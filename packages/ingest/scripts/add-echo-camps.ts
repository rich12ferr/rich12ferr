/**
 * Adds ECHO's 2026-2027 vacation camps, transcribed from the public camps page.
 * ECHO's Cloudflare bot protection challenges OpenPlayBot (robots.txt allows
 * it), so the weekly crawl cannot read the page. Re-run after editing CAMPS
 * when ECHO posts new dates; already-approved titles are skipped.
 *
 * Usage:
 *   pnpm --filter @openplay/ingest exec tsx --env-file-if-exists=/vercel/share/.env.project scripts/add-echo-camps.ts
 */
import { randomUUID } from "node:crypto"

import { db, pool, reviewCandidates } from "@openplay/db"
import { and, eq } from "drizzle-orm"

import { approveReviewCandidate } from "../src/review-actions"

const SOURCE_ID = "src_echo_camps"
const PAGE_URL = "https://www.echovermont.org/events/camps/"
const ORGANIZATION_NAME = "ECHO, Leahy Center for Lake Champlain"

const SHARED = {
  organizationName: ORGANIZATION_NAME,
  town: "Burlington",
  state: "VT",
  zip: "05401",
  venueName: "ECHO, Leahy Center for Lake Champlain",
  venueAddress: "1 College Street, Burlington, VT 05401",
  audienceType: "youth",
  programFormat: "camp",
  programType: "recreational",
  sportName: "camps & enrichment",
  campStay: "day",
  campFocus: "stem",
  dayLength: "full_day",
  gender: "coed",
  minGrade: 0,
  maxGrade: 3,
  minAge: null,
  maxAge: null,
  dailyStartTime: "08:30",
  dailyEndTime: "15:30",
  contactEmail: "camps@echovermont.org",
  contactName: null,
  contactUrl: PAGE_URL,
  registrationUrl: PAGE_URL,
  scholarshipAvailable: true,
  waitlistAvailable: true,
  tryoutRequired: false,
  beforeCare: null,
  afterCare: null,
  extendedCareDetails: null,
  registrationCloseDate: null,
  registrationFee: null,
  sessions: null,
  ambiguities: [],
  sourceQuotes: {},
  fieldConfidence: {},
}

const CAMPS = [
  {
    title: "Colorful Critters Camp",
    season: "fall",
    seasonYear: 2026,
    campPeriod: "other_break",
    seasonStartDate: "2026-11-23",
    seasonEndDate: "2026-11-24",
    registrationOpenDate: null,
    nonMemberPrice: 200,
    memberPrice: 160,
    tags: ["science", "art", "insects", "thanksgiving break"],
    description:
      "Two-day camp for grades K-3 (Monday and Tuesday, November 23-24, 2026). Campers explore insects through painting, printing and collage inspired by Eric Carle, investigate insect anatomy, and engineer their own colorful creations. Spots are currently filled; ECHO keeps a waitlist on its camps page.",
  },
  {
    title: "Wonders of Winter Camp",
    season: "winter",
    seasonYear: 2027,
    campPeriod: "february_break",
    seasonStartDate: "2027-02-22",
    seasonEndDate: "2027-02-26",
    registrationOpenDate: null,
    nonMemberPrice: 440,
    memberPrice: 400,
    tags: ["science", "engineering", "winter", "february vacation"],
    description:
      "February-break STEM camp for grades K-3 (Monday-Friday, February 22-26, 2027). Campers shake off cabin fever as scientists and engineers, unlocking the mysteries of winter through sensory-rich experiments, collaborative engineering challenges, and playful discoveries. Registration opens in early December 2026.",
  },
  {
    title: "Space Camp",
    season: "spring",
    seasonYear: 2027,
    campPeriod: "april_break",
    seasonStartDate: "2027-04-19",
    seasonEndDate: "2027-04-23",
    registrationOpenDate: null,
    nonMemberPrice: 440,
    memberPrice: 400,
    tags: ["science", "space", "engineering", "april vacation"],
    description:
      "April-break camp for grades K-3 (Monday-Friday, April 19-23, 2027). Campers investigate planets, gravity and the vacuum of space through engineering design challenges, science demos, and space-themed art. Registration opens in early December 2026.",
  },
]

async function main() {
  for (const camp of CAMPS) {
    const [already] = await db
      .select({ id: reviewCandidates.id })
      .from(reviewCandidates)
      .where(
        and(
          eq(reviewCandidates.sourceId, SOURCE_ID),
          eq(reviewCandidates.proposedTitle, camp.title),
          eq(reviewCandidates.status, "approved"),
        ),
      )
      .limit(1)
    if (already) {
      console.log(`skip ${camp.title} (already approved as ${already.id})`)
      continue
    }

    const { nonMemberPrice, memberPrice, ...fields } = camp
    const payload = {
      ...SHARED,
      ...fields,
      pricing: [{ type: "season", amount: nonMemberPrice, currency: "USD" }],
      additionalFees: `Non-member price $${nonMemberPrice}; ECHO Member price $${memberPrice}. Limited scholarships available (apply separately).`,
    }

    const id = `rc_${randomUUID().replace(/-/g, "").slice(0, 20)}`
    await db.insert(reviewCandidates).values({
      id,
      kind: "new_program",
      sourceId: SOURCE_ID,
      proposedTitle: camp.title,
      proposedOrganizationName: ORGANIZATION_NAME,
      payload,
      reviewReason: "new_program",
      confidence: 1,
      duplicateAssessment: "new",
      status: "pending",
    })
    const result = await approveReviewCandidate(id, "v0-agent")
    console.log(camp.title, JSON.stringify(result))
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
