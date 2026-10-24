/**
 * Marks existing camp programs as programFormat = "camp" and fills the facets
 * that can be inferred safely (focus, stay, summer period). Daily hours, care
 * and day length are left null: a guess is worse than "not posted".
 *
 * Dry run by default; pass --apply to write.
 *
 * Usage: pnpm --filter @openplay/ingest exec tsx --env-file-if-exists=/vercel/share/.env.project scripts/backfill-camps.ts [--apply]
 */
import { eq } from "drizzle-orm"
import { db, pool, programOfferings, programs, sports } from "@openplay/db"
import { inferCampFocus, inferCampPeriod, inferCampStay, looksLikeCamp } from "@openplay/core"

const apply = process.argv.includes("--apply")

async function main() {
  const rows = await db
    .select({
      programId: programs.id,
      title: programs.title,
      description: programs.description,
      programFormat: programs.programFormat,
      campFocus: programs.campFocus,
      campStay: programs.campStay,
      sportSlug: sports.slug,
    })
    .from(programs)
    .innerJoin(sports, eq(programs.sportId, sports.id))

  const camps = rows.filter((row) => row.programFormat === "camp" || looksLikeCamp(row.title))
  const report: Array<Record<string, string | number>> = []
  let offeringUpdates = 0

  for (const row of camps) {
    const focus = row.campFocus ?? inferCampFocus(row.title, row.sportSlug)
    const stay = row.campStay ?? inferCampStay(`${row.title} ${row.description ?? ""}`)

    const offerings = await db
      .select({ id: programOfferings.id, season: programOfferings.season, campPeriod: programOfferings.campPeriod })
      .from(programOfferings)
      .where(eq(programOfferings.programId, row.programId))
    const periodChanges = offerings
      .filter((o) => !o.campPeriod && inferCampPeriod(o.season))
      .map((o) => ({ id: o.id, period: inferCampPeriod(o.season)! }))

    report.push({
      title: row.title.slice(0, 48),
      sport: row.sportSlug,
      format: row.programFormat === "camp" ? "camp" : `${row.programFormat ?? "null"} -> camp`,
      focus,
      stay,
      summerOfferings: periodChanges.length,
    })

    if (apply) {
      await db
        .update(programs)
        .set({ programFormat: "camp", campFocus: focus, campStay: stay })
        .where(eq(programs.id, row.programId))
      for (const change of periodChanges) {
        await db
          .update(programOfferings)
          .set({ campPeriod: change.period })
          .where(eq(programOfferings.id, change.id))
      }
    }
    offeringUpdates += periodChanges.length
  }

  console.table(report)
  const byFocus = report.reduce<Record<string, number>>((acc, r) => {
    acc[r.focus as string] = (acc[r.focus as string] ?? 0) + 1
    return acc
  }, {})
  console.log({ programs: camps.length, summerPeriodOfferings: offeringUpdates, byFocus })
  console.log(apply ? "Applied." : "Dry run. Re-run with --apply to write.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
