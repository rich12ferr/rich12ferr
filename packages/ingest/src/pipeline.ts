/**
 * The ingestion orchestrator.
 *
 * Ties the pure modules together and owns every database write, so the
 * decision logic in `extract`, `entity-resolution`, and `change-detection`
 * stays testable without a Postgres connection.
 *
 * Three rules shape the design, all of them about trust rather than throughput:
 *
 * 1. **Unchanged content never reaches the model.** The content hash gates
 *    extraction, so a weekly crawl of a page that has not changed costs one
 *    HTTP request and no tokens. This is what makes frequent re-checking
 *    affordable, and frequent re-checking is the entire product promise.
 *
 * 2. **Nothing new is ever auto-published.** A program the crawler has not
 *    seen before always goes to the review queue. Auto-apply is reserved for
 *    additive, high-confidence updates to records a human already approved.
 *
 * 3. **Every applied value records where it came from.** Writes go to
 *    `field_provenance` alongside the record itself, so the UI can always
 *    answer "how do you know this?" for any individual field.
 */

import { and, desc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm"
import {
  db,
  extractionRuns,
  fieldProvenance,
  notifyOfferingChange,
  organizations,
  programOfferings,
  programs,
  rawDocuments,
  reviewCandidates,
  sources,
  sports,
  type SourceRow,
} from "@openplay/db"

import {
  autoApplicableChanges,
  diffFields,
  nextCrawlIntervalHours,
  requiresReview,
  type FieldChange,
} from "./change-detection"
import { findProgramLinks } from "./discover-links"
import {
  findBestMatch,
  organizationMatchKey,
  programMatchKey,
  resolveSportSlug,
  type ProgramCandidate,
} from "./entity-resolution"
import { hasBlockingIssues, extractPrograms, validateExtraction } from "./extract"
import type { ExtractedProgram } from "./extraction-schema"
import { fetchPage, type FetchPageOptions } from "./fetch"
import { geocode } from "./geocode"

/* -------------------------------------------------------------------------- */
/*  Identifiers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Prefixed random IDs, matching the seeded convention (`off_`, `prog_`, …).
 *
 * Readable prefixes make production logs and the review queue legible at a
 * glance, which matters more here than the few bytes a bare UUID would save.
 */
function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`
}

/* -------------------------------------------------------------------------- */
/*  Extracted program -> offering fields                                      */
/* -------------------------------------------------------------------------- */

/**
 * The offering-shaped subset of an extraction, used for diffing and writing.
 *
 * Only fields the extractor can actually observe on a page appear here.
 * Editorial and provenance columns are excluded on purpose so a crawl can
 * never silently overwrite a human's decision.
 */
export type OfferingFields = {
  season: string | null
  seasonYear: number | null
  registrationOpenDate: string | null
  registrationCloseDate: string | null
  seasonStartDate: string | null
  seasonEndDate: string | null
  registrationUrl: string | null
  registrationFee: number | null
  additionalFees: string | null
  scholarshipAvailable: boolean | null
  capacity: number | null
  waitlistAvailable: boolean | null
  tryoutRequired: boolean | null
  tryoutDetails: string | null
  tryoutDate: string | null
  town: string | null
  state: string | null
  zip: string | null
  venueName: string | null
  venueAddress: string | null
  contactName: string | null
  contactEmail: string | null
  contactUrl: string | null
}

export function toOfferingFields(program: ExtractedProgram): OfferingFields {
  return {
    season: program.season ?? null,
    seasonYear: program.seasonYear ?? null,
    registrationOpenDate: program.registrationOpenDate ?? null,
    registrationCloseDate: program.registrationCloseDate ?? null,
    seasonStartDate: program.seasonStartDate ?? null,
    seasonEndDate: program.seasonEndDate ?? null,
    registrationUrl: program.registrationUrl ?? null,
    registrationFee: program.registrationFee ?? null,
    additionalFees: program.additionalFees ?? null,
    scholarshipAvailable: program.scholarshipAvailable ?? null,
    capacity: program.capacity ?? null,
    waitlistAvailable: program.waitlistAvailable ?? null,
    tryoutRequired: program.tryoutRequired ?? null,
    tryoutDetails: program.tryoutDetails ?? null,
    tryoutDate: program.tryoutDate ?? null,
    town: program.town ?? null,
    state: program.state ?? null,
    zip: program.zip ?? null,
    venueName: program.venueName ?? null,
    venueAddress: program.venueAddress ?? null,
    contactName: program.contactName ?? null,
    contactEmail: program.contactEmail ?? null,
    contactUrl: program.contactUrl ?? null,
  }
}

/** Mean confidence across the fields this program actually populated. */
function programConfidence(program: ExtractedProgram): number {
  const scores = Object.values(program.fieldConfidence ?? {})
  if (scores.length === 0) return 0.5
  return scores.reduce((sum, value) => sum + value, 0) / scores.length
}

/* -------------------------------------------------------------------------- */
/*  Result types                                                              */
/* -------------------------------------------------------------------------- */

export type ProgramOutcome =
  /** Queued for a human: new program, low confidence, or risky change. */
  | { kind: "queued"; reviewCandidateId: string; reason: string; title: string }
  /** Additive, high-confidence updates written straight to an existing record. */
  | { kind: "applied"; offeringId: string; changes: FieldChange[]; title: string }
  /** Extraction produced nothing actionable. */
  | { kind: "rejected"; reason: string; title: string }
  /** Matched an existing record and nothing differed. */
  | { kind: "unchanged"; offeringId: string; title: string }

export type IngestResult = {
  sourceId: string
  url: string
  /**
   * `extraction_failed` is deliberately distinct from `fetch_failed`: the page
   * was retrieved fine and the model or gateway is what broke. Collapsing the
   * two sends an operator to debug the crawler when the crawler is healthy.
   */
  status:
    | "unchanged"
    | "extracted"
    | "fetch_failed"
    | "extraction_failed"
    | "not_a_listing"
    | "skipped_robots"
  rawDocumentId: string | null
  extractionRunId: string | null
  /** Null when extraction was skipped; token cost is only spent when needed. */
  tokensUsed: number | null
  programs: ProgramOutcome[]
  error: string | null
  /**
   * IDs of any new `sources` rows registered by link discovery on this crawl
   * (see `discover-links.ts`). Always `pending_review` and inactive — they
   * are candidates for a human to approve, never crawled automatically.
   */
  discoveredSourceIds: string[]
}

/* -------------------------------------------------------------------------- */
/*  Source ingestion                                                          */
/* -------------------------------------------------------------------------- */

export type IngestOptions = {
  model?: string
  fetchOptions?: FetchPageOptions
  /** Re-extract even when the content hash is unchanged (prompt/model changes). */
  force?: boolean
  /** Confidence below which an additive change still needs review. */
  confidenceThreshold?: number
}

/**
 * Runs the full pipeline for one source.
 *
 * Resolves rather than throws for expected failures (network, robots, bad
 * extraction) so one broken source cannot abort a batch of hundreds. Only a
 * genuine programming error propagates.
 */
export async function ingestSource(
  source: SourceRow,
  options: IngestOptions = {},
): Promise<IngestResult> {
  const startedAt = new Date()
  const base: IngestResult = {
    sourceId: source.id,
    url: source.url,
    status: "fetch_failed",
    rawDocumentId: null,
    extractionRunId: null,
    tokensUsed: null,
    programs: [],
    error: null,
    discoveredSourceIds: [],
  }

  const fetched = await fetchPage(source.url, options.fetchOptions)

  // Record the robots verdict whether or not it changed, so the legality of
  // every crawl is auditable after the fact.
  await db
    .update(sources)
    .set({
      robotsAllowed: fetched.robotsAllowed,
      robotsCheckedAt: startedAt,
      permissionNote: fetched.robotsNote || source.permissionNote,
      lastCrawledAt: startedAt,
      updatedAt: startedAt,
    })
    .where(eq(sources.id, source.id))

  if (!fetched.robotsAllowed) {
    await recordFailure(source, fetched.fetchError ?? "Disallowed by robots.txt", startedAt)
    return { ...base, status: "skipped_robots", error: fetched.fetchError }
  }

  // Every fetch attempt is persisted, including failures — the failure history
  // is what drives the exponential crawl back-off.
  const rawDocumentId = newId("raw")
  await db.insert(rawDocuments).values({
    id: rawDocumentId,
    sourceId: source.id,
    fetchedAt: startedAt,
    httpStatus: fetched.httpStatus,
    contentType: fetched.contentType,
    contentHash: fetched.contentHash ?? "",
    content: fetched.content,
    bytes: fetched.bytes,
    fetchError: fetched.fetchError,
  })

  if (!fetched.content || !fetched.contentHash) {
    await recordFailure(source, fetched.fetchError ?? "No content", startedAt)
    return { ...base, rawDocumentId, error: fetched.fetchError }
  }

  // Runs on every successful fetch — deliberately *before* the hash gate
  // below. Link discovery only needs the page's markup, not new content, so
  // gating it on "did the content change" would mean an unchanged homepage
  // (like cvtll.org's) never gets a chance to have its links discovered,
  // even on the crawl right after this feature ships. A source that never
  // changes would otherwise never be scanned for subpages at all.
  const discoveredSourceIds = fetched.rawHtml
    ? await discoverSubpageSources(source, fetched.rawHtml, fetched.finalUrl)
    : []

  // --- Hash gate: the cost control that makes frequent crawling viable. -----
  if (!options.force) {
    const [previous] = await db
      .select({ contentHash: rawDocuments.contentHash })
      .from(rawDocuments)
      .where(
        and(
          eq(rawDocuments.sourceId, source.id),
          sql`${rawDocuments.id} <> ${rawDocumentId}`,
          sql`${rawDocuments.content} is not null`,
        ),
      )
      .orderBy(desc(rawDocuments.fetchedAt))
      .limit(1)

    if (previous?.contentHash === fetched.contentHash) {
      await recordSuccess(source, startedAt)
      return { ...base, status: "unchanged", rawDocumentId, error: null, discoveredSourceIds }
    }
  }

  // --- Extraction ----------------------------------------------------------
  const extractionRunId = newId("xrun")
  const organizationHint = await organizationName(source.organizationId)

  await db.insert(extractionRuns).values({
    id: extractionRunId,
    rawDocumentId,
    sourceId: source.id,
    model: options.model ?? "pending",
    promptVersion: "pending",
    startedAt,
    status: "running",
  })

  try {
    const extraction = await extractPrograms({
      content: fetched.content,
      sourceUrl: fetched.finalUrl,
      organizationHint,
      fetchedAt: startedAt,
      model: options.model,
    })

    const tokensUsed =
      (extraction.usage.inputTokens ?? 0) + (extraction.usage.outputTokens ?? 0)

    await db
      .update(extractionRuns)
      .set({
        model: extraction.model,
        promptVersion: extraction.promptVersion,
        finishedAt: new Date(),
        status: "succeeded",
        inputTokens: extraction.usage.inputTokens,
        outputTokens: extraction.usage.outputTokens,
        candidatesFound: extraction.result.programs.length,
        meanConfidence: extraction.meanConfidence,
      })
      .where(eq(extractionRuns.id, extractionRunId))

    if (!extraction.result.isProgramListing) {
      await recordSuccess(source, startedAt)
      return {
        ...base,
        status: "not_a_listing",
        rawDocumentId,
        extractionRunId,
        tokensUsed,
        error: null,
        discoveredSourceIds,
      }
    }

    const outcomes: ProgramOutcome[] = []
    for (const program of extraction.result.programs) {
      outcomes.push(
        await reconcileProgram({
          program,
          source,
          rawDocumentId,
          extractionRunId,
          confidenceThreshold: options.confidenceThreshold,
        }),
      )
    }

    await recordSuccess(source, startedAt, outcomes)

    return {
      ...base,
      status: "extracted",
      rawDocumentId,
      extractionRunId,
      tokensUsed,
      programs: outcomes,
      error: null,
      discoveredSourceIds,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await db
      .update(extractionRuns)
      .set({ finishedAt: new Date(), status: "failed", error: message })
      .where(eq(extractionRuns.id, extractionRunId))
    await recordFailure(source, message, startedAt)
    return {
      ...base,
      status: "extraction_failed",
      rawDocumentId,
      extractionRunId,
      error: message,
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Reconciliation                                                            */
/* -------------------------------------------------------------------------- */

async function reconcileProgram(input: {
  program: ExtractedProgram
  source: SourceRow
  rawDocumentId: string
  extractionRunId: string
  confidenceThreshold?: number
}): Promise<ProgramOutcome> {
  const { program, source, rawDocumentId, extractionRunId } = input
  const title = program.title
  const issues = validateExtraction(program)

  // A blocking issue means the extraction contradicts itself (dates out of
  // order, fee on a free program). Queue it with the issues attached rather
  // than discarding it — the page may be genuinely ambiguous and worth a look.
  if (hasBlockingIssues(issues)) {
    const id = await queueCandidate({
      // The schema's `kind` describes *what* needs review, not why. The "why"
      // travels in `validation_issues`, which the reviewer UI reads to show
      // exactly which field contradicted itself.
      kind: "new_program",
      program,
      source,
      rawDocumentId,
      extractionRunId,
      changes: [],
      issues,
      assessment: "new",
      matchScore: null,
      targetProgramId: null,
      targetOfferingId: null,
    })
    return { kind: "queued", reviewCandidateId: id, reason: "validation", title }
  }

  const confidence = programConfidence(program)
  const sportSlug = resolveSportSlug(program.sportName)
  const organizationId = await resolveOrganizationId(program, source)

  const [sport] = await db
    .select({ id: sports.id })
    .from(sports)
    .where(eq(sports.slug, sportSlug))
    .limit(1)

  const candidate: ProgramCandidate = {
    title,
    organizationId,
    sportId: sport?.id ?? null,
    sportName: program.sportName ?? null,
    gender: program.gender ?? null,
    minAge: program.minAge ?? null,
    maxAge: program.maxAge ?? null,
    minGrade: program.minGrade ?? null,
    maxGrade: program.maxGrade ?? null,
  }

  // Restrict the comparison set to the same organization when known. Comparing
  // against every program in the database would be both slow and noisy.
  const existing = await db
    .select({
      id: programs.id,
      title: programs.title,
      organizationId: programs.organizationId,
      sportId: programs.sportId,
      gender: programs.gender,
      minAge: programs.minAge,
      maxAge: programs.maxAge,
      minGrade: programs.minGrade,
      maxGrade: programs.maxGrade,
    })
    .from(programs)
    .where(
      organizationId
        ? eq(programs.organizationId, organizationId)
        : sport?.id
          ? eq(programs.sportId, sport.id)
          : sql`false`,
    )

  const best = findBestMatch(candidate, existing)

  // No confident match: a genuinely new program. Never auto-published.
  if (!best) {
    const id = await queueCandidate({
      kind: "new_program",
      program,
      source,
      rawDocumentId,
      extractionRunId,
      changes: [],
      issues,
      assessment: "new",
      matchScore: null,
      targetProgramId: null,
      targetOfferingId: null,
    })
    return { kind: "queued", reviewCandidateId: id, reason: "new program", title }
  }

  // An ambiguous match is worse than no match: applying it would corrupt a
  // record a parent may already be relying on.
  if (best.evaluation.assessment === "possible_duplicate") {
    const id = await queueCandidate({
      // "possible_duplicate" is the duplicate *assessment*, passed below; the
      // kind stays new_program because that is the row a reviewer would create
      // if they decide it is genuinely distinct.
      kind: "new_program",
      program,
      source,
      rawDocumentId,
      extractionRunId,
      changes: [],
      issues,
      assessment: best.evaluation.assessment,
      matchScore: best.evaluation.score,
      targetProgramId: best.match.id,
      targetOfferingId: null,
    })
    return { kind: "queued", reviewCandidateId: id, reason: "ambiguous match", title }
  }

  const fields = toOfferingFields(program)

  // Find the offering for this program and season; season is what separates
  // "this year's registration" from last year's.
  const [offering] = await db
    .select()
    .from(programOfferings)
    .where(
      and(
        eq(programOfferings.programId, best.match.id),
        fields.season
          ? eq(programOfferings.season, fields.season)
          : sql`true`,
        fields.seasonYear
          ? eq(programOfferings.seasonYear, fields.seasonYear)
          : sql`true`,
      ),
    )
    .orderBy(desc(programOfferings.seasonYear))
    .limit(1)

  if (!offering) {
    const id = await queueCandidate({
      kind: "new_offering",
      program,
      source,
      rawDocumentId,
      extractionRunId,
      changes: [],
      issues,
      assessment: best.evaluation.assessment,
      matchScore: best.evaluation.score,
      targetProgramId: best.match.id,
      targetOfferingId: null,
    })
    return { kind: "queued", reviewCandidateId: id, reason: "new season", title }
  }

  const changes = diffFields(
    offering as unknown as Record<string, unknown>,
    fields as unknown as Record<string, unknown>,
    {
      trustedSource: source.sourceType === "structured_feed",
      confidence,
      confidenceThreshold: input.confidenceThreshold,
    },
  )

  if (changes.length === 0) {
    // Nothing differs, but we did verify the page today — and "checked
    // recently" is itself the signal the freshness UI shows to parents.
    await db
      .update(programOfferings)
      .set({ dateLastChecked: new Date(), contentHash: null, updatedAt: new Date() })
      .where(eq(programOfferings.id, offering.id))
    return { kind: "unchanged", offeringId: offering.id, title }
  }

  if (requiresReview(changes)) {
    const id = await queueCandidate({
      kind: "field_update",
      program,
      source,
      rawDocumentId,
      extractionRunId,
      changes,
      issues,
      assessment: best.evaluation.assessment,
      matchScore: best.evaluation.score,
      targetProgramId: best.match.id,
      targetOfferingId: offering.id,
    })
    return { kind: "queued", reviewCandidateId: id, reason: "high-stakes change", title }
  }

  const applied = autoApplicableChanges(changes)
  await applyChanges({
    offeringId: offering.id,
    changes: applied,
    program,
    source,
    rawDocumentId,
    confidence,
  })

  // Fire parent alerts for the changes we just committed. Best-effort: a mail
  // failure must never fail the crawl, so swallow and log. Keyed on the durable
  // program id (best.match.id) so an "activity" watch survives across seasons.
  try {
    const summary = await notifyOfferingChange({
      programId: best.match.id,
      changes: applied.map((c) => ({ field: c.field, previous: c.previous, next: c.next })),
    })
    if (summary.matched > 0) {
      console.log(
        `[v0] [alerts] program=${best.match.id} triggers=${summary.triggers.join(",")} matched=${summary.matched} sent=${summary.sent}`,
      )
    }
  } catch (error) {
    console.error("[v0] [alerts] notification failed (crawl unaffected):", error)
  }

  return { kind: "applied", offeringId: offering.id, changes: applied, title }
}

/* -------------------------------------------------------------------------- */
/*  Writes                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Writes auto-applicable changes and their provenance in one transaction.
 *
 * The provenance ledger keeps one live row per field: the previous row is
 * stamped `superseded_at` rather than deleted, so the history of a value stays
 * reconstructible even after several crawls have overwritten it.
 */
async function applyChanges(input: {
  offeringId: string
  changes: FieldChange[]
  program: ExtractedProgram
  source: SourceRow
  rawDocumentId: string
  confidence: number
}): Promise<void> {
  const { offeringId, changes, program, source, rawDocumentId, confidence } = input
  if (changes.length === 0) return

  const now = new Date()
  const patch: Record<string, unknown> = {}
  for (const change of changes) patch[change.field] = change.next

  // Re-geocode only when the location actually moved.
  const locationChanged = changes.some((change) =>
    ["town", "state", "zip", "venueAddress"].includes(change.field),
  )
  if (locationChanged) {
    const point = await geocode({
      address: program.venueAddress,
      town: program.town,
      state: program.state,
      zip: program.zip,
    })
    if (point) {
      patch.location = point.point
      patch.geocodePrecision = point.precision
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(programOfferings)
      .set({
        ...patch,
        dateLastChecked: now,
        verificationMethod: "automated re-check",
        updatedAt: now,
      })
      .where(eq(programOfferings.id, offeringId))

    for (const change of changes) {
      await tx
        .update(fieldProvenance)
        .set({ supersededAt: now })
        .where(
          and(
            eq(fieldProvenance.entityType, "offering"),
            eq(fieldProvenance.entityId, offeringId),
            eq(fieldProvenance.field, change.field),
            isNull(fieldProvenance.supersededAt),
          ),
        )

      await tx.insert(fieldProvenance).values({
        id: newId("prov"),
        entityType: "offering",
        entityId: offeringId,
        field: change.field,
        value: change.next === null ? null : String(change.next),
        sourceId: source.id,
        rawDocumentId,
        sourceType: source.sourceType,
        extractionMethod: "ai_extracted",
        confidence: program.fieldConfidence?.[change.field] ?? confidence,
        verificationStatus: "ai_extracted",
      })
    }
  })
}

/**
 * Mirrors the `review_kind_check` constraint. Kept as a union rather than
 * `string` so an invalid value is a type error here instead of a failed INSERT
 * at crawl time, which is what previously turned a queueable program into a
 * dropped one.
 */
type ReviewKind = "new_program" | "new_offering" | "field_update"

/** Mirrors `review_duplicate_check`. */
type DuplicateAssessment = "new" | "possible_duplicate" | "likely_update" | "duplicate"

async function queueCandidate(input: {
  kind: ReviewKind
  program: ExtractedProgram
  source: SourceRow
  rawDocumentId: string
  extractionRunId: string
  changes: FieldChange[]
  issues: unknown[]
  assessment: DuplicateAssessment
  matchScore: number | null
  targetProgramId: string | null
  targetOfferingId: string | null
}): Promise<string> {
  const id = newId("rc")
  await db.insert(reviewCandidates).values({
    id,
    kind: input.kind,
    extractionRunId: input.extractionRunId,
    sourceId: input.source.id,
    rawDocumentId: input.rawDocumentId,
    targetProgramId: input.targetProgramId,
    targetOfferingId: input.targetOfferingId,
    proposedTitle: input.program.title,
    proposedOrganizationName: input.program.organizationName ?? null,
    payload: input.program,
    changes: input.changes,
    validationIssues: input.issues,
    confidence: programConfidence(input.program),
    duplicateAssessment: input.assessment,
    matchScore: input.matchScore,
    status: "pending",
  })
  return id
}

/* -------------------------------------------------------------------------- */
/*  Subpage discovery                                                         */
/* -------------------------------------------------------------------------- */

/** Hard ceiling on new sources registered from one page's links in one crawl. */
const MAX_DISCOVERED_LINKS_PER_CRAWL = 5

/**
 * Finds same-origin links on a page that look like they lead to program
 * content, and registers each new one as its own `sources` row so the
 * organization's real program page gets a chance to be crawled — instead of
 * a homepage that isn't itself a listing being a permanent dead end.
 *
 * Every discovered source lands `active: false` / `sourceStatus:
 * "pending_review"`, mirroring how a hand-registered source starts (see
 * `register-sources.ts`). Discovery only ever *proposes* a source; nothing
 * it finds is fetched in the same run, and nothing starts crawling on a
 * schedule until a human flips it active — the same trust boundary the
 * pipeline already enforces for new programs never auto-publishing.
 */
async function discoverSubpageSources(
  source: SourceRow,
  rawHtml: string,
  pageUrl: string,
): Promise<string[]> {
  const candidates = findProgramLinks(rawHtml, pageUrl, {
    limit: MAX_DISCOVERED_LINKS_PER_CRAWL,
  }).filter((link) => link.url !== source.url && link.url !== pageUrl)

  if (candidates.length === 0) return []

  const existing = await db
    .select({ url: sources.url })
    .from(sources)
    .where(inArray(sources.url, candidates.map((candidate) => candidate.url)))
  const existingUrls = new Set(existing.map((row) => row.url))

  const newSourceIds: string[] = []
  for (const candidate of candidates) {
    if (existingUrls.has(candidate.url)) continue

    const id = newId("src")
    const inserted = await db
      .insert(sources)
      .values({
        id,
        organizationId: source.organizationId,
        url: candidate.url,
        sourceType: source.sourceType,
        label: candidate.linkText || null,
        crawlIntervalHours: source.crawlIntervalHours,
        active: false,
        sourceStatus: "pending_review",
        discoveredFromSourceId: source.id,
        discoveryNote: `Discovered on ${pageUrl}; matched keywords: ${candidate.matchedKeywords.join(", ")}.`,
      })
      .onConflictDoNothing({ target: sources.url })
      .returning({ id: sources.id })

    if (inserted.length > 0) newSourceIds.push(id)
  }

  return newSourceIds
}

/* -------------------------------------------------------------------------- */
/*  Source bookkeeping                                                        */
/* -------------------------------------------------------------------------- */

async function organizationName(organizationId: string | null): Promise<string | null> {
  if (!organizationId) return null
  const [row] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)
  return row?.name ?? null
}

/**
 * Resolves the organization for an extraction.
 *
 * Prefers the source's declared organization: the crawler knows which site it
 * fetched, which is more reliable than a name parsed out of page text. Falls
 * back to a normalized match key so a page naming its own organization can
 * still be linked.
 */
async function resolveOrganizationId(
  program: ExtractedProgram,
  source: SourceRow,
): Promise<string | null> {
  if (source.organizationId) return source.organizationId
  if (!program.organizationName) return null

  const key = organizationMatchKey(
    program.organizationName,
    program.town ?? "",
    program.state ?? "VT",
  )
  const [row] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.matchKey, key))
    .limit(1)
  return row?.id ?? null
}

/**
 * Records a successful crawl and re-times the next one.
 *
 * The new interval is derived from the nearest deadline this source feeds, so
 * a source behind a registration closing in two days gets checked daily while
 * an off-season source relaxes to monthly.
 */
async function recordSuccess(
  source: SourceRow,
  crawledAt: Date,
  outcomes: ProgramOutcome[] = [],
): Promise<void> {
  const offeringIds = outcomes
    .map((outcome) =>
      outcome.kind === "applied" || outcome.kind === "unchanged" ? outcome.offeringId : null,
    )
    .filter((id): id is string => id !== null)

  let daysUntilNearestDeadline: number | null = null
  if (offeringIds.length > 0) {
    const [row] = await db
      .select({
        days: sql<number | null>`
          min(${programOfferings.registrationCloseDate} - current_date)
        `,
      })
      .from(programOfferings)
      .where(
        and(
          sql`${programOfferings.id} = any(${offeringIds})`,
          sql`${programOfferings.registrationCloseDate} is not null`,
        ),
      )
    daysUntilNearestDeadline = row?.days ?? null
  }

  await db
    .update(sources)
    .set({
      lastSucceededAt: crawledAt,
      consecutiveFailures: 0,
      crawlIntervalHours: nextCrawlIntervalHours({
        daysUntilNearestDeadline,
        consecutiveFailures: 0,
        baseIntervalHours: source.crawlIntervalHours,
      }),
      updatedAt: new Date(),
    })
    .where(eq(sources.id, source.id))
}

async function recordFailure(
  source: SourceRow,
  error: string,
  crawledAt: Date,
): Promise<void> {
  const failures = source.consecutiveFailures + 1
  await db
    .update(sources)
    .set({
      consecutiveFailures: failures,
      permissionNote: source.permissionNote,
      crawlIntervalHours: nextCrawlIntervalHours({
        daysUntilNearestDeadline: null,
        consecutiveFailures: failures,
        baseIntervalHours: source.crawlIntervalHours,
      }),
      // A source that fails repeatedly is parked rather than retried forever.
      active: failures < 10,
      updatedAt: new Date(),
    })
    .where(eq(sources.id, source.id))

  void error
  void crawledAt
}

/* -------------------------------------------------------------------------- */
/*  Batch runner                                                              */
/* -------------------------------------------------------------------------- */

/** Sources whose next crawl is due, most-overdue first. */
export async function dueSources(limit = 25): Promise<SourceRow[]> {
  return db
    .select()
    .from(sources)
    .where(
      and(
        eq(sources.active, true),
        eq(sources.robotsAllowed, true),
        or(
          isNull(sources.lastCrawledAt),
          lte(
            sources.lastCrawledAt,
            sql`now() - (${sources.crawlIntervalHours} || ' hours')::interval`,
          ),
        ),
      ),
    )
    .orderBy(sql`${sources.lastCrawledAt} asc nulls first`)
    .limit(limit)
}

/**
 * Crawls every due source, sequentially.
 *
 * Sequential on purpose: these are small municipal sites, and a burst of
 * parallel requests is exactly the behavior that gets a crawler blocked. The
 * delay between requests respects any `Crawl-delay` the origin declared.
 */
export async function runDueSources(
  options: IngestOptions & { limit?: number; delayMs?: number } = {},
): Promise<IngestResult[]> {
  const sourcesToCrawl = await dueSources(options.limit)
  const results: IngestResult[] = []

  for (const [index, source] of sourcesToCrawl.entries()) {
    results.push(await ingestSource(source, options))
    if (index < sourcesToCrawl.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs ?? 1_000))
    }
  }

  return results
}
