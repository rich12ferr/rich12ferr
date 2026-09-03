import { eq } from "drizzle-orm"
import { db } from "./client"
import { programs } from "./schema"
import { findAlertsToNotify, type MatchedAlert } from "./queries"

/* -------------------------------------------------------------------------- */
/*  Provider-agnostic mailer                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The one thing the rest of the app calls to send mail. It hides which
 * provider (if any) is configured so trigger detection never has to care.
 *
 * Delivery mode is chosen at call time from the environment:
 *   - `RESEND_API_KEY` present  -> send for real via Resend's REST API.
 *   - otherwise                 -> "log" mode: print the email to the server
 *                                  console and report success.
 *
 * Log mode is deliberate, not a stub: it lets the entire alert pipeline —
 * matching, trigger mapping, unsubscribe links — be built and verified before
 * an email integration is connected, which is the gating decision for the
 * beta. Swapping in a real provider is purely additive (set the key); no
 * caller changes.
 */
export type EmailMessage = {
  to: string
  subject: string
  text: string
}

export type SendResult = { ok: boolean; mode: "resend" | "log"; error?: string }

/**
 * Sender address. Prefer the configured `ALERT_FROM_EMAIL` (a verified-domain
 * address once the custom domain is set up). The fallback is Resend's built-in
 * test sender, which works without domain verification but ONLY delivers to the
 * Resend account owner's own email — good enough to confirm live sending before
 * `openplay.org` DNS is verified, not for real parent delivery.
 */
const FROM_ADDRESS = process.env.ALERT_FROM_EMAIL ?? "OpenPlay Alerts <onboarding@resend.dev>"

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    // Log mode — the pipeline is fully exercised, mail just lands in the log.
    console.log(
      `[v0] [alert-email:log] to=${message.to} subject=${JSON.stringify(message.subject)}\n${message.text}`,
    )
    return { ok: true, mode: "log" }
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: message.to,
        subject: message.subject,
        text: message.text,
      }),
    })
    if (!res.ok) {
      const detail = await res.text()
      console.error(`[v0] [alert-email:resend] failed ${res.status}: ${detail}`)
      return { ok: false, mode: "resend", error: `Resend ${res.status}` }
    }
    return { ok: true, mode: "resend" }
  } catch (error) {
    console.error("[v0] [alert-email:resend] threw:", error)
    return { ok: false, mode: "resend", error: String(error) }
  }
}

/* -------------------------------------------------------------------------- */
/*  Trigger mapping                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Translates the field-level changes the ingest pipeline just applied into the
 * subset of alert trigger events they represent. This is the single source of
 * truth for "which real-world event did this crawl produce," and it uses the
 * same trigger vocabulary the alert form and the alerts table share.
 *
 * `changedFields` are extraction field names (e.g. "registrationOpenDate").
 * `previous`/`next` let us distinguish "a date got filled in" (info added)
 * from "a date moved" (deadline changed).
 */
export type AppliedFieldChange = {
  field: string
  previous: unknown
  next: unknown
}

export function triggersFromChanges(changes: AppliedFieldChange[]): string[] {
  const fired = new Set<string>()

  for (const change of changes) {
    switch (change.field) {
      case "registrationOpenDate":
        // A newly-present open date is the headline "signup is live" event.
        if (change.previous == null && change.next != null) {
          fired.add("registration_opened")
        } else if (change.next != null) {
          fired.add("deadline_changed")
        }
        break
      case "registrationCloseDate":
        // Close-date movement is a deadline change either way.
        if (change.previous == null && change.next != null) {
          fired.add("registration_info_added")
        } else {
          fired.add("deadline_changed")
        }
        break
      case "registrationUrl":
      case "registrationFee":
      case "seasonStartDate":
      case "seasonEndDate":
        // Registration details filled in for the first time vs. corrected.
        fired.add(change.previous == null ? "registration_info_added" : "deadline_changed")
        break
      default:
        break
    }
  }

  return [...fired]
}

/* -------------------------------------------------------------------------- */
/*  Orchestration                                                             */
/* -------------------------------------------------------------------------- */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://openplay.local"

function triggerSentence(trigger: string, label: string): string {
  switch (trigger) {
    case "registration_opened":
      return `Registration is now open for ${label}.`
    case "registration_closing_soon":
      return `Registration is closing soon for ${label}.`
    case "deadline_changed":
      return `A registration date changed for ${label}.`
    case "registration_info_added":
      return `New registration details were posted for ${label}.`
    case "new_matching_activity":
      return `A new activity matching your alert was published: ${label}.`
    default:
      return `There's an update for ${label}.`
  }
}

function buildEmail(alert: MatchedAlert, firedTriggers: string[], programSlug: string): EmailMessage {
  // Only mention triggers this alert actually subscribed to.
  const relevant = firedTriggers.filter((t) => alert.triggers.includes(t))
  const lines = relevant.map((t) => `• ${triggerSentence(t, alert.label)}`)
  const activityUrl = `${APP_URL}/activities/${programSlug}`
  const unsubscribeUrl = `${APP_URL}/alerts/unsubscribe?token=${alert.unsubscribeToken}`

  return {
    to: alert.email,
    subject: `OpenPlay alert: ${alert.label}`,
    text: [
      `You asked OpenPlay to watch "${alert.label}".`,
      "",
      ...lines,
      "",
      `See details and register here: ${activityUrl}`,
      "",
      "OpenPlay never processes registrations or payments — you'll register on the organization's own site.",
      "",
      `Stop these emails anytime (one click, no login): ${unsubscribeUrl}`,
    ].join("\n"),
  }
}

/**
 * Entry point the ingest pipeline calls after it applies changes to an
 * offering. Maps the changes to trigger events, finds the alerts that want
 * them, and sends one email per matched alert. Best-effort and self-contained:
 * a mail failure is logged, never thrown, so notification can never break a
 * crawl. Returns a small summary for pipeline logging/telemetry.
 */
export async function notifyOfferingChange(input: {
  programId: string
  changes: AppliedFieldChange[]
}): Promise<{ triggers: string[]; matched: number; sent: number }> {
  const triggers = triggersFromChanges(input.changes)
  if (triggers.length === 0) return { triggers: [], matched: 0, sent: 0 }

  const matches = await findAlertsToNotify(input.programId, triggers)
  if (matches.length === 0) return { triggers, matched: 0, sent: 0 }

  // The activity link needs the program's public slug; fetch it once and reuse
  // across every matched email rather than threading it through the pipeline.
  const [program] = await db
    .select({ slug: programs.slug })
    .from(programs)
    .where(eq(programs.id, input.programId))
    .limit(1)
  const slug = program?.slug ?? ""

  let sent = 0
  for (const alert of matches) {
    const result = await sendEmail(buildEmail(alert, triggers, slug))
    if (result.ok) sent += 1
  }

  return { triggers, matched: matches.length, sent }
}
