/**
 * Adds program_offerings.dates_reviewed_at (nullable, no backfill).
 * Idempotent. Run before deploying code that selects the column.
 *
 * Usage: pnpm --filter @openplay/ingest exec tsx --env-file-if-exists=/vercel/share/.env.project scripts/add-dates-reviewed-column.ts
 */
import { pool } from "@openplay/db"

async function main() {
  await pool.query(
    "ALTER TABLE program_offerings ADD COLUMN IF NOT EXISTS dates_reviewed_at timestamptz",
  )
  const { rows } = await pool.query(
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'program_offerings' AND column_name = 'dates_reviewed_at'",
  )
  console.table(rows)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
