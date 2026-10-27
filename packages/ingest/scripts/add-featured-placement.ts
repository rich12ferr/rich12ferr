/**
 * One-off: adds the Featured placement surface's storage.
 *
 * - `program_offerings.featured_at` — the admin-only flag (null = not featured).
 * - `handoff_events.placement` — "featured" for clicks from a Featured card.
 * - `featured_impressions` — one row per Featured card seen.
 *
 * Additive and idempotent (`IF NOT EXISTS`). Run before deploying code that
 * writes these columns, otherwise handoff inserts fail.
 *
 * Usage: pnpm --filter @openplay/ingest exec tsx scripts/add-featured-placement.ts
 */
import { pool } from "@openplay/db"

async function main() {
  await pool.query("ALTER TABLE program_offerings ADD COLUMN IF NOT EXISTS featured_at timestamptz")
  await pool.query("ALTER TABLE handoff_events ADD COLUMN IF NOT EXISTS placement text")
  await pool.query(
    "CREATE INDEX IF NOT EXISTS handoff_events_placement_idx ON handoff_events (placement, occurred_at)",
  )
  await pool.query(`
    CREATE TABLE IF NOT EXISTS featured_impressions (
      id text PRIMARY KEY,
      occurred_at timestamptz NOT NULL DEFAULT now(),
      surface text NOT NULL,
      offering_id text NOT NULL,
      program_id text,
      organization_id text,
      organization_name text,
      sport_slug text,
      session_id text
    )
  `)
  await pool.query(
    "CREATE INDEX IF NOT EXISTS featured_impressions_org_idx ON featured_impressions (organization_id, occurred_at)",
  )
  await pool.query(
    "CREATE INDEX IF NOT EXISTS featured_impressions_offering_idx ON featured_impressions (offering_id)",
  )

  const { rows } = await pool.query(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE (table_name = 'program_offerings' AND column_name = 'featured_at')
        OR (table_name = 'handoff_events' AND column_name = 'placement')
        OR table_name = 'featured_impressions'
     ORDER BY table_name, column_name`,
  )
  console.log(rows.map((r) => `${r.table_name}.${r.column_name}`).join("\n"))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
