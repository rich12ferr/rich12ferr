/**
 * Shows the Burlington CivicRec catalog source's crawl status and every
 * Burlington program on file, for checking crawl coverage against the live
 * catalog.
 *
 * Usage: pnpm --filter @openplay/ingest exec tsx scripts/burlington-coverage-check.ts
 */
import { pool } from "@openplay/db"

const ORG_ID = "org-us-vt-burlington-parks-recreation-waterfront"

async function main() {
  const sourceRows = await pool.query(
    `SELECT id, url, active, source_status, last_crawled_at FROM sources WHERE organization_id = $1 ORDER BY id`,
    [ORG_ID],
  )
  const programRows = await pool.query(
    `SELECT title, status FROM programs WHERE organization_id = $1 ORDER BY title`,
    [ORG_ID],
  )
  console.log("sources:", sourceRows.rows)
  console.log(`programs (${programRows.rowCount}):`)
  for (const row of programRows.rows) console.log(`  [${row.status}] ${row.title}`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
