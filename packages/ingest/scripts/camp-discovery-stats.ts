/**
 * Read-only data profile behind the PRD discovery notes (date matching, photos).
 *
 *   pnpm exec tsx --env-file-if-exists=/vercel/share/.env.project scripts/camp-discovery-stats.ts
 */
import { pool } from "@openplay/db"

async function main() {
  const cols = await pool.query<{ table_name: string; column_name: string; data_type: string }>(`
    select table_name, column_name, data_type from information_schema.columns
     where table_schema = 'public' and table_name in ('program_offerings', 'programs', 'organizations', 'locations')
     order by table_name, ordinal_position`)
  const byTable = new Map<string, string[]>()
  for (const c of cols.rows)
    byTable.set(c.table_name, [...(byTable.get(c.table_name) ?? []), `${c.column_name}:${c.data_type}`])
  for (const [t, list] of byTable) console.log(`${t}: ${list.join(", ")}\n`)

  const media = await pool.query<{ table_name: string; column_name: string }>(`
    select table_name, column_name from information_schema.columns
     where table_schema = 'public' and (column_name ilike '%image%' or column_name ilike '%photo%' or column_name ilike '%media%' or column_name ilike '%logo%')`)
  console.log("Media-like columns:", media.rows.map((r) => `${r.table_name}.${r.column_name}`).join(", ") || "none")

  const camps = `from program_offerings o join programs p on p.id = o.program_id
                 join organizations g on g.id = p.organization_id
                where p.program_format = 'camp' and p.status = 'active'`
  const profile = await pool.query(`
    select count(*) total,
           count(*) filter (where o.season_start_date is not null and o.season_end_date is not null) both_dates,
           count(*) filter (where o.season_start_date is null) no_start,
           count(*) filter (where o.season_start_date is not null and o.season_end_date is null) start_only,
           count(*) filter (where o.season_end_date - o.season_start_date between 0 and 6) one_week_or_less,
           count(*) filter (where o.season_end_date - o.season_start_date > 6) longer_than_week,
           count(*) filter (where jsonb_typeof(o.sessions) = 'array' and jsonb_array_length(o.sessions) > 0) has_sessions_json,
           count(*) filter (where o.daily_start_time is not null and o.daily_end_time is not null) has_hours,
           count(*) filter (where o.day_length is not null) has_day_length,
           count(*) filter (where o.before_care or o.after_care) has_extended_care,
           count(*) filter (where p.min_age is not null or p.max_age is not null) has_age,
           count(*) filter (where p.min_grade is not null or p.max_grade is not null) has_grade,
           count(*) filter (where jsonb_typeof(o.eligibility_rules) = 'object' or (jsonb_typeof(o.eligibility_rules) = 'array' and jsonb_array_length(o.eligibility_rules) > 0)) has_eligibility_rules,
           count(*) filter (where o.timezone is not null) has_tz,
           count(*) filter (where p.camp_stay = 'overnight') overnight
      ${camps}`)
  console.log("\nCamp offering profile:", profile.rows[0])

  const periods = await pool.query(`select coalesce(o.camp_period,'(null)') period, count(*) n ${camps} group by 1 order by 2 desc`)
  console.log("camp_period:", periods.rows.map((r) => `${r.period}=${r.n}`).join(", "))

  const samples = await pool.query(`
    select g.name org, p.title, o.season_start_date::text s, o.season_end_date::text e,
           o.daily_start_time::text st, o.daily_end_time::text et, o.day_length, p.min_age, p.max_age,
           p.min_grade, p.max_grade, o.camp_period, left(o.sessions::text, 160) sessions,
           left(o.eligibility_rules::text, 120) elig
      ${camps}
     order by (o.season_end_date - o.season_start_date) desc nulls last limit 8`)
  console.log("\nLongest / undated samples:")
  for (const r of samples.rows) console.log(" ", JSON.stringify(r))

  const undated = await pool.query(`
    select g.name org, p.title, o.camp_period, o.season ${camps} and o.season_start_date is null limit 6`)
  console.log("\nUndated samples:")
  for (const r of undated.rows) console.log(" ", JSON.stringify(r))

  const billingsSource = await pool.query(`
    select p.slug, g.name org, o.source_url, o.source_type ${camps} and p.title ilike '%billings%'`)
  console.log("\nCamp Billings provenance:")
  for (const r of billingsSource.rows) console.log(" ", JSON.stringify(r))
  await pool.end()
}

main().catch(async (error) => {
  console.error(error)
  await pool.end()
  process.exit(1)
})
