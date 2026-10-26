/**
 * Prints the most recent Featured impressions and featured-placement handoff
 * clicks, for checking the Featured surface's logging.
 *
 * Usage: pnpm --filter @openplay/ingest exec tsx scripts/featured-events-check.ts
 */
import { pool } from "@openplay/db"

async function main() {
  const impressions = await pool.query(
    `SELECT * FROM featured_impressions ORDER BY 1 DESC LIMIT 5`,
  )
  const clicks = await pool.query(
    `SELECT * FROM handoff_events WHERE placement = 'featured' ORDER BY occurred_at DESC LIMIT 5`,
  )
  console.log("featured_impressions:", impressions.rows)
  console.log("featured handoff clicks:", clicks.rows)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
