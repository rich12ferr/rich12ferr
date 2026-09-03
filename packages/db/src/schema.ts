/**
 * Drizzle schema for OpenPlay.
 *
 * IMPORTANT: DDL for this project runs through the Neon MCP, not Drizzle Kit.
 * This file must be kept in sync by hand after any schema change. The live
 * database is always the source of truth.
 *
 * Two structural decisions are encoded here and are worth understanding before
 * changing anything:
 *
 * 1. `programs` (durable identity) is split from `program_offerings` (the dated
 *    instance). "Montpelier Rec Youth Soccer" is one program row forever; each
 *    year's registration window is a new offering row. Bookmarks and alerts
 *    point at programs so a saved program survives into next season; search
 *    reads offerings because that is where dates and fees live.
 *
 * 2. Trust is tracked per FIELD in `field_provenance`, not per record. Parent
 *    reports are field-scoped ("wrong_date", "wrong_cost"), so trust has to be
 *    too — otherwise a single bad fee invalidates an otherwise good record and
 *    there is no way to re-verify just the stale field.
 */

import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

/* -------------------------------------------------------------------------- */
/*  Custom types                                                              */
/* -------------------------------------------------------------------------- */

/**
 * PostGIS `geography(Point, 4326)`.
 *
 * Stored as a geography rather than two float columns so distance queries use
 * real great-circle math on a GiST index. Reads come back as GeoJSON via
 * ST_AsGeoJSON in our queries; on write we send WKT, which PostGIS parses.
 *
 * Longitude comes first in WKT (`POINT(lng lat)`) — reversing it is the single
 * most common PostGIS bug and silently places Vermont in the Indian Ocean.
 */
export const geographyPoint = customType<{
  data: { lng: number; lat: number }
  driverData: string
}>({
  dataType() {
    return "geography(Point, 4326)"
  },
  toDriver(value) {
    return `SRID=4326;POINT(${value.lng} ${value.lat})`
  },
})

/** Numeric that round-trips as a JS number instead of a string. */
const money = (name: string) =>
  numeric(name, { precision: 10, scale: 2, mode: "number" })

const confidenceScore = (name: string) =>
  numeric(name, { precision: 4, scale: 3, mode: "number" })

/* -------------------------------------------------------------------------- */
/*  Reference data                                                            */
/* -------------------------------------------------------------------------- */

export const sports = pgTable("sports", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** Two-letter fallback shown before iconography loads, e.g. "BK". */
  monogram: text("monogram").notNull(),
  /**
   * Stable key for per-sport iconography. Decoupled from `slug` so the icon set
   * can be revised without touching URLs, and so several sports can share one
   * icon (e.g. indoor/outdoor track).
   */
  iconKey: text("icon_key").notNull(),
  tone: text("tone").notNull(),
  primarySeasons: text("primary_seasons").array().notNull().default([]),
  /** Query-expansion aliases: "XC" -> cross country, "hockey" -> ice hockey. */
  synonyms: text("synonyms").array().notNull().default([]),
  blurb: text("blurb"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

/* -------------------------------------------------------------------------- */
/*  Organizations                                                             */
/* -------------------------------------------------------------------------- */

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    organizationType: text("organization_type").notNull().default("other"),
    websiteUrl: text("website_url"),
    registrationPlatform: text("registration_platform"),
    contactEmail: text("contact_email"),
    phone: text("phone"),

    town: text("town").notNull(),
    state: text("state").notNull(),
    zip: text("zip"),
    venueName: text("venue_name"),
    venueAddress: text("venue_address"),
    location: geographyPoint("location"),
    /** How trustworthy `location` is; drives whether radius filtering applies. */
    geocodePrecision: text("geocode_precision").notNull().default("none"),

    about: text("about"),

    /** Set when an org claims its listing — its edits then outrank extraction. */
    claimed: boolean("claimed").notNull().default(false),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    verified: boolean("verified").notNull().default(false),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),

    /** Normalized name+town key used by entity resolution to dedupe orgs. */
    matchKey: text("match_key"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("organizations_location_gix").using("gist", t.location),
    index("organizations_town_idx").on(t.town, t.state),
    index("organizations_match_key_idx").on(t.matchKey),
  ],
)

/* -------------------------------------------------------------------------- */
/*  Programs — durable identity                                               */
/* -------------------------------------------------------------------------- */

export const programs = pgTable(
  "programs",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    organizationId: text("organization_id").notNull(),
    sportId: text("sport_id").notNull(),

    title: text("title").notNull(),
    description: text("description"),
    programType: text("program_type").notNull().default("recreational"),

    // Eligibility lives on the program, not the offering: it is the part that
    // stays stable year over year and the part child profiles match against.
    gender: text("gender").notNull().default("any"),
    minAge: integer("min_age"),
    maxAge: integer("max_age"),
    minGrade: integer("min_grade"),
    maxGrade: integer("max_grade"),
    residencyRequirement: text("residency_requirement"),
    experienceLevel: text("experience_level"),
    beginnerFriendly: boolean("beginner_friendly").notNull().default(false),

    typicalSeasons: text("typical_seasons").array().notNull().default([]),
    equipmentRequirements: text("equipment_requirements"),
    practiceSchedule: text("practice_schedule"),
    gameSchedule: text("game_schedule"),

    verificationStatus: text("verification_status").notNull().default("unverified"),
    active: boolean("active").notNull().default(true),
    matchKey: text("match_key"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("programs_organization_idx").on(t.organizationId),
    index("programs_sport_idx").on(t.sportId),
    index("programs_match_key_idx").on(t.matchKey),
    index("programs_age_range_idx").on(t.minAge, t.maxAge),
  ],
)

/* -------------------------------------------------------------------------- */
/*  Program offerings — the dated instance                                    */
/* -------------------------------------------------------------------------- */

export const programOfferings = pgTable(
  "program_offerings",
  {
    id: text("id").primaryKey(),
    programId: text("program_id").notNull(),

    season: text("season").notNull(),
    seasonYear: integer("season_year").notNull(),

    registrationOpenDate: date("registration_open_date"),
    registrationCloseDate: date("registration_close_date"),
    seasonStartDate: date("season_start_date"),
    seasonEndDate: date("season_end_date"),

    registrationUrl: text("registration_url"),
    registrationProvider: text("registration_provider"),
    capacity: integer("capacity"),
    waitlistAvailable: boolean("waitlist_available"),
    /**
     * Set only when a human or the org states a status that contradicts the
     * dates (e.g. "full" while the window is technically open). Derived status
     * is computed from dates otherwise — see @openplay/core.
     */
    statusOverride: text("status_override"),

    registrationFee: money("registration_fee"),
    currency: text("currency").notNull().default("USD"),
    additionalFees: text("additional_fees"),
    scholarshipAvailable: boolean("scholarship_available"),

    tryoutRequired: boolean("tryout_required").notNull().default(false),
    tryoutDetails: text("tryout_details"),
    tryoutDate: date("tryout_date"),

    // Location overrides the org's when a specific offering meets elsewhere.
    town: text("town"),
    state: text("state"),
    zip: text("zip"),
    venueName: text("venue_name"),
    venueAddress: text("venue_address"),
    location: geographyPoint("location"),
    geocodePrecision: text("geocode_precision").notNull().default("none"),

    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    contactUrl: text("contact_url"),

    /**
     * The canonical page this listing was derived from. Every published
     * offering cites its source so the UI can always answer "where did this
     * come from?" — the core trust guarantee.
     */
    sourceUrl: text("source_url"),
    sourceType: text("source_type"),
    dateDiscovered: timestamp("date_discovered", { withTimezone: true }),
    verificationMethod: text("verification_method"),

    /** Drives the freshness SLA and the "checked N days ago" UI. */
    dateLastChecked: timestamp("date_last_checked", { withTimezone: true }),
    verificationStatus: text("verification_status").notNull().default("unverified"),
    /** Hash of extracted content; unchanged hash means skip the review queue. */
    contentHash: text("content_hash"),
    /** Unpublished offerings are invisible to parents but visible to admins. */
    published: boolean("published").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("offerings_program_season_unique").on(t.programId, t.season, t.seasonYear),
    index("offerings_program_idx").on(t.programId),
    index("offerings_location_gix").using("gist", t.location),
    index("offerings_season_idx").on(t.season, t.seasonYear),
    index("offerings_close_date_idx").on(t.registrationCloseDate),
    index("offerings_published_idx").on(t.published, t.seasonYear),
    index("offerings_last_checked_idx").on(t.dateLastChecked),
    index("offerings_content_hash_idx").on(t.contentHash),
  ],
)

/* -------------------------------------------------------------------------- */
/*  Ingestion                                                                 */
/* -------------------------------------------------------------------------- */

export const sources = pgTable(
  "sources",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id"),
    url: text("url").notNull().unique(),
    sourceType: text("source_type").notNull(),
    label: text("label"),
    parserHints: jsonb("parser_hints").notNull().default({}),

    /** Re-crawl cadence; the freshness engine tightens this near deadlines. */
    crawlIntervalHours: integer("crawl_interval_hours").notNull().default(168),

    // Crawl legality is recorded per source, not assumed globally.
    robotsAllowed: boolean("robots_allowed").notNull().default(true),
    robotsCheckedAt: timestamp("robots_checked_at", { withTimezone: true }),
    permissionNote: text("permission_note"),

    /**
     * Terms of Service review, kept distinct from `robotsAllowed`: a page can
     * permit crawling by robots.txt while its ToS still restricts scraping
     * (common for SportsEngine/MyRec-hosted pages), and the two are checked by
     * different means — robots.txt automatically, ToS by a human reading it.
     * `active`/`sourceStatus` do not read this yet; an operator gates go-live
     * on it manually via the review/approve workflow.
     */
    termsStatus: text("terms_status").notNull().default("needs_review"),

    lastCrawledAt: timestamp("last_crawled_at", { withTimezone: true }),
    lastSucceededAt: timestamp("last_succeeded_at", { withTimezone: true }),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    active: boolean("active").notNull().default(true),
    /**
     * Human-readable lifecycle state backing `active`. `active` is what the
     * crawl-selection query actually filters on; `sourceStatus` records *why*
     * a source isn't crawling ("pending_review" vs "disabled" by robots.txt vs
     * "paused" after repeated failures vs manually "retired"), which `active`
     * alone can't distinguish. Keep the two in sync when either changes.
     */
    sourceStatus: text("source_status").notNull().default("pending_review"),

    /**
     * Denormalized cache of the newest `raw_documents.content_hash` for this
     * source. The change-detection gate already looks this up via an indexed
     * query on `raw_documents`, so this is not required for correctness — it
     * exists so an operator dashboard can show per-source freshness without a
     * join. Keep it in sync wherever a raw document is inserted.
     */
    lastContentHash: text("last_content_hash"),
    /**
     * Which crawler adapter (and version) last produced a successful fetch for
     * this source, e.g. "generic-llm@1" or "myrec@1". Distinct from
     * `extractionRuns.promptVersion`, which only exists for LLM-based
     * extractions — this covers dedicated non-LLM adapters too, once built.
     */
    parserVersion: text("parser_version"),

    /**
     * Set when this source was not registered by hand but found by the link
     * discovery pass on another source's homepage — the audit trail for
     * "why does this row exist." Null for every hand-registered source,
     * including everything in `register-sources.ts`.
     */
    discoveredFromSourceId: text("discovered_from_source_id"),
    /**
     * Why the discovery pass thought this URL worth registering (matched
     * keywords, link text) — kept so a reviewer can approve/reject a
     * `pending_review` discovered source without re-fetching the parent page.
     */
    discoveryNote: text("discovery_note"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sources_crawl_due_idx").on(t.lastCrawledAt),
    index("sources_organization_idx").on(t.organizationId),
  ],
)

/**
 * Immutable snapshot of every fetch. Kept so an extraction can be replayed
 * against a new prompt or model without re-crawling the source, and so a bad
 * extraction run can be audited after the fact.
 */
export const rawDocuments = pgTable(
  "raw_documents",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    httpStatus: integer("http_status"),
    contentType: text("content_type"),
    contentHash: text("content_hash").notNull(),
    content: text("content"),
    storageUrl: text("storage_url"),
    bytes: integer("bytes"),
    fetchError: text("fetch_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("raw_documents_source_idx").on(t.sourceId, t.fetchedAt),
    index("raw_documents_hash_idx").on(t.contentHash),
  ],
)

/**
 * Per-field trust ledger. One live row per (entity, field) enforced by a
 * partial unique index on `superseded_at IS NULL`; history is retained by
 * stamping the old row rather than deleting it.
 */
export const fieldProvenance = pgTable(
  "field_provenance",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    field: text("field").notNull(),
    value: text("value"),

    sourceId: text("source_id"),
    rawDocumentId: text("raw_document_id"),
    sourceType: text("source_type"),
    extractionMethod: text("extraction_method").notNull(),
    confidence: confidenceScore("confidence"),
    extractionVersion: text("extraction_version"),

    verificationStatus: text("verification_status").notNull().default("unverified"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: text("verified_by"),
    /** Set by a parent report; flags the field for re-verification. */
    disputedAt: timestamp("disputed_at", { withTimezone: true }),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("provenance_entity_idx").on(t.entityType, t.entityId),
    index("provenance_disputed_idx").on(t.disputedAt),
  ],
)

/** Cost and quality telemetry per extraction, for regression tracking. */
export const extractionRuns = pgTable(
  "extraction_runs",
  {
    id: text("id").primaryKey(),
    rawDocumentId: text("raw_document_id").notNull(),
    sourceId: text("source_id").notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    status: text("status").notNull().default("running"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: numeric("cost_usd", { precision: 10, scale: 5, mode: "number" }),
    candidatesFound: integer("candidates_found").notNull().default(0),
    meanConfidence: confidenceScore("mean_confidence"),
    error: text("error"),
  },
  (t) => [index("extraction_runs_document_idx").on(t.rawDocumentId)],
)

/** Human review queue. Only genuine deltas land here — see change detection. */
export const reviewCandidates = pgTable(
  "review_candidates",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    extractionRunId: text("extraction_run_id"),
    sourceId: text("source_id"),
    rawDocumentId: text("raw_document_id"),
    targetProgramId: text("target_program_id"),
    targetOfferingId: text("target_offering_id"),

    proposedTitle: text("proposed_title").notNull(),
    proposedOrganizationName: text("proposed_organization_name"),
    payload: jsonb("payload").notNull().default({}),
    changes: jsonb("changes").notNull().default([]),
    validationIssues: jsonb("validation_issues").notNull().default([]),

    confidence: confidenceScore("confidence"),
    duplicateAssessment: text("duplicate_assessment").notNull().default("new"),
    matchScore: confidenceScore("match_score"),

    status: text("status").notNull().default("pending"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by"),
    reviewNote: text("review_note"),
    discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("review_candidates_status_idx").on(t.status, t.discoveredAt)],
)

/* -------------------------------------------------------------------------- */
/*  Community feedback                                                        */
/* -------------------------------------------------------------------------- */

export const reports = pgTable(
  "reports",
  {
    id: text("id").primaryKey(),
    programId: text("program_id"),
    offeringId: text("offering_id"),
    category: text("category").notNull(),
    /** Which field the report is about, so provenance can be disputed precisely. */
    field: text("field"),
    details: text("details"),
    reporterEmail: text("reporter_email"),
    reportedAt: timestamp("reported_at", { withTimezone: true }).notNull().defaultNow(),
    status: text("status").notNull().default("new"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNote: text("resolution_note"),
  },
  (t) => [
    index("reports_offering_idx").on(t.offeringId),
    index("reports_status_idx").on(t.status, t.reportedAt),
  ],
)

export const submissions = pgTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    submitterEmail: text("submitter_email"),
    organizationName: text("organization_name").notNull(),
    sportName: text("sport_name"),
    programName: text("program_name").notNull(),
    eligibility: text("eligibility"),
    registrationDates: text("registration_dates"),
    registrationUrl: text("registration_url"),
    sourceUrl: text("source_url"),
    comments: text("comments"),
    status: text("status").notNull().default("pending"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by"),
  },
  (t) => [index("submissions_status_idx").on(t.status, t.submittedAt)],
)

/* -------------------------------------------------------------------------- */
/*  Parent alerts (PRD 17)                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A standing request to be emailed when something happens in the directory.
 *
 * Alerts are deliberately usable logged-out: `email` is the required identity
 * and `userId` is a nullable link that gets backfilled once accounts land in
 * the auth phase. There is no FK on `userId` yet because the users table does
 * not exist — adding the column now keeps the eventual migration a pure
 * backfill instead of a table rewrite.
 *
 * `kind` mirrors the frontend `AlertType`:
 *   - "activity"     watch ONE program for its next offering / changes. Points
 *                    at the durable `programs` row, never an offering, so the
 *                    alert survives into next season (see file header) and
 *                    fires when that program posts a new dated offering.
 *   - "sport"        watch a sport within a radius of a ZIP.
 *   - "child_match"  watch anything a given grade is eligible for within a
 *                    radius — matches activities that may not exist yet.
 */
export const alerts = pgTable(
  "alerts",
  {
    id: text("id").primaryKey(),

    email: text("email").notNull(),
    userId: text("user_id"),

    kind: text("kind").notNull(),

    // Target by kind. "activity" sets programId; "sport" sets sportId;
    // "child_match" uses grade + location and leaves both null.
    programId: text("program_id").references(() => programs.id, { onDelete: "cascade" }),
    sportId: text("sport_id").references(() => sports.id, { onDelete: "cascade" }),

    // Geo criteria for "sport" and "child_match".
    grade: integer("grade"),
    zip: text("zip"),
    radiusMiles: integer("radius_miles"),

    // Which trigger events this alert wants (PRD 17). Stored as text[] so a
    // parent can pick any subset of a small fixed set without a join table.
    triggers: text("triggers").array().notNull(),

    // Captured at creation so the manage list stays stable even if the
    // underlying program is later renamed.
    label: text("label").notNull(),

    // Paused alerts stay saved but stop sending (manage UI switch).
    active: boolean("active").notNull().default(true),

    // Opaque token behind the one-click, no-login unsubscribe link that every
    // alert email must carry.
    unsubscribeToken: text("unsubscribe_token").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // The delivery job scans active alerts; the email index powers both the
    // logged-out manage-by-link flow and the future account view.
    index("alerts_active_idx").on(t.active),
    index("alerts_email_idx").on(t.email),
    index("alerts_program_idx").on(t.programId),
    index("alerts_sport_idx").on(t.sportId),
    uniqueIndex("alerts_unsubscribe_token_idx").on(t.unsubscribeToken),
  ],
)

/* -------------------------------------------------------------------------- */
/*  Inferred row types                                                        */
/* -------------------------------------------------------------------------- */

export type SportRow = typeof sports.$inferSelect
export type OrganizationRow = typeof organizations.$inferSelect
export type ProgramRow = typeof programs.$inferSelect
export type ProgramOfferingRow = typeof programOfferings.$inferSelect
export type SourceRow = typeof sources.$inferSelect
export type RawDocumentRow = typeof rawDocuments.$inferSelect
export type FieldProvenanceRow = typeof fieldProvenance.$inferSelect
export type ExtractionRunRow = typeof extractionRuns.$inferSelect
export type ReviewCandidateRow = typeof reviewCandidates.$inferSelect
export type ReportRow = typeof reports.$inferSelect
export type SubmissionRow = typeof submissions.$inferSelect
export type AlertRow = typeof alerts.$inferSelect

export type NewSport = typeof sports.$inferInsert
export type NewOrganization = typeof organizations.$inferInsert
export type NewProgram = typeof programs.$inferInsert
export type NewProgramOffering = typeof programOfferings.$inferInsert
export type NewSource = typeof sources.$inferInsert
export type NewFieldProvenance = typeof fieldProvenance.$inferInsert
export type NewReviewCandidate = typeof reviewCandidates.$inferInsert
export type NewAlert = typeof alerts.$inferInsert
