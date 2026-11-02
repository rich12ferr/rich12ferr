/**
 * Registers ECHO, Leahy Center for Lake Champlain (Burlington) and its camps
 * page as a crawlable source. The page lists K-3 school-vacation day camps
 * (November, February and April break) plus summer camps when posted.
 *
 * Usage:
 *   pnpm --filter @openplay/ingest exec tsx --env-file-if-exists=/vercel/share/.env.project scripts/register-echo.ts
 * then crawl it:
 *   pnpm --filter @openplay/ingest crawl -- --source src_echo_camps
 */
import { db, organizations, pool, sources } from "@openplay/db"
import { eq } from "drizzle-orm"

import { checkRobots } from "../src/fetch"
import { organizationMatchKey } from "../src/entity-resolution"

const ORGANIZATION = {
  id: "org-us-vt-echo-leahy-center",
  slug: "echo-leahy-center-for-lake-champlain",
  name: "ECHO, Leahy Center for Lake Champlain",
  town: "Burlington",
  state: "VT",
  websiteUrl: "https://www.echovermont.org/",
  contactEmail: "camps@echovermont.org",
}

const SOURCE = {
  id: "src_echo_camps",
  url: "https://www.echovermont.org/events/camps/",
  label: "ECHO Camps (vacation and summer day camps)",
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
  // robots.txt allows OpenPlayBot, but Cloudflare bot protection answers it
  // with a 403 challenge. Keep the source paused; camps come from add-echo-camps.ts.
  robots.allowed = false
  robots.note =
    "robots.txt allows crawling, but Cloudflare bot protection returns 403 to OpenPlayBot. Camps are entered with scripts/add-echo-camps.ts; ask ECHO to allowlist the crawler to resume."
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
