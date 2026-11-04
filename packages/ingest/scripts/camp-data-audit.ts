/**
 * Read-only audit of camp listings (PRD R1). Prints records whose stored
 * fields contradict each other or their own description, so they can be
 * corrected or reviewed. Never writes.
 *
 *   pnpm exec tsx --env-file-if-exists=/vercel/share/.env.project scripts/camp-data-audit.ts [--json]
 */
import { pool } from "@openplay/db"

type Row = {
  offering_id: string
  slug: string
  program_id: string
  title: string
  org: string
  location_id: string | null
  season_start_date: string | null
  season_end_date: string | null
  registration_open_date: string | null
  registration_close_date: string | null
  status_override: string | null
  registration_status: string | null
  registration_fee: string | null
  additional_fees: string | null
  pricing: unknown
  description: string | null
  date_last_checked: string | null
}

const today = new Date().toISOString().slice(0, 10)

async function main() {
  const { rows } = await pool.query<Row>(`
    select o.id offering_id, p.slug, p.id program_id, p.title, g.name org, o.location location_id,
           o.season_start_date::text, o.season_end_date::text,
           o.registration_open_date::text, o.registration_close_date::text,
           o.status_override, o.registration_status, o.registration_fee::text,
           o.additional_fees, o.pricing, p.description,
           o.date_last_checked::text
      from program_offerings o
      join programs p on p.id = o.program_id
      join organizations g on g.id = p.organization_id
     where p.program_format = 'camp' and p.status = 'active'
     order by g.name, p.title, o.season_start_date nulls last`)

  const issues: { slug: string; title: string; org: string; reason: string }[] = []
  const flag = (r: Row, reason: string) => issues.push({ slug: r.slug, title: r.title, org: r.org, reason })

  for (const r of rows) {
    const text = (r.description ?? "").toLowerCase()
    const pricing = Array.isArray(r.pricing) ? r.pricing : []
    const proseMentionsPrice = /\$\s?\d/.test(r.description ?? "")
    if (r.registration_fee === null && pricing.length === 0 && proseMentionsPrice)
      flag(r, "Description states a price but no structured price is stored")
    if (r.registration_fee === null && pricing.length > 0)
      flag(r, "Structured pricing exists but registration_fee is empty (card shows no price)")
    const proseSaysOpen = /registration (is )?(now )?open|now open|enrollment (is )?open|register now/.test(text)
    if (proseSaysOpen && !r.registration_open_date && r.status_override !== "open")
      flag(r, "Description says registration is open but no open date or override is stored")
    if (r.registration_open_date && r.registration_close_date && r.registration_open_date > r.registration_close_date)
      flag(r, "Registration opens after it closes")
    if (r.season_end_date && r.season_end_date < today && r.registration_status === "open")
      flag(r, "Session ended but stored registration_status is open")
  }

  const byProgram = new Map<string, Row[]>()
  for (const r of rows) byProgram.set(r.program_id, [...(byProgram.get(r.program_id) ?? []), r])
  const multiSession = [...byProgram.values()].filter((list) => list.length > 1)

  const ended = rows.filter((r) => r.season_end_date && r.season_end_date < today).length
  const undated = rows.filter((r) => !r.season_start_date).length
  const billings = rows.filter((r) => /billings/i.test(r.org))

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ total: rows.length, ended, undated, issues, billings }, null, 2))
  } else {
    console.log(`Camp offerings: ${rows.length} (ended: ${ended}, undated: ${undated})`)
    console.log(`Programs with more than one offering: ${multiSession.length}`)
    console.log(`\nCamp Billings offerings:`)
    for (const r of billings)
      console.log(
        `  ${r.slug} | program ${r.program_id} | loc ${r.location_id} | ${r.season_start_date}→${r.season_end_date} | open ${r.registration_open_date} | override ${r.status_override} | fee ${r.registration_fee} | pricing ${JSON.stringify(r.pricing)}`,
      )
    console.log(`\nIssues (${issues.length}):`)
    for (const i of issues) console.log(`  [${i.org}] ${i.title} (${i.slug}): ${i.reason}`)
  }
  await pool.end()
}

main().catch(async (error) => {
  console.error(error)
  await pool.end()
  process.exit(1)
})
