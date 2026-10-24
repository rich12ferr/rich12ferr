/**
 * Registers Shelburne Parks & Recreation's Bolton Valley Ski & Ride Program
 * page as a crawl source for the existing Shelburne organization.
 *
 * Shelburne's only source was its WebTrac registration platform, which sits
 * behind the same Vermont Systems hosting that blocks our crawler elsewhere.
 * The program page on the town site carries the full 2026-27 details (dates,
 * fees, staggered openings), so it's the page worth crawling.
 *
 *   pnpm --filter @openplay/ingest register-shelburne-bolton
 *
 * Idempotent — re-running updates rather than duplicates.
 */
import { db, pool, sources } from "@openplay/db"

import { checkRobots } from "../src/fetch"

const ORG_ID = "org-us-vt-shelburne-parks-recreation"
const SOURCE = {
  id: "src_shelburne_bolton_ski_ride",
  url: "https://www.shelburnevt.org/184/Bolton-Ski-Ride-Program",
  label: "Shelburne Parks & Recreation — Bolton Valley Ski & Ride Program",
  crawlIntervalHours: 24,
}

async function main() {
  const robots = await checkRobots(SOURCE.url)
  const status = robots.allowed ? "active" : "disabled"

  await db
    .insert(sources)
    .values({
      id: SOURCE.id,
      organizationId: ORG_ID,
      url: SOURCE.url,
      sourceType: "organization_website",
      label: SOURCE.label,
      parserHints: {},
      crawlIntervalHours: SOURCE.crawlIntervalHours,
      robotsAllowed: robots.allowed,
      robotsCheckedAt: new Date(),
      permissionNote: robots.note,
      consecutiveFailures: 0,
      active: robots.allowed,
      sourceStatus: status,
    })
    .onConflictDoUpdate({
      target: sources.id,
      set: {
        organizationId: ORG_ID,
        url: SOURCE.url,
        label: SOURCE.label,
        crawlIntervalHours: SOURCE.crawlIntervalHours,
        robotsAllowed: robots.allowed,
        robotsCheckedAt: new Date(),
        permissionNote: robots.note,
        active: robots.allowed,
        sourceStatus: status,
        updatedAt: new Date(),
      },
    })

  console.log(`${robots.allowed ? "allowed" : "BLOCKED"} ${SOURCE.id}  ${SOURCE.url}  (${robots.note ?? "no note"})`)
  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
