/**
 * One-off: adds `session_id` and `discovery_origin` to `handoff_events` so a
 * registration clickout can be attributed to the visit and the surface (for
 * example the homepage) it came from.
 *
 * Additive and idempotent: both columns are nullable, existing rows stay null,
 * and `IF NOT EXISTS` makes re-running a no-op. Run this before deploying code
 * that writes the columns, otherwise handoff inserts fail.
 *
 * Usage: pnpm --filter @openplay/ingest exec tsx scripts/add-handoff-session-columns.ts
 */
import { pool } from "@openplay/db"

async function main() {
  await pool.query(
    "ALTER TABLE handoff_events ADD COLUMN IF NOT EXISTS session_id text, ADD COLUMN IF NOT EXISTS discovery_origin text",
  )
  const { rows } = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'handoff_events' AND column_name IN ('session_id', 'discovery_origin') ORDER BY column_name",
  )
  console.log("handoff_events columns present:", rows.map((r) => r.column_name).join(", "))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
