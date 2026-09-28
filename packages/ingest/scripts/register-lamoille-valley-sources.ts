/**
 * Registers two organizations found via the Healthy Lamoille Valley Youth
 * Sports Community Directory (healthylamoillevalley.org/sports) that had a
 * real crawlable web presence (registration page or registration-platform
 * profile) beyond a bare contact email:
 *
 *   - Vermont United Soccer Academy (Lamoille County, U6-U19)
 *   - Central Vermont Swim Club (based at NVU-Johnson's SHAPE pool)
 *
 * Every other organization on that directory page was excluded because it
 * only listed a personal email/phone/Facebook contact with no page for the
 * crawler to fetch — see the 2026-09-28 follow-up conversation for the full
 * list of excluded orgs and the reasoning.
 *
 * Town/state for each org came from the directory page itself: Central
 * Vermont Swim Club practices at NVU's Johnson campus; Vermont United Soccer
 * Academy trains and plays at the Bishop Marshall School in Morrisville.
 *
 * Run with:
 *   pnpm --filter @openplay/ingest register-lamoille-valley-sources
 */
import type { OrganizationType } from "@openplay/core"
import { db, organizations, pool, sources } from "@openplay/db"
import { eq } from "drizzle-orm"

import { checkRobots } from "../src/fetch"
import { organizationMatchKey } from "../src/entity-resolution"

type SeedSource = {
  id: string
  url: string
  sourceType: "organization_website" | "registration_platform"
  label: string
  crawlIntervalHours: number
}

type SeedOrganization = {
  id: string
  name: string
  organizationType: OrganizationType
  town: string
  state: string
  contactEmail: string
  sources: SeedSource[]
}

const SEED_ORGANIZATIONS: SeedOrganization[] = [
  {
    id: "org-us-vt-vermont-united-soccer-academy",
    name: "Vermont United Soccer Academy",
    organizationType: "club",
    // Trains and plays at the Bishop Marshall School.
    town: "Morrisville",
    state: "VT",
    contactEmail: "vermontunitedsocceracademy@gmail.com",
    sources: [
      {
        id: "src_vermont_united_soccer_academy_home",
        url: "https://www.vermontunitedsocceracademy.com/",
        sourceType: "organization_website",
        label: "Vermont United Soccer Academy homepage and public programs",
        crawlIntervalHours: 168,
      },
    ],
  },
  {
    id: "org-us-vt-central-vermont-swim-club",
    name: "Central Vermont Swim Club",
    organizationType: "club",
    // Practices at NVU-Johnson's SHAPE pool.
    town: "Johnson",
    state: "VT",
    contactEmail: "cvsc@gmail.com",
    sources: [
      {
        id: "src_central_vermont_swim_club_teamunify",
        url: "https://www.teamunify.com/necvsc/",
        sourceType: "registration_platform",
        label: "Central Vermont Swim Club TeamUnify profile",
        crawlIntervalHours: 168,
      },
    ],
  },
]

async function findOrCreateOrganization(seed: SeedOrganization): Promise<{ id: string; created: boolean }> {
  const matchKey = organizationMatchKey(seed.name, seed.town, seed.state)

  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.matchKey, matchKey))
    .limit(1)
  if (existing) return { id: existing.id, created: false }

  await db.insert(organizations).values({
    id: seed.id,
    slug: seed.id.replace(/^org-us-vt-/, ""),
    name: seed.name,
    organizationType: seed.organizationType,
    websiteUrl: seed.sources[0]?.url,
    contactEmail: seed.contactEmail,
    town: seed.town,
    state: seed.state,
    matchKey,
  })

  return { id: seed.id, created: true }
}

async function main() {
  console.log(`Registering ${SEED_ORGANIZATIONS.length} organizations from the Lamoille Valley directory...\n`)

  let organizationsCreated = 0
  let sourcesCreated = 0
  let sourcesUpdated = 0

  for (const seed of SEED_ORGANIZATIONS) {
    const { id: organizationId, created } = await findOrCreateOrganization(seed)
    if (created) organizationsCreated += 1

    console.log(`${seed.name} (${seed.town}, ${seed.state}) — ${created ? "created" : "already existed"}`)

    for (const source of seed.sources) {
      const robots = await checkRobots(source.url)

      const [existingSource] = await db
        .select({ id: sources.id })
        .from(sources)
        .where(eq(sources.id, source.id))
        .limit(1)

      await db
        .insert(sources)
        .values({
          id: source.id,
          organizationId,
          url: source.url,
          sourceType: source.sourceType,
          label: source.label,
          parserHints: {
            discoveryBatch: {
              source: "healthylamoillevalley.org/sports",
              asOfDate: "2026-09-28",
            },
          },
          crawlIntervalHours: source.crawlIntervalHours,
          robotsAllowed: robots.allowed,
          robotsCheckedAt: new Date(),
          permissionNote: robots.note,
          consecutiveFailures: 0,
          active: robots.allowed,
        })
        .onConflictDoUpdate({
          target: sources.id,
          set: {
            organizationId,
            url: source.url,
            sourceType: source.sourceType,
            label: source.label,
            crawlIntervalHours: source.crawlIntervalHours,
            robotsAllowed: robots.allowed,
            robotsCheckedAt: new Date(),
            permissionNote: robots.note,
            active: robots.allowed,
            updatedAt: new Date(),
          },
        })

      if (existingSource) sourcesUpdated += 1
      else sourcesCreated += 1

      console.log(
        `  ${robots.allowed ? "allowed " : "BLOCKED "} ${source.id}` +
          `  every ${source.crawlIntervalHours}h` +
          (existingSource ? "  (updated)" : "  (created)"),
      )
    }
  }

  console.log(
    `\n${organizationsCreated} organization(s) created (of ${SEED_ORGANIZATIONS.length} seeded), ` +
      `${sourcesCreated} source(s) created, ${sourcesUpdated} updated.`,
  )

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
