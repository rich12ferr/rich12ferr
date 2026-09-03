"use server"

import { createReport } from "@openplay/db"

export type ContactFormInput = {
  name: string
  email: string
  category: string
  message: string
}

export type ContactFormResult = { ok: true } | { ok: false; error: string }

/**
 * Validates and persists a general contact message into the shared `reports`
 * table (category "general_inquiry"), so the admin console has one queue to
 * check instead of a form that quietly writes nowhere.
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
    return { ok: true }
  } catch (error) {
    console.error("[v0] Failed to save contact message:", error)
    return { ok: false, error: "Something went wrong sending your message. Please try again." }
  }
}
