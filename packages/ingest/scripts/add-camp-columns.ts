/**
 * Adds the camp facet columns (all nullable, no backfill) and an index on
 * programs.program_format. Idempotent. Run before deploying code that selects them.
 *
 * Usage: pnpm --filter @openplay/ingest exec tsx --env-file-if-exists=/vercel/share/.env.project scripts/add-camp-columns.ts
 */
import { pool } from "@openplay/db"

const statements = [
  "ALTER TABLE programs ADD COLUMN IF NOT EXISTS camp_focus text",
  "ALTER TABLE programs ADD COLUMN IF NOT EXISTS camp_stay text",
  "CREATE INDEX IF NOT EXISTS programs_program_format_idx ON programs (program_format)",
  "ALTER TABLE program_offerings ADD COLUMN IF NOT EXISTS camp_period text",
  "ALTER TABLE program_offerings ADD COLUMN IF NOT EXISTS day_length text",
  "ALTER TABLE program_offerings ADD COLUMN IF NOT EXISTS daily_start_time time",
  "ALTER TABLE program_offerings ADD COLUMN IF NOT EXISTS daily_end_time time",
  "ALTER TABLE program_offerings ADD COLUMN IF NOT EXISTS before_care boolean",
  "ALTER TABLE program_offerings ADD COLUMN IF NOT EXISTS after_care boolean",
  "ALTER TABLE program_offerings ADD COLUMN IF NOT EXISTS extended_care_details text",
]

async function main() {
  for (const statement of statements) await pool.query(statement)
  const { rows } = await pool.query(
    `SELECT table_name, column_name, data_type, is_nullable
       FROM information_schema.columns
      WHERE (table_name = 'programs' AND column_name IN ('camp_focus', 'camp_stay'))
         OR (table_name = 'program_offerings' AND column_name IN
             ('camp_period', 'day_length', 'daily_start_time', 'daily_end_time',
              'before_care', 'after_care', 'extended_care_details'))
      ORDER BY table_name, column_name`,
  )
  console.table(rows)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
