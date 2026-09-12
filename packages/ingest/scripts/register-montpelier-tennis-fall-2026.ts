/**
 * Adds "Tennis - VT Academy - Youth" (Fall 2026) for Montpelier Recreation.
 *
 * A parent-reported gap: this program is already running (registration
 * windows for all three sections opened before this was caught) but had no
 * row in `programs`/`program_offerings`. The org's real registration page
 * lives on WebTrac behind Cloudflare bot-management (see
 * `src-montpelier-webtrac-tennis-ar` below) — automated crawling of it was
 * already ruled out, so this is a one-time manual entry transcribed directly
 * from the live WebTrac listing, following the same curated pattern as the
 * org's existing Tae Kwon Do programs (also hand-entered, not yet crawled).
 *
 * The WebTrac page lists three sections (Tue-only, Thu-only, Tue+Thu) under
 * one durable program — modeled as one program + one Fall 2026 offering,
 * matching the schema's program/offering split (see schema.ts header).
 *
 *   pnpm --filter @openplay/ingest register-montpelier-tennis-fall-2026
 *
 * Idempotent — re-running updates rather than duplicates.
 */
import { db, fieldProvenance, pool, programOfferings, programs, sources } from "@openplay/db"

const ORG_ID = "org-us-vt-montpelier-recreation"
const SPORT_ID = "sp_tennis"

const PROGRAM_ID = "prog-montpelier-recreation-tennis-vt-academy-youth"
const PROGRAM_SLUG = "org-us-vt-montpelier-recreation-tennis-vt-academy-youth"
const OFFERING_ID = "offer-montpelier-recreation-tennis-vt-academy-youth-fall-2026"
const SOURCE_ID = "src-montpelier-webtrac-tennis-ar"

// CSRF token query param stripped — it's per-session and would be stale on
// the very next page load, unlike the rest of the URL.
const REGISTRATION_URL =
  "https://webtrac.montpelier-vt.org/wbwsc/webtrac.wsc/search.html?module=AR&type=YPROG,YTENN"

const now = new Date()

async function main() {
  await db
    .insert(sources)
    .values({
      id: SOURCE_ID,
      organizationId: ORG_ID,
      url: REGISTRATION_URL,
      sourceType: "registration_platform",
      label: "Montpelier Recreation — WebTrac activity search (Youth Programs / Tennis)",
      platform: "webtrac",
      authoritativeLevel: "primary",
      crawlIntervalHours: 720,
      robotsAllowed: false,
      robotsCheckedAt: now,
      permissionNote:
        "Blocked by Cloudflare bot management before robots.txt could even be evaluated — do not retry automated crawling; re-verify by hand each season.",
      termsStatus: "needs_review",
      consecutiveFailures: 0,
      active: false,
      sourceStatus: "disabled",
    })
    .onConflictDoUpdate({
      target: sources.id,
      set: {
        url: REGISTRATION_URL,
        label: "Montpelier Recreation — WebTrac activity search (Youth Programs / Tennis)",
        robotsCheckedAt: now,
        updatedAt: now,
      },
    })

  const programValues = {
    id: PROGRAM_ID,
    slug: PROGRAM_SLUG,
    organizationId: ORG_ID,
    sportId: SPORT_ID,
    title: "Tennis - VT Academy - Youth",
    description:
      "The Vermont Tennis Academy is designed to help beginners to advanced players reach their maximum potential in a very short period of time. The Academy offers low and high performance tennis training for all ages and abilities. Scott's experience as a tennis professional includes teaching beginners, intermediates and advanced players as well as high school, college and professional level players. All participants will be divided into groups by age and skill level.",
    programType: "recreational" as const,
    programFormat: "recurring_class" as const,
    audienceType: "youth" as const,
    competitionLevel: "recreational" as const,
    gender: "any" as const,
    minGrade: 1,
    maxGrade: 9,
    beginnerFriendly: true,
    typicalSeasons: ["fall"] as const,
    practiceSchedule:
      "Three sections at Rec. Field, 3:30-5:00 pm: Tuesdays only, Thursdays only, or both Tuesdays and Thursdays.",
    verificationStatus: "admin_reviewed" as const,
    active: true,
    status: "active" as const,
  }

  await db
    .insert(programs)
    .values(programValues)
    .onConflictDoUpdate({ target: programs.id, set: { ...programValues, updatedAt: now } })

  const offeringValues = {
    id: OFFERING_ID,
    programId: PROGRAM_ID,
    season: "fall" as const,
    seasonYear: 2026,
    seasonStartDate: "2026-09-08",
    seasonEndDate: "2026-10-08",
    registrationUrl: REGISTRATION_URL,
    registrationProvider: "WebTrac",
    audienceType: "youth" as const,
    currency: "USD",
    additionalFees:
      "Activity 2332-B (Tue only, 09/08-10/06): $150 resident / $225 non-resident. " +
      "Activity 2332-C (Thu only, 09/10-10/08): $150 resident / $225 non-resident. " +
      "Activity 2332-D (Tue & Thu, 09/08-10/08): $300 resident / $450 non-resident.",
    tags: ["webtrac-2332-B", "webtrac-2332-C", "webtrac-2332-D"],
    tryoutRequired: false,
    venueName: "Rec. Field",
    sourceUrl: REGISTRATION_URL,
    sourceType: "registration_platform" as const,
    dateDiscovered: now,
    dateLastChecked: now,
    verificationMethod: "manual_entry" as const,
    verificationStatus: "admin_reviewed" as const,
    published: true,
  }

  await db
    .insert(programOfferings)
    .values(offeringValues)
    .onConflictDoUpdate({ target: programOfferings.id, set: { ...offeringValues, updatedAt: now } })

  const tracked: Array<[string, string]> = [
    ["registrationUrl", REGISTRATION_URL],
    ["seasonStartDate", "2026-09-08"],
    ["seasonEndDate", "2026-10-08"],
    ["minGrade", "1"],
    ["maxGrade", "9"],
    ["additionalFees", offeringValues.additionalFees],
  ]

  for (const [field, value] of tracked) {
    await db
      .insert(fieldProvenance)
      .values({
        id: `prov_${OFFERING_ID}_${field}`,
        entityType: "program_offering",
        entityId: OFFERING_ID,
        field,
        value,
        sourceId: SOURCE_ID,
        sourceType: "registration_platform",
        extractionMethod: "manual_entry",
        // Human entry carries its own trust tier; model confidence doesn't apply.
        confidence: null,
        verificationStatus: "admin_reviewed",
        verifiedAt: now,
        verifiedBy: "admin",
      })
      .onConflictDoNothing({ target: fieldProvenance.id })
  }

  console.log(`Program ${PROGRAM_ID} and offering ${OFFERING_ID} registered.`)

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
