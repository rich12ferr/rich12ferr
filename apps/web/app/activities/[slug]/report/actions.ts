"use server"

import { createReport, sendEmail } from "@openplay/db"
import type { ReportCategory } from "@/lib/types"
import { reportCategoryLabels } from "@/lib/report-categories"

export type SubmitReportInput = {
  programId: string
  offeringId: string
  activityTitle: string
  category: ReportCategory
  details: string
  email: string
}

export type SubmitReportResult = { ok: true } | { ok: false; error: string }

/** Same inbox the /contact form and suggested-edit flow page — one place the admin already checks. */
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL

/**
 * Records a quick "something's wrong" flag as a `reports` row (status
 * "new" — never applied to the live listing directly). Shares the same
 * table and admin queue as `submitSuggestedEdit`, so a broken-link flag and
 * a detailed correction both land in one place for review, distinguished
 * only by `category`.
 *
 * Re-validates server-side because this form is reachable without the
 * client-side checks (disabled JS, direct POST) and requires no account.
 */
export async function submitReport(input: SubmitReportInput): Promise<SubmitReportResult> {
  const details = input.details.trim()
  const email = input.email.trim()

  if (!details) {
    return { ok: false, error: "Please describe what's wrong." }
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "That email address does not look right." }
  }

  const categoryLabel = reportCategoryLabels[input.category] ?? input.category
  const fullDetails = `Report for "${input.activityTitle}": ${categoryLabel}\n\n${details}`

  try {
    await createReport({
      category: input.category,
      details: fullDetails,
      reporterEmail: email || null,
      programId: input.programId,
      offeringId: input.offeringId,
    })
  } catch (error) {
    console.error("[v0] Failed to save report:", error)
    return { ok: false, error: "Something went wrong sending your report. Please try again." }
  }

  // Best-effort notification: the report is already saved, so a mail
  // failure here is logged, never surfaced as a form error to the visitor.
  if (CONTACT_TO_EMAIL) {
    const result = await sendEmail({
      to: CONTACT_TO_EMAIL,
      subject: `Report: ${input.activityTitle} — ${categoryLabel}`,
      text: `${fullDetails}${email ? `\n\nSubmitted by: ${email}` : "\n\n(No email provided.)"}`,
    })
    if (!result.ok) {
      console.error(`[v0] Report saved but admin email failed to send: ${result.error}`)
    }
  } else {
    console.warn("[v0] CONTACT_TO_EMAIL is not set; skipping admin notification for report.")
  }

  return { ok: true }
}
