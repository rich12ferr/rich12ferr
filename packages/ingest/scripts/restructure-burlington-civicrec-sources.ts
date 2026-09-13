/**
 * Splits the single, mislabeled source row each CivicRec town had into the
 * two distinct sources a CivicRec town actually has:
 *
 *   - an **organization page**, the town's own .gov page describing its rec
 *     department (previously the only row on file, incorrectly typed
 *     `registration_platform` / `platform: civicrec` even though it carries
 *     no program data at all — Burlington's is a plain Sports info page,
 *     South Burlington's is a FAQ page);
 *   - a **registration platform**, the real CivicRec catalog at
 *     `secure.rec1.com/{state}/{slug}/catalog`, where the program dates,
 *     fees, and ages actually live. Confirmed working end-to-end against
 *     both towns via `civicrec.ts` (2026-09-13): 31 programs for Burlington,
 *     64 for South Burlington, each with real season dates and fees.
 *
 * Before this, the crawler was pointed at the .gov page and got nothing —
 * the same gap myrec towns had until their detail pages were folded in.
 *
 *   pnpm --filter @openplay/ingest restructure-burlington-civicrec-sources
 *
 * Idempotent — re-running reapplies the same values.
 */
import { db, pool, sources } from "@openplay/db"
import { eq } from "drizzle-orm"

const now = new Date()

const TOWNS = [
  {
    orgId: "org-us-vt-burlington-parks-recreation-waterfront",
    orgLabel: "Burlington Parks, Recreation & Waterfront",
    orgPageSourceId: "VT-MUNI-BURLINGTON-CIVICREC",
    orgPageUrl: "https://www.burlingtonvt.gov/1086/Sports",
    catalogSourceId: "VT-MUNI-BURLINGTON-CIVICREC-CATALOG",
    catalogUrl: "https://secure.rec1.com/VT/burlington-vt/catalog",
  },
  {
    orgId: "org-us-vt-south-burlington-recreation-parks",
    orgLabel: "South Burlington Recreation & Parks",
    orgPageSourceId: "VT-MUNI-SOUTHBURLINGTON-CIVICREC",
    orgPageUrl: "https://southburlingtonvt.gov/457/FAQs",
    catalogSourceId: "VT-MUNI-SOUTHBURLINGTON-CIVICREC-CATALOG",
    catalogUrl: "https://secure.rec1.com/VT/south-burlington-vt-recreation-parks/catalog",
  },
] as const

async function main() {
  for (const town of TOWNS) {
    // The existing row becomes the organization page: still worth crawling
    // (it can carry a season announcement or a link change), just no longer
    // mislabeled as the registration platform it never was.
    await db
      .update(sources)
      .set({
        sourceType: "organization_website",
        platform: null,
        label: `${town.orgLabel} — organization page`,
        updatedAt: now,
      })
      .where(eq(sources.id, town.orgPageSourceId))
    console.log(`Retyped ${town.orgPageSourceId} to organization_website.`)

    // The new row is the real registration platform.
    await db
      .insert(sources)
      .values({
        id: town.catalogSourceId,
        organizationId: town.orgId,
        url: town.catalogUrl,
        sourceType: "registration_platform",
        label: `${town.orgLabel} — CivicRec catalog`,
        platform: "civicrec",
        authoritativeLevel: "primary",
        robotsAllowed: true,
        robotsCheckedAt: now,
        permissionNote: "robots.txt on secure.rec1.com has no disallow rules; catalog API confirmed reachable.",
        termsStatus: "needs_review",
        active: true,
        sourceStatus: "active",
      })
      .onConflictDoUpdate({
        target: sources.id,
        set: {
          url: town.catalogUrl,
          label: `${town.orgLabel} — CivicRec catalog`,
          platform: "civicrec",
          updatedAt: now,
        },
      })
    console.log(`Registered ${town.catalogSourceId} -> ${town.catalogUrl}.`)
  }

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
