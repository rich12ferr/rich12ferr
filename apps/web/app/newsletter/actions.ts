"use server"

import {
  subscribeToNewsletter,
  unsubscribeFromNewsletterByEmail,
  unsubscribeFromNewsletterByToken,
} from "@openplay/db"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type SubscribeResult =
  | { ok: true; outcome: "subscribed" | "already_subscribed" | "resubscribed" }
  | { ok: false; error: string }

/**
 * Opts an email into the weekly digest from the homepage or Alerts page.
 * Login-free by design (same as alerts), and email is re-validated here
 * because a server action is a public endpoint reachable without the form's
 * client-side checks.
 */
export async function subscribeToNewsletterAction(
  rawEmail: string,
  source?: "homepage" | "alerts_page",
): Promise<SubscribeResult> {
  const email = rawEmail.trim().toLowerCase()
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "That email address does not look right." }
  }

  try {
    const result = await subscribeToNewsletter(email, source)
    return { ok: true, outcome: result.status }
  } catch (error) {
    console.error("[v0] Failed to subscribe to newsletter:", error)
    return { ok: false, error: "Something went wrong. Please try again." }
  }
}

/** One-click, login-free unsubscribe from an email footer link. Idempotent. */
export async function unsubscribeNewsletterByToken(token: string): Promise<{ ok: boolean }> {
  try {
    const row = await unsubscribeFromNewsletterByToken(token)
    return { ok: row !== null }
  } catch (error) {
    console.error("[v0] Failed to unsubscribe from newsletter by token:", error)
    return { ok: false }
  }
}

/** Unsubscribe by typing an email on the Alerts page (no token in hand). */
export async function unsubscribeNewsletterByEmailAction(
  rawEmail: string,
): Promise<{ ok: boolean; error?: string }> {
  const email = rawEmail.trim().toLowerCase()
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "That email address does not look right." }
  }
  try {
    // A missing row means the address wasn't subscribed — report success
    // anyway so we never disclose whether a given email is on the list.
    await unsubscribeFromNewsletterByEmail(email)
    return { ok: true }
  } catch (error) {
    console.error("[v0] Failed to unsubscribe from newsletter by email:", error)
    return { ok: false, error: "Something went wrong. Please try again." }
  }
}
