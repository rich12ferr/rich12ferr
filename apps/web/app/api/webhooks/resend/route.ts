import { createHmac, timingSafeEqual } from "node:crypto"
import { recordEngagementEvent } from "@openplay/db"

// Signature verification uses Node's crypto, so this must not run on the Edge.
export const runtime = "nodejs"

/**
 * Resend engagement webhook. Records delivered/opened/bounced events against
 * the per-recipient `newsletter_sends` rows so the analytics page can compute
 * open rate per issue.
 *
 * Resend signs webhooks with the Svix scheme. We verify manually (HMAC-SHA256
 * over `${id}.${timestamp}.${body}`) instead of pulling in the Resend/Svix SDK
 * — it's a few lines and keeps the app dependency-free, consistent with the
 * raw-fetch mailer. If `RESEND_WEBHOOK_SECRET` isn't set yet, we skip
 * verification and log loudly: engagement still records so the pipeline is
 * testable, but this MUST be set before production so forged events can't
 * poison the funnel.
 */

const RELEVANT: Record<string, "delivered" | "opened" | "bounced"> = {
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.bounced": "bounced",
}

/** Constant-time compare of a candidate signature against any of the header's signatures. */
function verifySvix(
  payload: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
): boolean {
  if (!headers.id || !headers.timestamp || !headers.signature) return false

  // Secret is "whsec_<base64>"; the bytes after the prefix are the HMAC key.
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64")
  const signedContent = `${headers.id}.${headers.timestamp}.${payload}`
  const expected = createHmac("sha256", key).update(signedContent).digest("base64")
  const expectedBuf = Buffer.from(expected)

  // Header is a space-delimited list of "v1,<sig>" — any match passes.
  return headers.signature.split(" ").some((part) => {
    const sig = part.split(",")[1] ?? ""
    const sigBuf = Buffer.from(sig)
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)
  })
}

export async function POST(req: Request) {
  // Must read the raw body for signature verification — parsing to JSON first
  // would re-serialize differently and break the HMAC.
  const payload = await req.text()

  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (secret) {
    const ok = verifySvix(
      payload,
      {
        id: req.headers.get("svix-id"),
        timestamp: req.headers.get("svix-timestamp"),
        signature: req.headers.get("svix-signature"),
      },
      secret,
    )
    if (!ok) {
      console.error("[v0] [resend-webhook] signature verification failed")
      return new Response("Invalid signature", { status: 401 })
    }
  } else {
    console.warn(
      "[v0] [resend-webhook] RESEND_WEBHOOK_SECRET not set — accepting event without verification. Set it before production.",
    )
  }

  let event: { type?: string; data?: { email_id?: string } }
  try {
    event = JSON.parse(payload)
  } catch {
    return new Response("Bad payload", { status: 400 })
  }

  const mapped = event.type ? RELEVANT[event.type] : undefined
  const emailId = event.data?.email_id
  if (mapped && emailId) {
    try {
      await recordEngagementEvent(emailId, mapped)
    } catch (error) {
      // Return 500 so Resend retries per its backoff schedule rather than
      // dropping an event we failed to persist.
      console.error("[v0] [resend-webhook] failed to record event:", error)
      return new Response("Error recording event", { status: 500 })
    }
  }

  // Always 200 for events we don't track, so Resend doesn't retry them.
  return new Response("OK", { status: 200 })
}
