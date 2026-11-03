"use server"

import { revalidatePath } from "next/cache"
import { allSports } from "@openplay/db"
import { declineSubmission, publishSubmission } from "@openplay/ingest/submission-actions"
import { CAMP_PERIODS, CAMP_STAYS, PROGRAM_FORMATS, SEASONS } from "@openplay/core"

import { requireAdminAction } from "@/lib/require-admin"
import type { SubmissionDraft } from "@/lib/submission-prefill"

export type SubmissionActionResult =
  | { ok: true; programSlug?: string }
  | { ok: false; error: string }

const DATE = /^\d{4}-\d{2}-\d{2}$/

function text(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function int(value: string, label: string, min: number, max: number): number | null {
  if (!value.trim()) return null
  const n = Number(value)
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${label} must be a whole number from ${min} to ${max}.`)
  return n
}

function date(value: string, label: string): string | null {
  if (!value.trim()) return null
  if (!DATE.test(value)) throw new Error(`${label} must be a date.`)
  return value
}

function url(value: string, label: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error()
    return parsed.toString()
  } catch {
    throw new Error(`${label} must be a full web address (https://…).`)
  }
}

function oneOf<T extends string>(value: string, allowed: readonly T[], label: string): T | null {
  if (!value) return null
  if (!allowed.includes(value as T)) throw new Error(`Unknown ${label}.`)
  return value as T
}

/**
 * Validates the reviewer's edits server-side (the form is a privileged
 * surface but the action is reachable without it), then publishes through
 * the shared review-candidate approval path.
 */
export async function publishSubmissionAction(
  submissionId: string,
  draft: SubmissionDraft,
): Promise<SubmissionActionResult> {
  const session = await requireAdminAction()

  try {
    const title = text(draft.title)
    const organizationName = text(draft.organizationName)
    const town = text(draft.town)
    const state = text(draft.state)?.toUpperCase()
    if (!title || !organizationName || !town || !state) {
      return { ok: false, error: "Title, organization, town and state are required." }
    }

    const season = oneOf(draft.season, SEASONS, "season")
    const seasonYear = int(draft.seasonYear, "Year", 2024, 2035)
    if (!season || !seasonYear) return { ok: false, error: "Season and year are required." }

    const sport = (await allSports()).find((s) => s.slug === draft.sportSlug)
    if (!sport) return { ok: false, error: "Pick an activity." }

    const sourceUrl = url(draft.sourceUrl, "Source page")
    if (!sourceUrl) return { ok: false, error: "A source page is required." }

    const programFormat = oneOf(draft.programFormat, PROGRAM_FORMATS, "format")
    const isCamp = programFormat === "camp"
    const feeText = draft.registrationFee.trim()
    const registrationFee = feeText ? Number(feeText) : null
    if (registrationFee !== null && (!Number.isFinite(registrationFee) || registrationFee < 0)) {
      return { ok: false, error: "Price must be a dollar amount." }
    }

    const result = await publishSubmission(
      submissionId,
      {
        title,
        description: text(draft.description),
        organizationName,
        town,
        state,
        zip: text(draft.zip),
        venueName: text(draft.venueName),
        venueAddress: text(draft.venueAddress),
        sportSlug: sport.slug,
        sportName: sport.name,
        programFormat,
        campStay: isCamp ? oneOf(draft.campStay, CAMP_STAYS, "camp type") : null,
        campPeriod: isCamp ? oneOf(draft.campPeriod, CAMP_PERIODS, "camp period") : null,
        season,
        seasonYear,
        seasonStartDate: date(draft.seasonStartDate, "Start date"),
        seasonEndDate: date(draft.seasonEndDate, "End date"),
        registrationOpenDate: date(draft.registrationOpenDate, "Registration opens"),
        registrationCloseDate: date(draft.registrationCloseDate, "Registration closes"),
        minAge: int(draft.minAge, "Min age", 0, 99),
        maxAge: int(draft.maxAge, "Max age", 0, 99),
        minGrade: int(draft.minGrade, "Min grade", -1, 12),
        maxGrade: int(draft.maxGrade, "Max grade", -1, 12),
        registrationFee,
        additionalFees: text(draft.additionalFees),
        registrationUrl: url(draft.registrationUrl, "Registration link"),
        sourceUrl,
        contactEmail: text(draft.contactEmail),
      },
      session.user.email ?? "admin",
    )
    if (!result.ok) return result

    revalidatePath("/admin/submissions")
    revalidatePath("/admin")
    revalidatePath("/camps")
    if (result.programSlug) revalidatePath(`/activities/${result.programSlug}`)
    return result
  } catch (error) {
    if (error instanceof Error && !("digest" in error)) {
      return { ok: false, error: error.message }
    }
    console.error("[v0] Failed to publish submission:", error)
    return { ok: false, error: "Something went wrong publishing this submission." }
  }
}

export async function declineSubmissionAction(submissionId: string): Promise<SubmissionActionResult> {
  const session = await requireAdminAction()
  const result = await declineSubmission(submissionId, session.user.email ?? "admin")
  if (result.ok) {
    revalidatePath("/admin/submissions")
    revalidatePath("/admin")
  }
  return result
}
