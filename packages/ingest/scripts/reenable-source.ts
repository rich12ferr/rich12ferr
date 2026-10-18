/**
 * Re-enables a disabled source after a human has reviewed it.
 *
 *   pnpm --filter @openplay/ingest reenable-source <source-id>
 *
 * Re-checks robots.txt first and refuses to re-enable if the crawler is still
 * blocked. Otherwise records the terms review as "allowed", clears the failure
 * counter, and marks the source active so the next crawl picks it up. Run
 * `crawl -- --source <id>` afterwards to fetch it.
 */
import { db, pool, sources } from "@openplay/db"
import { eq } from "drizzle-orm"

import { checkRobots } from "../src/fetch"

async function main() {
  const sourceId = process.argv[2]
  if (!sourceId) {
    console.error("Usage: pnpm --filter @openplay/ingest reenable-source <source-id>")
    process.exit(1)
  }

  const [row] = await db.select().from(sources).where(eq(sources.id, sourceId)).limit(1)
  if (!row) {
    console.error(`No source with id "${sourceId}".`)
    await pool.end()
    process.exit(1)
  }

  const show = (label: string, s: typeof row) =>
    console.log(
      `${label}: active=${s.active} status=${s.sourceStatus} terms=${s.termsStatus} ` +
        `robotsAllowed=${s.robotsAllowed} failures=${s.consecutiveFailures}`,
    )

  console.log(`${row.id}  ${row.url}`)
  show("before", row)

  const robots = await checkRobots(row.url)
  if (!robots.allowed) {
    console.error(`robots.txt still blocks this URL (${robots.note}). Not re-enabling.`)
    await pool.end()
    process.exit(1)
  }

  await db
    .update(sources)
    .set({
      active: true,
      sourceStatus: "active",
      termsStatus: "allowed",
      robotsAllowed: true,
      robotsCheckedAt: new Date(),
      permissionNote: robots.note,
      consecutiveFailures: 0,
      updatedAt: new Date(),
    })
    .where(eq(sources.id, sourceId))

  const [after] = await db.select().from(sources).where(eq(sources.id, sourceId)).limit(1)
  show("after ", after)

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
