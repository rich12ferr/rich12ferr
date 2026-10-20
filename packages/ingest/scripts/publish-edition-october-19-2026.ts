/**
 * One-off: authors and publishes the October 19, 2026 "This Week" edition,
 * which replaces October 12 on the homepage (the homepage shows the newest
 * published edition whose weekStart has passed). October 12 stays in the
 * `/this-week` archive untouched.
 *
 * One story, `missingActivity`: Shelburne Parks & Recreation's 2026-27
 * Bolton Valley Ski & Ride after-school program. Facts are taken from
 * https://www.shelburnevt.org/184/Bolton-Ski-Ride-Program and match the
 * crawled review candidate. The program is queued for review, not yet live,
 * so programId stays null until it's approved.
 *
 * Idempotent: upserts the same edition and story ids on every run.
 *
 * Usage: pnpm --filter @openplay/ingest publish-edition-october-19-2026
 */
import { db, pool, weeklyEditions, weeklyStories, type NewWeeklyStory } from "@openplay/db"
import { sql } from "drizzle-orm"

const EDITION_ID = "wk_2026_10_19"

const stories: NewWeeklyStory[] = [
  {
    id: "wks_2026_10_19_1",
    editionId: EDITION_ID,
    sortOrder: 0,
    featuredRank: 1,
    headline: "Shelburne's after-school ski and ride dates are out",
    teaser:
      "Wednesday nights on the slopes are back. Shelburne Parks & Recreation has published its 2026-27 Bolton Valley Ski & Ride Program for grades 5-8, with a bus from Shelburne Community School to Bolton Valley. Registration opens in stages starting November 5, and bus seats are limited.",
    body: "Shelburne Parks & Recreation has published the details for its 2026-27 Bolton Valley Ski & Ride Program, an after-school night skiing and snowboarding program for students in grades 5-8. A bus takes kids from Shelburne Community School to Bolton Valley Resort on Wednesdays. There are two four-week sessions: Session 1 runs January 6, 13, 20 and 27, and Session 2 runs February 10 and March 3, 10 and 17, 2027. Each child can register for one session. Registration opens at 8 AM on November 5 for grades 7-8, and at 8 AM on November 16 for grades 5-6 if space remains. The deadline is December 7. Bus capacity is limited, so plan to register as soon as your child's grade opens. The base fee is $110 for bus transportation, and families can add a lift ticket ($90), group lessons ($80), ski or snowboard rental ($90) or a helmet-only rental ($30).",
    categoryLabel: "Skiing & snowboarding",
    sportId: "sp_snow_sports",
    season: "winter",
    locationLabel: "Shelburne to Bolton Valley",
    organizationName: "Shelburne Parks & Recreation",
    organizationId: "org-us-vt-shelburne-parks-recreation",
    programId: null,
    offeringId: null,
    registrationStatus: "upcoming",
    registrationOpensOn: "2026-11-05",
    registrationClosesOn: "2026-12-07",
    waitlistStatus: null,
    programDatesLabel: "Two four-week Wednesday sessions, January-March 2027",
    sourceUrl: "https://www.shelburnevt.org/184/Bolton-Ski-Ride-Program",
    sourceLabel: "Shelburne Parks & Recreation",
    ctaLabel: "Explore snow sports programs",
    ctaHref: "/sports/snow-sports",
    missingActivity: true,
    missingActivityNote:
      "This program is newly identified and is being added to the Sign Up Vermont directory. Until its listing is live, register through Shelburne Parks & Recreation.",
  },
]

async function main() {
  const now = new Date()

  await db
    .insert(weeklyEditions)
    .values({
      id: EDITION_ID,
      weekSlug: "october-19-2026",
      weekStart: "2026-10-19",
      weekEnd: "2026-10-25",
      title: "Shelburne's after-school ski and ride program sets its dates",
      intro:
        "Winter planning starts now: Shelburne Parks & Recreation has published its Bolton Valley Ski & Ride dates for grades 5-8, and registration opens November 5.",
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

  console.log(`Published october-19-2026 with ${stories.length} featured story.`)
  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
