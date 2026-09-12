/**
 * Applies a human reviewer's approve/reject decision to a pending
 * `review_candidates` row.
 *
 * The crawl pipeline (`pipeline.ts`) deliberately never auto-publishes a new
 * program or offering — see the "Nothing new is ever auto-published" rule at
 * the top of that file. This module is the other half of that rule: the
 * write path a human reviewer triggers once they've looked at a candidate and
 * decided it's real (or not). It is shared by two callers — the
 * `approve-candidates` CLI script and the admin dashboard's `/admin/review`
 * server actions — so there is exactly one code path that ever turns a
 * candidate into a published `programs`/`program_offerings` row.
 */
import { and, eq, isNull, sql } from "drizzle-orm"
import {
  db,
  fieldProvenance,
  organizations,
  programOfferings,
  programs,
  reviewCandidates,
  sources,
  sports,
  type ReviewCandidateRow,
} from "@openplay/db"
import { geocodeFromGazetteer } from "./geocode"
import { programMatchKey, resolveSportSlug, significantTokens } from "./entity-resolution"

export type ReviewActionResult =
  | { ok: true; programId?: string; offeringId?: string; programSlug?: string }
  | { ok: false; error: string }

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`
}

/** WKT for PostGIS. Longitude first — reversing this puts Vermont in the ocean. */
function pointLiteral(lng: number, lat: number) {
  return sql`st_setsrid(st_makepoint(${lng}, ${lat}), 4326)::geography`
}

/**
 * A `field_update` whose changes are dominated by "cleared" fields with the
 * pipeline's own "may be an extraction failure" note is almost always a page
 * that temporarily stopped rendering the data the previous crawl found, not
 * a real edit by the organization. Applying it would silently regress a
 * record a human already verified, so callers should reject it instead.
 */
export function looksLikeExtractionLoss(candidate: ReviewCandidateRow): boolean {
  const changes = (candidate.changes ?? []) as Array<{ kind: string; note?: string | null }>
  if (changes.length === 0) return false
  const cleared = changes.filter((c) => c.kind === "cleared")
  return cleared.length > 0 && cleared.length >= changes.length / 2
}

async function uniqueProgramSlug(base: string): Promise<string> {
  const root = significantTokens(base).join("-") || "program"
  let candidate = root
  let suffix = 2
  while (true) {
    const [existing] = await db
      .select({ id: programs.id })
      .from(programs)
      .where(eq(programs.slug, candidate))
      .limit(1)
    if (!existing) return candidate
    candidate = `${root}-${suffix}`
    suffix += 1
  }
}

/**
 * Season/seasonYear are NOT NULL on `program_offerings`, but the extraction
 * schema allows both to be null (a page can say "2026-2027 registration"
 * without ever using the words "fall" or "winter"). Rather than invent a
 * value from nothing, this only fills gaps using other signals already
 * present on the *same* payload — the year embedded in the title/description,
 * or a sibling program's season/seasonYear for the same organization.
 */
function inferSeasonYear(payload: Record<string, unknown>): number | null {
  if (typeof payload.seasonYear === "number") return payload.seasonYear
  const text = `${payload.title ?? ""} ${payload.description ?? ""}`
  const match = text.match(/20\d{2}/)
  return match ? Number(match[0]) : null
}

function inferSeason(payload: Record<string, unknown>): string | null {
  if (typeof payload.season === "string") return payload.season
  // Registration-open language ("now open", tryouts in Sept) for a season
  // that runs into the following calendar year is conventionally "fall".
  const text = `${payload.title ?? ""} ${payload.description ?? ""}`.toLowerCase()
  if (/registration/.test(text)) return "fall"
  return null
}

/**
 * Approves a `new_program` / `new_offering` candidate: creates the
 * `programs` + `program_offerings` rows, records provenance, and marks the
 * candidate `approved`. All-or-nothing — a failure partway through (e.g. a
 * check-constraint typo in the provenance insert) must not leave an
 * orphaned program/offering that a re-run would then duplicate.
 */
export async function approveReviewCandidate(
  candidateId: string,
  reviewedBy: string,
): Promise<ReviewActionResult> {
  const [candidate] = await db
    .select()
    .from(reviewCandidates)
    .where(eq(reviewCandidates.id, candidateId))
    .limit(1)
  if (!candidate) {
    return { ok: false, error: "Candidate not found." }
  }
  if (candidate.status !== "pending") {
    return { ok: false, error: `Candidate is already "${candidate.status}", not pending.` }
  }

  // A field_update that looks like an extraction failure is auto-rejected
  // rather than applied, even from the "Approve" button — approving it would
  // silently regress an already-verified offering. See `looksLikeExtractionLoss`.
  if (candidate.kind === "field_update" && looksLikeExtractionLoss(candidate)) {
    return rejectReviewCandidate(
      candidateId,
      reviewedBy,
      "Rejected: change set clears previously-populated fields with an extraction-failure note. Applying would regress an already-verified offering.",
    )
  }

  if (candidate.kind !== "new_program" && candidate.kind !== "new_offering") {
    return { ok: false, error: `No approve handler yet for candidate kind "${candidate.kind}".` }
  }

  const payload = candidate.payload as Record<string, unknown>
  const title = String(payload.title ?? candidate.proposedTitle)

  if (!candidate.sourceId) {
    return { ok: false, error: "Candidate has no source_id, cannot resolve organization." }
  }
  const [source] = await db.select().from(sources).where(eq(sources.id, candidate.sourceId)).limit(1)
  if (!source?.organizationId) {
    return { ok: false, error: "Source has no linked organization." }
  }
  const [org] = await db
    .select({ id: organizations.id, town: organizations.town, state: organizations.state })
    .from(organizations)
    .where(eq(organizations.id, source.organizationId))
    .limit(1)
  if (!org) {
    return { ok: false, error: `Organization ${source.organizationId} not found.` }
  }

  const sportSlug = resolveSportSlug(payload.sportName as string | null | undefined)
  const [sport] = await db.select({ id: sports.id }).from(sports).where(eq(sports.slug, sportSlug)).limit(1)
  if (!sport) {
    return { ok: false, error: `No sport matches "${payload.sportName}" (slug "${sportSlug}").` }
  }

  const seasonYear = inferSeasonYear(payload)
  const season = inferSeason(payload)
  if (!seasonYear || !season) {
    return {
      ok: false,
      error: `Cannot determine season/seasonYear from payload (season=${season}, seasonYear=${seasonYear}).`,
    }
  }

  const gender = (payload.gender as string | null) ?? "any"
  const minAge = (payload.minAge as number | null) ?? null
  const maxAge = (payload.maxAge as number | null) ?? null
  const minGrade = (payload.minGrade as number | null) ?? null
  const maxGrade = (payload.maxGrade as number | null) ?? null

  const programId = newId("prog")
  const slug = await uniqueProgramSlug(`${title} ${org.id}`)
  const matchKey = programMatchKey({
    organizationId: org.id,
    sportId: sport.id,
    gender,
    minAge,
    maxAge,
    minGrade,
    maxGrade,
  })

  const town = (payload.town as string | null) ?? org.town
  const state = (payload.state as string | null) ?? org.state
  const geo = geocodeFromGazetteer(town, state)
  const offeringId = newId("off")

  await db.transaction(async (tx) => {
    await tx.insert(programs).values({
      id: programId,
      slug,
      organizationId: org.id,
      sportId: sport.id,
      title,
      description: (payload.description as string | null) ?? null,
      programType: (payload.programType as string | null) ?? "recreational",
      gender,
      minAge,
      maxAge,
      minGrade,
      maxGrade,
      residencyRequirement: (payload.residencyRequirement as string | null) ?? null,
      experienceLevel: (payload.experienceLevel as string | null) ?? null,
      beginnerFriendly: Boolean(payload.beginnerFriendly),
      typicalSeasons: season ? [season] : [],
      equipmentRequirements: (payload.equipmentRequirements as string | null) ?? null,
      practiceSchedule: (payload.practiceSchedule as string | null) ?? null,
      gameSchedule: (payload.gameSchedule as string | null) ?? null,
      verificationStatus: "ai_extracted",
      active: true,
      matchKey,
    })

    await tx.insert(programOfferings).values({
      id: offeringId,
      programId,
      season,
      seasonYear,
      registrationOpenDate: (payload.registrationOpenDate as string | null) ?? null,
      registrationCloseDate: (payload.registrationCloseDate as string | null) ?? null,
      seasonStartDate: (payload.seasonStartDate as string | null) ?? null,
      seasonEndDate: (payload.seasonEndDate as string | null) ?? null,
      registrationUrl: (payload.registrationUrl as string | null) ?? source.url,
      capacity: (payload.capacity as number | null) ?? null,
      waitlistAvailable: (payload.waitlistAvailable as boolean | null) ?? null,
      registrationFee: (payload.registrationFee as number | null) ?? null,
      additionalFees: (payload.additionalFees as string | null) ?? null,
      scholarshipAvailable: (payload.scholarshipAvailable as boolean | null) ?? null,
      tryoutRequired: Boolean(payload.tryoutRequired),
      tryoutDetails: (payload.tryoutDetails as string | null) ?? null,
      tryoutDate: (payload.tryoutDate as string | null) ?? null,
      town,
      state,
      zip: (payload.zip as string | null) ?? null,
      venueName: (payload.venueName as string | null) ?? null,
      venueAddress: (payload.venueAddress as string | null) ?? null,
      geocodePrecision: geo ? geo.precision : "none",
      contactName: (payload.contactName as string | null) ?? null,
      contactEmail: (payload.contactEmail as string | null) ?? null,
      contactUrl: (payload.contactUrl as string | null) ?? null,
      sourceUrl: source.url,
      sourceType: source.sourceType,
      dateDiscovered: candidate.discoveredAt,
      verificationMethod: "ai_extracted, human-approved from review queue",
      dateLastChecked: new Date(),
      verificationStatus: "ai_extracted",
      published: true,
    })

    if (geo) {
      await tx
        .update(programOfferings)
        .set({ location: sql`${pointLiteral(geo.point.lng, geo.point.lat)}` as never })
        .where(eq(programOfferings.id, offeringId))
    }

    await tx.insert(fieldProvenance).values({
      id: newId("prov"),
      // Matches the `provenance_entity_type_check` constraint, which accepts
      // "program_offering" — not "offering".
      entityType: "program_offering",
      entityId: offeringId,
      field: "registrationUrl",
      value: (payload.registrationUrl as string | null) ?? source.url,
      sourceId: source.id,
      rawDocumentId: candidate.rawDocumentId,
      sourceType: source.sourceType,
      // `provenance_method_check` accepts "ai_extraction", not "ai_extracted"
      // (that spelling is reserved for the separate verification_status enum).
      extractionMethod: "ai_extraction",
      confidence: candidate.confidence,
      verificationStatus: "ai_extracted",
    })

    await tx
      .update(reviewCandidates)
      .set({
        status: "approved",
        targetProgramId: programId,
        targetOfferingId: offeringId,
        reviewedAt: new Date(),
        reviewedBy,
        reviewNote: `Approved and published as ${programId} / ${offeringId}`,
      })
      .where(eq(reviewCandidates.id, candidate.id))
  })

  return { ok: true, programId, offeringId, programSlug: slug }
}

/** Rejects a pending candidate, recording `note` as the reviewer's reason. */
export async function rejectReviewCandidate(
  candidateId: string,
  reviewedBy: string,
  note: string,
): Promise<ReviewActionResult> {
  const [candidate] = await db
    .select({ id: reviewCandidates.id, status: reviewCandidates.status })
    .from(reviewCandidates)
    .where(eq(reviewCandidates.id, candidateId))
    .limit(1)
  if (!candidate) {
    return { ok: false, error: "Candidate not found." }
  }
  if (candidate.status !== "pending") {
    return { ok: false, error: `Candidate is already "${candidate.status}", not pending.` }
  }

  await db
    .update(reviewCandidates)
    .set({
      status: "rejected",
      reviewedAt: new Date(),
      reviewedBy,
      reviewNote: note,
    })
    .where(eq(reviewCandidates.id, candidateId))

  return { ok: true }
}

/** All pending candidates, oldest first, for CLI/batch callers. */
export async function pendingReviewCandidateRows(ids?: string[]): Promise<ReviewCandidateRow[]> {
  const rows = await db
    .select()
    .from(reviewCandidates)
    .where(and(eq(reviewCandidates.status, "pending"), isNull(reviewCandidates.reviewedAt)))
  return ids ? rows.filter((r) => ids.includes(r.id)) : rows
}
