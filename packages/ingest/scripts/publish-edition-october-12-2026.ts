/**
 * One-off: authors and publishes the October 12, 2026 "This Week" edition,
 * which replaces September 28 on the homepage (the homepage shows the newest
 * published edition whose weekStart has passed). September 28 stays in the
 * `/this-week` archive untouched, since stories are snapshots of their week.
 *
 * Two Central Vermont stories, both `missingActivity`:
 * - Barre Youth Sports Association's winter basketball registration is open
 *   on its homepage but not yet in the directory. Age divisions, fees and
 *   the deadline aren't published, so none are stated.
 * - Barre Figure Skating Club has published its 2026-27 schedule, but its
 *   linked registration page still references 2025-26, so the story leaves
 *   `registrationStatus` null rather than claiming enrollment is open. The
 *   directory only has the club's winter 2024 listing.
 *
 * Idempotent: upserts the same edition and story ids on every run.
 *
 * Usage: pnpm --filter @openplay/ingest publish-edition-october-12-2026
 */
import { db, pool, weeklyEditions, weeklyStories, type NewWeeklyStory } from "@openplay/db"
import { sql } from "drizzle-orm"

const EDITION_ID = "wk_2026_10_12"

const stories: NewWeeklyStory[] = [
  {
    id: "wks_2026_10_12_1",
    editionId: EDITION_ID,
    sortOrder: 0,
    featuredRank: 1,
    headline: "Barre winter basketball registration is open",
    teaser:
      "Soccer and football may still be on the weekend calendar, but basketball season is already calling! Barre Youth Sports Association has opened winter basketball registration. It's a great time for families to start thinking about indoor activities, keeping kids active, and making new friends when Vermont's colder months arrive.",
    body: "Barre Youth Sports Association has opened registration for its 2026-27 winter basketball season, and the registration form is live on the association's homepage now. BYSA hasn't published a closing date yet, and age divisions and fees aren't listed on the page, so check those details on the registration form before you sign up. With fall sports still wrapping up, now is a good time to plan ahead for winter: indoor basketball keeps kids active and connected with friends through Vermont's colder months. BYSA's winter season isn't in the Sign Up Vermont directory as a listing yet, so for now the fastest path is registering directly with BYSA.",
    categoryLabel: "Basketball",
    sportId: "sp_basketball",
    season: "winter",
    locationLabel: "Barre",
    organizationName: "Barre Youth Sports Association",
    organizationId: "org-us-vt-barre-youth-sports-association",
    programId: null,
    offeringId: null,
    registrationStatus: "open",
    registrationOpensOn: null,
    registrationClosesOn: null,
    waitlistStatus: null,
    programDatesLabel: "2026-27 winter season; closing date not yet published",
    sourceUrl: "https://www.barreyouthsports.com/",
    sourceLabel: "Barre Youth Sports Association",
    ctaLabel: "Explore youth basketball programs",
    ctaHref: "/sports/basketball",
    missingActivity: true,
    missingActivityNote:
      "BYSA's 2026-27 winter basketball season isn't in the Sign Up Vermont directory yet. We're flagging it for a listing once age divisions, fees and the deadline are published.",
  },
  {
    id: "wks_2026_10_12_2",
    editionId: EDITION_ID,
    sortOrder: 1,
    featuredRank: 2,
    headline: "Barre Figure Skating's 2026-27 season takes shape",
    teaser:
      "Ready to trade sneakers for skates? Barre Figure Skating Club is preparing for another winter at the BOR Ice Arena. From first-time skaters finding their balance to more experienced kids developing new skills, the club offers several ways to enjoy the ice. The first lessons are scheduled for November, making October a good time to explore the options.",
    body: "Barre Figure Skating Club has published its 2026-27 winter schedule at the BOR Ice Arena, with programs for every level: Snowplow Sam for the youngest beginners, Basic Skills 1-6, Pre-Freeskate and Freestyle. The first Sunday Learn-to-Skate and Basic Skills sessions start November 1, Friday Basic Skills sessions begin November 6, and a second Snowplow Sam session starts December 13. The club's linked registration page still shows last season's details, so confirm the current form is open with the club before you plan around a session. The new season isn't in the Sign Up Vermont directory yet.",
    categoryLabel: "Ice skating",
    sportId: "sp_ice_skating",
    season: "winter",
    locationLabel: "BOR Ice Arena, Barre",
    organizationName: "Barre Figure Skating Club",
    organizationId: "org_barre_figure_skating",
    programId: null,
    offeringId: null,
    registrationStatus: null,
    registrationOpensOn: null,
    registrationClosesOn: null,
    waitlistStatus: null,
    programDatesLabel: "First sessions Nov 1 (Sun) and Nov 6 (Fri); second Snowplow Sam session Dec 13",
    sourceUrl: "https://www.barrefigureskatingclub.org/home",
    sourceLabel: "Barre Figure Skating Club",
    ctaLabel: "Explore ice-skating programs",
    ctaHref: "/sports/ice-skating",
    missingActivity: true,
    missingActivityNote:
      "Sign Up Vermont only lists the club's winter 2024 Snowplow Sam session. We're flagging the 2026-27 schedule for an updated listing once current registration is confirmed.",
  },
]

async function main() {
  const now = new Date()

  await db
    .insert(weeklyEditions)
    .values({
      id: EDITION_ID,
      weekSlug: "october-12-2026",
      weekStart: "2026-10-12",
      weekEnd: "2026-10-18",
      title: "Winter basketball opens in Barre, and skating season takes shape",
      intro:
        "Two Central Vermont winter programs to plan for this week: Barre's youth basketball registration is open, and Barre Figure Skating Club has published its 2026-27 schedule.",
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

  console.log(`Published october-12-2026 with ${stories.length} featured stories.`)
  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
