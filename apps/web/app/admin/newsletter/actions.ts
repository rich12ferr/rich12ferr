"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  createIssue,
  ensureSendRows,
  getIssueForRender,
  markIssueSent,
  markSendResult,
  sendNewsletterBatch,
  updateIssue,
  type NewIssueInput,
} from "@openplay/db"
import { requireAdminAction } from "@/lib/require-admin"
import { renderNewsletterEmail } from "@/lib/newsletter-email"
import { siteUrl } from "@/lib/site-url"

/** Create a blank draft and jump straight into its editor. */
export async function createIssueAction(): Promise<void> {
  await requireAdminAction()
  const issue = await createIssue({ subject: "Untitled digest" })
  revalidatePath("/admin/newsletter")
  redirect(`/admin/newsletter/${issue.id}`)
}

export type SaveIssueResult = { ok: true } | { ok: false; error: string }

export async function saveIssueAction(
  id: string,
  patch: NewIssueInput,
): Promise<SaveIssueResult> {
  await requireAdminAction()
  if (!patch.subject?.trim()) {
    return { ok: false, error: "A subject line is required." }
  }
  try {
    await updateIssue(id, patch)
    revalidatePath(`/admin/newsletter/${id}`)
    revalidatePath("/admin/newsletter")
    return { ok: true }
  } catch (error) {
    console.error("[v0] Failed to save newsletter issue:", error)
    return { ok: false, error: "Something went wrong saving the issue." }
  }
}

export type SendIssueResult =
  | { ok: true; sent: number; failed: number; mode: "resend" | "log" }
  | { ok: false; error: string }

/**
 * Admin-triggered send. Nothing here schedules or auto-sends — this only runs
 * on an explicit click. Builds one email per recipient (each with its own
 * unsubscribe link), sends via the batch mailer, records per-recipient
 * outcomes for open-rate analytics, then flips the issue to "sent".
 *
 * Re-runnable after a partial failure: `ensureSendRows` is idempotent and we
 * only (re)send rows not already in a delivered/opened/sent state, so a retry
 * never double-emails someone who already got it.
 */
export async function sendIssueAction(issueId: string): Promise<SendIssueResult> {
  await requireAdminAction()

  const data = await getIssueForRender(issueId)
  if (!data) return { ok: false, error: "Issue not found." }
  if (!data.issue.subject?.trim()) return { ok: false, error: "Add a subject line before sending." }

  const rows = await ensureSendRows(issueId)
  if (rows.length === 0) return { ok: false, error: "There are no active subscribers to send to." }

  // Skip anyone already successfully sent/delivered/opened so a retry only
  // fills the gaps left by a previous failure.
  const alreadyDone = new Set(["sent", "delivered", "opened"])
  const pending = rows.filter((r) => !alreadyDone.has(r.status))
  if (pending.length === 0) {
    return { ok: false, error: "Every subscriber has already received this issue." }
  }

  const base = siteUrl()
  const emails = pending.map((r) => {
    const { html, text } = renderNewsletterEmail({
      issue: data.issue,
      edition: data.edition,
      stories: data.stories,
      appUrl: base,
      unsubscribeUrl: `${base}/newsletter/unsubscribe?token=${r.unsubscribeToken}`,
    })
    return { to: r.email, subject: data.issue.subject, html, text }
  })

  const batch = await sendNewsletterBatch(emails)

  let sent = 0
  let failed = 0
  await Promise.all(
    batch.results.map((res, i) => {
      const row = pending[i]
      if (!row) return Promise.resolve()
      if (res.ok) sent += 1
      else failed += 1
      return markSendResult(row.id, {
        resendEmailId: res.id ?? null,
        status: res.ok ? "sent" : "failed",
        error: res.error ?? null,
      })
    }),
  )

  // Snapshot the recipient count as everyone we successfully sent to across all
  // attempts (total rows minus any still failed), then mark the issue sent.
  await markIssueSent(issueId, rows.length - failed)

  revalidatePath(`/admin/newsletter/${issueId}`)
  revalidatePath("/admin/newsletter")
  return { ok: true, sent, failed, mode: batch.mode }
}
