"use server"

import { revalidatePath } from "next/cache"

import {
  offeringById,
  insertAuditLogEntry,
  setReportStatus,
  updateOfferingFields,
  type AuditChange,
  type OfferingFieldPatch,
} from "@openplay/db"
import { requireAdminAction } from "@/lib/require-admin"

export type SaveActivityInput = {
  offeringId: string
  programId: string
  patch: OfferingFieldPatch
  /** Set when this save was opened from a "suggested edit" report — auto-resolves that report on success. */
  reportId?: string | null
}

export type SaveActivityResult = { ok: true } | { ok: false; error: string }

/**
 * The activity editor's one write path. Diffs the incoming patch against the
 * current row so the audit log only records fields that actually changed,
 * applies the update, writes the audit entry, and — when opened from a
 * report — auto-resolves that report in the same action (approved: "auto-
 * resolve on save" rather than a separate manual step).
 */
export async function saveActivity(input: SaveActivityInput): Promise<SaveActivityResult> {
  await requireAdminAction()

  const { offeringId, programId, patch, reportId } = input

  const before = await offeringById(offeringId)
  if (!before) {
    return { ok: false, error: "This activity no longer exists." }
  }

  const updated = await updateOfferingFields(offeringId, programId, patch)
  if (!updated) {
    return { ok: false, error: "Couldn't save — the activity may have been removed." }
  }

  const changes: AuditChange = {}
  const beforeRecord = before as unknown as Record<string, unknown>
  const afterRecord = updated as unknown as Record<string, unknown>
  const touchedFields = [...Object.keys(patch.program ?? {}), ...Object.keys(patch.offering ?? {})]
  for (const field of touchedFields) {
    const beforeValue = beforeRecord[field]
    const afterValue = afterRecord[field]
    if (beforeValue !== afterValue) {
      changes[field] = { before: beforeValue, after: afterValue }
    }
  }

  if (Object.keys(changes).length > 0) {
    await insertAuditLogEntry({
      entityType: "program_offering",
      entityId: offeringId,
      changes,
      reportId: reportId ?? null,
    })
  }

  if (reportId) {
    await setReportStatus(reportId, "resolved", "Applied via activity editor save.")
    revalidatePath("/admin/reports")
  }

  revalidatePath(`/admin/activities/${offeringId}`)
  revalidatePath("/admin/activities")
  revalidatePath(`/activities/${updated.programSlug}`)

  return { ok: true }
}
