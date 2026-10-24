/**
 * Sets season and seasonYear on a pending review candidate's payload.
 * Dry run by default; pass --apply to write. Refuses unless exactly one pending candidate matches.
 *
 *   pnpm --filter @openplay/ingest exec tsx scripts/set-candidate-season.ts "tae kwon do" fall 2026 --apply
 */
import { db, pool, reviewCandidates } from "@openplay/db"
import { and, eq, ilike } from "drizzle-orm"

const SEASONS = ["spring", "summer", "fall", "winter"]

async function main() {
  const [titlePattern, seasonArg, yearArg] = process.argv.slice(2)
  const apply = process.argv.includes("--apply")
  const season = seasonArg?.toLowerCase()
  const seasonYear = Number(yearArg)

  if (!titlePattern || !season || !SEASONS.includes(season) || !Number.isInteger(seasonYear)) {
    console.error("Usage: set-candidate-season <titlePattern> <spring|summer|fall|winter> <year> [--apply]")
    process.exit(1)
  }

  const matches = await db
    .select({
      id: reviewCandidates.id,
      sourceId: reviewCandidates.sourceId,
      title: reviewCandidates.proposedTitle,
      payload: reviewCandidates.payload,
    })
    .from(reviewCandidates)
    .where(and(eq(reviewCandidates.status, "pending"), ilike(reviewCandidates.proposedTitle, `%${titlePattern}%`)))

  for (const match of matches) {
    const payload = match.payload as Record<string, unknown>
    console.log(
      JSON.stringify({ id: match.id, sourceId: match.sourceId, title: match.title, season: payload.season, seasonYear: payload.seasonYear }),
    )
  }

  if (matches.length !== 1) {
    console.error(`Expected exactly 1 pending match, found ${matches.length}. Nothing changed.`)
    await pool.end()
    process.exit(matches.length === 0 ? 1 : 2)
  }

  const [target] = matches
  if (!apply) {
    console.log(`Dry run: would set season=${season}, seasonYear=${seasonYear} on ${target.id}. Re-run with --apply.`)
    await pool.end()
    return
  }

  const updatedPayload = { ...(target.payload as Record<string, unknown>), season, seasonYear }
  await db.update(reviewCandidates).set({ payload: updatedPayload }).where(eq(reviewCandidates.id, target.id))

  const [after] = await db
    .select({ payload: reviewCandidates.payload })
    .from(reviewCandidates)
    .where(eq(reviewCandidates.id, target.id))
  const saved = after.payload as Record<string, unknown>
  console.log(`Updated ${target.id}: season=${saved.season}, seasonYear=${saved.seasonYear}`)

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
