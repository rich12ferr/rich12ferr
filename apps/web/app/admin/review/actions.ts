"use server"

import { revalidatePath } from "next/cache"

import { approveReviewCandidate, rejectReviewCandidate } from "@openplay/ingest/review-actions"
import { requireAdminAction } from "@/lib/require-admin"

export type ReviewActionResult = { ok: true } | { ok: false; error: string }

/**
 * Approves a pending review candidate. Delegates to `@openplay/ingest`'s
 * `approveReviewCandidate` — the same transaction the `approve-candidates`
 * CLI script uses — so the dashboard and the CLI never drift apart on what
 * "approve" actually does.
 */
export async function approveCandidateAction(candidateId: string): Promise<ReviewActionResult> {
  const session = await requireAdminAction()

  const result = await approveReviewCandidate(candidateId, session.user.email ?? "admin")
  if (!result.ok) {
    return result
  }

  revalidatePath("/admin/review")
  revalidatePath("/admin/activities")
  if (result.programSlug) {
    revalidatePath(`/activities/${result.programSlug}`)
  }

  return { ok: true }
}

/** Rejects a pending review candidate with a reviewer-supplied note. */
export async function rejectCandidateAction(candidateId: string, note: string): Promise<ReviewActionResult> {
  const session = await requireAdminAction()

  const result = await rejectReviewCandidate(candidateId, session.user.email ?? "admin", note)
  if (!result.ok) {
    return result
  }

  revalidatePath("/admin/review")

  return { ok: true }
}
