/**
 * Read-only audit: is an organization known, registered as a crawl source,
 * actually crawled, and does it have any programs/offerings or queued candidates.
 *
 * Usage: pnpm --filter @openplay/ingest exec tsx --env-file-if-exists=/vercel/share/.env.project scripts/audit-org-coverage.ts "<name fragment>" ["<url fragment>"]
 */
import { pool } from "@openplay/db"

async function main() {
  const name = `%${process.argv[2] ?? "barre youth"}%`
  const url = `%${process.argv[3] ?? "barreyouth"}%`

  const orgs = await pool.query(
    `select id, name, organization_type, town, website_url from organizations where name ilike $1 or website_url ilike $2`,
    [name, url],
  )
  console.log("ORGANIZATIONS")
  console.table(orgs.rows)

  const sources = await pool.query(
    `select id, organization_id, label, url, platform, source_status, active, terms_status, robots_allowed,
            last_crawled_at, last_succeeded_at, consecutive_failures, discovery_note
       from sources
      where label ilike $1 or url ilike $2 or organization_id = any($3::text[])`,
    [name, url, orgs.rows.map((r) => r.id)],
  )
  console.log("SOURCES")
  console.table(sources.rows)

  const docs = await pool.query(
    `select source_id, count(*)::int as docs, max(fetched_at) as last_fetched
       from raw_documents where source_id = any($1::text[]) group by source_id`,
    [sources.rows.map((r) => r.id)],
  )
  console.log("RAW DOCUMENTS")
  console.table(docs.rows)

  const programs = await pool.query(
    `select p.id, p.title, s.slug as sport, o.id as offering_id, o.published, o.season_start_date, o.season_end_date
       from programs p
       left join sports s on s.id = p.sport_id
       left join program_offerings o on o.program_id = p.id
      where p.organization_id = any($1::text[])`,
    [orgs.rows.map((r) => r.id)],
  )
  console.log("PROGRAMS / OFFERINGS")
  console.table(programs.rows)

  const candidates = await pool.query(
    `select id, kind, status, proposed_title, proposed_organization_name, source_id, discovered_at
       from review_candidates
      where proposed_organization_name ilike $1 or target_organization_id = any($2::text[]) or source_id = any($3::text[])`,
    [name, orgs.rows.map((r) => r.id), sources.rows.map((r) => r.id)],
  )
  console.log("REVIEW CANDIDATES")
  console.table(candidates.rows)

  const near = await pool.query(
    `select id, name, town from organizations where town ilike '%barre%' order by name`,
  )
  console.log("ORGANIZATIONS IN BARRE")
  console.table(near.rows)

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
