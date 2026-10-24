/**
 * Lists sources whose id, url or label contains a search term.
 *
 *   pnpm --filter @openplay/ingest find-sources barreyouthsports
 */
import { db, pool, sources } from "@openplay/db"
import { ilike, or } from "drizzle-orm"

async function main() {
  const term = process.argv[2]
  if (!term) {
    console.error("Usage: pnpm --filter @openplay/ingest find-sources <term>")
    process.exit(1)
  }

  const pattern = `%${term}%`
  const rows = await db
    .select({
      id: sources.id,
      url: sources.url,
      platform: sources.platform,
      active: sources.active,
      status: sources.sourceStatus,
      terms: sources.termsStatus,
      failures: sources.consecutiveFailures,
    })
    .from(sources)
    .where(or(ilike(sources.id, pattern), ilike(sources.url, pattern), ilike(sources.label, pattern)))

  console.log(JSON.stringify(rows, null, 2))
  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
