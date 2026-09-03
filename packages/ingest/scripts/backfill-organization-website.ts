/**
 * One-time backfill for organizations imported before the `website_url` fix
 * in import-source-registry.ts (see that file's comment on the same field).
 *
 * Originally, `website_url` was only ever set when a source's type was
 * literally `organization_website` — so any organization whose only source
 * was a `registration_platform` page (MyRec, SportsEngine, CivicRec, ...)
 * was left with website_url = null, and the "visit website" button on its
 * public and admin pages silently disappeared. Per product decision, we
 * link out regardless: a MyRec sub-page is still where a parent finds dates
 * and registers, which is the point of the link.
 *
 * For each organization missing website_url, this picks one source to link
 * to — preferring an `organization_website`-typed source over a
 * `registration_platform` one when both exist, then the oldest by
 * `created_at` as a stable tiebreaker — and writes its URL onto the
 * organization.
 *
 * Idempotent: only touches organizations where website_url is currently
 * null or empty, so re-running after fixing a source's URL is harmless.
 *
 * Run: pnpm --filter @openplay/ingest backfill-organization-website
 */
import { db, organizations, pool, sources } from "@openplay/db"
import { and, asc, eq, isNull, or, sql } from "drizzle-orm"

async function main() {
  const missing = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(or(isNull(organizations.websiteUrl), eq(organizations.websiteUrl, "")))

  console.log(`${missing.length} organization(s) missing website_url.\n`)

  let backfilled = 0
  let stillUnresolved = 0

  for (const org of missing) {
    // organization_website first, then earliest-created as a stable
    // tiebreaker when an org has several sources of the same type.
    const [best] = await db
      .select({ url: sources.url, sourceType: sources.sourceType })
      .from(sources)
      .where(eq(sources.organizationId, org.id))
      .orderBy(
        // Explicit priority rather than relying on alphabetical order —
        // "bulk_upload" and "community_submission" both sort before
        // "organization_website" alphabetically and are not better choices.
        asc(sql`case when ${sources.sourceType} = 'organization_website' then 0 else 1 end`),
        asc(sources.createdAt),
      )
      .limit(1)

    if (!best) {
      stillUnresolved += 1
      console.log(`  no source at all -> ${org.id} "${org.name}" (left unset)`)
      continue
    }

    await db
      .update(organizations)
      .set({ websiteUrl: best.url, updatedAt: new Date() })
      .where(and(eq(organizations.id, org.id), or(isNull(organizations.websiteUrl), eq(organizations.websiteUrl, ""))))

    backfilled += 1
    console.log(`  ${org.id} "${org.name}" -> ${best.url}  [${best.sourceType}]`)
  }

  console.log(`\n${backfilled} organization(s) backfilled, ${stillUnresolved} left unset (no source found).`)

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
