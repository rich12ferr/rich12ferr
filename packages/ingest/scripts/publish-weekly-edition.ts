/**
 * Publishes a drafted `weekly_editions` row — the "publish to This Week"
 * step of the editorial loop, and the only thing that makes an edition
 * visible on `/this-week` and eligible for the homepage's "What's happening
 * this week" module.
 *
 * Refuses to publish an edition whose `featuredRank` values (the homepage's
 * top-3 slots) are invalid — out of the 1-3 range, or duplicated — since a
 * bad rank would either silently drop a story from the homepage module or
 * make it disappear entirely (`homepage promotes top 3` breaks otherwise).
 * An edition with zero featured stories is allowed: it just will not
 * appear in the homepage module, only in the `/this-week` archive.
 *
 * Idempotent: publishing an already-published edition just re-validates and
 * leaves `publishedAt` as it was.
 *
 * Usage:
 *   pnpm --filter @openplay/ingest publish-weekly-edition <week-slug>
 */
import { eq } from "drizzle-orm"
import { db, pool, weeklyEditions, weeklyStories } from "@openplay/db"

async function main() {
  const weekSlug = process.argv[2]
  if (!weekSlug) {
    console.error("Usage: publish-weekly-edition <week-slug>")
    process.exit(1)
  }

  const [edition] = await db.select().from(weeklyEditions).where(eq(weeklyEditions.weekSlug, weekSlug)).limit(1)
  if (!edition) {
    console.error(`No weekly_editions row with weekSlug "${weekSlug}".`)
    process.exit(1)
  }

  const stories = await db.select().from(weeklyStories).where(eq(weeklyStories.editionId, edition.id))
  if (stories.length === 0) {
    console.error(`Edition "${weekSlug}" has no stories yet — draft at least one before publishing.`)
    process.exit(1)
  }

  const rankedStories = stories.filter((s) => s.featuredRank !== null)
  const invalidRange = rankedStories.filter((s) => s.featuredRank! < 1 || s.featuredRank! > 3)
  if (invalidRange.length > 0) {
    console.error(
      `Edition "${weekSlug}" has featuredRank outside 1-3 on: ${invalidRange.map((s) => s.id).join(", ")}. ` +
        "Fix before publishing — the homepage module only has 3 slots.",
    )
    process.exit(1)
  }
  const seenRanks = new Set<number>()
  const duplicateRanks = rankedStories.filter((s) => {
    if (seenRanks.has(s.featuredRank!)) return true
    seenRanks.add(s.featuredRank!)
    return false
  })
  if (duplicateRanks.length > 0) {
    console.error(
      `Edition "${weekSlug}" has more than one story sharing a featuredRank: ${duplicateRanks
        .map((s) => `${s.id} (rank ${s.featuredRank})`)
        .join(", ")}. Each of 1/2/3 must be unique.`,
    )
    process.exit(1)
  }

  await db
    .update(weeklyEditions)
    .set({ published: true, publishedAt: edition.publishedAt ?? new Date() })
    .where(eq(weeklyEditions.id, edition.id))

  console.log(
    `Published "${weekSlug}" (${edition.weekStart} to ${edition.weekEnd}) with ${stories.length} story(ies), ` +
      `${rankedStories.length} featured on the homepage.`,
  )

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
