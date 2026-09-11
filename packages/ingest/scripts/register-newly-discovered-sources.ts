/**
 * Registers the "newly discovered organizations / sources" batch (section 3
 * of the 2026-09-11 source-discovery report, source_conversation_id
 * 6a9eb15d-c1f0-83ea-9cb2-1d2924fdd4c8): 9 organizations found via crawl
 * discovery rather than the original CSV registry, each with one or more
 * crawl URLs.
 *
 * This is the small hand-curated batch path — the counterpart to
 * import-source-registry.ts's CSV/JSON batch path, sized for a short list
 * pasted straight from a discovery report rather than round-tripped through
 * a spreadsheet. Organizations are found-or-created by matchKey exactly like
 * import-source-registry.ts's findOrCreateOrganization, and sources are
 * upserted by a stable hand-assigned id, so re-running after editing a
 * record only touches that record.
 *
 * Town/state for each organization were not present in the discovery report
 * (only `organization_or_source` + `coverage_value` + URLs) and were looked
 * up against each org's own site independently on 2026-09-11 — see the
 * `town` comment on each record below for the source of that lookup.
 *
 * Run: pnpm --filter @openplay/ingest register-newly-discovered-sources
 */
import type { OrganizationType, SourceAuthorityLevel } from "@openplay/core"
import { db, organizations, pool, sources } from "@openplay/db"
import { eq } from "drizzle-orm"

import { checkRobots } from "../src/fetch"
import { organizationMatchKey } from "../src/entity-resolution"

type SeedCrawlUrl = {
  id: string
  url: string
  /** Verbatim `role` from the discovery report's `crawl_urls` entry. */
  role: string
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
  authoritativeLevel: SourceAuthorityLevel
  crawlIntervalHours: number
}

type SeedOrganization = {
  id: string
  name: string
  organizationType: OrganizationType
  town: string
  state: string
  /** Verbatim `coverage_value` from the discovery report, kept for the label. */
  coverageValue: string
  crawlUrls: SeedCrawlUrl[]
}

const SEED_ORGANIZATIONS: SeedOrganization[] = [
  {
    id: "org_northern_vt_wrestling",
    name: "Northern Vermont Wrestling Club",
    organizationType: "club",
    // Registered address in Essex Junction; practices there and at Essex High School.
    town: "Essex Junction",
    state: "VT",
    coverageValue: "Wrestling; youth/teen; current registration",
    crawlUrls: [
      {
        id: "src_northern_vt_wrestling_home",
        url: "https://www.vtwrestling.org/",
        role: "primary",
        sourceType: "organization_website",
        authoritativeLevel: "primary",
        crawlIntervalHours: 168,
      },
    ],
  },
  {
    id: "org_vt_usa_wrestling",
    name: "Vermont USA Wrestling",
    organizationType: "state_association",
    town: "Statewide",
    state: "VT",
    coverageValue: "State governing body; club discovery and membership",
    crawlUrls: [
      {
        id: "src_vt_usa_wrestling_home",
        url: "https://www.vtusaw.com/Default.aspx",
        role: "primary",
        sourceType: "organization_website",
        // Registered as a discovery source, not a primary registration source:
        // its value is surfacing member clubs, not its own program listings.
        authoritativeLevel: "discovery_only",
        crawlIntervalHours: 168,
      },
    ],
  },
  {
    id: "org_lcmm_champlain_longboats",
    name: "Lake Champlain Maritime Museum / Champlain Longboats",
    organizationType: "nonprofit",
    // 4472 Basin Harbor Road, Vergennes, VT — the museum's waterfront campus.
    town: "Vergennes",
    state: "VT",
    coverageValue: "Youth and adult rowing statewide/school-based",
    crawlUrls: [
      {
        id: "src_lcmm_champlain_longboats_program",
        url: "https://www.lcmm.org/learn/for-everyone/champlain-longboats-program/",
        role: "primary",
        sourceType: "organization_website",
        authoritativeLevel: "primary",
        crawlIntervalHours: 168,
      },
    ],
  },
  {
    id: "org_moving_light_dance",
    name: "Moving Light Dance",
    organizationType: "commercial_provider",
    // 184 River Street, Montpelier, VT.
    town: "Montpelier",
    state: "VT",
    coverageValue: "Dance classes and camps in Montpelier",
    crawlUrls: [
      {
        id: "src_moving_light_dance_home",
        url: "https://movinglightdance.com/",
        role: "primary",
        sourceType: "organization_website",
        authoritativeLevel: "primary",
        crawlIntervalHours: 24,
      },
      {
        id: "src_moving_light_dance_summer_session",
        url: "https://movinglightdance.com/summer-session",
        role: "supplemental_program",
        sourceType: "organization_website",
        authoritativeLevel: "primary",
        crawlIntervalHours: 24,
      },
    ],
  },
  {
    id: "org_burlington_rugby",
    name: "Burlington Rugby Football Club",
    organizationType: "club",
    // Based in Burlington; practices at the Tree Farm facility in Essex Junction.
    town: "Burlington",
    state: "VT",
    coverageValue: "Adult rugby, active Fall 2026",
    crawlUrls: [
      {
        id: "src_burlington_rugby_home",
        url: "https://www.vermontrugby.org/",
        role: "primary",
        sourceType: "organization_website",
        authoritativeLevel: "primary",
        crawlIntervalHours: 168,
      },
    ],
  },
  {
    id: "org_mad_river_stowe_rugby",
    name: "Mad River/Stowe Rugby Football Club",
    organizationType: "club",
    // Stowe Polo Fields, 667 W Hill Rd, Stowe, VT.
    town: "Stowe",
    state: "VT",
    coverageValue: "Youth rugby development / school programs",
    crawlUrls: [
      {
        id: "src_mad_river_stowe_rugby_youth",
        url: "https://www.madriverrugby.org/youth-rugby",
        role: "primary_program",
        sourceType: "organization_website",
        // No current consumer registration found yet — discovery/organization
        // source only, per the report's recommended action for this record.
        authoritativeLevel: "discovery_only",
        crawlIntervalHours: 168,
      },
      {
        id: "src_mad_river_stowe_rugby_org",
        url: "https://www.madriverrugby.org/",
        role: "organization",
        sourceType: "organization_website",
        authoritativeLevel: "discovery_only",
        crawlIntervalHours: 168,
      },
    ],
  },
  {
    id: "org_vermont_national_cc",
    name: "Vermont National Country Club",
    organizationType: "facility_operator",
    // 1227 Dorset Street, South Burlington, VT.
    town: "South Burlington",
    state: "VT",
    coverageValue: "Junior Golf",
    crawlUrls: [
      {
        id: "src_vermont_national_cc_kids_corner",
        url: "https://vermontnational.com/Golf/Kids_Corner",
        role: "primary_program",
        sourceType: "organization_website",
        authoritativeLevel: "primary",
        crawlIntervalHours: 168,
      },
      {
        id: "src_vermont_national_cc_pga_jr_league",
        url: "https://www.pgajrleague.com/",
        role: "registration_provider",
        sourceType: "registration_platform",
        authoritativeLevel: "secondary",
        crawlIntervalHours: 168,
      },
    ],
  },
  {
    id: "org_links_at_lang_farm",
    name: "The Links at Lang Farm",
    organizationType: "facility_operator",
    // 39 Essex Way, Essex Junction, VT.
    town: "Essex Junction",
    state: "VT",
    coverageValue: "9U/13U/17U PGA Jr. League and junior golf programming",
    crawlUrls: [
      {
        id: "src_links_at_lang_farm_pga_jr_league",
        url: "https://linksatlangfarm.com/pga-junior-league/",
        role: "primary_program",
        sourceType: "organization_website",
        authoritativeLevel: "primary",
        crawlIntervalHours: 168,
      },
    ],
  },
  {
    id: "org_green_mountain_community_fitness",
    name: "Green Mountain Community Fitness",
    organizationType: "commercial_provider",
    // 652 Granger Road, Barre, VT.
    town: "Barre",
    state: "VT",
    coverageValue: "Pickleball, Sports Performance, swimming, camps",
    crawlUrls: [
      {
        id: "src_gmcf_home",
        url: "https://gmcf.life/",
        role: "primary",
        sourceType: "organization_website",
        authoritativeLevel: "primary",
        crawlIntervalHours: 24,
      },
      {
        id: "src_gmcf_pickleball",
        url: "https://gmcf.life/pickleball/",
        role: "supplemental_pickleball",
        sourceType: "organization_website",
        authoritativeLevel: "primary",
        crawlIntervalHours: 24,
      },
      {
        id: "src_gmcf_youth_programs",
        url: "https://gmcf.life/youth-programs/",
        role: "supplemental_youth_programs",
        sourceType: "organization_website",
        authoritativeLevel: "primary",
        crawlIntervalHours: 24,
      },
    ],
  },
]

/**
 * Finds an organization by the same matchKey used elsewhere in the pipeline
 * (see entity-resolution.ts), creating one from this seed if none exists.
 * Never updates an existing organization's fields — a match here means a
 * later crawl or a different registry batch already established the row,
 * and that row's data (possibly org-verified since) should not be
 * overwritten by this fixed seed.
 */
async function findOrCreateOrganization(seed: SeedOrganization): Promise<string> {
  const matchKey = organizationMatchKey(seed.name, seed.town, seed.state)

  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.matchKey, matchKey))
    .limit(1)
  if (existing) return existing.id

  const primaryUrl = seed.crawlUrls.find((c) => c.role.startsWith("primary"))?.url ?? seed.crawlUrls[0]?.url

  await db.insert(organizations).values({
    id: seed.id,
    slug: seed.id.replace(/^org_/, ""),
    name: seed.name,
    organizationType: seed.organizationType,
    websiteUrl: primaryUrl,
    town: seed.town,
    state: seed.state,
    matchKey,
  })

  return seed.id
}

async function main() {
  console.log(
    `Registering ${SEED_ORGANIZATIONS.length} newly discovered organizations ` +
      `(${SEED_ORGANIZATIONS.reduce((total, org) => total + org.crawlUrls.length, 0)} sources)...\n`,
  )

  let organizationsCreated = 0
  let sourcesCreated = 0
  let sourcesUpdated = 0
  let robotsBlocked = 0

  for (const seed of SEED_ORGANIZATIONS) {
    const [existingOrg] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, seed.id))
      .limit(1)

    const organizationId = await findOrCreateOrganization(seed)
    if (!existingOrg && organizationId === seed.id) organizationsCreated += 1

    console.log(`${seed.name} (${seed.town}, ${seed.state}) — ${seed.coverageValue}`)

    for (const crawlUrl of seed.crawlUrls) {
      // Same legality-before-persistence rule as register-sources.ts and
      // import-source-registry.ts: never store an active source we have not
      // checked, and record the result either way so an operator can see
      // *why* something isn't crawling.
      const robots = await checkRobots(crawlUrl.url)
      if (!robots.allowed) robotsBlocked += 1

      const [existingSource] = await db
        .select({ id: sources.id })
        .from(sources)
        .where(eq(sources.id, crawlUrl.id))
        .limit(1)

      await db
        .insert(sources)
        .values({
          id: crawlUrl.id,
          organizationId,
          url: crawlUrl.url,
          sourceType: crawlUrl.sourceType,
          label: `${seed.name} — ${crawlUrl.role}`,
          parserHints: {
            discoveryBatch: {
              sourceConversationId: "6a9eb15d-c1f0-83ea-9cb2-1d2924fdd4c8",
              asOfDate: "2026-09-11",
              role: crawlUrl.role,
            },
          },
          authoritativeLevel: crawlUrl.authoritativeLevel,
          crawlIntervalHours: crawlUrl.crawlIntervalHours,
          robotsAllowed: robots.allowed,
          robotsCheckedAt: new Date(),
          permissionNote: robots.note,
          consecutiveFailures: 0,
          active: robots.allowed,
          sourceStatus: robots.allowed ? "active" : "disabled",
          // Robots.txt says nothing about a site's actual Terms of Service —
          // same convention as import-source-registry.ts, every freshly
          // imported source starts unreviewed for ToS regardless of the
          // robots outcome.
          termsStatus: "needs_review",
        })
        .onConflictDoUpdate({
          target: sources.id,
          set: {
            organizationId,
            url: crawlUrl.url,
            sourceType: crawlUrl.sourceType,
            label: `${seed.name} — ${crawlUrl.role}`,
            authoritativeLevel: crawlUrl.authoritativeLevel,
            crawlIntervalHours: crawlUrl.crawlIntervalHours,
            robotsAllowed: robots.allowed,
            robotsCheckedAt: new Date(),
            permissionNote: robots.note,
            active: robots.allowed,
            sourceStatus: robots.allowed ? "active" : "disabled",
            updatedAt: new Date(),
          },
        })

      if (existingSource) sourcesUpdated += 1
      else sourcesCreated += 1

      console.log(
        `  ${robots.allowed ? "allowed " : "BLOCKED "} ${crawlUrl.id}` +
          `  [${crawlUrl.sourceType}/${crawlUrl.authoritativeLevel}]` +
          `  every ${crawlUrl.crawlIntervalHours}h` +
          (existingSource ? "  (updated)" : "  (created)"),
      )
    }
  }

  console.log(
    `\n${organizationsCreated} organization(s) created (of ${SEED_ORGANIZATIONS.length} seeded), ` +
      `${sourcesCreated} source(s) created, ${sourcesUpdated} updated, ${robotsBlocked} blocked by robots.txt.`,
  )
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
