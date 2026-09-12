/**
 * Registers Barre Figure Skating Club as a new organization + source set.
 *
 * A parent-reported update surfaced a Central Vermont ice-skating org with no
 * existing row in `organizations` or `sources` — this is the one-time
 * registration step every other seed source already went through (see
 * `register-sources.ts`), scoped to this single org so the real crawler can
 * be pointed at it and re-run like any other due source.
 *
 *   pnpm --filter @openplay/ingest register-barre-figure-skating
 *
 * Idempotent — re-running updates rather than duplicates.
 */
import { db, organizations, pool, sources } from "@openplay/db"
import { sql } from "drizzle-orm"

import { organizationMatchKey } from "../src/entity-resolution"
import { checkRobots } from "../src/fetch"
import { geocodeFromGazetteer } from "../src/geocode"

const ORG_ID = "org_barre_figure_skating"
const ORG_NAME = "Barre Figure Skating Club"
const TOWN = "Barre"
const STATE = "VT"

const SOURCE_PAGES = [
  {
    id: "src_barre_figure_skating_home",
    url: "https://www.barrefigureskatingclub.org/home",
    label: "Barre Figure Skating Club — homepage (calendar, key dates)",
    crawlIntervalHours: 24,
  },
  {
    id: "src_barre_figure_skating_registration",
    url: "https://www.barrefigureskatingclub.org/registration",
    label: "Barre Figure Skating Club — registration",
    crawlIntervalHours: 24,
  },
  {
    id: "src_barre_figure_skating_levels",
    url: "https://www.barrefigureskatingclub.org/levels",
    label: "Barre Figure Skating Club — levels (Snowplow Sam, Basic Skills 1-6, Pre-Free/Free Skate, USFS Freestyle)",
    crawlIntervalHours: 168,
  },
] as const

async function main() {
  const geo = geocodeFromGazetteer(TOWN, STATE)
  const matchKey = organizationMatchKey(ORG_NAME, TOWN, STATE)

  await db
    .insert(organizations)
    .values({
      id: ORG_ID,
      slug: "barre-figure-skating-club",
      name: ORG_NAME,
      // "youth_sports_organization" isn't in organizations_type_check; "club"
      // is the closest fit the schema actually allows for a membership club.
      organizationType: "club",
      websiteUrl: "https://www.barrefigureskatingclub.org/home",
      town: TOWN,
      state: STATE,
      countryCode: "US",
      venueName: "BOR Ice Arena",
      status: "active",
      verificationStatus: "ai_extracted",
      geocodePrecision: geo?.precision ?? "none",
      matchKey,
    })
    .onConflictDoUpdate({
      target: organizations.id,
      set: {
        name: ORG_NAME,
        websiteUrl: "https://www.barrefigureskatingclub.org/home",
        venueName: "BOR Ice Arena",
        matchKey,
        updatedAt: new Date(),
      },
    })

  if (geo) {
    await db
      .update(organizations)
      .set({ location: { lat: geo.point.lat, lng: geo.point.lng } })
      .where(sql`${organizations.id} = ${ORG_ID}`)
  }

  console.log(`Organization ${ORG_ID} (${ORG_NAME}) registered.\n`)

  for (const page of SOURCE_PAGES) {
    const robots = await checkRobots(page.url)

    await db
      .insert(sources)
      .values({
        id: page.id,
        organizationId: ORG_ID,
        url: page.url,
        sourceType: "organization_website",
        label: page.label,
        parserHints: {},
        crawlIntervalHours: page.crawlIntervalHours,
        robotsAllowed: robots.allowed,
        robotsCheckedAt: new Date(),
        permissionNote: robots.note,
        consecutiveFailures: 0,
        active: robots.allowed,
        sourceStatus: robots.allowed ? "active" : "disabled",
      })
      .onConflictDoUpdate({
        target: sources.id,
        set: {
          organizationId: ORG_ID,
          url: page.url,
          label: page.label,
          crawlIntervalHours: page.crawlIntervalHours,
          robotsAllowed: robots.allowed,
          robotsCheckedAt: new Date(),
          permissionNote: robots.note,
          active: robots.allowed,
          sourceStatus: robots.allowed ? "active" : "disabled",
          updatedAt: new Date(),
        },
      })

    console.log(
      `  ${robots.allowed ? "allowed " : "BLOCKED "} ${page.id}  ${page.url}` +
        (robots.crawlDelaySeconds ? `  crawl-delay ${robots.crawlDelaySeconds}s` : ""),
    )
  }

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
