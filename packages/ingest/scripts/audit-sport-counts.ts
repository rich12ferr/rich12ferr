/**
 * Read-only audit: per-sport program counts under the homepage definition
 * (published, active program, youth audience, ended seasons included) versus
 * the sport page definition (published, any audience, ended seasons dropped).
 *
 * Usage: pnpm --filter @openplay/ingest exec tsx --env-file-if-exists=/vercel/share/.env.project scripts/audit-sport-counts.ts
 */
import { pool } from "@openplay/db"

async function main() {
  const { rows } = await pool.query(`
    select s.slug,
      count(*) filter (
        where p.active and coalesce(o.audience_type, p.audience_type) = 'youth'
      )::int as homepage,
      count(*) filter (
        where o.season_end_date is null or o.season_end_date >= current_date
      )::int as sport_page,
      count(*) filter (where not p.active)::int as inactive_program,
      count(*) filter (
        where coalesce(o.audience_type, p.audience_type) is distinct from 'youth'
      )::int as non_youth,
      count(*) filter (where o.season_end_date < current_date)::int as ended
    from program_offerings o
    join programs p on p.id = o.program_id
    join sports s on s.id = p.sport_id
    where o.published
    group by s.slug
    order by homepage desc, s.slug
  `)
  console.table(rows)
  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
