/**
 * Imports the winter v3.1 supplemental seed — data/vt-winter-program-offerings-seed-v3_1.csv
 * (51 offerings across Alpine Skiing, Nordic Skiing, Snowboarding, Freestyle
 * Skiing, Biathlon, and multi-discipline ski academy terms) plus
 * data/vt-winter-org-sources-seed-v3_1.csv (44 organization/source rows,
 * sourced from NENSA's Vermont club directory and VARA's Northern/Mid/Southern
 * councils) — into organizations, sources, programs, and program_offerings.
 *
 * This closes the gap the original v3 seed (import-v3-seed.ts) left: it had no
 * taxonomy for on-snow winter sports at all, so no Nordic/alpine ski club, ski
 * academy, or biathlon program could be represented. Six sport rows were added
 * to packages/core/src/domain/sport.ts to fix that (alpine-skiing,
 * nordic-skiing, snowboarding, freestyle-skiing, biathlon, and a snow-sports
 * catch-all for multi-discipline ski academy terms and generic learn-to-ski/
 * ride instruction) — see resolveSportId() below for how a row's taxonomy path
 * resolves onto them.
 *
 * The org-sources CSV (not the offerings CSV) is treated as the authoritative
 * source for organization identity and location: every organization referenced
 * by an offering row also has a row in the org-sources CSV, and the org-sources
 * CSV additionally carries organizations with a registered source but no
 * extractable offering yet (e.g. most NENSA-directory Nordic clubs), which the
 * offerings CSV alone would silently drop.
 *
 * Per the source notes, some rows are confirmed organizations/programs whose
 * 2026-27 dates have not been published yet ("details pending" in
 * verification_status) rather than fully insert-ready. Per the go-live
 * instruction to never copy stale (2025-26) dates forward, those rows are
 * still inserted — so the program/organization is discoverable and a future
 * crawl can enrich it — but published=false and verification_status stays
 * "unverified" rather than "ai_extracted", consistent with how `published`
 * is documented in schema.ts ("Unpublished offerings are invisible to parents
 * but visible to admins").
 *
 * Idempotent — every insert is an upsert keyed on the CSV's own stable id
 * (organization_id / program_id / program_offering_id / source_id), so this
 * can be re-run safely after editing the CSVs.
 *
 * Run: pnpm --filter @openplay/ingest exec tsx scripts/import-winter-v3-1-seed.ts
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parse } from "csv-parse/sync"
import { sql } from "drizzle-orm"

import {
  SPORTS,
  type AudienceType,
  type CompetitionLevel,
  type OrganizationType,
  type ProgramFormat,
  type ProgramType,
  type RegistrationStatus,
  type SourcePlatform,
} from "@openplay/core"
import { db, fieldProvenance, organizations, pool, programOfferings, programs, sources } from "@openplay/db"
import { organizationMatchKey, programMatchKey } from "../src/entity-resolution"
import { geocodeFromGazetteer } from "../src/geocode"

const DATA_DIR = join(__dirname, "../data")

/* -------------------------------------------------------------------------- */
/*  CSV row shapes                                                            */
/* -------------------------------------------------------------------------- */

/** Identical column shape to import-v3-seed.ts's OfferingRow — same CSV template. */
type OfferingRow = {
  organization_id: string
  organization_name: string
  organization_type: string
  program_id: string
  program_name: string
  program_offering_id: string
  program_offering_title: string
  activity_taxonomy_path: string
  audience_type: string
  program_format: string
  competition_level: string
  season_label: string
  season_year: string
  start_date: string
  end_date: string
  registration_open_date: string
  registration_close_date: string
  registration_status: string
  registration_url: string
  registration_provider: string
  min_age: string
  max_age: string
  min_grade: string
  max_grade: string
  eligibility_rules_json: string
  schedule_json: string
  pricing_json: string
  location_json: string
  source_id: string
  source_url: string
  source_authority: string
  verification_status: string
  lifecycle_status: string
  last_checked_at: string
  notes: string
}

type OrgSourceRow = {
  organization_id: string
  organization_name: string
  organization_aliases: string
  organization_type: string
  governing_body: string
  council_or_district: string
  town: string
  state: string
  country_code: string
  activity_scope: string
  audience_scope: string
  source_id: string
  source_url: string
  source_type: string
  platform: string
  authoritative_level: string
  verification_status: string
  current_2026_27_status: string
  notes: string
}

function loadCsv<T>(filename: string): T[] {
  const raw = readFileSync(join(DATA_DIR, filename), "utf8")
  return parse(raw, { columns: true, skip_empty_lines: true }) as T[]
}

/* -------------------------------------------------------------------------- */
/*  Small helpers                                                             */
/* -------------------------------------------------------------------------- */

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** WKT for PostGIS. Longitude first — reversing this puts Vermont in the ocean. */
function pointLiteral(lng: number, lat: number) {
  return sql`st_setsrid(st_makepoint(${lng}, ${lat}), 4326)::geography`
}

function nullIfEmpty(value: string | undefined): string | null {
  const v = value?.trim()
  return v ? v : null
}

function asDate(value: string | undefined): string | null {
  const v = nullIfEmpty(value)
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
}

function asTimestamp(value: string | undefined): Date | null {
  const date = asDate(value)
  return date ? new Date(`${date}T12:00:00Z`) : null
}

function asInt(value: string | undefined): number | null {
  const v = nullIfEmpty(value)
  if (!v) return null
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

function parseJsonArray(value: string | undefined): unknown[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** A confirmed organization/program whose 2026-27 details haven't been published yet — see file header. */
function isPending(verificationStatus: string): boolean {
  return /pending/.test(verificationStatus)
}

/** First segment of a "Town / Town" location string, e.g. "Jericho / Underhill" -> "Jericho". */
function primaryTown(rawTown: string): string {
  return rawTown.split("/")[0]!.trim()
}

/* -------------------------------------------------------------------------- */
/*  Taxonomy mapping — CSV free text -> @openplay/core closed vocabularies    */
/* -------------------------------------------------------------------------- */

function mapOrganizationType(csvType: string): OrganizationType {
  switch (csvType) {
    case "state_association":
    case "club":
    case "school":
      return csvType as OrganizationType
    // NENSA is a New England-wide (not single-state) governing/directory body —
    // closest existing bucket above a single state association.
    case "regional_association":
      return "national_association"
    default:
      return "other"
  }
}

/** "youth;junior;adult"/"youth;adult" collapse to "all_ages"; a lone "junior" is a youth racer. */
function mapAudienceType(csvValue: string): AudienceType | null {
  const v = nullIfEmpty(csvValue)
  if (!v) return null
  if (v.includes(";")) return "all_ages"
  if (v === "junior") return "youth"
  if (v === "youth" || v === "adult" || v === "all_ages" || v === "family") return v
  return null
}

/** None of this CSV's formats (membership/season_program/school_term/festival) have a closer match than "other". */
function mapProgramFormat(csvValue: string): ProgramFormat | null {
  return nullIfEmpty(csvValue) ? "other" : null
}

/** "training" (full-time academy programs) maps to "elite"; "recreational_and_competitive" collapses like the original seed's "recreational_and_travel". */
function mapCompetitionLevel(csvValue: string): CompetitionLevel | null {
  const v = nullIfEmpty(csvValue)
  if (!v) return null
  switch (v) {
    case "competitive":
      return "competitive"
    case "developmental":
      return "recreational"
    case "training":
      return "elite"
    case "recreational_and_competitive":
      return "recreational"
    default:
      return null
  }
}

function mapProgramType(competitionLevel: string): ProgramType {
  return competitionLevel === "competitive" || competitionLevel === "training" ? "competitive" : "recreational"
}

function mapRegistrationStatus(csvValue: string): RegistrationStatus {
  switch (nullIfEmpty(csvValue)) {
    case "closed":
      return "closed"
    case "late_registration_or_full":
      return "closing_soon"
    case "open":
    case "open_at_source_snapshot":
    case "open_or_active":
    case "open_or_published":
    case "application_open_or_inquiry":
    case "inquiry_or_application":
      return "open"
    case "upcoming":
      return "upcoming"
    default:
      return "unknown"
  }
}

const PLATFORM_MAP: Record<string, SourcePlatform> = {
  MyRec: "myrec",
  SportsEngine: "sportsengine",
  CivicRec: "civicrec",
  WebTrac: "webtrac",
  "WebTrac/RecTrac": "webtrac",
  USTA: "usta",
  Facebook: "facebook",
  "Sports Connect / Blue Sombrero": "leagueapps",
}

function mapPlatform(csvPlatform: string): SourcePlatform {
  return PLATFORM_MAP[csvPlatform] ?? "generic_html"
}

const REGISTRATION_PLATFORM_KEYS = new Set<SourcePlatform>([
  "myrec",
  "sportsengine",
  "civicrec",
  "webtrac",
  "rectrac",
  "usta",
  "leagueapps",
])

function mapSourceType(platform: SourcePlatform): "registration_platform" | "organization_website" {
  return REGISTRATION_PLATFORM_KEYS.has(platform) ? "registration_platform" : "organization_website"
}

/**
 * The activity taxonomy path -> @openplay/core sport slug, for the winter
 * leaves added to packages/core/src/domain/sport.ts specifically for this
 * import. "Multi-Discipline Snow Sports" (ski academy winter terms) and
 * "Ski & Snowboard Instruction" (generic learn-to-ski/ride) both land on the
 * "snow-sports" catch-all since neither names a single discipline.
 */
const TAXONOMY_TO_SPORT_SLUG: Record<string, string> = {
  "Alpine Skiing": "alpine-skiing",
  "Nordic Skiing": "nordic-skiing",
  Snowboarding: "snowboarding",
  Biathlon: "biathlon",
  "Freeski / Freestyle Skiing": "freestyle-skiing",
  "Multi-Discipline Snow Sports": "snow-sports",
  "Ski & Snowboard Instruction": "snow-sports",
}

const SPORT_ID_BY_SLUG: Record<string, string> = Object.fromEntries(SPORTS.map((s) => [s.slug, s.id]))

/**
 * Resolves an `activity_taxonomy_path` like "Sports > Winter Sports > Nordic
 * Skiing > Masters" to a sport id. Matches the last segment first, walking
 * back toward the root so a sub-leaf like "Masters" or "Racing" (not itself a
 * mapped sport) still resolves through its parent ("Nordic Skiing"). Falls
 * back to the "snow-sports" catch-all rather than @openplay/core's
 * "camps-enrichment" catch-all — every row in this CSV is already scoped to
 * "Sports > Winter Sports", so an unresolved leaf is still a snow sport, not a
 * generic camp.
 */
function resolveSportId(taxonomyPath: string): string {
  const segments = taxonomyPath.split(">").map((s) => s.trim())
  for (const segment of [...segments].reverse()) {
    const slug = TAXONOMY_TO_SPORT_SLUG[segment]
    const id = slug ? SPORT_ID_BY_SLUG[slug] : undefined
    if (id) return id
  }
  return SPORT_ID_BY_SLUG["snow-sports"]!
}

/** `pricing[].type` in the CSV onto @openplay/core's PricingType, same mapping as import-v3-seed.ts. */
function mapPricingEntry(entry: unknown): Record<string, unknown> | null {
  if (typeof entry !== "object" || entry === null) return null
  const e = entry as Record<string, unknown>
  const csvType = typeof e.type === "string" ? e.type : "other"
  const type =
    csvType === "player"
      ? "registration"
      : csvType === "team"
        ? "other"
        : csvType === "early_program_fee"
          ? "early_bird"
          : csvType
  return { ...e, type, original_type: csvType }
}

/**
 * Manual location for the handful of organizations with no single town, e.g.
 * a regional association (NENSA) or a club whose CSV town is a region name
 * rather than a town ("Southern Vermont"). `organizations.town`/`state` are
 * NOT NULL, so every organization needs one of these two paths.
 */
const ORG_TOWN_OVERRIDES: Record<string, string> = {
  "org-us-vt-new-england-nordic-ski-association": "Vermont (statewide)",
  "org-us-vt-willard-racing-team": "Southern Vermont (statewide)",
}

/* -------------------------------------------------------------------------- */
/*  Organizations + sources (from the org-sources CSV)                       */
/* -------------------------------------------------------------------------- */

/**
 * `sources.url` is unique, but plenty of rows across both CSVs share one page
 * as their only found source — NENSA's club directory alone covers 10 orgs,
 * and several small clubs cite the exact same URL for both their homepage
 * (org-sources CSV) and their program page (offerings CSV). Inserting a
 * `sources` row per citing row would violate the unique constraint. This map
 * is shared across both seeding passes: the first row to claim a URL gets the
 * `sources` row under its own id; every later row citing that same URL is
 * resolved to the already-claimed id instead (via `canonicalSourceId`) rather
 * than getting a redundant row of its own.
 */
const sourceIdByUrl = new Map<string, string>()

function canonicalSourceId(url: string, ownSourceId: string): string {
  return sourceIdByUrl.get(url) ?? ownSourceId
}

async function seedOrganizationsAndSources(orgRows: OrgSourceRow[]) {
  // The CSV lists an organization once per governing-body/council it belongs
  // to (e.g. Green Mountain Valley School under both NENSA and VARA), so the
  // same organization_id can repeat. Last row wins on the org upsert.
  const seenOrgIds = new Set<string>()
  let orgCount = 0
  let sourceCount = 0
  let skippedDuplicateUrlCount = 0

  for (const row of orgRows) {
    const rawTown = nullIfEmpty(row.town)
    const town = rawTown ? primaryTown(rawTown) : ORG_TOWN_OVERRIDES[row.organization_id] ?? null
    const state = row.state || "VT"
    if (!town) {
      console.warn(`[import-winter-v3-1-seed] skipping organization with no resolvable town: ${row.organization_id}`)
      continue
    }

    if (!seenOrgIds.has(row.organization_id)) {
      seenOrgIds.add(row.organization_id)

      const matchKey = organizationMatchKey(row.organization_name, town, state)
      const geo = geocodeFromGazetteer(town, state)

      const orgValues = {
        id: row.organization_id,
        slug: slugify(row.organization_name),
        name: row.organization_name,
        organizationType: mapOrganizationType(row.organization_type),
        websiteUrl: row.source_url,
        town,
        state,
        countryCode: row.country_code || "US",
        status: "active",
        verificationStatus: "ai_extracted",
        geocodePrecision: geo ? geo.precision : ("none" as const),
        matchKey,
        about: nullIfEmpty(row.organization_aliases) ? `Also known as: ${row.organization_aliases}` : null,
      }

      await db
        .insert(organizations)
        .values(orgValues)
        .onConflictDoUpdate({ target: organizations.id, set: { ...orgValues, updatedAt: new Date() } })

      if (geo) {
        await db
          .update(organizations)
          .set({ location: sql`${pointLiteral(geo.point.lng, geo.point.lat)}` as never })
          .where(sql`${organizations.id} = ${row.organization_id}`)
      }

      orgCount += 1
    }

    const existingSourceId = sourceIdByUrl.get(row.source_url)
    if (existingSourceId && existingSourceId !== row.source_id) {
      skippedDuplicateUrlCount += 1
      continue
    }
    sourceIdByUrl.set(row.source_url, row.source_id)

    // association_directory/organization_site are both informational, not a
    // registration system — always "organization_website".
    const platform = mapPlatform(row.platform)
    const sourceValues = {
      id: row.source_id,
      organizationId: row.organization_id,
      url: row.source_url,
      sourceType: "organization_website" as const,
      label: `${row.organization_name} (${town}, ${state})`,
      platform,
      authoritativeLevel: row.authoritative_level || "secondary",
      parserHints: {
        winterV3_1: {
          governingBody: row.governing_body,
          councilOrDistrict: row.council_or_district,
          activityScope: row.activity_scope,
          audienceScope: row.audience_scope,
          sourceType: row.source_type,
          current202627Status: row.current_2026_27_status,
          verificationStatus: row.verification_status,
        },
      },
      lastCrawledAt: new Date(),
      lastSucceededAt: new Date(),
      consecutiveFailures: 0,
      active: true,
      sourceStatus: "active",
      discoveryNote: nullIfEmpty(row.notes),
    }

    await db
      .insert(sources)
      .values(sourceValues)
      .onConflictDoUpdate({ target: sources.id, set: { ...sourceValues, updatedAt: new Date() } })
    sourceCount += 1
  }

  console.log(
    `[import-winter-v3-1-seed] organizations: ${orgCount}, sources: ${sourceCount} (${skippedDuplicateUrlCount} skipped: shared discovery URL already claimed)`,
  )
}

/* -------------------------------------------------------------------------- */
/*  Sources (from the offerings CSV's own per-row source columns)            */
/* -------------------------------------------------------------------------- */

/**
 * Each offering row also cites its own authoritative program/registration
 * page (distinct from that organization's homepage/directory source seeded
 * above) — e.g. Smugglers' Notch's "-organization-site" homepage vs. its
 * "-program" alpine-program page. Both are real, independently useful
 * sources, so both get a `sources` row.
 */
async function seedOfferingSources(offerings: OfferingRow[]) {
  const bySourceId = new Map<string, OfferingRow>()
  for (const row of offerings) {
    if (!bySourceId.has(row.source_id)) bySourceId.set(row.source_id, row)
  }

  let sourceCount = 0
  let skippedDuplicateUrlCount = 0

  for (const row of bySourceId.values()) {
    const url = row.source_url || row.registration_url
    const existingSourceId = sourceIdByUrl.get(url)
    if (existingSourceId && existingSourceId !== row.source_id) {
      skippedDuplicateUrlCount += 1
      continue
    }
    sourceIdByUrl.set(url, row.source_id)

    const platform = mapPlatform(row.registration_provider)
    const sourceValues = {
      id: row.source_id,
      organizationId: row.organization_id,
      url,
      sourceType: mapSourceType(platform),
      label: `${row.organization_name} — program page`,
      platform,
      authoritativeLevel: row.source_authority || "secondary",
      parserHints: {
        winterV3_1: { verificationStatus: row.verification_status, lifecycleStatus: row.lifecycle_status },
      },
      lastCrawledAt: asTimestamp(row.last_checked_at) ?? new Date(),
      lastSucceededAt: asTimestamp(row.last_checked_at) ?? new Date(),
      consecutiveFailures: 0,
      active: true,
      sourceStatus: "active",
    }

    await db
      .insert(sources)
      .values(sourceValues)
      .onConflictDoUpdate({ target: sources.id, set: { ...sourceValues, updatedAt: new Date() } })
    sourceCount += 1
  }

  console.log(
    `[import-winter-v3-1-seed] offering-level sources: ${sourceCount} (${skippedDuplicateUrlCount} skipped: URL already claimed)`,
  )
}

/* -------------------------------------------------------------------------- */
/*  Programs + offerings                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Same collision-handling rationale as import-v3-seed.ts: a handful of
 * program_id groups actually contain multiple distinct offerings in the same
 * season (e.g. Smugglers' Notch's per-age-group alpine teams share a program
 * name but not an age band). Those get their own program row per offering
 * instead of collapsing onto the CSV's coarser program_id/program_name.
 */
function buildProgramKeyForOffering(
  row: OfferingRow,
  collisionCounts: Map<string, number>,
): { programId: string; programTitle: string } {
  const groupKey = `${row.program_id}::${row.season_label}::${row.season_year}`
  const collides = (collisionCounts.get(groupKey) ?? 0) > 1
  if (!collides) {
    return { programId: row.program_id, programTitle: row.program_name }
  }
  return {
    programId: `${row.program_id}--${slugify(row.program_offering_id)}`,
    programTitle: row.program_offering_title,
  }
}

async function seedProgramsAndOfferings(offerings: OfferingRow[]) {
  const collisionCounts = new Map<string, number>()
  for (const row of offerings) {
    const groupKey = `${row.program_id}::${row.season_label}::${row.season_year}`
    collisionCounts.set(groupKey, (collisionCounts.get(groupKey) ?? 0) + 1)
  }

  let programCount = 0
  let offeringCount = 0
  let unpublishedCount = 0

  for (const row of offerings) {
    const { programId, programTitle } = buildProgramKeyForOffering(row, collisionCounts)
    const sportId = resolveSportId(row.activity_taxonomy_path)
    const competitionLevel = mapCompetitionLevel(row.competition_level)
    const audienceType = mapAudienceType(row.audience_type)
    const minAge = asInt(row.min_age)
    const maxAge = asInt(row.max_age)
    const minGrade = asInt(row.min_grade)
    const maxGrade = asInt(row.max_grade)
    const pending = isPending(row.verification_status)

    const tags: string[] = ["winter_v3_1_seed"]
    if (row.audience_type.includes(";")) tags.push("multi-audience")
    if (row.competition_level === "recreational_and_competitive") tags.push("recreational_and_competitive")
    if (row.competition_level === "training") tags.push("training")
    if (row.lifecycle_status && row.lifecycle_status !== "unknown") tags.push(`lifecycle_${row.lifecycle_status}`)

    const programValues = {
      id: programId,
      slug: `${slugify(row.organization_id)}-${slugify(programTitle)}`,
      organizationId: row.organization_id,
      sportId,
      title: programTitle,
      description: nullIfEmpty(row.notes),
      programType: mapProgramType(row.competition_level),
      programFormat: mapProgramFormat(row.program_format),
      audienceType,
      competitionLevel,
      minAge,
      maxAge,
      minGrade,
      maxGrade,
      typicalSeasons: ["winter"],
      verificationStatus: pending ? "unverified" : "ai_extracted",
      active: true,
      status: "active",
      matchKey: programMatchKey({
        organizationId: row.organization_id,
        sportId,
        gender: "any",
        minAge,
        maxAge,
        minGrade,
        maxGrade,
      }),
    }

    await db
      .insert(programs)
      .values(programValues)
      .onConflictDoUpdate({ target: programs.id, set: { ...programValues, updatedAt: new Date() } })
    programCount += 1

    const pricing = parseJsonArray(row.pricing_json).map(mapPricingEntry).filter(Boolean)
    const eligibilityRules = parseJsonArray(row.eligibility_rules_json)

    const seasonYearMatch = row.season_year.match(/^(\d{4})/)
    const seasonYear = seasonYearMatch ? Number.parseInt(seasonYearMatch[1]!, 10) : null

    const platform = mapPlatform(row.registration_provider)

    // Organization location is the offering's location — none of these rows
    // carry a location_json override (unlike the original v3 seed, no winter
    // program meets somewhere other than its club's home venue).
    const [org] = await db
      .select({ town: organizations.town, state: organizations.state })
      .from(organizations)
      .where(sql`${organizations.id} = ${row.organization_id}`)
      .limit(1)
    const geo = org ? geocodeFromGazetteer(org.town, org.state) : null

    const offeringValues = {
      id: row.program_offering_id,
      programId: programValues.id,
      season: "winter" as const,
      seasonYear,
      registrationOpenDate: asDate(row.registration_open_date),
      registrationCloseDate: asDate(row.registration_close_date),
      seasonStartDate: asDate(row.start_date),
      seasonEndDate: asDate(row.end_date),
      registrationUrl: nullIfEmpty(row.registration_url),
      registrationProvider: nullIfEmpty(row.registration_provider),
      registrationStatus: mapRegistrationStatus(row.registration_status),
      audienceType,
      pricing,
      eligibilityRules,
      tags,
      town: org?.town ?? null,
      state: org?.state ?? null,
      countryCode: "US",
      geocodePrecision: geo ? geo.precision : ("none" as const),
      sourceUrl: nullIfEmpty(row.source_url) ?? nullIfEmpty(row.registration_url),
      sourceType: mapSourceType(platform),
      dateDiscovered: asTimestamp(row.last_checked_at),
      dateLastChecked: asTimestamp(row.last_checked_at),
      verificationMethod: "ai_extraction",
      // See file header: dates/fees not yet published stay unpublished and
      // unverified rather than presented with false confidence.
      verificationStatus: pending ? "unverified" : "ai_extracted",
      published: !pending,
    }

    await db
      .insert(programOfferings)
      .values(offeringValues)
      .onConflictDoUpdate({ target: programOfferings.id, set: { ...offeringValues, updatedAt: new Date() } })

    if (geo) {
      await db
        .update(programOfferings)
        .set({ location: sql`${pointLiteral(geo.point.lng, geo.point.lat)}` as never })
        .where(sql`${programOfferings.id} = ${offeringValues.id}`)
    }

    if (!offeringValues.published) unpublishedCount += 1

    await seedProvenance(row, offeringValues.id)
    offeringCount += 1
  }

  console.log(
    `[import-winter-v3-1-seed] programs: ${programCount}, offerings: ${offeringCount} (${unpublishedCount} unpublished pending details)`,
  )
}

/* -------------------------------------------------------------------------- */
/*  Provenance                                                                */
/* -------------------------------------------------------------------------- */

async function seedProvenance(row: OfferingRow, offeringId: string) {
  const tracked: Array<[string, unknown]> = [
    ["registrationUrl", nullIfEmpty(row.registration_url)],
    ["registrationOpenDate", asDate(row.registration_open_date)],
    ["registrationCloseDate", asDate(row.registration_close_date)],
    ["seasonStartDate", asDate(row.start_date)],
    ["minAge", asInt(row.min_age)],
    ["maxAge", asInt(row.max_age)],
  ]

  const pending = isPending(row.verification_status)

  for (const [field, value] of tracked) {
    if (value === null || value === undefined) continue

    await db
      .insert(fieldProvenance)
      .values({
        id: `prov_${row.program_offering_id}_${field}`,
        entityType: "program_offering",
        entityId: offeringId,
        field,
        value: String(value),
        // Resolved through canonicalSourceId in case this row's own source_id
        // was skipped as a duplicate URL (see seedOfferingSources).
        sourceId: canonicalSourceId(row.source_url || row.registration_url, row.source_id),
        sourceType: "organization_website",
        extractionMethod: "ai_extraction",
        confidence: pending ? 0.4 : 0.65,
        extractionVersion: "winter_v3_1_seed",
        verificationStatus: pending ? "unverified" : "ai_extracted",
      })
      .onConflictDoNothing()
  }
}

/* -------------------------------------------------------------------------- */
/*  Entry point                                                               */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log("[import-winter-v3-1-seed] starting")

  const offerings = loadCsv<OfferingRow>("vt-winter-program-offerings-seed-v3_1.csv")
  const orgRows = loadCsv<OrgSourceRow>("vt-winter-org-sources-seed-v3_1.csv")

  console.log(`[import-winter-v3-1-seed] loaded ${offerings.length} offering rows, ${orgRows.length} org/source rows`)

  await seedOrganizationsAndSources(orgRows)
  await seedOfferingSources(offerings)
  await seedProgramsAndOfferings(offerings)

  const [counts] = await db
    .select({
      offerings: sql<number>`count(*)::int`,
      published: sql<number>`count(*) filter (where ${programOfferings.published})::int`,
    })
    .from(programOfferings)

  console.log("[import-winter-v3-1-seed] done", counts)
  await pool.end()
}

main().catch((err) => {
  console.error("[import-winter-v3-1-seed] failed", err)
  process.exit(1)
})
