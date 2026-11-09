/**
 * Montpelier Recreation youth basketball, 2026/27 season. Dry run by default;
 * pass --apply to write.
 *
 *   pnpm exec tsx --env-file-if-exists=/vercel/share/.env.project scripts/fix-montpelier-basketball-2026.ts [--apply]
 *
 * The 2026-11-09 forced recrawl of /988/Youth-Programs could not find season
 * dates: the page only lists registration deadlines. The dates live in the two
 * linked registration forms (DocumentCenter/View/13025 and 13026), which the
 * extractor does not follow. The crawl's own proposals would also have cleared
 * `season`, so they are rejected here and the form facts are applied directly:
 *
 *   3rd-6th: deadline Nov 10, skills evaluations Nov 11-12 (placement, no cuts),
 *            season begins Sat Dec 5, 2026.
 *   K-2nd:   deadline Dec 9, Saturdays Jan 9 - Feb 20, 2027.
 *
 * Both programs were also filed under sp_baseball by the original extraction.
 */
import { pool } from "@openplay/db"

const apply = process.argv.includes("--apply")

const FORMS = "https://www.montpelier-vt.org/DocumentCenter/View/"

const offerings = [
  {
    programId: "prog_7a70291042624371b9d9",
    offeringId: "off_7fd80be6e3a14ac99582",
    label: "3rd-6th Grade Basketball",
    seasonStart: "2026-12-05",
    seasonEnd: null,
    registrationUrl: `${FORMS}13026`,
    tryoutDate: "2026-11-11",
    tryoutDetails:
      "Skills evaluation for team balancing; every registered player is placed on a team. " +
      "3/4 and 5/6 boys: Wed Nov 11. 3/4 and 5/6 girls: Thu Nov 12. At the Rec Center.",
  },
  {
    programId: "prog_66f2b8871c3d42f2bae3",
    offeringId: "off_30caea23f4824af89fac",
    label: "K-2nd Grade Basketball",
    seasonStart: "2027-01-09",
    seasonEnd: "2027-02-20",
    registrationUrl: `${FORMS}13025`,
    tryoutDate: null,
    tryoutDetails: null,
  },
]

async function main() {
  const seasonsType = await pool.query<{ udt_name: string }>(
    `select udt_name from information_schema.columns where table_name = 'programs' and column_name = 'typical_seasons'`,
  )
  const seasonsIsJson = seasonsType.rows[0]?.udt_name?.startsWith("json")

  const current = await pool.query(
    `select o.id, p.title, p.sport_id, p.match_key, o.season, o.season_year, o.season_start_date,
            o.season_end_date, o.registration_close_date, o.registration_url
       from program_offerings o join programs p on p.id = o.program_id
      where o.id = any($1)`,
    [offerings.map((o) => o.offeringId)],
  )
  for (const row of current.rows) console.log("before", JSON.stringify(row))

  for (const o of offerings) {
    console.log(
      `\n${o.label}: sport -> sp_basketball, season -> winter 2026, start -> ${o.seasonStart}, ` +
        `end -> ${o.seasonEnd ?? "(not published)"}, registration -> ${o.registrationUrl}` +
        (o.tryoutDate ? `, evaluation -> ${o.tryoutDate}` : ""),
    )
  }

  const pending = await pool.query<{ id: string; proposed_title: string }>(
    `select id, proposed_title from review_candidates
      where status = 'pending' and target_offering_id = any($1)`,
    [offerings.map((o) => o.offeringId)],
  )
  console.log(`\nPending crawl candidates to reject: ${pending.rows.map((r) => r.id).join(", ") || "none"}`)

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to write.")
    return
  }

  await pool.query("begin")
  try {
    for (const o of offerings) {
      await pool.query(
        `update programs
            set sport_id = 'sp_basketball',
                match_key = replace(match_key, '|sp_baseball|', '|sp_basketball|'),
                typical_seasons = ${seasonsIsJson ? `'["winter"]'::jsonb` : `array['winter']`},
                updated_at = now()
          where id = $1`,
        [o.programId],
      )
      await pool.query(
        `update program_offerings
            set season = 'winter', season_year = 2026,
                season_start_date = $2, season_end_date = $3,
                registration_url = $4,
                tryout_required = $5, tryout_date = $6, tryout_details = $7,
                date_last_checked = now(), dates_reviewed_at = now(), updated_at = now()
          where id = $1`,
        [o.offeringId, o.seasonStart, o.seasonEnd, o.registrationUrl, o.tryoutDate !== null, o.tryoutDate, o.tryoutDetails],
      )
    }
    await pool.query(
      `update review_candidates
          set status = 'rejected', reviewed_at = now(), reviewed_by = 'v0-agent',
              review_note = 'Superseded by fix-montpelier-basketball-2026: dates taken from the linked registration forms; proposal would have cleared season.'
        where id = any($1)`,
      [pending.rows.map((r) => r.id)],
    )
    await pool.query("commit")
    console.log("\nApplied.")
  } catch (error) {
    await pool.query("rollback")
    throw error
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
