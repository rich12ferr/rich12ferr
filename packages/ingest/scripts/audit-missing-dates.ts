/**
 * Read-only audit: how many program offerings are missing season and
 * registration dates, and which kinds of listing they are.
 *
 * Usage: pnpm --filter @openplay/ingest exec tsx --env-file-if-exists=/vercel/share/.env.project scripts/audit-missing-dates.ts
 */
import { pool } from "@openplay/db"

async function run(label: string, sql: string) {
  const { rows } = await pool.query(sql)
  console.log(`\n== ${label}`)
  console.table(rows)
}

async function main() {
  await run(
    "Published vs draft, and missing dates",
    `SELECT published,
            count(*)::int AS offerings,
            count(*) FILTER (WHERE season_start_date IS NULL)::int AS no_season_start,
            count(*) FILTER (WHERE season_end_date IS NULL)::int AS no_season_end,
            count(*) FILTER (WHERE season_start_date IS NULL AND season_end_date IS NULL)::int AS no_season_dates,
            count(*) FILTER (WHERE registration_open_date IS NULL)::int AS no_reg_open,
            count(*) FILTER (WHERE registration_close_date IS NULL)::int AS no_reg_close,
            count(*) FILTER (WHERE season_start_date IS NULL AND season_end_date IS NULL
                              AND registration_open_date IS NULL AND registration_close_date IS NULL)::int AS no_dates_at_all
       FROM program_offerings GROUP BY published ORDER BY published DESC`,
  )

  await run(
    "Published, no season start AND no season end: by registration status",
    `SELECT coalesce(registration_status, 'null') AS registration_status, count(*)::int AS n
       FROM program_offerings
      WHERE published AND season_start_date IS NULL AND season_end_date IS NULL
      GROUP BY 1 ORDER BY n DESC`,
  )

  await run(
    "Published, no season dates: by season label / has season year",
    `SELECT coalesce(season, 'null') AS season,
            (season_year IS NOT NULL) AS has_year,
            count(*)::int AS n
       FROM program_offerings
      WHERE published AND season_start_date IS NULL AND season_end_date IS NULL
      GROUP BY 1, 2 ORDER BY n DESC`,
  )

  await run(
    "Published, no season dates: by verification status",
    `SELECT verification_status, count(*)::int AS n
       FROM program_offerings
      WHERE published AND season_start_date IS NULL AND season_end_date IS NULL
      GROUP BY 1 ORDER BY n DESC`,
  )

  await run(
    "Published, no season dates: top organizations",
    `SELECT o.name AS organization, count(*)::int AS n
       FROM program_offerings po
       JOIN programs p ON p.id = po.program_id
       JOIN organizations o ON o.id = p.organization_id
      WHERE po.published AND po.season_start_date IS NULL AND po.season_end_date IS NULL
      GROUP BY 1 ORDER BY n DESC LIMIT 15`,
  )

  await run(
    "Published, no season dates: how many have a source URL / registration URL",
    `SELECT (source_url IS NOT NULL) AS has_source_url,
            (registration_url IS NOT NULL) AS has_registration_url,
            count(*)::int AS n
       FROM program_offerings
      WHERE published AND season_start_date IS NULL AND season_end_date IS NULL
      GROUP BY 1, 2 ORDER BY n DESC`,
  )

  await run(
    "Extraction payloads: how often each date is null, and what the extractor said",
    `SELECT count(*)::int AS payloads,
            count(*) FILTER (WHERE payload->>'seasonStartDate' IS NULL)::int AS season_start_null,
            count(*) FILTER (WHERE payload->>'seasonEndDate' IS NULL)::int AS season_end_null,
            count(*) FILTER (WHERE payload->>'registrationOpenDate' IS NULL)::int AS reg_open_null,
            count(*) FILTER (WHERE payload->>'registrationCloseDate' IS NULL)::int AS reg_close_null,
            count(*) FILTER (WHERE payload->>'seasonStartDate' IS NULL AND payload->>'seasonYear' IS NOT NULL)::int AS start_null_but_year_known,
            count(*) FILTER (WHERE payload->>'seasonStartDate' IS NULL
                              AND jsonb_array_length(coalesce(payload->'ambiguities', '[]'::jsonb)) > 0)::int AS start_null_with_ambiguity
       FROM review_candidates`,
  )

  await run(
    "Extraction payloads with no season start: most common ambiguity text (first 110 chars)",
    `SELECT left(a.value #>> '{}', 110) AS ambiguity, count(*)::int AS n
       FROM review_candidates rc,
            jsonb_array_elements(coalesce(rc.payload->'ambiguities', '[]'::jsonb)) AS a(value)
      WHERE rc.payload->>'seasonStartDate' IS NULL
      GROUP BY 1 ORDER BY n DESC LIMIT 12`,
  )

  await run(
    "Published, no season dates: does the page text hint at a year or a month range (sampled titles)",
    `SELECT po.id, left(p.title, 60) AS title, po.season, po.season_year, po.registration_status
       FROM program_offerings po JOIN programs p ON p.id = po.program_id
      WHERE po.published AND po.season_start_date IS NULL AND po.season_end_date IS NULL
      ORDER BY po.updated_at DESC LIMIT 12`,
  )

  await run(
    "Published: structured windows/sessions that could backfill dates",
    `SELECT count(*) FILTER (WHERE jsonb_array_length(registration_periods) > 0)::int AS has_reg_periods,
            count(*) FILTER (WHERE jsonb_array_length(sessions) > 0)::int AS has_sessions,
            count(*) FILTER (WHERE season_start_date IS NULL AND jsonb_array_length(sessions) > 0)::int AS no_start_but_sessions
       FROM program_offerings WHERE published`,
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
