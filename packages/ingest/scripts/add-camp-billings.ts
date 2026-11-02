/**
 * Registers Camp Billings (co-ed overnight camp on Lake Fairlee, ages 8-15)
 * and adds its four Summer 2027 sessions, transcribed from campbillings.org.
 * Registration runs through CampInTouch, which is a login-only portal, so the
 * public homepage is the crawl source. Re-run after editing SESSIONS; already
 * approved titles are skipped.
 *
 * Usage:
 *   pnpm --filter @openplay/ingest exec tsx --env-file-if-exists=/vercel/share/.env.project scripts/add-camp-billings.ts
 */
import { randomUUID } from "node:crypto"

import { db, organizations, pool, reviewCandidates, sources } from "@openplay/db"
import { and, eq } from "drizzle-orm"

import { organizationMatchKey } from "../src/entity-resolution"
import { checkRobots } from "../src/fetch"
import { approveReviewCandidate } from "../src/review-actions"

const ORGANIZATION = {
  id: "org-us-vt-camp-billings",
  slug: "camp-billings",
  name: "Camp Billings",
  town: "Fairlee",
  state: "VT",
  websiteUrl: "https://www.campbillings.org/",
}

const SOURCE = {
  id: "src_camp_billings",
  url: "https://www.campbillings.org/",
  label: "Camp Billings (summer sessions and tuition)",
  crawlIntervalHours: 168,
}

const REGISTRATION_URL = "https://campbillings.campintouch.com"

const SHARED = {
  organizationName: ORGANIZATION.name,
  town: "Fairlee",
  state: "VT",
  zip: "05045",
  venueName: "Camp Billings on Lake Fairlee",
  venueAddress: "1452 Route 244, Fairlee, VT 05045",
  audienceType: "youth",
  programFormat: "camp",
  programType: "recreational",
  sportName: "camps & enrichment",
  campStay: "overnight",
  campFocus: "general",
  campPeriod: "summer",
  season: "summer",
  seasonYear: 2027,
  dayLength: "full_day",
  gender: "coed",
  minAge: 8,
  maxAge: 15,
  minGrade: null,
  maxGrade: null,
  dailyStartTime: null,
  dailyEndTime: null,
  contactEmail: null,
  contactName: null,
  contactUrl: ORGANIZATION.websiteUrl,
  registrationUrl: REGISTRATION_URL,
  registrationOpenDate: null,
  registrationCloseDate: null,
  registrationFee: null,
  scholarshipAvailable: null,
  waitlistAvailable: null,
  tryoutRequired: false,
  beforeCare: null,
  afterCare: null,
  extendedCareDetails: null,
  sessions: null,
  tags: ["sleepaway", "overnight camp", "lake", "summer 2027"],
  ambiguities: [],
  sourceQuotes: {},
  fieldConfidence: {},
}

const SESSIONS = [
  { number: 1, start: "2027-06-27", end: "2027-07-10", label: "June 27 - July 10", tuition: 2400 },
  { number: 2, start: "2027-07-11", end: "2027-07-24", label: "July 11 - July 24", tuition: 2700 },
  { number: 3, start: "2027-07-25", end: "2027-08-07", label: "July 25 - August 7", tuition: 2700 },
  { number: 4, start: "2027-08-08", end: "2027-08-21", label: "August 8 - August 21", tuition: 2700 },
]

async function registerOrganizationAndSource() {
  const matchKey = organizationMatchKey(ORGANIZATION.name, ORGANIZATION.town, ORGANIZATION.state)
  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.matchKey, matchKey))
    .limit(1)

  const organizationId = existing?.id ?? ORGANIZATION.id
  if (!existing) {
    await db.insert(organizations).values({
      id: ORGANIZATION.id,
      slug: ORGANIZATION.slug,
      name: ORGANIZATION.name,
      organizationType: "nonprofit",
      websiteUrl: ORGANIZATION.websiteUrl,
      town: ORGANIZATION.town,
      state: ORGANIZATION.state,
      matchKey,
    })
  }
  console.log(`${ORGANIZATION.name}: ${existing ? "already existed" : "created"} (${organizationId})`)

  const robots = await checkRobots(SOURCE.url)
  const sourceFields = {
    organizationId,
    url: SOURCE.url,
    label: SOURCE.label,
    robotsAllowed: robots.allowed,
    robotsCheckedAt: new Date(),
    permissionNote: robots.note,
    active: robots.allowed,
  }
  await db
    .insert(sources)
    .values({
      id: SOURCE.id,
      sourceType: "organization_website",
      crawlIntervalHours: SOURCE.crawlIntervalHours,
      consecutiveFailures: 0,
      ...sourceFields,
    })
    .onConflictDoUpdate({ target: sources.id, set: { ...sourceFields, updatedAt: new Date() } })
  console.log(`${robots.allowed ? "allowed" : "BLOCKED"} ${SOURCE.id} -> ${SOURCE.url}`)
}

async function addSessions() {
  for (const session of SESSIONS) {
    const title = `Camp Billings Summer 2027 - Session ${session.number}`
    const [already] = await db
      .select({ id: reviewCandidates.id })
      .from(reviewCandidates)
      .where(
        and(
          eq(reviewCandidates.sourceId, SOURCE.id),
          eq(reviewCandidates.proposedTitle, title),
          eq(reviewCandidates.status, "approved"),
        ),
      )
      .limit(1)
    if (already) {
      console.log(`skip ${title} (already approved as ${already.id})`)
      continue
    }

    const payload = {
      ...SHARED,
      title,
      seasonStartDate: session.start,
      seasonEndDate: session.end,
      pricing: [{ type: "season", amount: session.tuition, currency: "USD" }],
      additionalFees: `Two-week session tuition: $${session.tuition.toLocaleString("en-US")}.`,
      description: `Two-week co-ed overnight session for campers ages 8-15 (${session.label}, 2027) on Lake Fairlee. Founded in 1906, Camp Billings is a nonprofit, screen-free sleepaway camp where campers try new activities every day, share cabin duties, and build lasting friendships. Summer 2027 registration is open on CampInTouch; Camp Billings publishes a step-by-step registration guide and hosts Family Information Sessions.`,
    }

    const id = `rc_${randomUUID().replace(/-/g, "").slice(0, 20)}`
    await db.insert(reviewCandidates).values({
      id,
      kind: "new_program",
      sourceId: SOURCE.id,
      proposedTitle: title,
      proposedOrganizationName: ORGANIZATION.name,
      payload,
      reviewReason: "new_program",
      confidence: 1,
      duplicateAssessment: "new",
      status: "pending",
    })
    const result = await approveReviewCandidate(id, "v0-agent")
    console.log(title, JSON.stringify(result))
  }
}

async function main() {
  await registerOrganizationAndSource()
  await addSessions()
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
