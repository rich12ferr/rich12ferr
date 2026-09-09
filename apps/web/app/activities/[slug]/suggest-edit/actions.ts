"use server"

import { createReport, sendEmail } from "@openplay/db"

export type SuggestEditInput = {
  programId: string
  offeringId: string
  activityTitle: string
  organizationName: string
  email: string
  registrationUrl: string
  websiteUrl: string
  registrationOpenDate: string
  registrationCloseDate: string
  context: string
}

export type SuggestEditResult = { ok: true } | { ok: false; error: string }

/** Same inbox the /contact form pages — one place the admin already checks. */
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL

function line(label: string, current: string | null, suggested: string) {
  const value = suggested.trim()
  if (!value || value === (current ?? "")) return null
  return `${label}: "${current ?? "(not published)"}" -> "${value}"`
}

/**
 * Records a community-suggested correction to a program's details as a
 * `reports` row (category "suggested_edit", status "new" — a draft awaiting
 * admin review, never applied to the live listing directly). Reuses the same
 * queue the quick "report incorrect info" dialog writes to, so the admin
 * console has one place to review every kind of community feedback.
 *
 * Re-validates server-side because this form is reachable without the
 * client-side checks (disabled JS, direct POST) and requires no account.
 */
export async function submitSuggestedEdit(input: SuggestEditInput): Promise<SuggestEditResult> {
  const email = input.email.trim()
  const context = input.context.trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "That email address does not look right." }
  }
  if (!context) {
    return { ok: false, error: "Please add a bit of context so a reviewer can verify this." }
  }

  const changes = [
    line("Registration URL", input.registrationUrl, input.registrationUrl),
    line("Organization website", input.websiteUrl, input.websiteUrl),
    line("Registration opens", input.registrationOpenDate, input.registrationOpenDate),
    line("Registration closes", input.registrationCloseDate, input.registrationCloseDate),
  ].filter((entry): entry is string => entry !== null)

  const details = [
    `Suggested edit for "${input.activityTitle}" (${input.organizationName}).`,
    changes.length > 0 ? `Suggested values submitted:\n${changes.join("\n")}` : null,
    `Context from submitter:\n${context}`,
  ]
    .filter(Boolean)
    .join("\n\n")

  try {
    await createReport({
      category: "suggested_edit",
      details,
      reporterEmail: email,
      programId: input.programId,
      offeringId: input.offeringId,
    })
  } catch (error) {
    console.error("[v0] Failed to save suggested edit:", error)
    return { ok: false, error: "Something went wrong saving your suggestion. Please try again." }
  }

  // Best-effort notification: the suggestion is already saved, so a mail
  // failure here is logged, never surfaced as a form error to the visitor.
  if (CONTACT_TO_EMAIL) {
    const result = await sendEmail({
      to: CONTACT_TO_EMAIL,
      subject: `Suggested edit: ${input.activityTitle}`,
      text: `${details}\n\nSubmitted by: ${email}`,
    })
    if (!result.ok) {
      console.error(`[v0] Suggested edit saved but admin email failed to send: ${result.error}`)
    }
  } else {
    console.warn("[v0] CONTACT_TO_EMAIL is not set; skipping admin notification for suggested edit.")
  }

  return { ok: true }
}
