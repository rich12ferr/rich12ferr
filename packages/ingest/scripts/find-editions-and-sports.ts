/**
 * Read-only: lists recent weekly editions and sports matching a search term,
 * for authoring a new "This Week" story.
 *
 *   pnpm --filter @openplay/ingest exec tsx scripts/find-editions-and-sports.ts ski
 */
import { db, pool, sports, weeklyEditions, weeklyStories } from "@openplay/db"
import { desc, ilike, or, sql } from "drizzle-orm"

async function main() {
  const term = process.argv[2] ?? ""

  const editions = await db
    .select({
      id: weeklyEditions.id,
      weekSlug: weeklyEditions.weekSlug,
      weekStart: weeklyEditions.weekStart,
      published: weeklyEditions.published,
      stories: sql<number>`(select count(*)::int from ${weeklyStories} where ${weeklyStories.editionId} = ${weeklyEditions.id})`,
    })
    .from(weeklyEditions)
    .orderBy(desc(weeklyEditions.weekStart))
    .limit(4)
  console.log("EDITIONS")
  console.log(JSON.stringify(editions, null, 2))

  const matches = await db
    .select({ id: sports.id, name: sports.name, slug: sports.slug })
    .from(sports)
    .where(or(ilike(sports.name, `%${term}%`), ilike(sports.slug, `%${term}%`), ilike(sports.name, "%snow%")))
  console.log("SPORTS")
  console.log(JSON.stringify(matches, null, 2))

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
