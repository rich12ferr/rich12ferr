/**
 * Prints the season-related payload fields for review candidates of a source.
 *
 *   pnpm --filter @openplay/ingest exec tsx scripts/inspect-candidate-payloads.ts VT-LEAGUE-BARRE-YOUTH-SPORTS
 */
import { db, pool, reviewCandidates } from "@openplay/db"
import { eq } from "drizzle-orm"

async function main() {
  const sourceId = process.argv[2]
  if (!sourceId) {
    console.error("Usage: inspect-candidate-payloads <sourceId>")
    process.exit(1)
  }

  const rows = await db
    .select({
      id: reviewCandidates.id,
      kind: reviewCandidates.kind,
      status: reviewCandidates.status,
      proposedTitle: reviewCandidates.proposedTitle,
      payload: reviewCandidates.payload,
    })
    .from(reviewCandidates)
    .where(eq(reviewCandidates.sourceId, sourceId))

  for (const row of rows) {
    const payload = row.payload as Record<string, unknown>
    console.log(
      JSON.stringify(
        {
          id: row.id,
          kind: row.kind,
          status: row.status,
          title: row.proposedTitle,
          season: payload.season,
          seasonYear: payload.seasonYear,
          startDate: payload.startDate,
          endDate: payload.endDate,
          registrationOpensAt: payload.registrationOpensAt,
          registrationClosesAt: payload.registrationClosesAt,
          description: payload.description,
          ambiguities: payload.ambiguities,
          payloadKeys: Object.keys(payload),
        },
        null,
        2,
      ),
    )
  }

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
