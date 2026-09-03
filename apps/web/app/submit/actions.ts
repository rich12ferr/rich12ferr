"use server"

import { createSubmission } from "@openplay/db"

export type SubmitActivityInput = {
  organizationName: string
  sportName?: string
  programName: string
  eligibility?: string
  registrationDates?: string
  registrationUrl?: string
  sourceUrl: string
  comments?: string
  submitterEmail: string
}

export type SubmitActivityResult = { ok: true } | { ok: false; error: string }

/**
 * Validates and persists a community submission.
 *
 * Client-side validation already blocks empty required fields, but a public
 * form is reachable without JavaScript-driven checks (disabled JS, direct
 * POST, a future non-browser client), so the required fields are re-checked
 * here before anything is written.
 */
export async function submitActivity(input: SubmitActivityInput): Promise<SubmitActivityResult> {
  const organizationName = input.organizationName.trim()
  const programName = input.programName.trim()
  const sourceUrl = input.sourceUrl.trim()
  const submitterEmail = input.submitterEmail.trim()

  if (!organizationName || !programName || !sourceUrl || !submitterEmail) {
    return { ok: false, error: "A few required fields are still empty." }
  }

  try {
    new URL(sourceUrl)
  } catch {
    return { ok: false, error: "The source link needs to be a valid URL." }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
    return { ok: false, error: "That email address does not look right." }
  }

  try {
    await createSubmission({
      organizationName,
      sportName: input.sportName?.trim() || null,
      programName,
      eligibility: input.eligibility?.trim() || null,
      registrationDates: input.registrationDates?.trim() || null,
      registrationUrl: input.registrationUrl?.trim() || null,
      sourceUrl,
      comments: input.comments?.trim() || null,
      submitterEmail,
    })
    return { ok: true }
  } catch (error) {
    console.error("[v0] Failed to save submission:", error)
    return { ok: false, error: "Something went wrong saving your submission. Please try again." }
  }
}
