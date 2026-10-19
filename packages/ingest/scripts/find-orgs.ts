/**
 * Lists organizations whose id, name or town contains a search term, plus the
 * sources that point at a matching (or missing) organization id.
 *
 *   pnpm --filter @openplay/ingest find-orgs montpelier
 */
import { db, organizations, pool, sources } from "@openplay/db"
import { ilike, or } from "drizzle-orm"

async function main() {
  const term = process.argv[2]
  if (!term) {
    console.error("Usage: pnpm --filter @openplay/ingest find-orgs <term>")
    process.exit(1)
  }
  const pattern = `%${term}%`

  const orgs = await db
    .select({ id: organizations.id, name: organizations.name, town: organizations.town })
    .from(organizations)
    .where(or(ilike(organizations.id, pattern), ilike(organizations.name, pattern), ilike(organizations.town, pattern)))

  const srcs = await db
    .select({ id: sources.id, organizationId: sources.organizationId, active: sources.active })
    .from(sources)
    .where(or(ilike(sources.id, pattern), ilike(sources.url, pattern), ilike(sources.organizationId, pattern)))

  const orgIds = new Set(orgs.map((o) => o.id))
  console.log("ORGANIZATIONS")
  console.log(JSON.stringify(orgs, null, 2))
  console.log("\nSOURCES")
  console.log(
    JSON.stringify(
      srcs.map((s) => ({ ...s, orgExists: s.organizationId ? orgIds.has(s.organizationId) : false })),
      null,
      2,
    ),
  )
  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
