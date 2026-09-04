/**
 * Imports the v3 canonical crawl seed — data/vt-program-offerings-seed-v3.csv
 * (153 offerings, AI-extracted and web-verified from live pages) plus
 * data/vt-source-crawl-report-v3.csv (47 sources across 43 organizations,
 * including 18 organizations with a registered source but no extractable
 * offering yet) — into organizations, sources, programs, and
 * program_offerings.
 *
 * Per the go-live decision for this batch: every offering is published
 * immediately (published=true) with verification_status='ai_extracted'
 * (not admin-reviewed) rather than landing unpublished for spot-check.
 *
 * Idempotent — every insert is an upsert keyed on the CSV's own stable id
 * (organization_id / program_id / program_offering_id / source_id), so this
 * can be re-run safely after editing the CSVs.
 *
 * Run: pnpm --filter @openplay/ingest exec tsx scripts/import-v3-seed.ts
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

type CrawlRow = {
  source_id: string
  organization_id: string
  organization_name: string
  source_url: string
  platform: string
  authoritative_level: string
  crawl_status: string
  program_offerings_in_v3_for_org: string
  last_checked_at: string
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

function parseJsonObject(value: string | undefined): Record<string, unknown> {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

/* -------------------------------------------------------------------------- */
/*  Taxonomy mapping — CSV free text -> @openplay/core closed vocabularies    */
/* -------------------------------------------------------------------------- */

/** Same mapping as import-source-registry.ts, kept consistent across both importers. */
function mapOrganizationType(csvType: string): OrganizationType {
  switch (csvType) {
    case "municipal_recreation":
    case "school":
    case "school_district":
    case "league":
    case "club":
    case "nonprofit":
    case "commercial_provider":
    case "camp_provider":
    case "state_association":
    case "national_association":
    case "community_group":
    case "facility_operator":
      return csvType as OrganizationType
    case "youth_league":
      return "league"
    case "private_youth_program_provider":
      return "commercial_provider"
    case "state_governing_body":
      return "state_association"
    case "youth_sports_organization":
      return "nonprofit"
    default:
      return "other"
  }
}

function mapAudienceType(csvValue: string): AudienceType | null {
  const v = nullIfEmpty(csvValue)
  if (!v) return null
  if (v === "youth;adult") return "all_ages"
  if (v === "youth" || v === "adult" || v === "all_ages" || v === "family") return v
  return null
}

/** The two "club" program_format rows are both hockey leagues, not one-off clinics. */
function mapProgramFormat(csvValue: string): ProgramFormat | null {
  const v = nullIfEmpty(csvValue)
  if (!v) return null
  switch (v) {
    case "clinic":
      return "clinic"
    case "club":
      return "league"
    case "drop_in":
      return "drop_in"
    case "league":
      return "league"
    case "lessons":
      return "class"
    default:
      return "other"
  }
}

/** "recreational_and_travel" collapses to "recreational"; the full CSV value is kept in tags. */
function mapCompetitionLevel(csvValue: string): CompetitionLevel | null {
  const v = nullIfEmpty(csvValue)
  if (!v) return null
  switch (v) {
    case "competitive":
      return "competitive"
    case "developmental":
      return "recreational"
    case "recreational_and_travel":
      return "recreational"
    default:
      return null
  }
}

function mapProgramType(competitionLevel: string): ProgramType {
  return competitionLevel === "competitive" ? "competitive" : "recreational"
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

/** `sources.source_status`, derived from the crawl report's outcome for this attempt. */
function mapSourceStatus(crawlStatus: string): { active: boolean; sourceStatus: string } {
  switch (crawlStatus) {
    case "offering_data_extracted_or_corroborated":
    case "source_reachable_but_no_current_offering_extracted":
    case "checked_no_qualifying_offering_extracted":
    case "blocked_direct_but_indexed_search_success":
      return { active: true, sourceStatus: "active" }
    case "blocked_403":
    case "blocked_403_direct_but_known_registration":
    case "blocked_403_direct_but_indexed_elsewhere":
      return { active: false, sourceStatus: "disabled" }
    case "fetch_failed":
      return { active: false, sourceStatus: "paused" }
    case "discovery_only_not_authoritative":
      return { active: false, sourceStatus: "pending_review" }
    default:
      return { active: true, sourceStatus: "pending_review" }
  }
}

/**
 * Manual town/state overrides for the 18 organizations that appear only in
 * the crawl report (a registered source with no extracted offering yet), so
 * they have no location_json to read from. `organizations.town`/`state` are
 * NOT NULL, so every organization needs one of these two paths.
 */
const ORG_LOCATION_OVERRIDES: Record<string, { town: string; state: string }> = {
  "org-us-vt-barre-community-baseball-softball": { town: "Barre", state: "VT" },
  "org-us-vt-barre-youth-sports-association": { town: "Barre", state: "VT" },
  "org-us-vt-charlotte-recreation": { town: "Charlotte", state: "VT" },
  "org-us-vt-hartland-recreation": { town: "Hartland", state: "VT" },
  "org-us-vt-montpelier-recreation": { town: "Montpelier", state: "VT" },
  "org-us-vt-northfield-community-athletics": { town: "Northfield", state: "VT" },
  "org-us-vt-vsaha-member-associations": { town: "Vermont (statewide)", state: "VT" },
  "org-us-vt-vermont-state-amateur-hockey-association": { town: "Vermont (statewide)", state: "VT" },
  "org-us-vt-barre-city-recreation": { town: "Barre", state: "VT" },
  "org-us-vt-bradford-youth-sports": { town: "Bradford", state: "VT" },
  "org-us-vt-brattleboro-recreation-parks": { town: "Brattleboro", state: "VT" },
  "org-us-vt-colchester-parks-recreation": { town: "Colchester", state: "VT" },
  "org-us-vt-lyndon-recreation": { town: "Lyndon", state: "VT" },
  "org-us-vt-milton-recreation": { town: "Milton", state: "VT" },
  "org-us-vt-south-burlington-recreation-parks": { town: "South Burlington", state: "VT" },
  "org-us-vt-stowe-parks-recreation": { town: "Stowe", state: "VT" },
  "org-us-vt-usta-junior-tennis-vermont": { town: "Vermont (statewide)", state: "VT" },
  "org-us-vt-usta-vermont": { town: "Vermont (statewide)", state: "VT" },
}

/** Same organization_type overrides for the 18 crawl-only organizations (no offering row to read it from). */
const ORG_TYPE_OVERRIDES: Record<string, string> = {
  "org-us-vt-barre-community-baseball-softball": "youth_league",
  "org-us-vt-barre-youth-sports-association": "youth_sports_organization",
  "org-us-vt-charlotte-recreation": "municipal_recreation",
  "org-us-vt-hartland-recreation": "municipal_recreation",
  "org-us-vt-montpelier-recreation": "municipal_recreation",
  "org-us-vt-northfield-community-athletics": "youth_sports_organization",
  "org-us-vt-vsaha-member-associations": "state_governing_body",
  "org-us-vt-vermont-state-amateur-hockey-association": "state_governing_body",
  "org-us-vt-barre-city-recreation": "municipal_recreation",
  "org-us-vt-bradford-youth-sports": "youth_sports_organization",
  "org-us-vt-brattleboro-recreation-parks": "municipal_recreation",
  "org-us-vt-colchester-parks-recreation": "municipal_recreation",
  "org-us-vt-lyndon-recreation": "municipal_recreation",
  "org-us-vt-milton-recreation": "municipal_recreation",
  "org-us-vt-south-burlington-recreation-parks": "municipal_recreation",
  "org-us-vt-stowe-parks-recreation": "municipal_recreation",
  "org-us-vt-usta-junior-tennis-vermont": "state_governing_body",
  "org-us-vt-usta-vermont": "state_governing_body",
}

/**
 * The activity taxonomy path -> @openplay/core sport slug. New sports/camps
 * bucket added in packages/core/src/domain/sport.ts specifically for this
 * import: 6 real sports (volleyball, gymnastics, swimming, mountain-biking,
 * sled-hockey, ultimate-frisbee) plus one catch-all "camps-enrichment" sport
 * for every generic (non-sport-specific) camp/clinic taxonomy leaf.
 */
const TAXONOMY_TO_SPORT_SLUG: Record<string, string> = {
  Baseball: "baseball",
  Basketball: "basketball",
  "Cross Country": "cross-country",
  "Field Hockey": "field-hockey",
  "Flag Football": "flag-football",
  Football: "football",
  Hockey: "hockey",
  "Ice Hockey": "hockey",
  "Ice Skating": "ice-skating",
  Lacrosse: "lacrosse",
  "Martial Arts": "martial-arts",
  Soccer: "soccer",
  Softball: "softball",
  Tennis: "tennis",
  "Track & Field": "track-and-field",
  "Track and Field": "track-and-field",
  Volleyball: "volleyball",
  Gymnastics: "gymnastics",
  Swimming: "swimming",
  "Mountain Biking": "mountain-biking",
  "Sled Hockey": "sled-hockey",
  "Ultimate Frisbee": "ultimate-frisbee",
}

/** Real sport slug -> id lookup. A sport's id doesn't always derive algorithmically from its slug (e.g. "track-and-field" -> "sp_track_field"), so this must read the actual SPORTS array rather than guessing. */
const SPORT_ID_BY_SLUG: Record<string, string> = Object.fromEntries(SPORTS.map((s) => [s.slug, s.id]))

/**
 * Resolves an `activity_taxonomy_path` like "Sports > Team Sports > Soccer"
 * or "Camps > Sports Camps" to a sport id. Matches the taxonomy path's last
 * segment against a known sport name first (so "Camps > Sports Camps >
 * Mountain Biking" still resolves to mountain-biking); anything with no
 * sport-specific leaf (generic day/STEM/specialty camps, sports clinics with
 * no named sport) falls back to the "camps-enrichment" catch-all.
 */
function resolveSportId(taxonomyPath: string): string {
  const segments = taxonomyPath.split(">").map((s) => s.trim())
  for (const segment of [...segments].reverse()) {
    const slug = TAXONOMY_TO_SPORT_SLUG[segment]
    const id = slug ? SPORT_ID_BY_SLUG[slug] : undefined
    if (id) return id
  }
  return SPORT_ID_BY_SLUG["camps-enrichment"]!
}

/** `pricing[].type` in the CSV ("player"/"team") onto @openplay/core's PricingType. */
function mapPricingEntry(entry: unknown): Record<string, unknown> | null {
  if (typeof entry !== "object" || entry === null) return null
  const e = entry as Record<string, unknown>
  const csvType = typeof e.type === "string" ? e.type : "other"
  const type = csvType === "player" ? "registration" : csvType === "team" ? "other" : csvType
  return { ...e, type, original_type: csvType }
}

/* -------------------------------------------------------------------------- */
/*  Organizations                                                            */
/* -------------------------------------------------------------------------- */

async function seedOrganizations(offerings: OfferingRow[], crawlRows: CrawlRow[]) {
  // One representative offering per organization, for orgs that have any —
  // carries organization_type, location_json, and a registration_provider
  // hint. Crawl-only organizations (no offering) fall back to the override
  // tables above.
  const firstOfferingByOrg = new Map<string, OfferingRow>()
  for (const row of offerings) {
    if (!firstOfferingByOrg.has(row.organization_id)) {
      firstOfferingByOrg.set(row.organization_id, row)
    }
  }

  const firstSourceByOrg = new Map<string, CrawlRow>()
  for (const row of crawlRows) {
    if (!firstSourceByOrg.has(row.organization_id)) {
      firstSourceByOrg.set(row.organization_id, row)
    }
  }

  const allOrgIds = new Set<string>([...firstOfferingByOrg.keys(), ...firstSourceByOrg.keys()])

  let count = 0
  for (const orgId of allOrgIds) {
    const offering = firstOfferingByOrg.get(orgId)
    const crawlSource = firstSourceByOrg.get(orgId)
    const name = offering?.organization_name ?? crawlSource?.organization_name
    if (!name) continue

    const location = offering ? parseJsonObject(offering.location_json) : {}
    const town =
      (typeof location.city === "string" ? location.city : null) ??
      ORG_LOCATION_OVERRIDES[orgId]?.town ??
      null
    const state =
      (typeof location.state === "string" ? location.state : null) ??
      ORG_LOCATION_OVERRIDES[orgId]?.state ??
      null
    if (!town || !state) {
      console.warn(`[import-v3-seed] skipping organization with no resolvable location: ${orgId}`)
      continue
    }

    const csvOrgType = offering?.organization_type ?? ORG_TYPE_OVERRIDES[orgId] ?? "other"
    const slug = slugify(name)
    const matchKey = organizationMatchKey(name, town, state)
    const geo = geocodeFromGazetteer(town, state)

    const values = {
      id: orgId,
      slug,
      name,
      organizationType: mapOrganizationType(csvOrgType),
      websiteUrl: crawlSource?.source_url ?? offering?.registration_url ?? null,
      registrationPlatform: offering?.registration_provider ?? crawlSource?.platform ?? null,
      town,
      state,
      countryCode: "US",
      status: "active",
      verificationStatus: "ai_extracted",
      geocodePrecision: geo ? geo.precision : ("none" as const),
      matchKey,
    }

    await db
      .insert(organizations)
      .values(values)
      .onConflictDoUpdate({ target: organizations.id, set: { ...values, updatedAt: new Date() } })

    if (geo) {
      await db
        .update(organizations)
        .set({ location: sql`${pointLiteral(geo.point.lng, geo.point.lat)}` as never })
        .where(sql`${organizations.id} = ${orgId}`)
    }

    count += 1
  }

  console.log(`[import-v3-seed] organizations: ${count}`)
}

/* -------------------------------------------------------------------------- */
/*  Sources                                                                   */
/* -------------------------------------------------------------------------- */

async function seedSources(crawlRows: CrawlRow[]) {
  for (const row of crawlRows) {
    const platform = mapPlatform(row.platform)
    const { active, sourceStatus } = mapSourceStatus(row.crawl_status)

    const values = {
      id: row.source_id,
      organizationId: row.organization_id,
      url: row.source_url,
      sourceType: mapSourceType(platform),
      label: `${row.organization_name} — ${row.platform}`,
      platform,
      authoritativeLevel: row.authoritative_level || "secondary",
      parserHints: {
        v3CrawlReport: {
          crawlStatus: row.crawl_status,
          platformRaw: row.platform,
          offeringsInV3ForOrg: asInt(row.program_offerings_in_v3_for_org) ?? 0,
        },
      },
      lastCrawledAt: asTimestamp(row.last_checked_at),
      lastSucceededAt: row.crawl_status === "offering_data_extracted_or_corroborated" ? asTimestamp(row.last_checked_at) : null,
      consecutiveFailures: active ? 0 : 1,
      active,
      sourceStatus,
      discoveryNote: nullIfEmpty(row.notes),
    }

    await db
      .insert(sources)
      .values(values)
      .onConflictDoUpdate({ target: sources.id, set: { ...values, updatedAt: new Date() } })
  }

  console.log(`[import-v3-seed] sources: ${crawlRows.length}`)
}

/* -------------------------------------------------------------------------- */
/*  Programs + offerings                                                     */
/* -------------------------------------------------------------------------- */

/**
 * `program_offerings` has a unique (program_id, season, season_year)
 * constraint, but 14 of the CSV's program_id groups (42 rows) actually
 * contain multiple distinct offerings in the same season — different grade
 * bands ("2nd Grade Boys Basketball" vs "3/4 Girls Basketball"), named
 * sessions (swim lesson sessions 1-3), or camp variants. Those are genuinely
 * separate programs, so within a colliding group each offering gets its own
 * program row (id + title derived from the offering itself) instead of
 * sharing the CSV's coarser program_id/program_name.
 */
function buildProgramKeyForOffering(row: OfferingRow, collisionCounts: Map<string, number>): { programId: string; programTitle: string } {
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

async function seedProgramsAndOfferings(offerings: OfferingRow[], crawlRows: CrawlRow[]) {
  const sourceById = new Map(crawlRows.map((r) => [r.source_id, r]))

  const collisionCounts = new Map<string, number>()
  for (const row of offerings) {
    const groupKey = `${row.program_id}::${row.season_label}::${row.season_year}`
    collisionCounts.set(groupKey, (collisionCounts.get(groupKey) ?? 0) + 1)
  }

  let programCount = 0
  let offeringCount = 0

  for (const row of offerings) {
    const { programId, programTitle } = buildProgramKeyForOffering(row, collisionCounts)
    const sportId = resolveSportId(row.activity_taxonomy_path)
    const competitionLevel = mapCompetitionLevel(row.competition_level)
    const audienceType = mapAudienceType(row.audience_type)
    const minAge = asInt(row.min_age)
    const maxAge = asInt(row.max_age)
    const minGrade = asInt(row.min_grade)
    const maxGrade = asInt(row.max_grade)

    const tags: string[] = []
    if (row.audience_type === "youth;adult") tags.push("youth-and-adult")
    if (row.competition_level === "recreational_and_travel") tags.push("recreational_and_travel")
    if (row.season_label === "fall_winter") tags.push("fall_winter")
    if (/^\d{4}-\d{4}$/.test(row.season_year)) tags.push(`school_year_${row.season_year}`)
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
      typicalSeasons: row.season_label && row.season_label !== "fall_winter" ? [row.season_label] : row.season_label === "fall_winter" ? ["fall", "winter"] : [],
      verificationStatus: "ai_extracted",
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

    const location = parseJsonObject(row.location_json)
    const town = typeof location.city === "string" ? location.city : null
    const state = typeof location.state === "string" ? location.state : null
    const geo = geocodeFromGazetteer(town, state)

    const pricing = parseJsonArray(row.pricing_json).map(mapPricingEntry).filter(Boolean)
    const eligibilityRules = parseJsonArray(row.eligibility_rules_json)
    const schedule = parseJsonObject(row.schedule_json)
    const sessions =
      Object.keys(schedule).length > 0
        ? [
            {
              date: schedule.date ?? null,
              startTime: schedule.start_time ?? null,
              endTime: schedule.end_time ?? null,
            },
          ]
        : []

    const sourceRow = sourceById.get(row.source_id)
    const platform = sourceRow ? mapPlatform(sourceRow.platform) : "generic_html"

    const seasonYearMatch = row.season_year.match(/^(\d{4})/)
    const seasonYear = seasonYearMatch ? Number.parseInt(seasonYearMatch[1]!, 10) : null
    const season = row.season_label === "fall_winter" ? "fall" : nullIfEmpty(row.season_label)

    const offeringValues = {
      id: row.program_offering_id,
      programId: programValues.id,
      season,
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
      sessions,
      tags,
      town,
      state,
      countryCode: "US",
      geocodePrecision: geo ? geo.precision : ("none" as const),
      sourceUrl: nullIfEmpty(row.source_url) ?? nullIfEmpty(row.registration_url),
      sourceType: mapSourceType(platform),
      dateDiscovered: asTimestamp(row.last_checked_at),
      dateLastChecked: asTimestamp(row.last_checked_at),
      verificationMethod: "ai_extraction",
      // Every offering in this batch is AI-extracted and web-verified, not
      // yet admin-reviewed — see the go-live decision in the file header.
      verificationStatus: "ai_extracted",
      published: true,
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

    await seedProvenance(row, offeringValues.id)
    offeringCount += 1
  }

  console.log(`[import-v3-seed] programs: ${programCount}, offerings: ${offeringCount}`)
}

/* -------------------------------------------------------------------------- */
/*  Provenance                                                                */
/* -------------------------------------------------------------------------- */

async function seedProvenance(row: OfferingRow, offeringId: string) {
  const tracked: Array<[string, unknown]> = [
    ["registrationUrl", nullIfEmpty(row.registration_url)],
    ["registrationOpenDate", asDate(row.registration_open_date)],
    ["registrationCloseDate", asDate(row.registration_close_date)],
    ["minAge", asInt(row.min_age)],
    ["maxAge", asInt(row.max_age)],
  ]

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
        sourceId: row.source_id,
        sourceType: "registration_platform",
        extractionMethod: "ai_extraction",
        confidence: 0.65,
        extractionVersion: "v3_seed",
        verificationStatus: "ai_extracted",
      })
      .onConflictDoNothing()
  }
}

/* -------------------------------------------------------------------------- */
/*  Entry point                                                               */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log("[import-v3-seed] starting")

  const offerings = loadCsv<OfferingRow>("vt-program-offerings-seed-v3.csv")
  const crawlRows = loadCsv<CrawlRow>("vt-source-crawl-report-v3.csv")

  console.log(`[import-v3-seed] loaded ${offerings.length} offering rows, ${crawlRows.length} source rows`)

  await seedOrganizations(offerings, crawlRows)
  await seedSources(crawlRows)
  await seedProgramsAndOfferings(offerings, crawlRows)

  const [counts] = await db
    .select({
      offerings: sql<number>`count(*)::int`,
      published: sql<number>`count(*) filter (where ${programOfferings.published})::int`,
    })
    .from(programOfferings)

  console.log("[import-v3-seed] done", counts)
  await pool.end()
}

main().catch((err) => {
  console.error("[import-v3-seed] failed", err)
  process.exit(1)
})
