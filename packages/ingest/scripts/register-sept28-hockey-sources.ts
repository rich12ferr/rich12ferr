/**
 * Registers the sources discovered in the Sept 28, 2026 weekly crawl report:
 * 2026-27 youth hockey registration opening across several Vermont
 * associations, plus a confirmed UVM Campus Recreation registration window.
 *
 * Split out from `register-sources.ts` because that script's shared
 * SEED_SOURCES list currently fails partway through on a pre-existing
 * duplicate URL (`sources_url_key` collision on cvtll.org) unrelated to this
 * batch — see the Sept 28 crawl follow-up. Once that is fixed, these entries
 * can be folded back into the shared list.
 *
 * Run with:
 *   pnpm --filter @openplay/ingest register-sept28-hockey-sources
 */
import { db, pool, sources } from "@openplay/db"

import { checkRobots } from "../src/fetch"

type SeedSource = {
  id: string
  organizationId: string
  url: string
  sourceType: "organization_website"
  label: string
  crawlIntervalHours: number
}

const SEED_SOURCES: SeedSource[] = [
  {
    id: "src_csb_hockey_registration",
    organizationId: "org_csb_hockey",
    url: "https://www.csbhockey.com/registration",
    sourceType: "organization_website",
    label: "CSB Youth Hockey registration",
    crawlIntervalHours: 24,
  },
  {
    id: "src_nekha_home",
    organizationId: "org_nekha",
    url: "https://www.layha.org/",
    sourceType: "organization_website",
    label: "Northeast Kingdom Hockey Association homepage",
    crawlIntervalHours: 24,
  },
  {
    id: "src_northshire_hockey_registration",
    organizationId: "org_northshire_hockey",
    url: "https://www.northshirehockey.org/registration",
    sourceType: "organization_website",
    label: "Northshire Hockey registration and forms",
    crawlIntervalHours: 24,
  },
  {
    id: "src_uvha_home",
    organizationId: "org_uvha",
    url: "https://www.uvha.org/",
    sourceType: "organization_website",
    label: "Upper Valley Hockey Association homepage",
    crawlIntervalHours: 24,
  },
  {
    id: "src_vsaha_pd_tryouts",
    organizationId: "org_vsaha",
    url: "https://www.vermonthockey.org/pdtryouts",
    sourceType: "organization_website",
    label: "VSAHA player development tryouts",
    crawlIntervalHours: 168,
  },
  {
    id: "src_uvm_campus_rec_overview",
    organizationId: "org_uvm_campus_rec",
    url: "https://uvmcampusrec.com/sports/2017/11/9/overview",
    sourceType: "organization_website",
    label: "UVM Campus Recreation intramural overview",
    crawlIntervalHours: 24,
  },
]

async function main() {
  console.log(`Registering ${SEED_SOURCES.length} sources...\n`)

  for (const seed of SEED_SOURCES) {
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

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
