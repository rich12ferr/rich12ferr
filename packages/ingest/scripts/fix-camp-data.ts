/**
 * Corrects camp records whose structured fields contradict their own source
 * (PRD R1). Dry run by default; pass --apply to write.
 *
 *   pnpm exec tsx --env-file-if-exists=/vercel/share/.env.project scripts/fix-camp-data.ts [--apply]
 *
 * 1. Camp Billings Summer 2027: the organizer page (human-approved from the
 *    review queue on 2026-11-02) states registration is open and tuition is
 *    $2,400 (session 1) or $2,700 (sessions 2-4), but tuition was stored only as prose in
 *    additional_fees and no registration date was stored, so cards read
 *    "Coming Up" and "Cost not published".
 * 2. Structured pricing with exactly one registration amount but an empty
 *    registration_fee: promote that amount so cards show it.
 */
import { pool } from "@openplay/db"

const apply = process.argv.includes("--apply")

async function main() {
  const billings = await pool.query<{ id: string; slug: string; additional_fees: string | null }>(`
    select o.id, p.slug, o.additional_fees
      from program_offerings o join programs p on p.id = o.program_id
     where p.organization_id = 'org-us-vt-camp-billings'
       and p.program_format = 'camp' and o.season_year = 2027
       and o.registration_fee is null`)

  const tuition = billings.rows.flatMap((r) => {
    const match = /tuition:\s*\$([\d,]+)/i.exec(r.additional_fees ?? "")
    return match ? [{ ...r, amount: Number(match[1].replace(/,/g, "")) }] : []
  })
  console.log(`Camp Billings 2027 sessions to correct: ${tuition.length}`)
  for (const r of tuition) console.log(`  ${r.slug}: fee null -> ${r.amount}, status_override null -> open, additional_fees cleared`)

  const promotable = await pool.query<{ id: string; slug: string; amount: string }>(`
    select o.id, p.slug, (o.pricing->0->>'amount') amount
      from program_offerings o join programs p on p.id = o.program_id
     where p.program_format = 'camp' and o.registration_fee is null
       and jsonb_typeof(o.pricing) = 'array' and jsonb_array_length(o.pricing) = 1
       and o.pricing->0->>'type' in ('registration', 'tuition')
       and (o.pricing->0->>'amount') ~ '^[0-9]+(\\.[0-9]+)?$'`)
  console.log(`\nOfferings with one structured price but no registration_fee: ${promotable.rows.length}`)
  for (const r of promotable.rows) console.log(`  ${r.slug}: fee null -> ${r.amount}`)

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to write.")
    return
  }

  await pool.query("begin")
  try {
    for (const r of tuition) {
      await pool.query(
        `update program_offerings
            set registration_fee = $2,
                pricing = jsonb_build_array(jsonb_build_object('type','tuition','amount',$2::numeric,'currency','USD','original_type','tuition','notes','Per two-week session')),
                additional_fees = null,
                status_override = 'open',
                updated_at = now()
          where id = $1`,
        [r.id, r.amount],
      )
    }
    for (const r of promotable.rows) {
      await pool.query(`update program_offerings set registration_fee = $2, updated_at = now() where id = $1`, [r.id, r.amount])
    }
    await pool.query("commit")
    console.log(`\nApplied ${tuition.length + promotable.rows.length} updates.`)
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
