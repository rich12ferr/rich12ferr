/**
 * Registers Shock Sports (private youth soccer training academy, Shelburne VT)
 * as an organization, plus its two dated program pages as crawl sources.
 *
 * Scope agreed with the operator:
 *   - /winter-26-27 is the parent schedule listing every winter program.
 *   - /winter-gameplay-2026 is the detail page for Winter Session 1.
 *   - /programs is background only (no dates or prices), so it is not crawled.
 *   - The ~55 single-event registration pages are skipped (mostly past events).
 *   - Invite-only programs (Sunday Select, advanced masterclass) are rejected
 *     at review rather than filtered here, so the crawl still sees them.
 *
 *   pnpm --filter @openplay/ingest register-shock-sports
 *
 * Idempotent — re-running updates rather than duplicates.
 */
import { db, organizations, pool, sources } from "@openplay/db"

import { organizationMatchKey } from "../src/entity-resolution"
import { checkRobots } from "../src/fetch"

const ORG = {
  id: "org-us-vt-shock-sports",
  slug: "shock-sports",
  name: "Shock Sports",
  organizationType: "commercial_provider",
  websiteUrl: "https://www.shocksportsvt.com",
  contactEmail: "admin@shocksportsvt.com",
  phone: "(802) 448-0068",
  town: "Shelburne",
  state: "VT",
  venueName: "Shelburne Field House",
  venueAddress: "166 Athletic Dr, Shelburne, VT",
  about:
    "Independent youth soccer training academy offering year-round small-group training, with Saturday programs at the Shelburne Field House and some Sunday sessions in Essex Junction.",
}

const SOURCES = [
  {
    id: "src_shock_sports_winter_schedule",
    url: "https://www.shocksportsvt.com/winter-26-27",
    label: "Shock Sports — Winter 2026–27 program schedule",
  },
  {
    id: "src_shock_sports_winter_gameplay",
    url: "https://www.shocksportsvt.com/winter-gameplay-2026",
    label: "Shock Sports — Winter Gameplay Session 1 (Saturdays, Shelburne)",
  },
]

async function main() {
  const matchKey = organizationMatchKey(ORG.name, ORG.town, ORG.state)
  await db
    .insert(organizations)
    .values({ ...ORG, matchKey, verificationStatus: "admin_reviewed" })
    .onConflictDoUpdate({
      target: organizations.id,
      set: { ...ORG, matchKey, updatedAt: new Date() },
    })
  console.log(`organization ${ORG.id}  matchKey=${matchKey}`)

  for (const source of SOURCES) {
    const robots = await checkRobots(source.url)
    const status = robots.allowed ? "active" : "disabled"
    const shared = {
      organizationId: ORG.id,
      url: source.url,
      label: source.label,
      crawlIntervalHours: 24,
      robotsAllowed: robots.allowed,
      robotsCheckedAt: new Date(),
      permissionNote: robots.note,
      active: robots.allowed,
      sourceStatus: status,
    }
    await db
      .insert(sources)
      .values({ id: source.id, sourceType: "organization_website", parserHints: {}, consecutiveFailures: 0, ...shared })
      .onConflictDoUpdate({ target: sources.id, set: { ...shared, updatedAt: new Date() } })
    console.log(`${robots.allowed ? "allowed" : "BLOCKED"} ${source.id}  ${source.url}  (${robots.note ?? "no note"})`)
  }

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
