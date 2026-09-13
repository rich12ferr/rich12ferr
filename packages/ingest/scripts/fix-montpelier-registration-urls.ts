/**
 * Fixes the "View program page" destination for Montpelier Recreation's
 * existing Tae Kwon Do offerings.
 *
 * Both offerings had `registrationUrl`/`sourceUrl` pointing at
 * montpelier-vt.org/988/Youth-Programs — a plain informational page, not
 * anything a parent can actually register through. The org's real
 * registration surface is WebTrac, confirmed working by direct user testing
 * (2026-09-12) via a broad activity search covering every Montpelier Rec
 * program type. That same URL now also backs the Tennis offering — see
 * register-montpelier-tennis-fall-2026.ts, which owns the literal and the
 * shared `src-montpelier-webtrac-search` source row this script reuses.
 *
 * Both offerings currently render the "View program page" fallback (not
 * "Register") because neither has registration open/close dates recorded —
 * see apps/web/lib/registration-status.ts customerFacingState + canRegister
 * in activity-card.tsx/[slug]/page.tsx. registrationUrl is updated anyway so
 * the same destination takes over immediately if that ever changes.
 *
 * Also retires the tennis-only source row (`src-montpelier-webtrac-tennis-ar`)
 * created before this URL was confirmed — superseded by the shared one.
 *
 *   pnpm --filter @openplay/ingest fix-montpelier-registration-urls
 *
 * Idempotent — re-running reapplies the same values.
 */
import { db, fieldProvenance, pool, programOfferings, sources } from "@openplay/db"
import { eq } from "drizzle-orm"

// Kept identical to register-montpelier-tennis-fall-2026.ts's SOURCE_ID and
// REGISTRATION_URL — both scripts point at the one shared source row.
const SOURCE_ID = "src-montpelier-webtrac-search"
const REGISTRATION_URL =
  "https://vtmontpelierweb.myvscloud.com/webtrac/web/search.html?Action=Start&SubAction=&type=YPROG&type=YSPOR&type=YTENN&beginmonth=&endmonth=&category=&grade=&location=&keyword=&keywordoption=Match+One&dayoption=All&gender=&spotsavailable=&bydayonly=No&beginyear=&season=&primarycode=&timeblock=&age=&module=AR&multiselectlist_value=&arwebsearch_buttonsearch=yes"

const OLD_TENNIS_ONLY_SOURCE_ID = "src-montpelier-webtrac-tennis-ar"

const OFFERING_IDS = [
  "offer-montpelier-recreation-tae-kwon-do-ages-6-9-fall-2026",
  "offer-montpelier-recreation-tae-kwon-do-ages-10-plus-fall-2026",
]

const now = new Date()

async function main() {
  for (const offeringId of OFFERING_IDS) {
    await db
      .update(programOfferings)
      .set({
        registrationUrl: REGISTRATION_URL,
        sourceUrl: REGISTRATION_URL,
        registrationProvider: "WebTrac",
        dateLastChecked: now,
        updatedAt: now,
      })
      .where(eq(programOfferings.id, offeringId))

    for (const field of ["registrationUrl", "sourceUrl"] as const) {
      const provenanceValues = {
        id: `prov_${offeringId}_${field}`,
        entityType: "program_offering" as const,
        entityId: offeringId,
        field,
        value: REGISTRATION_URL,
        sourceId: SOURCE_ID,
        sourceType: "registration_platform" as const,
        extractionMethod: "manual_entry" as const,
        // Human entry carries its own trust tier; model confidence doesn't apply.
        confidence: null,
        verificationStatus: "admin_reviewed" as const,
        verifiedAt: now,
        verifiedBy: "admin",
      }
      await db
        .insert(fieldProvenance)
        .values(provenanceValues)
        .onConflictDoUpdate({ target: fieldProvenance.id, set: provenanceValues })
    }

    console.log(`Updated ${offeringId} to the shared WebTrac search URL.`)
  }

  // Cleanup: the tennis-only source row this superseded. Nothing else
  // references it by id (field_provenance rows key on the offering id, not
  // this row), so deleting is safe.
  const deleted = await db.delete(sources).where(eq(sources.id, OLD_TENNIS_ONLY_SOURCE_ID)).returning({ id: sources.id })
  if (deleted.length > 0) {
    console.log(`Removed superseded source row ${OLD_TENNIS_ONLY_SOURCE_ID}.`)
  }

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
