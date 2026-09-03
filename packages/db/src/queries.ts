/**
 * Read path for OpenPlay.
 *
 * Search runs in SQL, not in JavaScript. The prototype filtered an in-memory
 * array, which is fine for 28 rows and impossible at directory scale. The
 * shape here is deliberate:
 *
 *   - Hard constraints (sport, season, published, radius) are SQL WHERE
 *     clauses, so Postgres uses the indexes and we never load rows we will
 *     discard.
 *   - Ranking is applied in TypeScript by @openplay/core, because eligibility
 *     and freshness scoring are product policy that must stay testable and
 *     identical everywhere. Encoding that in SQL would bury the rules in a
 *     query string.
 *
 * Distance uses PostGIS `ST_DWithin` on a geography column, so radius filtering
 * is real great-circle math against a GiST index rather than a bounding box.
 */

import {
  and,
  arrayOverlaps,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm"
import type { LatLng, Season } from "@openplay/core"
import { db } from "./client"
import {
  alerts,
  fieldProvenance,
  organizations,
  programOfferings,
  programs,
  reports,
  reviewCandidates,
  sports,
  submissions,
} from "./schema"

/* -------------------------------------------------------------------------- */
/*  Row shape returned to the app                                             */
/* -------------------------------------------------------------------------- */

/**
 * A single offering joined to its program, organization, and sport.
 *
 * Flattened on purpose: the UI renders a card per offering and would otherwise
 * navigate three levels of nesting for every field.
 */
export type OfferingListing = {
  // Offering
  offeringId: string
  season: Season
  seasonYear: number
  registrationOpenDate: string | null
  registrationCloseDate: string | null
  seasonStartDate: string | null
  seasonEndDate: string | null
  registrationUrl: string | null
  registrationFee: number | null
  currency: string
  additionalFees: string | null
  scholarshipAvailable: boolean | null
  capacity: number | null
  waitlistAvailable: boolean | null
  statusOverride: string | null
  tryoutRequired: boolean
  tryoutDetails: string | null
  tryoutDate: string | null
  registrationProvider: string | null
  contactName: string | null
  contactEmail: string | null
  contactUrl: string | null
  createdAt: Date
  updatedAt: Date
  sourceUrl: string | null
  sourceType: string | null
  dateDiscovered: Date | null
  verificationMethod: string | null
  dateLastChecked: Date | null
  offeringVerificationStatus: string
  published: boolean

  // Program
  programId: string
  programSlug: string
  title: string
  description: string | null
  programType: string
  gender: string
  minAge: number | null
  maxAge: number | null
  minGrade: number | null
  maxGrade: number | null
  residencyRequirement: string | null
  experienceLevel: string | null
  beginnerFriendly: boolean
  equipmentRequirements: string | null
  practiceSchedule: string | null
  gameSchedule: string | null
  programVerificationStatus: string

  // Location (offering overrides organization)
  town: string
  state: string
  zip: string | null
  venueName: string | null
  venueAddress: string | null
  lat: number | null
  lng: number | null
  geocodePrecision: string
  /** Miles from the search origin. Null when either side lacks coordinates. */
  distanceMiles: number | null

  // Organization
  organizationId: string
  organizationSlug: string
  organizationName: string
  organizationType: string
  organizationWebsite: string | null
  organizationClaimed: boolean
  organizationVerified: boolean

  // Sport
  sportId: string
  sportSlug: string
  sportName: string
  sportMonogram: string
  sportIconKey: string
  sportTone: string
  sportPrimarySeasons: Season[] | null
  sportBlurb: string | null
}

/**
 * Column selection shared by every listing query.
 *
 * `COALESCE` implements the offering-overrides-organization rule for location:
 * a specific offering can meet somewhere other than the org's home venue, and
 * when it does not, it inherits.
 */
const listingColumns = {
  offeringId: programOfferings.id,
  season: programOfferings.season,
  seasonYear: programOfferings.seasonYear,
  registrationOpenDate: programOfferings.registrationOpenDate,
  registrationCloseDate: programOfferings.registrationCloseDate,
  seasonStartDate: programOfferings.seasonStartDate,
  seasonEndDate: programOfferings.seasonEndDate,
  registrationUrl: programOfferings.registrationUrl,
  registrationFee: programOfferings.registrationFee,
  currency: programOfferings.currency,
  additionalFees: programOfferings.additionalFees,
  scholarshipAvailable: programOfferings.scholarshipAvailable,
  capacity: programOfferings.capacity,
  waitlistAvailable: programOfferings.waitlistAvailable,
  statusOverride: programOfferings.statusOverride,
  tryoutRequired: programOfferings.tryoutRequired,
  tryoutDetails: programOfferings.tryoutDetails,
  tryoutDate: programOfferings.tryoutDate,
  registrationProvider: programOfferings.registrationProvider,
  contactName: programOfferings.contactName,
  contactEmail: programOfferings.contactEmail,
  contactUrl: programOfferings.contactUrl,
  createdAt: programOfferings.createdAt,
  updatedAt: programOfferings.updatedAt,
  sourceUrl: programOfferings.sourceUrl,
  sourceType: programOfferings.sourceType,
  dateDiscovered: programOfferings.dateDiscovered,
  verificationMethod: programOfferings.verificationMethod,
  dateLastChecked: programOfferings.dateLastChecked,
  offeringVerificationStatus: programOfferings.verificationStatus,
  published: programOfferings.published,

  programId: programs.id,
  programSlug: programs.slug,
  title: programs.title,
  description: programs.description,
  programType: programs.programType,
  gender: programs.gender,
  minAge: programs.minAge,
  maxAge: programs.maxAge,
  minGrade: programs.minGrade,
  maxGrade: programs.maxGrade,
  residencyRequirement: programs.residencyRequirement,
  experienceLevel: programs.experienceLevel,
  beginnerFriendly: programs.beginnerFriendly,
  equipmentRequirements: programs.equipmentRequirements,
  practiceSchedule: programs.practiceSchedule,
  gameSchedule: programs.gameSchedule,
  programVerificationStatus: programs.verificationStatus,

  town: sql<string>`coalesce(${programOfferings.town}, ${organizations.town})`.as("town"),
  state: sql<string>`coalesce(${programOfferings.state}, ${organizations.state})`.as("state"),
  zip: sql<string | null>`coalesce(${programOfferings.zip}, ${organizations.zip})`.as("zip"),
  venueName: sql<string | null>`coalesce(${programOfferings.venueName}, ${organizations.venueName})`.as("venue_name"),
  venueAddress: sql<string | null>`coalesce(${programOfferings.venueAddress}, ${organizations.venueAddress})`.as("venue_address"),
  lat: sql<number | null>`st_y(coalesce(${programOfferings.location}, ${organizations.location})::geometry)`.as("lat"),
  lng: sql<number | null>`st_x(coalesce(${programOfferings.location}, ${organizations.location})::geometry)`.as("lng"),
  geocodePrecision: sql<string>`
    case
      when ${programOfferings.location} is not null then ${programOfferings.geocodePrecision}
      else ${organizations.geocodePrecision}
    end
  `.as("geocode_precision"),

  organizationId: organizations.id,
  organizationSlug: organizations.slug,
  organizationName: organizations.name,
  organizationType: organizations.organizationType,
  organizationWebsite: organizations.websiteUrl,
  organizationClaimed: organizations.claimed,
  organizationVerified: organizations.verified,

  sportId: sports.id,
  sportSlug: sports.slug,
  sportName: sports.name,
  sportMonogram: sports.monogram,
  sportIconKey: sports.iconKey,
  sportTone: sports.tone,
  sportPrimarySeasons: sports.primarySeasons,
  sportBlurb: sports.blurb,
}

/** Distance in miles from an origin to the effective location. */
function distanceExpression(origin: LatLng) {
  return sql<number | null>`
    st_distance(
      coalesce(${programOfferings.location}, ${organizations.location}),
      st_setsrid(st_makepoint(${origin.lng}, ${origin.lat}), 4326)::geography
    ) / 1609.344
  `
}

const baseJoin = () =>
  db
    .select(listingColumns)
    .from(programOfferings)
    .innerJoin(programs, eq(programOfferings.programId, programs.id))
    .innerJoin(organizations, eq(programs.organizationId, organizations.id))
    .innerJoin(sports, eq(programs.sportId, sports.id))

/* -------------------------------------------------------------------------- */
/*  Search                                                                    */
/* -------------------------------------------------------------------------- */

export type OfferingSearchInput = {
  /**
   * Free-text keyword, matched with ILIKE against program title/description,
   * organization name, and sport name. Not full-text search — no tsvector
   * column exists yet — so it is a plain substring match. Fine at directory
   * scale today; revisit with a GIN-indexed tsvector if this becomes a
   * bottleneck or ranking-by-relevance is needed.
   */
  query?: string | null
  sportSlugs?: string[]
  season?: Season | null
  seasonYear?: number | null
  towns?: string[]
  gender?: string | null
  programTypes?: string[]
  /** Radius filter. Ignored unless `origin` is set. */
  origin?: LatLng | null
  radiusMiles?: number | null
  tryoutRequired?: boolean | null
  freeOnly?: boolean
  maxFee?: number | null
  /** Include unpublished rows. Admin surfaces only. */
  includeUnpublished?: boolean
  limit?: number
  offset?: number
}

/**
 * Hard-constraint search.
 *
 * Eligibility is intentionally NOT filtered here. A child one year outside a
 * stated range is usually still welcome, and silently hiding those programs is
 * worse than showing them with a caveat — so age/grade are scored by
 * @openplay/core after the fetch, not excluded in SQL.
 */
export async function searchOfferings(
  input: OfferingSearchInput = {},
): Promise<OfferingListing[]> {
  const conditions: SQL[] = []

  if (!input.includeUnpublished) {
    conditions.push(eq(programOfferings.published, true))
    conditions.push(eq(programs.active, true))
  }

  const keyword = input.query?.trim()
  if (keyword) {
    // Escape %, _, and \ so a title containing them can't widen the match
    // (ILIKE treats those as wildcards, not literal characters).
    const escaped = keyword.replace(/[\\%_]/g, "\\$&")
    const pattern = `%${escaped}%`
    const keywordCondition = or(
      sql`${programs.title} ilike ${pattern}`,
      sql`${programs.description} ilike ${pattern}`,
      sql`${organizations.name} ilike ${pattern}`,
      sql`${sports.name} ilike ${pattern}`,
    )
    if (keywordCondition) conditions.push(keywordCondition)
  }

  if (input.sportSlugs?.length) {
    conditions.push(inArray(sports.slug, input.sportSlugs))
  }

  if (input.season) {
    conditions.push(eq(programOfferings.season, input.season))
  }

  if (input.seasonYear) {
    conditions.push(eq(programOfferings.seasonYear, input.seasonYear))
  }

  if (input.towns?.length) {
    conditions.push(
      sql`coalesce(${programOfferings.town}, ${organizations.town}) = any(${input.towns})`,
    )
  }

  // "coed" and "any" programs are open to everyone, so a gender filter must
  // include them rather than matching only the exact value.
  if (input.gender && input.gender !== "any") {
    const genderCondition = or(
      eq(programs.gender, input.gender),
      inArray(programs.gender, ["coed", "any"]),
    )
    if (genderCondition) conditions.push(genderCondition)
  }

  if (input.programTypes?.length) {
    conditions.push(inArray(programs.programType, input.programTypes))
  }

  if (input.tryoutRequired !== null && input.tryoutRequired !== undefined) {
    conditions.push(eq(programOfferings.tryoutRequired, input.tryoutRequired))
  }

  if (input.freeOnly) {
    conditions.push(eq(programOfferings.registrationFee, 0))
  } else if (input.maxFee !== null && input.maxFee !== undefined) {
    // Unknown fees are kept: excluding them would hide programs for having
    // incomplete data, which penalizes the org rather than informing the parent.
    const feeCondition = or(
      lte(programOfferings.registrationFee, input.maxFee),
      sql`${programOfferings.registrationFee} is null`,
    )
    if (feeCondition) conditions.push(feeCondition)
  }

  // Radius: ST_DWithin is index-backed, unlike filtering on ST_Distance.
  if (input.origin && input.radiusMiles) {
    conditions.push(
      sql`st_dwithin(
        coalesce(${programOfferings.location}, ${organizations.location}),
        st_setsrid(st_makepoint(${input.origin.lng}, ${input.origin.lat}), 4326)::geography,
        ${input.radiusMiles * 1609.344}
      )`,
    )
  }

  const origin = input.origin
  const query = origin
    ? db
        .select({ ...listingColumns, distanceMiles: distanceExpression(origin).as("distance_miles") })
        .from(programOfferings)
        .innerJoin(programs, eq(programOfferings.programId, programs.id))
        .innerJoin(organizations, eq(programs.organizationId, organizations.id))
        .innerJoin(sports, eq(programs.sportId, sports.id))
    : baseJoin()

  const rows = await query
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(programOfferings.registrationCloseDate))
    .limit(input.limit ?? 200)
    .offset(input.offset ?? 0)

  return rows.map(normalizeListing)
}

/** Coerce driver output into the declared listing shape. */
function normalizeListing(row: Record<string, unknown>): OfferingListing {
  const distance = row.distanceMiles
  return {
    ...(row as unknown as OfferingListing),
    lat: row.lat === null ? null : Number(row.lat),
    lng: row.lng === null ? null : Number(row.lng),
    distanceMiles:
      distance === null || distance === undefined ? null : Number(distance),
  }
}

/* -------------------------------------------------------------------------- */
/*  Single-record reads                                                       */
/* -------------------------------------------------------------------------- */

export async function offeringById(id: string): Promise<OfferingListing | null> {
  const rows = await baseJoin().where(eq(programOfferings.id, id)).limit(1)
  return rows[0] ? normalizeListing(rows[0]) : null
}

/**
 * All offerings for a program slug, newest season first.
 *
 * This is the program detail page: one durable program, its season history, and
 * whichever offering is currently actionable.
 */
export async function offeringsByProgramSlug(slug: string): Promise<OfferingListing[]> {
  const rows = await baseJoin()
  .where(eq(programs.slug, slug))
  .orderBy(sql`${programOfferings.seasonYear} desc`)
  return rows.map(normalizeListing)
  }

  /**
  * Every program slug with at least one published offering.
  *
  * Feeds `generateStaticParams` on the activity detail page, so the build
  * pre-renders real, live programs instead of a fixed prototype slug list.
  */
  export async function programSlugsForStaticParams(): Promise<string[]> {
  const rows = await db
  .selectDistinct({ slug: programs.slug })
  .from(programOfferings)
  .innerJoin(programs, eq(programOfferings.programId, programs.id))
  .where(eq(programOfferings.published, true))
  return rows.map((r) => r.slug)
  }

export async function offeringsByOrganizationSlug(slug: string) {
  const rows = await baseJoin().where(
    and(
      or(eq(organizations.slug, slug), eq(organizations.id, slug)),
      eq(programOfferings.published, true),
    ),
  )
  return rows.map(normalizeListing)
}

export async function offeringsBySportSlug(slug: string) {
  const rows = await baseJoin().where(
    and(or(eq(sports.slug, slug), eq(sports.id, slug)), eq(programOfferings.published, true)),
  )
  return rows.map(normalizeListing)
}

export async function listSports() {
  return db.select().from(sports).orderBy(asc(sports.name))
}

export async function listOrganizations() {
  return db.select().from(organizations).orderBy(asc(organizations.name))
}

export async function organizationBySlug(slug: string) {
  const rows = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1)
  return rows[0] ?? null
}

/**
 * Resolve an organization by either its id or its slug.
 *
 * Both are unique, so a single query with an OR avoids a second round trip and
 * lets id-based and slug-based URLs coexist.
 */
export async function organizationByIdOrSlug(idOrSlug: string) {
  const rows = await db
    .select()
    .from(organizations)
    .where(or(eq(organizations.id, idOrSlug), eq(organizations.slug, idOrSlug)))
    .limit(1)
  return rows[0] ?? null
}

/** Distinct towns that actually have published offerings. */
export async function listTowns(): Promise<string[]> {
  const rows = await db
    .selectDistinct({
      town: sql<string>`coalesce(${programOfferings.town}, ${organizations.town})`.as("town"),
    })
    .from(programOfferings)
    .innerJoin(programs, eq(programOfferings.programId, programs.id))
    .innerJoin(organizations, eq(programs.organizationId, organizations.id))
    .where(eq(programOfferings.published, true))
    .orderBy(sql`town asc`)
  return rows.map((r) => r.town).filter(Boolean)
}

/* -------------------------------------------------------------------------- */
/*  Home page collections                                                     */
/* -------------------------------------------------------------------------- */

/** Offerings whose registration closes within `days`. Drives the urgency rail. */
export async function closingSoonOfferings(days = 14, limit = 8) {
  const rows = await baseJoin()
    .where(
      and(
        eq(programOfferings.published, true),
        isNotNull(programOfferings.registrationCloseDate),
        gte(programOfferings.registrationCloseDate, sql`current_date`),
        lte(programOfferings.registrationCloseDate, sql`current_date + ${days} * interval '1 day'`),
      ),
    )
    .orderBy(asc(programOfferings.registrationCloseDate))
    .limit(limit)
  return rows.map(normalizeListing)
}

/** Offerings that opened within `days`. */
export async function recentlyOpenedOfferings(days = 14, limit = 8) {
  const rows = await baseJoin()
    .where(
      and(
        eq(programOfferings.published, true),
        isNotNull(programOfferings.registrationOpenDate),
        gte(programOfferings.registrationOpenDate, sql`current_date - ${days} * interval '1 day'`),
        lte(programOfferings.registrationOpenDate, sql`current_date`),
      ),
    )
    .orderBy(sql`${programOfferings.registrationOpenDate} desc`)
    .limit(limit)
  return rows.map(normalizeListing)
}

/** Per-season totals and how many are open right now. */
export async function seasonCounts(): Promise<
  Array<{ season: string; seasonYear: number; total: number; openNow: number }>
> {
  const rows = await db
    .select({
      season: programOfferings.season,
      seasonYear: programOfferings.seasonYear,
      total: sql<number>`count(*)::int`,
      openNow: sql<number>`count(*) filter (
        where ${programOfferings.registrationOpenDate} <= current_date
          and (${programOfferings.registrationCloseDate} is null
               or ${programOfferings.registrationCloseDate} >= current_date)
      )::int`,
    })
    .from(programOfferings)
    .innerJoin(programs, eq(programOfferings.programId, programs.id))
    .where(and(eq(programOfferings.published, true), eq(programs.active, true)))
    .groupBy(programOfferings.season, programOfferings.seasonYear)
  return rows
}

/** Per-sport counts for the browse grid. */
export async function sportCounts() {
  return db
    .select({
      sportId: sports.id,
      slug: sports.slug,
      name: sports.name,
      monogram: sports.monogram,
      iconKey: sports.iconKey,
      tone: sports.tone,
      total: sql<number>`count(${programOfferings.id})::int`,
      openNow: sql<number>`count(${programOfferings.id}) filter (
        where ${programOfferings.registrationOpenDate} <= current_date
          and (${programOfferings.registrationCloseDate} is null
               or ${programOfferings.registrationCloseDate} >= current_date)
      )::int`,
    })
    .from(sports)
    .leftJoin(programs, eq(programs.sportId, sports.id))
    .leftJoin(
      programOfferings,
      and(eq(programOfferings.programId, programs.id), eq(programOfferings.published, true)),
    )
    .groupBy(sports.id, sports.slug, sports.name, sports.monogram, sports.iconKey, sports.tone)
    .orderBy(sql`count(${programOfferings.id}) desc, ${sports.name} asc`)
}

/** Per-organization counts for the organization index. */
export async function organizationCounts() {
  return db
    .select({
      organizationId: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
      organizationType: organizations.organizationType,
      town: organizations.town,
      state: organizations.state,
      verified: organizations.verified,
      claimed: organizations.claimed,
      total: sql<number>`count(${programOfferings.id})::int`,
      openNow: sql<number>`count(${programOfferings.id}) filter (
        where ${programOfferings.registrationOpenDate} <= current_date
          and (${programOfferings.registrationCloseDate} is null
               or ${programOfferings.registrationCloseDate} >= current_date)
      )::int`,
    })
    .from(organizations)
    .leftJoin(programs, eq(programs.organizationId, organizations.id))
    .leftJoin(
      programOfferings,
      and(eq(programOfferings.programId, programs.id), eq(programOfferings.published, true)),
    )
    .groupBy(
      organizations.id,
      organizations.slug,
      organizations.name,
      organizations.organizationType,
      organizations.town,
      organizations.state,
      organizations.verified,
      organizations.claimed,
    )
    .orderBy(sql`count(${programOfferings.id}) desc`)
}

/* -------------------------------------------------------------------------- */
/*  Trust and provenance                                                      */
/* -------------------------------------------------------------------------- */

/** Live provenance rows for one entity, for the "where did this come from" UI. */
export async function provenanceFor(entityType: string, entityId: string) {
  return db
    .select()
    .from(fieldProvenance)
    .where(
      and(
        eq(fieldProvenance.entityType, entityType),
        eq(fieldProvenance.entityId, entityId),
        sql`${fieldProvenance.supersededAt} is null`,
      ),
    )
    .orderBy(asc(fieldProvenance.field))
}

/* -------------------------------------------------------------------------- */
/*  Admin                                                                     */
/* -------------------------------------------------------------------------- */

export async function pendingReviewCandidates(limit = 50) {
  return db
    .select()
    .from(reviewCandidates)
    .where(eq(reviewCandidates.status, "pending"))
    .orderBy(asc(reviewCandidates.discoveredAt))
    .limit(limit)
}

export async function openReports(limit = 50) {
  return db
    .select()
    .from(reports)
    .where(inArray(reports.status, ["new", "investigating"]))
    .orderBy(asc(reports.reportedAt))
    .limit(limit)
}

export async function pendingSubmissions(limit = 50) {
  return db
    .select()
    .from(submissions)
    .where(eq(submissions.status, "pending"))
    .orderBy(asc(submissions.submittedAt))
    .limit(limit)
}

/**
 * Counters for the admin dashboard.
 *
 * One round trip with conditional aggregates rather than six queries — this
 * renders on every admin page load.
 */
export async function adminCounts(stalenessDays = 30) {
  const rows = await db
    .select({
      publishedOfferings: sql<number>`count(*) filter (where ${programOfferings.published})::int`,
      unverified: sql<number>`count(*) filter (
        where ${programOfferings.verificationStatus} in ('unverified', 'ai_extracted', 'community_submitted')
      )::int`,
      missingDates: sql<number>`count(*) filter (
        where ${programOfferings.registrationOpenDate} is null
          and ${programOfferings.registrationCloseDate} is null
      )::int`,
      closingSoon: sql<number>`count(*) filter (
        where ${programOfferings.registrationCloseDate} between current_date and current_date + interval '14 days'
      )::int`,
      stale: sql<number>`count(*) filter (
        where ${programOfferings.dateLastChecked} is null
          or ${programOfferings.dateLastChecked} < now() - ${stalenessDays} * interval '1 day'
      )::int`,
    })
    .from(programOfferings)

  const [reviewRow] = await db
    .select({ pending: sql<number>`count(*)::int` })
    .from(reviewCandidates)
    .where(eq(reviewCandidates.status, "pending"))

  const [reportRow] = await db
    .select({ open: sql<number>`count(*)::int` })
    .from(reports)
    .where(inArray(reports.status, ["new", "investigating"]))

  return {
    ...(rows[0] ?? {
      publishedOfferings: 0,
      unverified: 0,
      missingDates: 0,
      closingSoon: 0,
      stale: 0,
    }),
    pendingReview: reviewRow?.pending ?? 0,
    openReports: reportRow?.open ?? 0,
  }
}

/* -------------------------------------------------------------------------- */
/*  Community submissions (write path)                                       */
/* -------------------------------------------------------------------------- */

/**
 * Prefixed random id, matching the seeded/ingest convention (`off_`, `prog_`,
 * `rc_`, …) so a submission row is legible in the same admin surfaces.
 */
function newSubmissionId(): string {
  return `sub_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`
}

export type NewSubmissionInput = {
  organizationName: string
  sportName?: string | null
  programName: string
  eligibility?: string | null
  registrationDates?: string | null
  registrationUrl?: string | null
  sourceUrl: string
  comments?: string | null
  submitterEmail: string
}

/**
 * Records a community submission as `status: "pending"`.
 *
 * This is the public `/submit` form's write path. It never touches
 * `programs`/`program_offerings` directly — a submission only becomes a
 * listing once a reviewer accepts it, matching PRD 23 (community submissions
 * never publish directly).
 */
export async function createSubmission(input: NewSubmissionInput) {
  const [row] = await db
    .insert(submissions)
    .values({
      id: newSubmissionId(),
      organizationName: input.organizationName,
      sportName: input.sportName ?? null,
      programName: input.programName,
      eligibility: input.eligibility ?? null,
      registrationDates: input.registrationDates ?? null,
      registrationUrl: input.registrationUrl ?? null,
      sourceUrl: input.sourceUrl,
      comments: input.comments ?? null,
      submitterEmail: input.submitterEmail,
      status: "pending",
    })
    .returning()
  return row
}

/* -------------------------------------------------------------------------- */
/*  Contact / listing reports (write path)                                    */
/* -------------------------------------------------------------------------- */

function newReportId(): string {
  return `rep_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`
}

export type NewReportInput = {
  category: string
  details: string
  reporterEmail?: string | null
  /** Set when the report is filed from an activity page; omitted for the general /contact form. */
  programId?: string | null
  offeringId?: string | null
  field?: string | null
}

/**
 * Records a report as `status: "new"`.
 *
 * Backs both the general `/contact` form (no programId/offeringId — category
 * "general_inquiry") and any future per-listing "report an issue" action, so
 * the admin console has one queue instead of two.
 */
export async function createReport(input: NewReportInput) {
  const [row] = await db
    .insert(reports)
    .values({
      id: newReportId(),
      programId: input.programId ?? null,
      offeringId: input.offeringId ?? null,
      category: input.category,
      field: input.field ?? null,
      details: input.details,
      reporterEmail: input.reporterEmail?.trim().toLowerCase() ?? null,
      status: "new",
    })
    .returning()
  return row
}

/* -------------------------------------------------------------------------- */
/*  Parent alerts (write + manage path)                                       */
/* -------------------------------------------------------------------------- */

function newAlertId(): string {
  return `alt_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`
}

/**
 * The opaque token behind the one-click unsubscribe link. A full uuid (not
 * truncated like the id) so it stays unguessable — an unsubscribe link is a
 * capability, and anyone holding it can disable the alert without logging in.
 */
function newUnsubscribeToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "")
}

/**
 * Fixed set of trigger events an alert can subscribe to (PRD 17).
 *
 * These strings are the shared vocabulary between the form UI
 * (`apps/web/lib/types.ts` `AlertTrigger`, whose labels live in
 * `lib/labels.ts`) and the delivery job that scans for them. Kept identical to
 * the frontend values on purpose so the column stores exactly what the user
 * picked — no translation layer to drift.
 */
export type AlertTrigger =
  | "registration_opened"
  | "registration_closing_soon"
  | "deadline_changed"
  | "new_matching_activity"
  | "registration_info_added"

export type NewAlertInput = {
  email: string
  kind: "activity" | "sport" | "child_match"
  /** Set for "activity": the durable program to watch (survives seasons). */
  programId?: string | null
  /** Set for "sport". */
  sportId?: string | null
  grade?: number | null
  zip?: string | null
  radiusMiles?: number | null
  triggers: AlertTrigger[]
  /** Human-readable summary captured at creation for a stable manage list. */
  label: string
  /** Nullable until accounts exist; backfilled in the auth phase. */
  userId?: string | null
}

/**
 * Creates an alert. Deliberately does not require a user — `email` is the
 * identity so the activity-page capture works logged-out. Returns the row
 * including its `unsubscribeToken`, which the caller needs to build the
 * confirmation email's one-click unsubscribe link.
 */
export async function createAlert(input: NewAlertInput) {
  const [row] = await db
    .insert(alerts)
    .values({
      id: newAlertId(),
      email: input.email.trim().toLowerCase(),
      userId: input.userId ?? null,
      kind: input.kind,
      programId: input.programId ?? null,
      sportId: input.sportId ?? null,
      grade: input.grade ?? null,
      zip: input.zip ?? null,
      radiusMiles: input.radiusMiles ?? null,
      triggers: input.triggers,
      label: input.label,
      unsubscribeToken: newUnsubscribeToken(),
      active: true,
    })
    .returning()
  return row
}

/** All alerts for an email, newest first — powers the manage-by-link view. */
export async function getAlertsByEmail(email: string) {
  return db
    .select()
    .from(alerts)
    .where(eq(alerts.email, email.trim().toLowerCase()))
    .orderBy(desc(alerts.createdAt))
}

/**
 * Pause or resume an alert (manage UI switch). Email-scoped for the same
 * reason as delete: the login-free manage view proves control of an email,
 * so a bare id must not toggle another person's alert.
 */
export async function setAlertActive(id: string, email: string, active: boolean) {
  const [row] = await db
    .update(alerts)
    .set({ active, updatedAt: new Date() })
    .where(and(eq(alerts.id, id), eq(alerts.email, email.trim().toLowerCase())))
    .returning()
  return row ?? null
}

/**
 * Disables an alert via its unsubscribe token. Idempotent and login-free:
 * clicking the email link twice is harmless, and a missing token returns null
 * rather than throwing so the unsubscribe page can show a graceful message.
 */
export async function unsubscribeAlert(token: string) {
  const [row] = await db
    .update(alerts)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(alerts.unsubscribeToken, token))
    .returning()
  return row ?? null
}

/**
 * Permanently removes an alert. Scoped by email as well as id so the
 * login-free manage view can only delete rows belonging to the email the
 * caller already proved they can receive mail at — an id alone must not be
 * enough to delete a stranger's alert.
 */
export async function deleteAlert(id: string, email: string) {
  const result = await db
    .delete(alerts)
    .where(and(eq(alerts.id, id), eq(alerts.email, email.trim().toLowerCase())))
    .returning({ id: alerts.id })
  return result.length > 0
}

/* -------------------------------------------------------------------------- */
/*  Alert matching (delivery path)                                            */
/* -------------------------------------------------------------------------- */

export type MatchedAlert = {
  id: string
  email: string
  kind: string
  label: string
  triggers: string[]
  unsubscribeToken: string
}

/**
 * Finds active alerts that should be notified about an event on one program.
 *
 * Matching is intentionally conservative — an alert only matches when it both
 * (a) subscribes to at least one of the `firedTriggers` and (b) targets this
 * program by one of three routes:
 *
 *   - "activity"     directly references this `programId`.
 *   - "sport"        references the program's sport. (Radius/geo narrowing is
 *                    deferred: for the Central VT beta every org is inside the
 *                    default radius, so sport+trigger is the honest match today
 *                    and geo filtering slots in here later without touching the
 *                    delivery caller.)
 *   - "child_match"  has a grade that falls within the program's [minAge,
 *                    maxAge] envelope (grade≈age for the beta's age-based data).
 *
 * The trigger overlap is enforced in SQL with the `&&` array-overlap operator
 * so a paused or non-subscribing alert never even leaves the database.
 */
export async function findAlertsToNotify(
  programId: string,
  firedTriggers: string[],
): Promise<MatchedAlert[]> {
  if (firedTriggers.length === 0) return []

  const [program] = await db
    .select({
      sportId: programs.sportId,
      minAge: programs.minAge,
      maxAge: programs.maxAge,
    })
    .from(programs)
    .where(eq(programs.id, programId))
    .limit(1)

  if (!program) return []

  // Drizzle's helper emits a correctly-bound `&&` overlap; a hand-written
  // sql`... && ${array}` binds the JS array as a malformed Postgres literal.
  const overlaps = arrayOverlaps(alerts.triggers, firedTriggers)

  const targetsProgram = or(
    // Direct watch on this program.
    and(eq(alerts.kind, "activity"), eq(alerts.programId, programId)),
    // Sport-wide watch on the program's sport.
    program.sportId
      ? and(eq(alerts.kind, "sport"), eq(alerts.sportId, program.sportId))
      : sql`false`,
    // Child-match: the watched grade sits inside the program's age envelope.
    and(
      eq(alerts.kind, "child_match"),
      program.minAge !== null ? gte(alerts.grade, program.minAge) : sql`true`,
      program.maxAge !== null ? lte(alerts.grade, program.maxAge) : sql`true`,
    ),
  )

  return db
    .select({
      id: alerts.id,
      email: alerts.email,
      kind: alerts.kind,
      label: alerts.label,
      triggers: alerts.triggers,
      unsubscribeToken: alerts.unsubscribeToken,
    })
    .from(alerts)
    .where(and(eq(alerts.active, true), overlaps, targetsProgram))
}
