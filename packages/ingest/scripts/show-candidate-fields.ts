/**
 * Read-only: prints selected payload fields for one review candidate, so a
 * reviewer can compare the extraction against the source page.
 *
 *   pnpm --filter @openplay/ingest exec tsx scripts/show-candidate-fields.ts <candidateId>
 */
import { db, pool, reviewCandidates } from "@openplay/db"
import { eq } from "drizzle-orm"

const FIELDS = [
  "title",
  "sportName",
  "season",
  "seasonYear",
  "minGrade",
  "maxGrade",
  "minAge",
  "maxAge",
  "town",
  "venueName",
  "registrationOpenDate",
  "registrationCloseDate",
  "registrationPeriods",
  "seasonStartDate",
  "seasonEndDate",
  "sessions",
  "registrationFee",
  "additionalFees",
  "pricing",
  "capacity",
  "registrationUrl",
  "practiceSchedule",
]

async function main() {
  const id = process.argv[2]
  if (!id) {
    console.error("Usage: show-candidate-fields <candidateId>")
    process.exit(1)
  }
  const [row] = await db.select().from(reviewCandidates).where(eq(reviewCandidates.id, id))
  if (!row) {
    console.error(`No candidate ${id}`)
    process.exit(1)
  }
  const payload = (row.payload ?? {}) as Record<string, unknown>
  const picked = Object.fromEntries(FIELDS.map((f) => [f, payload[f] ?? null]))
  console.log(JSON.stringify(picked, null, 2))
  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
