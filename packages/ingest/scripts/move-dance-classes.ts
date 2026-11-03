/**
 * Moves the Contemporary Dance and Fitness Studio "Dance Classes" listing out
 * of the Camps & Enrichment catch-all and into the Dance category, seeding the
 * Dance row into `sports` first if this database predates it.
 *
 *   pnpm exec tsx --env-file-if-exists=/vercel/share/.env.project scripts/move-dance-classes.ts
 */
import { pool } from "@openplay/db"
import { getSportBySlug } from "@openplay/core"

const LISTING_SLUG = "dance-classes-a15635bdfe6e4b8ba1bf"

async function main() {
  const dance = getSportBySlug("dance")
  if (!dance) throw new Error("Dance is missing from the sport taxonomy")

  const cols = await pool.query(
    `select column_name from information_schema.columns where table_name = 'sports'`,
  )
  console.log("sports columns:", cols.rows.map((r) => r.column_name).join(", "))

  const existing = await pool.query(`select id, slug, name from sports where slug = 'dance'`)
  console.log("dance row:", existing.rows)

  const listing = await pool.query(
    `select p.id, p.title, s.slug as sport from programs p left join sports s on s.id = p.sport_id where p.slug = $1`,
    [LISTING_SLUG],
  )
  console.log("listing:", listing.rows)

  if (process.argv.includes("--apply")) {
    if (existing.rows.length === 0) throw new Error("Seed the Dance sport row before applying")
    const updated = await pool.query(
      `update programs set sport_id = $1, updated_at = now() where slug = $2 returning id`,
      [existing.rows[0].id, LISTING_SLUG],
    )
    console.log("moved:", updated.rowCount)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => pool.end())
