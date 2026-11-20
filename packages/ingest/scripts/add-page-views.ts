/**
 * One-off: creates `page_views` and adds `handoff_events.page` for the admin
 * conversion report. Additive and idempotent — safe to re-run. Run before
 * deploying code that writes either.
 *
 * Usage: pnpm --filter @openplay/ingest exec tsx scripts/add-page-views.ts
 */
import { pool } from "@openplay/db"

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS page_views (
      id text PRIMARY KEY,
      occurred_at timestamptz NOT NULL DEFAULT now(),
      page text NOT NULL,
      path text NOT NULL,
      offering_id text,
      program_id text,
      organization_id text,
      organization_name text,
      sport_id text,
      sport_slug text,
      sport_name text,
      session_id text
    )
  `)
  await pool.query("CREATE INDEX IF NOT EXISTS page_views_page_idx ON page_views (page, occurred_at)")
  await pool.query("CREATE INDEX IF NOT EXISTS page_views_org_idx ON page_views (organization_id, occurred_at)")
  await pool.query("CREATE INDEX IF NOT EXISTS page_views_sport_idx ON page_views (sport_id, occurred_at)")
  await pool.query("ALTER TABLE handoff_events ADD COLUMN IF NOT EXISTS page text")

  const { rows } = await pool.query(
    "SELECT table_name, column_name FROM information_schema.columns WHERE (table_name = 'page_views') OR (table_name = 'handoff_events' AND column_name = 'page') ORDER BY table_name, ordinal_position",
  )
  console.log(rows.map((r) => `${r.table_name}.${r.column_name}`).join("\n"))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
