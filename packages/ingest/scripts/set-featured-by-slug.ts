/**
 * Flags (or un-flags) the published offerings of a program as Featured.
 * Same effect as the admin toggle; useful for test setup.
 *
 * Usage: pnpm --filter @openplay/ingest exec tsx scripts/set-featured-by-slug.ts <program-slug> [on|off]
 */
import { pool } from "@openplay/db"

async function main() {
  const [slug, mode = "on"] = process.argv.slice(2)
  if (!slug) throw new Error("Pass a program slug")
  const { rows } = await pool.query(
    `UPDATE program_offerings o
        SET featured_at = ${mode === "off" ? "NULL" : "now()"}
       FROM programs p
      WHERE o.program_id = p.id AND p.slug = $1 AND o.published = true
      RETURNING o.id, o.featured_at`,
    [slug],
  )
  console.log(`${mode === "off" ? "Un-featured" : "Featured"} ${rows.length} offering(s):`, rows)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
