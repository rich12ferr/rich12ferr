/**
 * Registers the Vermont Institute of Natural Science (VINS, Quechee) and its
 * Nature Camp vacation-camps page as a crawlable source. The page lists the
 * Holiday (Dec 29-31) and February-break day camps for grades 1-4.
 *
 * Usage:
 *   pnpm --filter @openplay/ingest exec tsx --env-file-if-exists=/vercel/share/.env.project scripts/register-vins.ts
 * then crawl it:
 *   pnpm --filter @openplay/ingest crawl -- --source src_vins_vacation_camps
 */
import { db, organizations, pool, sources } from "@openplay/db"
import { eq } from "drizzle-orm"

import { checkRobots } from "../src/fetch"
import { organizationMatchKey } from "../src/entity-resolution"

const ORGANIZATION = {
  id: "org-us-vt-vermont-institute-of-natural-science",
  slug: "vermont-institute-of-natural-science",
  name: "Vermont Institute of Natural Science (VINS)",
  town: "Quechee",
  state: "VT",
  websiteUrl: "https://vinsweb.org/",
  contactEmail: "camps@vinsweb.org",
  contactPhone: "802-359-5000",
}

const SOURCE = {
  id: "src_vins_vacation_camps",
  url: "https://vinsweb.org/nature-camp/vacationcamps/",
  label: "VINS Nature Camp vacation camps (Holiday and February break)",
  crawlIntervalHours: 168,
}

async function main() {
  const matchKey = organizationMatchKey(ORGANIZATION.name, ORGANIZATION.town, ORGANIZATION.state)
  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.matchKey, matchKey))
    .limit(1)

  let organizationId = existing?.id
  if (!organizationId) {
    await db.insert(organizations).values({
      id: ORGANIZATION.id,
      slug: ORGANIZATION.slug,
      name: ORGANIZATION.name,
      organizationType: "nonprofit",
      websiteUrl: ORGANIZATION.websiteUrl,
      contactEmail: ORGANIZATION.contactEmail,
      town: ORGANIZATION.town,
      state: ORGANIZATION.state,
      matchKey,
    })
    organizationId = ORGANIZATION.id
  }
  console.log(`${ORGANIZATION.name}: ${existing ? "already existed" : "created"} (${organizationId})`)

  const robots = await checkRobots(SOURCE.url)
  await db
    .insert(sources)
    .values({
      id: SOURCE.id,
      organizationId,
      url: SOURCE.url,
      sourceType: "organization_website",
      label: SOURCE.label,
      crawlIntervalHours: SOURCE.crawlIntervalHours,
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
        url: SOURCE.url,
        label: SOURCE.label,
        robotsAllowed: robots.allowed,
        robotsCheckedAt: new Date(),
        permissionNote: robots.note,
        active: robots.allowed,
        updatedAt: new Date(),
      },
    })
  console.log(`${robots.allowed ? "allowed" : "BLOCKED"} ${SOURCE.id} -> ${SOURCE.url}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
