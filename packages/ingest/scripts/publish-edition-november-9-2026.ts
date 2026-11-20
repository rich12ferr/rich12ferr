/**
 * One-off: authors and publishes the November 9, 2026 "This Week" edition,
 * which replaces October 19 on the homepage. October 19 stays in the
 * `/this-week` archive untouched.
 *
 * Story 1 (`missingActivity`): Middlebury Snowbowl's Holiday Panthers 3-Day
 * Ski & Ride Camps. Facts checked on November 13, 2026 against
 * https://middleburysnowbowl.com/holiday-camps/ and its reservation catalog
 * (shop.skimiddlebury.com, "Holiday Panthers" category: 10 products, $225
 * each, ski and snowboard per date). Remaining capacity was not confirmed
 * through checkout, so the copy never claims open spaces. Snowbowl is not in
 * the directory yet, so organizationId/programId stay null.
 *
 * Story 2: Shelburne's Bolton Valley Ski & Ride, carried forward from
 * October 19 now that its listing is live (prog_d7aea85e03ab4a9aa62a) and the
 * November 5 registration window has opened.
 *
 * Idempotent: upserts the same edition and story ids on every run.
 *
 * Usage: pnpm --filter @openplay/ingest exec tsx scripts/publish-edition-november-9-2026.ts
 */
import { db, pool, weeklyEditions, weeklyStories, type NewWeeklyStory } from "@openplay/db"
import { sql } from "drizzle-orm"

const EDITION_ID = "wk_2026_11_09"

const SNOWBOWL_RESERVATIONS =
  "https://shop.skimiddlebury.com/en/catalogue/category/100-snowbowl/200-snowbowl-snow-school/412-holiday-panthers_53/"

const stories: NewWeeklyStory[] = [
  {
    id: "wks_2026_11_09_1",
    editionId: EDITION_ID,
    sortOrder: 0,
    featuredRank: 1,
    headline: "Middlebury Snowbowl opens bookings for holiday ski and ride camps",
    teaser:
      "Middlebury Snowbowl's Holiday Panthers camps are bookable for the December holidays and February vacation. Each is three mornings or three afternoons on snow for ages 5-12, at $225 per camp before lift access and rentals. Check availability when you book; open spots aren't confirmed.",
    body: "Middlebury Snowbowl in Hancock has posted reservations for its 2026-27 Holiday Panthers 3-Day Ski & Ride Camps. There are five camps: December 26-28 and December 29-31, 2026, plus February 13-15, February 16-18 and February 24-26, 2027. Each day runs either 9 AM to noon or 1 to 4 PM, and morning and afternoon groups are booked separately. Ski camps are open to ages 5-12 at any ability level, with kids grouped by age and ability. Snowboard camps are for ages 6-12 and are aimed at first-time riders. Snowbowl advertises a 5:1 student-to-instructor ratio. Each camp is $225; lift access and rental equipment are extra. Sign Up Vermont has confirmed that the reservation pages are live, but not how many spaces remain, so check your dates on Snowbowl's booking page before you plan around them. The camps meet at the Snowbowl, 6886 Route 125 in Hancock.",
    categoryLabel: "Ski & snowboard camps",
    sportId: "sp_snow_sports",
    season: "winter",
    locationLabel: "Hancock",
    organizationName: "Middlebury Snowbowl",
    organizationId: null,
    programId: null,
    offeringId: null,
    registrationStatus: "open",
    registrationOpensOn: null,
    registrationClosesOn: null,
    waitlistStatus: "Remaining spaces not confirmed",
    programDatesLabel: "Dec 26-28 and 29-31; Feb 13-15, 16-18 and 24-26",
    sourceUrl: "https://middleburysnowbowl.com/holiday-camps/",
    sourceLabel: "Middlebury Snowbowl",
    ctaLabel: "Check dates at Snowbowl",
    ctaHref: SNOWBOWL_RESERVATIONS,
    missingActivity: true,
    missingActivityNote:
      "These camps are newly identified and are being added to the Sign Up Vermont directory. Until the listing is live, reserve directly with Middlebury Snowbowl.",
  },
  {
    id: "wks_2026_11_09_2",
    editionId: EDITION_ID,
    sortOrder: 1,
    featuredRank: 2,
    headline: "Shelburne's after-school ski and ride registration is open",
    teaser:
      "Registration for Shelburne's Wednesday Bolton Valley Ski & Ride Program opened November 5 for grades 7-8, and grades 5-6 can sign up from November 16 if space remains. The deadline is December 7, and bus seats are limited.",
    body: "Shelburne Parks & Recreation's 2026-27 Bolton Valley Ski & Ride Program is now taking registrations. It's an after-school night skiing and snowboarding program for students in grades 5-8, with a bus from Shelburne Community School to Bolton Valley Resort on Wednesdays. Session 1 runs January 6, 13, 20 and 27, and Session 2 runs February 10 and March 3, 10 and 17, 2027. Each child can register for one session. Registration opened November 5 for grades 7-8 and opens at 8 AM on November 16 for grades 5-6 if space remains. The deadline is December 7. Bus capacity is limited. The base fee is $110 for bus transportation, and families can add a lift ticket ($90), group lessons ($80), ski or snowboard rental ($90) or a helmet-only rental ($30).",
    categoryLabel: "Skiing & snowboarding",
    sportId: "sp_snow_sports",
    season: "winter",
    locationLabel: "Shelburne to Bolton Valley",
    organizationName: "Shelburne Parks & Recreation",
    organizationId: "org-us-vt-shelburne-parks-recreation",
    programId: "prog_d7aea85e03ab4a9aa62a",
    offeringId: "off_eef9f18e336140589c7e",
    registrationStatus: "open",
    registrationOpensOn: "2026-11-05",
    registrationClosesOn: "2026-12-07",
    waitlistStatus: null,
    programDatesLabel: "Two four-week Wednesday sessions, January-March 2027",
    sourceUrl: "https://www.shelburnevt.org/184/Bolton-Ski-Ride-Program",
    sourceLabel: "Shelburne Parks & Recreation",
    ctaLabel: "View program details",
    ctaHref: "/activities/bolton-valley-after-school-ski-us-vt-shelburne-parks",
    missingActivity: false,
    missingActivityNote: null,
  },
]

async function main() {
  const now = new Date()

  await db
    .insert(weeklyEditions)
    .values({
      id: EDITION_ID,
      weekSlug: "november-9-2026",
      weekStart: "2026-11-09",
      weekEnd: "2026-11-15",
      title: "Holiday ski camps at Middlebury Snowbowl are bookable",
      intro:
        "School-break snow camps are taking reservations: Middlebury Snowbowl has opened bookings for its Holiday Panthers camps, and Shelburne's after-school ski and ride registration is open.",
      published: true,
      publishedAt: now,
    })
    .onConflictDoUpdate({
      target: weeklyEditions.id,
      set: {
        title: sql`excluded.title`,
        intro: sql`excluded.intro`,
        published: true,
        publishedAt: sql`coalesce(${weeklyEditions.publishedAt}, excluded.published_at)`,
        updatedAt: now,
      },
    })

  for (const story of stories) {
    const { id: _id, ...fields } = story
    await db
      .insert(weeklyStories)
      .values(story)
      .onConflictDoUpdate({ target: weeklyStories.id, set: { ...fields, updatedAt: now } })
  }

  console.log(`Published november-9-2026 with ${stories.length} featured stories.`)
  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
