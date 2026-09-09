"use server"

import { createReport, sendEmail } from "@openplay/db"

export type ContactFormInput = {
  name: string
  email: string
  category: string
  message: string
}

export type ContactFormResult = { ok: true } | { ok: false; error: string }

/**
 * The Sign Up Vermont inbox that should hear about every contact form
 * submission. Configured via env (not hardcoded) so it can change without a
 * code edit; if it's unset, submissions still save to the `reports` queue
 * below, they just don't also page anyone by email.
 */
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL

/**
 * Validates and persists a general contact message into the shared `reports`
 * table (category "general_inquiry"), so the admin console has one queue to
 * check, then emails the Sign Up Vermont admin inbox so a submission is never
 * missed just because no one happened to check the queue.
 *
 * Re-validates server-side because a public form is reachable without the
 * client-side checks (disabled JS, direct POST).
 */
export async function submitContactForm(input: ContactFormInput): Promise<ContactFormResult> {
  const name = input.name.trim()
  const email = input.email.trim()
  const message = input.message.trim()

  if (!name || !email || !message) {
    return { ok: false, error: "A few required fields are still empty." }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "That email address does not look right." }
  }

  try {
    await createReport({
      category: "general_inquiry",
      details: `From: ${name}\n\n${message}`,
      reporterEmail: email,
    })
  } catch (error) {
    console.error("[v0] Failed to save contact message:", error)
    return { ok: false, error: "Something went wrong sending your message. Please try again." }
  }

  // Best-effort notification: the message is already saved, so a mail
  // failure here is logged, never surfaced as a form error to the visitor.
  if (CONTACT_TO_EMAIL) {
    const result = await sendEmail({
      to: CONTACT_TO_EMAIL,
      subject: `New contact form message: ${input.category}`,
      text: [
        `Category: ${input.category}`,
        `From: ${name} <${email}>`,
        "",
        message,
      ].join("\n"),
    })
    if (!result.ok) {
      console.error(`[v0] Contact form saved but admin email failed to send: ${result.error}`)
    }
  } else {
    console.warn("[v0] CONTACT_TO_EMAIL is not set; skipping admin notification for contact form submission.")
  }

  return { ok: true }
}
