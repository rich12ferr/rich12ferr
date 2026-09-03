/**
 * Registers the launch-region crawl sources.
 *
 * Sources are the input to the ingestion pipeline: each row is a page we have
 * checked for crawl permission and intend to re-read on a cadence. Run with:
 *
 *   pnpm --filter @openplay/ingest register-sources
 *
 * Idempotent — re-running updates the URL/cadence of an existing source rather
 * than creating a duplicate.
 */
import { db, pool, sources } from "@openplay/db"
import { sql } from "drizzle-orm"

import { checkRobots } from "../src/fetch"

type SeedSource = {
  id: string
  organizationId: string
  url: string
  /** Must match the `sources_type_check` constraint in the database. */
  sourceType:
    | "organization_website"
    | "school_athletics_page"
    | "registration_platform"
    | "community_submission"
    | "public_calendar"
    | "newsletter"
    | "organization_api"
    | "bulk_upload"
  label: string
  /**
   * How often to re-read. Registration pages change fastest in the weeks before
   * a season opens, so municipal rec listings get a tighter cadence than a
   * league's static homepage.
   */
  crawlIntervalHours: number
}

const SEED_SOURCES: SeedSource[] = [
  {
    id: "src_montpelier_rec_home",
    organizationId: "org_montpelier_rec",
    url: "https://www.montpelier-vt.org/",
    sourceType: "organization_website",
    label: "Montpelier city site (recreation landing)",
    crawlIntervalHours: 24,
  },
  {
    id: "src_montpelier_youth_programs",
    organizationId: "org_montpelier_rec",
    url: "https://www.montpelier-vt.org/988/Youth-Programs",
    sourceType: "organization_website",
    label: "Montpelier Youth Programs listing",
    crawlIntervalHours: 24,
  },
  {
    id: "src_waterbury_rec",
    organizationId: "org_waterbury_rec",
    url: "https://www.waterburyvt.com/departments/recreation",
    sourceType: "registration_platform",
    label: "Waterbury Recreation (MyRec portal)",
    crawlIntervalHours: 24,
  },
  {
    id: "src_barre_city",
    organizationId: "org_granite_ice",
    url: "https://www.barrecity.org/",
    sourceType: "organization_website",
    label: "Barre City departments index",
    crawlIntervalHours: 48,
  },
  {
    id: "src_vt_league_centralvt_littleleague",
    organizationId: "org_central-vermont-little-central-vermont",
    url: "https://www.cvtll.org/",
    sourceType: "organization_website",
    label: "Central Vermont Little League (baseball & softball) homepage",
    crawlIntervalHours: 168,
  },
  {
    id: "src_east_montpelier_rec_home",
    organizationId: "org_east_montpelier_rec",
    url: "https://www.eastmontpelierrecreation.org/home",
    sourceType: "organization_website",
    label: "East Montpelier Recreation homepage",
    crawlIntervalHours: 24,
  },
]

async function main() {
  console.log(`Registering ${SEED_SOURCES.length} sources...\n`)

  for (const seed of SEED_SOURCES) {
    // Check robots before storing, so we never persist a source we are not
    // permitted to crawl. The result is recorded rather than merely obeyed:
    // an admin needs to see *why* a source is inactive.
    const robots = await checkRobots(seed.url)

    await db
      .insert(sources)
      .values({
        id: seed.id,
        organizationId: seed.organizationId,
        url: seed.url,
        sourceType: seed.sourceType,
        label: seed.label,
        parserHints: {},
        crawlIntervalHours: seed.crawlIntervalHours,
        robotsAllowed: robots.allowed,
        robotsCheckedAt: new Date(),
        permissionNote: robots.note,
        consecutiveFailures: 0,
        active: robots.allowed,
      })
      .onConflictDoUpdate({
        target: sources.id,
        set: {
          url: seed.url,
          label: seed.label,
          crawlIntervalHours: seed.crawlIntervalHours,
          robotsAllowed: robots.allowed,
          robotsCheckedAt: new Date(),
          permissionNote: robots.note,
          active: robots.allowed,
          updatedAt: new Date(),
        },
      })

    console.log(
      `  ${robots.allowed ? "allowed " : "BLOCKED "} ${seed.id}` +
        `  every ${seed.crawlIntervalHours}h` +
        (robots.crawlDelaySeconds ? `  crawl-delay ${robots.crawlDelaySeconds}s` : ""),
    )
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sources)
  console.log(`\nsources table now holds ${count} row(s).`)

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
