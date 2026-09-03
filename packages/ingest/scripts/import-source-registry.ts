/**
 * Imports the generated source registry seed (data/vt-source-registry.seed.json)
 * into the `organizations` and `sources` tables.
 *
 * This is the ad hoc/recurring source-expansion path: an operator edits
 * data/vt-source-registry.csv, regenerates the JSON seed, then re-runs this
 * script. It is idempotent — organizations are found-or-created by match key,
 * and sources are upserted by a deterministic id derived from the CSV
 * `source_id` column, so re-running after editing a few rows only touches
 * those rows.
 *
 * Per the go-live decision for this batch: a source is auto-activated when
 * checkRobots() reports it is allowed, exactly like register-sources.ts does
 * for the original 3 sources. `terms_status` is NOT auto-approved by this
 * script — every imported source starts at terms_status='needs_review'
 * regardless of robots result, because robots.txt says nothing about a site's
 * actual Terms of Service. An operator flips terms_status to 'allowed' by hand
 * (see the approve-source script) after reading a source's ToS. Until then the
 * source can crawl (active=true if robots allows it) but should be treated as
 * legally unconfirmed.
 *
 * Run: pnpm --filter @openplay/ingest import-source-registry
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { db, organizations, pool, sources } from "@openplay/db"
import { eq, sql } from "drizzle-orm"

import { checkRobots } from "../src/fetch"
import { normalizeText, organizationMatchKey, significantTokens } from "../src/entity-resolution"
import type { SourceRegistryEntry } from "./generate-source-registry-seed"

const SEED_PATH = join(__dirname, "../data/vt-source-registry.seed.json")

/* -------------------------------------------------------------------------- */
/*  Taxonomy mapping                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The CSV's organization_type is a richer taxonomy (6 values) than the
 * database's `organizations_type_check` constraint (6 different values:
 * school, recreation_department, league, club, nonprofit, other). This maps
 * one to the other; the original CSV value is preserved verbatim in
 * `parser_hints.registry.organizationType` on the source row, so nothing is
 * lost even though the organization row itself is constrained.
 */
function mapOrganizationType(
  csvType: string,
): "school" | "recreation_department" | "league" | "club" | "nonprofit" | "other" {
  switch (csvType) {
    case "municipal_recreation":
      return "recreation_department"
    case "youth_league":
      return "league"
    case "private_youth_program_provider":
    case "youth_sports_organization":
      return "club"
    case "state_governing_body":
    case "state_member_directory":
      return "nonprofit"
    default:
      return "other"
  }
}

const REGISTRATION_PLATFORMS = new Set([
  "myrec",
  "civicrec",
  "webtrac",
  "webtrac/rectrac",
  "sportsengine",
  "usta",
])

const REGISTRATION_SOURCE_TYPES = new Set([
  "registration_landing_page",
  "registration_page",
  "registration_portal",
  "program_catalog",
  "organization_portal",
])

/**
 * Same rationale as mapOrganizationType: the CSV's source_type (12 free-text
 * values) is collapsed onto `sources_type_check`'s 8 allowed values. A source
 * maps to `registration_platform` when either its own CSV source_type says so
 * or its platform is a known registration system; everything else falls back
 * to `organization_website`. Full fidelity is kept in parser_hints.
 */
function mapSourceType(
  entry: SourceRegistryEntry,
): "organization_website" | "registration_platform" {
  if (REGISTRATION_SOURCE_TYPES.has(entry.sourceType)) return "registration_platform"
  if (REGISTRATION_PLATFORMS.has(entry.platform.toLowerCase())) return "registration_platform"
  return "organization_website"
}

/**
 * Baseline (offseason) crawl cadence in hours. This seeds `crawlIntervalHours`
 * only — `nextCrawlIntervalHours` (in pipeline.ts) already tightens the real
 * interval dynamically as a source's programs approach registration
 * deadlines, so the CSV's free-text cadence notes ("weekly; daily during
 * registration periods") don't need to be parsed in detail here, just given a
 * sane starting point.
 */
function baselineCrawlIntervalHours(crawlFrequency: string): number {
  if (crawlFrequency.startsWith("monthly")) return 24 * 30
  return 24 * 7
}

/* -------------------------------------------------------------------------- */
/*  Organization find-or-create                                              */
/* -------------------------------------------------------------------------- */

async function slugify(base: string): Promise<string> {
  const root = significantTokens(base).join("-") || "org"
  let candidate = root
  let suffix = 2
  // Small table, small batch — a loop-and-check is fine and keeps this
  // readable; no need for a clever collision-free id scheme.
  while (true) {
    const [existing] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, candidate))
      .limit(1)
    if (!existing) return candidate
    candidate = `${root}-${suffix}`
    suffix += 1
  }
}

/**
 * Finds an organization by the same matchKey used elsewhere in the pipeline
 * (see entity-resolution.ts), creating one if none exists. This is the
 * counterpart to resolveOrganizationId in pipeline.ts, which only looks up —
 * this script is the one place new organizations get created from a batch
 * import rather than from an extracted program.
 */
async function findOrCreateOrganization(entry: SourceRegistryEntry): Promise<string> {
  const matchKey = organizationMatchKey(entry.organization, entry.town, entry.state)

  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.matchKey, matchKey))
    .limit(1)
  if (existing) return existing.id

  const slug = await slugify(`${entry.organization}-${entry.town}`)
  const id = `org_${slug}`

  await db.insert(organizations).values({
    id,
    slug,
    name: entry.organization,
    organizationType: mapOrganizationType(entry.organizationType),
    websiteUrl: entry.sourceType === "organization_website" ? entry.sourceUrl : null,
    registrationPlatform: entry.platform,
    town: entry.town,
    state: entry.state,
    matchKey,
  })

  return id
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

function sourceId(csvSourceId: string): string {
  return `src_${normalizeText(csvSourceId).replace(/\s+/g, "_")}`
}

async function main() {
  const raw = readFileSync(SEED_PATH, "utf8")
  const seed: { entries: SourceRegistryEntry[] } = JSON.parse(raw)

  console.log(`Importing ${seed.entries.length} sources from the registry seed...\n`)

  let created = 0
  let updated = 0
  let robotsBlocked = 0

  for (const entry of seed.entries) {
    const organizationId = await findOrCreateOrganization(entry)

    // Same legality-before-persistence rule as register-sources.ts: never
    // store an active source we haven't checked, and record the result
    // either way so an operator can see *why* something isn't crawling.
    const robots = await checkRobots(entry.sourceUrl)
    if (!robots.allowed) robotsBlocked += 1

    const id = sourceId(entry.sourceId)
    const dbSourceType = mapSourceType(entry)

    const [existing] = await db
      .select({ id: sources.id })
      .from(sources)
      .where(eq(sources.id, id))
      .limit(1)

    await db
      .insert(sources)
      .values({
        id,
        organizationId,
        url: entry.sourceUrl,
        sourceType: dbSourceType,
        label: `${entry.organization} (${entry.town}, ${entry.state})`,
        parserHints: {
          registry: {
            csvSourceId: entry.sourceId,
            organizationType: entry.organizationType,
            sourceType: entry.sourceType,
            platform: entry.platform,
            crawlerAdapter: entry.crawlerAdapter,
            dataStructure: entry.dataStructure,
            sportsScope: entry.sportsScope,
            ingestionPriority: entry.ingestionPriority,
            humanReviewRequired: entry.humanReviewRequired,
            crawlFrequencyRaw: entry.crawlFrequency,
            notes: entry.notes,
          },
        },
        crawlIntervalHours: baselineCrawlIntervalHours(entry.crawlFrequency),
        robotsAllowed: robots.allowed,
        robotsCheckedAt: new Date(),
        permissionNote: robots.note,
        consecutiveFailures: 0,
        active: robots.allowed,
        sourceStatus: robots.allowed ? "active" : "disabled",
        // Robots and ToS are reviewed separately (see file header) — every
        // freshly imported source starts unreviewed for ToS regardless of
        // the robots outcome.
        termsStatus: "needs_review",
      })
      .onConflictDoUpdate({
        target: sources.id,
        set: {
          organizationId,
          url: entry.sourceUrl,
          sourceType: dbSourceType,
          label: `${entry.organization} (${entry.town}, ${entry.state})`,
          parserHints: {
            registry: {
              csvSourceId: entry.sourceId,
              organizationType: entry.organizationType,
              sourceType: entry.sourceType,
              platform: entry.platform,
              crawlerAdapter: entry.crawlerAdapter,
              dataStructure: entry.dataStructure,
              sportsScope: entry.sportsScope,
              ingestionPriority: entry.ingestionPriority,
              humanReviewRequired: entry.humanReviewRequired,
              crawlFrequencyRaw: entry.crawlFrequency,
              notes: entry.notes,
            },
          },
          crawlIntervalHours: baselineCrawlIntervalHours(entry.crawlFrequency),
          robotsAllowed: robots.allowed,
          robotsCheckedAt: new Date(),
          permissionNote: robots.note,
          active: robots.allowed,
          sourceStatus: robots.allowed ? "active" : "disabled",
          updatedAt: new Date(),
        },
      })

    if (existing) updated += 1
    else created += 1

    console.log(
      `  ${robots.allowed ? "allowed " : "BLOCKED "} ${id}` +
        `  [${dbSourceType}]` +
        `  every ${baselineCrawlIntervalHours(entry.crawlFrequency)}h` +
        (existing ? "  (updated)" : "  (created)"),
    )
  }

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(sources)

  console.log(
    `\n${created} source(s) created, ${updated} updated, ${robotsBlocked} blocked by robots.txt.`,
  )
  console.log(`sources table now holds ${count} row(s).`)
  console.log(
    `\nAll imported sources have terms_status='needs_review'. Run the approve-source script ` +
      `after reviewing each site's Terms of Service before treating it as fully cleared.`,
  )

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
