/**
 * Moves every source linked to one organization id onto another, existing
 * organization. Use when sources were registered against an id that was never
 * created (approval fails with "Organization <id> not found").
 *
 *   pnpm --filter @openplay/ingest repoint-source-org <fromOrgId> <toOrgId>
 */
import { db, organizations, pool, sources } from "@openplay/db"
import { eq } from "drizzle-orm"

async function main() {
  const [fromOrgId, toOrgId] = process.argv.slice(2)
  if (!fromOrgId || !toOrgId) {
    console.error("Usage: pnpm --filter @openplay/ingest repoint-source-org <fromOrgId> <toOrgId>")
    process.exit(1)
  }

  const [target] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, toOrgId))
    .limit(1)
  if (!target) {
    console.error(`Target organization ${toOrgId} does not exist; nothing changed.`)
    process.exit(1)
  }

  const moved = await db
    .update(sources)
    .set({ organizationId: toOrgId, updatedAt: new Date() })
    .where(eq(sources.organizationId, fromOrgId))
    .returning({ id: sources.id })

  console.log(`Moved ${moved.length} source(s) from ${fromOrgId} to ${toOrgId} (${target.name}):`)
  for (const row of moved) console.log(`  ${row.id}`)
  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
