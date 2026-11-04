/**
 * Moves camp sessions that run September–November out of the "other" and
 * "other_break" catch-alls and into fall_break. Dry run by default.
 *
 *   pnpm exec tsx --env-file-if-exists=/vercel/share/.env.project scripts/set-fall-break.ts [--apply]
 */
import { pool } from "@openplay/db"

const CANDIDATES = `
  from program_offerings o
  join programs p on p.id = o.program_id
  where p.program_format = 'camp'
    and o.season_start_date is not null
    and extract(month from o.season_start_date) between 9 and 11
    and (o.camp_period is null or o.camp_period in ('other', 'other_break'))
`

async function main() {
  const found = await pool.query(
    `select o.id, p.title, o.season_start_date::text as starts, o.camp_period ${CANDIDATES} order by o.season_start_date`,
  )
  console.log(`fall camps to move: ${found.rowCount}`)
  for (const row of found.rows) console.log(` - ${row.title} (${row.starts}) was ${row.camp_period ?? "unset"}`)

  if (process.argv.includes("--apply")) {
    const updated = await pool.query(
      `update program_offerings set camp_period = 'fall_break', updated_at = now()
       where id in (select o.id ${CANDIDATES})`,
    )
    console.log("updated:", updated.rowCount)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => pool.end())
