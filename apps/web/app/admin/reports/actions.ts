"use server"

import { revalidatePath } from "next/cache"
import { setReportStatus, type ReportStatus } from "@openplay/db"
import { requireAdminAction } from "@/lib/require-admin"

const VALID_STATUSES: ReportStatus[] = ["new", "investigating", "resolved", "dismissed"]

export type UpdateReportStatusResult = { ok: true } | { ok: false; error: string }

/**
 * Moves a report between states from the admin queue. Validates the status
 * against a fixed set server-side because the queue is a privileged surface and
 * an action is reachable without the client controls. `note` is an optional
 * resolution reason stored on close; ignored on reopen (see `setReportStatus`).
 */
export async function updateReportStatus(
  id: string,
  status: ReportStatus,
  note?: string,
): Promise<UpdateReportStatusResult> {
  await requireAdminAction()

  if (!id) {
    return { ok: false, error: "Missing report id." }
  }
  if (!VALID_STATUSES.includes(status)) {
    return { ok: false, error: "Unknown status." }
  }

  try {
    const row = await setReportStatus(id, status, note ?? null)
    if (!row) {
      return { ok: false, error: "That report no longer exists." }
    }
  } catch (error) {
    console.error("[v0] Failed to update report status:", error)
    return { ok: false, error: "Something went wrong updating the report. Please try again." }
  }

  revalidatePath("/admin/reports")
  revalidatePath("/admin")
  return { ok: true }
}
