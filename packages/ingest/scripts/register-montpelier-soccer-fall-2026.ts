/**
 * Adds Montpelier Recreation's 6 Fall 2026 youth soccer programs, missing
 * from the same WebTrac activity search already backing Tennis and Tae Kwon
 * Do (see register-montpelier-tennis-fall-2026.ts / SOURCE_ID below). User
 * supplied the listings directly (WebTrac search results, pasted text) since
 * the page is Cloudflare-blocked and can't be crawled automatically.
 *
 * Each grade/gender split is modeled as its own program with one Fall 2026
 * offering, matching how WebTrac itself splits them (six separate activity
 * numbers, not sections of one program) — unlike Tennis, where three
 * WebTrac sections rolled up into one program.
 *
 *   pnpm --filter @openplay/ingest register-montpelier-soccer-fall-2026
 *
 * Idempotent — re-running updates rather than duplicates.
 */
import { db, fieldProvenance, pool, programOfferings, programs, sources } from "@openplay/db"

const ORG_ID = "org-us-vt-montpelier-recreation"
const SPORT_ID = "sp_soccer"

// Same shared WebTrac search source as Tennis/Tae Kwon Do — see
// register-montpelier-tennis-fall-2026.ts for how this was confirmed working
// and why the CSRF token is stripped. Kept in sync by literal, not import,
// since these are one-off admin scripts rather than a shared module.
const SOURCE_ID = "src-montpelier-webtrac-search"
const REGISTRATION_URL =
  "https://vtmontpelierweb.myvscloud.com/webtrac/web/search.html?Action=Start&SubAction=&type=YPROG&type=YSPOR&type=YTENN&beginmonth=&endmonth=&category=&grade=&location=&keyword=&keywordoption=Match+One&dayoption=All&gender=&spotsavailable=&bydayonly=No&beginyear=&season=&primarycode=&timeblock=&age=&module=AR&multiselectlist_value=&arwebsearch_buttonsearch=yes"

const DESCRIPTION =
  "This volunteer-run Youth Soccer program is an opportunity for 4 to 12 year old's to build self-esteem and have fun in a cooperative play environment. This program is open to players of all abilities. Participants will learn the basic skills: dribbling, passing, receiving, and attacking, to use them in game like situations."

type SoccerProgram = {
  key: string
  title: string
  activityNumber: string
  minGrade: number
  maxGrade: number
  /** 0 = kindergarten; -1 stands in for Pre-K, one grade below K. */
  gender: "coed" | "boys" | "girls"
  seasonStartDate: string
  seasonEndDate: string
  schedule: string
  venueName: string | null
  /** Tiers exactly as WebTrac lists them — not assumed to be resident/nonresident/scholarship, since e.g. 2300-A's middle tier ($0) doesn't fit that pattern. */
  costTiers: [string, string, string]
  registrationFee: string
  registrationStatus: "open" | "waitlist" | "closed"
}

const SOCCER_PROGRAMS: SoccerProgram[] = [
  {
    key: "pre-k-kindergarten-coed",
    title: "Fall Soccer - Pre-K & Kindergarten Co-Ed",
    activityNumber: "2300-A",
    minGrade: -1,
    maxGrade: 0,
    gender: "coed",
    seasonStartDate: "2026-09-09",
    seasonEndDate: "2026-10-24",
    schedule: "Wednesdays and Saturdays, 9:00-10:00 am.",
    venueName: null,
    costTiers: ["$40.00", "$0.00", "$0.00"],
    registrationFee: "40.00",
    registrationStatus: "waitlist",
  },
  {
    key: "grade-1-2-coed",
    title: "Fall Soccer - Grade 1/2 Co-Ed",
    activityNumber: "2301-A",
    minGrade: 1,
    maxGrade: 2,
    gender: "coed",
    seasonStartDate: "2026-09-09",
    seasonEndDate: "2026-10-24",
    schedule: "Wednesdays and Saturdays, 10:00-11:00 am.",
    venueName: null,
    costTiers: ["$40.00", "$75.00", "$0.00"],
    registrationFee: "40.00",
    registrationStatus: "waitlist",
  },
  {
    key: "grade-3-4-boys",
    title: "Fall Soccer - Grade 3/4 Boys",
    activityNumber: "2303-A",
    minGrade: 3,
    maxGrade: 4,
    gender: "boys",
    seasonStartDate: "2026-08-25",
    seasonEndDate: "2026-10-31",
    schedule: "Tuesdays and Saturdays, 9:00 am-12:00 pm.",
    venueName: null,
    costTiers: ["$50.00", "$0.00", "$0.00"],
    registrationFee: "50.00",
    registrationStatus: "closed",
  },
  {
    key: "grade-3-4-girls",
    title: "Fall Soccer - Grade 3/4 Girls",
    activityNumber: "2304-A",
    minGrade: 3,
    maxGrade: 4,
    gender: "girls",
    seasonStartDate: "2026-08-26",
    seasonEndDate: "2026-10-31",
    schedule: "Wednesdays and Saturdays, 9:00 am-12:00 pm.",
    venueName: null,
    costTiers: ["$50.00", "$0.00", "$0.00"],
    registrationFee: "50.00",
    registrationStatus: "waitlist",
  },
  {
    key: "grade-5-6-boys",
    title: "Fall Soccer - Grade 5/6 Boys",
    activityNumber: "2305-A",
    minGrade: 5,
    maxGrade: 6,
    gender: "boys",
    seasonStartDate: "2026-08-25",
    seasonEndDate: "2026-10-31",
    schedule: "Tuesdays and Saturdays, 9:00 am-12:00 pm.",
    venueName: "Rec. Field",
    costTiers: ["$50.00", "$0.00", "$0.00"],
    registrationFee: "50.00",
    registrationStatus: "open",
  },
  {
    key: "grade-5-6-girls",
    title: "Fall Soccer - Grade 5/6 Girls",
    activityNumber: "2306-A",
    minGrade: 5,
    maxGrade: 6,
    gender: "girls",
    seasonStartDate: "2026-08-26",
    seasonEndDate: "2026-10-31",
    schedule: "Wednesdays and Saturdays, 9:00 am-12:00 pm.",
    venueName: "Rec. Field",
    costTiers: ["$50.00", "$0.00", "$0.00"],
    registrationFee: "50.00",
    registrationStatus: "open",
  },
]

const now = new Date()

async function main() {
  await db
    .insert(sources)
    .values({
      id: SOURCE_ID,
      organizationId: ORG_ID,
      url: REGISTRATION_URL,
      sourceType: "registration_platform",
      label: "Montpelier Recreation — WebTrac activity search (all program types)",
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
        label: "Montpelier Recreation — WebTrac activity search (all program types)",
        robotsCheckedAt: now,
        updatedAt: now,
      },
    })

  for (const soccer of SOCCER_PROGRAMS) {
    const programId = `prog-montpelier-recreation-soccer-${soccer.key}`
    const programSlug = `org-us-vt-montpelier-recreation-soccer-${soccer.key}`
    const offeringId = `offer-montpelier-recreation-soccer-${soccer.key}-fall-2026`

    const programValues = {
      id: programId,
      slug: programSlug,
      organizationId: ORG_ID,
      sportId: SPORT_ID,
      title: soccer.title,
      description: DESCRIPTION,
      programType: "recreational" as const,
      programFormat: "league" as const,
      audienceType: "youth" as const,
      competitionLevel: "recreational" as const,
      gender: soccer.gender,
      minGrade: soccer.minGrade,
      maxGrade: soccer.maxGrade,
      beginnerFriendly: true,
      typicalSeasons: ["fall"] as const,
      practiceSchedule: soccer.schedule,
      verificationStatus: "admin_reviewed" as const,
      active: true,
      status: "active" as const,
    }

    await db
      .insert(programs)
      .values(programValues)
      .onConflictDoUpdate({ target: programs.id, set: { ...programValues, updatedAt: now } })

    const costLabel = `Cost as listed on WebTrac (activity ${soccer.activityNumber}): ${soccer.costTiers.join(" / ")}.`

    const offeringValues = {
      id: offeringId,
      programId,
      season: "fall" as const,
      seasonYear: 2026,
      seasonStartDate: soccer.seasonStartDate,
      seasonEndDate: soccer.seasonEndDate,
      registrationUrl: REGISTRATION_URL,
      registrationProvider: "WebTrac",
      registrationStatus: soccer.registrationStatus,
      audienceType: "youth" as const,
      currency: "USD",
      registrationFee: soccer.registrationFee,
      additionalFees: costLabel,
      tags: [`webtrac-${soccer.activityNumber}`],
      tryoutRequired: false,
      venueName: soccer.venueName,
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
      ["seasonStartDate", soccer.seasonStartDate],
      ["seasonEndDate", soccer.seasonEndDate],
      ["minGrade", String(soccer.minGrade)],
      ["maxGrade", String(soccer.maxGrade)],
      ["registrationFee", soccer.registrationFee],
      ["additionalFees", costLabel],
      ["registrationStatus", soccer.registrationStatus],
    ]

    for (const [field, value] of tracked) {
      const provenanceValues = {
        id: `prov_${offeringId}_${field}`,
        entityType: "program_offering" as const,
        entityId: offeringId,
        field,
        value,
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

    console.log(`Program ${programId} and offering ${offeringId} registered.`)
  }

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
