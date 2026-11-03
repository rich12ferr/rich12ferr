/**
 * Turns a reviewed community submission into a published listing.
 *
 * Submissions never publish directly (PRD 23). The reviewer confirms or
 * corrects the structured fields in `/admin/submissions`, and this module then
 * routes them through the same `approveReviewCandidate` transaction the crawl
 * review queue uses, so there is still exactly one code path that creates
 * `programs`/`program_offerings` rows.
 */
import { and, eq } from "drizzle-orm"
import {
  db,
  organizations,
  recordSubmissionDecision,
  reviewCandidates,
  sources,
  submissionById,
} from "@openplay/db"

import { organizationMatchKey, resolveSportSlug, significantTokens } from "./entity-resolution"
import { approveReviewCandidate } from "./review-actions"

export type PublishSubmissionInput = {
  title: string
  description: string | null
  organizationName: string
  town: string
  state: string
  zip: string | null
  venueName: string | null
  venueAddress: string | null
  sportSlug: string
  sportName: string
  programFormat: string | null
  campStay: string | null
  campPeriod: string | null
  season: string
  seasonYear: number
  seasonStartDate: string | null
  seasonEndDate: string | null
  registrationOpenDate: string | null
  registrationCloseDate: string | null
  minAge: number | null
  maxAge: number | null
  minGrade: number | null
  maxGrade: number | null
  registrationFee: number | null
  additionalFees: string | null
  registrationUrl: string | null
  sourceUrl: string
  contactEmail: string | null
}

export type PublishSubmissionResult =
  | { ok: true; programSlug?: string }
  | { ok: false; error: string }

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`
}

async function uniqueOrganizationSlug(name: string, town: string): Promise<string> {
  const root = significantTokens(name).join("-") || "organization"
  for (const candidate of [root, `${root}-${significantTokens(town).join("-")}`]) {
    const [taken] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, candidate))
      .limit(1)
    if (!taken) return candidate
  }
  return `${root}-${crypto.randomUUID().slice(0, 6)}`
}

async function findOrCreateOrganization(input: PublishSubmissionInput): Promise<string> {
  const matchKey = organizationMatchKey(input.organizationName, input.town, input.state)
  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.matchKey, matchKey))
    .limit(1)
  if (existing) return existing.id

  const id = newId("org")
  await db.insert(organizations).values({
    id,
    slug: await uniqueOrganizationSlug(input.organizationName, input.town),
    name: input.organizationName,
    organizationType: "other",
    websiteUrl: input.sourceUrl,
    contactEmail: input.contactEmail,
    town: input.town,
    state: input.state,
    zip: input.zip,
    venueName: input.venueName,
    venueAddress: input.venueAddress,
    matchKey,
  })
  return id
}

/**
 * `approveReviewCandidate` resolves the organization through the candidate's
 * source, so the submission needs one. Reuses a source already registered to
 * this organization at the same URL; `sources.url` is unique, so a URL owned
 * by a different organization gets a submission-specific fragment instead.
 * New sources stay inactive: a submitted page hasn't been checked for crawl
 * permission, so enabling recrawls is a separate admin decision.
 */
async function findOrCreateSource(
  organizationId: string,
  submissionId: string,
  input: PublishSubmissionInput,
  submittedBy: string | null,
): Promise<string> {
  const [existing] = await db
    .select({ id: sources.id, organizationId: sources.organizationId })
    .from(sources)
    .where(eq(sources.url, input.sourceUrl))
    .limit(1)
  if (existing?.organizationId === organizationId) return existing.id

  const id = newId("src")
  await db.insert(sources).values({
    id,
    organizationId,
    url: existing ? `${input.sourceUrl}#${submissionId}` : input.sourceUrl,
    sourceType: "community_submission",
    label: `${input.organizationName} (community submission)`,
    permissionNote: `Submitted via /submit${submittedBy ? ` by ${submittedBy}` : ""}; crawl permission not yet reviewed.`,
    active: false,
  })
  return id
}

export async function publishSubmission(
  submissionId: string,
  input: PublishSubmissionInput,
  reviewedBy: string,
): Promise<PublishSubmissionResult> {
  const submission = await submissionById(submissionId)
  if (!submission) return { ok: false, error: "Submission not found." }
  if (submission.status !== "pending") {
    return { ok: false, error: `This submission was already ${submission.status}.` }
  }

  if (resolveSportSlug(input.sportName) !== input.sportSlug) {
    return { ok: false, error: `Activity "${input.sportName}" could not be matched. Pick another activity.` }
  }

  const organizationId = await findOrCreateOrganization(input)
  const sourceId = await findOrCreateSource(organizationId, submissionId, input, submission.submitterEmail)

  const isCamp = input.programFormat === "camp"
  const payload = {
    title: input.title,
    description: input.description,
    organizationName: input.organizationName,
    town: input.town,
    state: input.state,
    zip: input.zip,
    venueName: input.venueName,
    venueAddress: input.venueAddress,
    sportName: input.sportName,
    programFormat: input.programFormat,
    programType: "recreational",
    audienceType: "youth",
    campStay: isCamp ? input.campStay : null,
    campPeriod: isCamp ? input.campPeriod : null,
    season: input.season,
    seasonYear: input.seasonYear,
    seasonStartDate: input.seasonStartDate,
    seasonEndDate: input.seasonEndDate,
    registrationOpenDate: input.registrationOpenDate,
    registrationCloseDate: input.registrationCloseDate,
    minAge: input.minAge,
    maxAge: input.maxAge,
    minGrade: input.minGrade,
    maxGrade: input.maxGrade,
    gender: "any",
    registrationFee: input.registrationFee,
    additionalFees: input.additionalFees,
    registrationUrl: input.registrationUrl,
    contactEmail: input.contactEmail,
    contactUrl: input.sourceUrl,
    submissionId,
  }

  const candidateId = newId("rc")
  await db.insert(reviewCandidates).values({
    id: candidateId,
    kind: "new_program",
    sourceId,
    proposedTitle: input.title,
    proposedOrganizationName: input.organizationName,
    payload,
    reviewReason: "new_program",
    confidence: 1,
    duplicateAssessment: "new",
    status: "pending",
  })

  const result = await approveReviewCandidate(candidateId, reviewedBy)
  if (!result.ok) {
    // Leaving the half-made candidate would surface it in the crawl review queue.
    await db
      .delete(reviewCandidates)
      .where(and(eq(reviewCandidates.id, candidateId), eq(reviewCandidates.status, "pending")))
    return result
  }

  await recordSubmissionDecision(submissionId, {
    status: "approved",
    reviewedBy,
    reviewCandidateId: candidateId,
  })

  return { ok: true, programSlug: result.programSlug }
}

export async function declineSubmission(submissionId: string, reviewedBy: string) {
  const row = await recordSubmissionDecision(submissionId, { status: "rejected", reviewedBy })
  return row ? { ok: true as const } : { ok: false as const, error: "Submission is no longer pending." }
}
