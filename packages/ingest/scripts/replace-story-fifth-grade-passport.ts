/**
 * One-off: replaces the featured-rank-3 "Alpine and snowboard clubs are
 * already filling rosters" story in the September 7, 2026 edition with a new
 * story about Ski Vermont's 2026-27 Fifth Grade Passport, which opened the
 * same week and is more timely and higher-impact for the mission than the
 * story it displaces.
 *
 * This is a `missingActivity` story, the same pattern as this edition's
 * Cochran's Ski Club slot: the Passport is a real, verified statewide
 * program (Ski Vermont, skivermont.com) with a real audience, price, and
 * open date, but it's a multi-area voucher product spanning dozens of ski
 * areas rather than a single organization's program, so it doesn't fit the
 * `program_offering` model without further product work. The CTA points
 * straight at Ski Vermont's own application page since we have no internal
 * registration flow for it.
 *
 * Idempotent: safe to re-run, it always sets the same target row to the
 * same values. Not a general-purpose script — the target story id is
 * hardcoded because this is a specific edit to a specific already-published
 * story, not a repeatable authoring step.
 *
 * Usage: pnpm --filter @openplay/ingest replace-story-fifth-grade-passport
 */
import { eq } from "drizzle-orm"
import { db, pool, weeklyStories } from "@openplay/db"

const TARGET_STORY_ID = "wks_2026_09_07_3"

async function main() {
  const [updated] = await db
    .update(weeklyStories)
    .set({
      headline: "Fifth Grade Passport opens today: $40 for up to 90 days on snow, statewide",
      teaser:
        "Ski Vermont's 2026-27 Fifth Grade Passport went on sale today at noon: $40 gets any fifth grader up to 90 days of skiing and riding, three vouchers apiece at 20 alpine areas plus 30 cross-country trail passes. Vermont residency isn't required, and it's one of the most effective cost-barrier reducers we track for winter sports.",
      body: "Ski Vermont's Fifth Grade Passport opened its 2026-27 application window today, September 9, at noon. For $40, any currently enrolled fifth grader, Vermont residency is not required, can apply for up to 90 days of skiing and riding: three vouchers apiece at each of 20 participating alpine resorts, plus up to 30 cross-country day trail passes at participating Nordic centers. Passport holders redeem vouchers online through Ski Vermont's Pass Portal and must ski or ride alongside an adult who holds a valid lift ticket or season pass. Each ski area sets its own blackout dates and redemption rules, so it's worth checking the participating-area list before counting on a specific weekend. Applications are reviewed by Ski Vermont staff, with approval typically taking two to three business days. This program isn't yet in the Sign Up Vermont directory as a searchable listing, it's a statewide voucher product spanning dozens of ski areas rather than a single organization's program, so for now the fastest path is applying directly through Ski Vermont.",
      categoryLabel: "Multi-discipline snow sports",
      sportId: "sp_snow_sports",
      season: "winter",
      locationLabel: "Statewide",
      organizationName: "Ski Vermont",
      organizationId: null,
      programId: null,
      offeringId: null,
      registrationStatus: "open",
      registrationOpensOn: "2026-09-09",
      registrationClosesOn: null,
      waitlistStatus: null,
      programDatesLabel: "Vouchers redeemable across the 2026-27 season; each ski area sets its own blackout dates",
      sourceUrl: "https://www.skivermont.com/fifth-grade-passport/",
      sourceLabel: "Ski Vermont",
      ctaLabel: "Apply for the Fifth Grade Passport",
      ctaHref: "https://www.skivermont.com/fifth-grade-passport/",
      missingActivity: true,
      missingActivityNote:
        "Ski Vermont's Fifth Grade Passport isn't in the Sign Up Vermont directory yet, it's a statewide multi-area voucher product rather than a single organization's program. We're flagging it for a future listing and sending families straight to Ski Vermont's own application in the meantime.",
      updatedAt: new Date(),
    })
    .where(eq(weeklyStories.id, TARGET_STORY_ID))
    .returning()

  if (!updated) {
    console.error(`No weekly_stories row with id "${TARGET_STORY_ID}" was updated.`)
    process.exit(1)
  }
  console.log(`Updated story ${updated.id} -> "${updated.headline}"`)
  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
