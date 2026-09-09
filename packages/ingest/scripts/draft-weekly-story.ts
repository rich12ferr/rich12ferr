/**
 * Turns one `weekly_story_candidates` row plus a human's verified copy into a
 * real `weekly_stories` row — the "generates weekly story candidate" ->
 * "publish to This Week" step of the editorial loop.
 *
 * Deliberately never auto-drafts the machine suggestion straight into a
 * story: the candidate's `headlineSuggestion`/`teaserSuggestion` are a
 * starting point, not copy fit to publish, so this script requires a
 * `--copy` JSON file with the headline/teaser/body an editor actually wrote
 * and verified against the source. This mirrors `approve-candidates.ts`
 * never auto-publishing a raw extraction.
 *
 * The target edition is created (unpublished) if it does not exist yet —
 * `publish-weekly-edition.ts` is the separate, explicit step that makes it
 * visible to parents.
 *
 * Usage:
 *   pnpm --filter @openplay/ingest draft-weekly-story <candidate-id> \
 *     --edition <week-slug> --copy <path-to-json.json> \
 *     [--week-start YYYY-MM-DD] [--week-end YYYY-MM-DD] [--title "..."]
 *
 * Copy JSON shape:
 *   {
 *     "headline": "...", "teaser": "...", "body": "...",
 *     "ctaLabel": "...", "ctaHref": "...",
 *     "featuredRank": 1,            // optional, 1-3, homepage slot
 *     "sortOrder": 0,               // optional, article position
 *     "categoryLabel": "...",       // optional
 *     "locationLabel": "...",       // optional, defaults from the offering
 *     "sourceLabel": "..."          // optional, defaults from the offering
 *   }
 */
import { readFileSync } from "node:fs"
import { eq } from "drizzle-orm"
import {
  db,
  offeringById,
  pool,
  weeklyEditions,
  weeklyStories,
  weeklyStoryCandidateById,
  weeklyStoryCandidates,
  type NewWeeklyStory,
} from "@openplay/db"
import { registrationStatus as computeRegistrationStatus } from "@openplay/core"

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`
}

/** Monday-Sunday range containing `date`, as YYYY-MM-DD strings. */
function weekRange(date: Date): { weekStart: string; weekEnd: string } {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const iso = (x: Date) => x.toISOString().slice(0, 10)
  return { weekStart: iso(monday), weekEnd: iso(sunday) }
}

type CopyFile = {
  headline: string
  teaser: string
  body: string
  ctaLabel: string
  ctaHref: string
  featuredRank?: number | null
  sortOrder?: number
  categoryLabel?: string | null
  locationLabel?: string | null
  sourceLabel?: string | null
}

function parseArgs(argv: string[]) {
  const candidateId = argv[0]
  const flag = (name: string) => {
    const i = argv.indexOf(name)
    return i >= 0 ? argv[i + 1] : undefined
  }
  return {
    candidateId,
    weekSlug: flag("--edition"),
    copyPath: flag("--copy"),
    weekStart: flag("--week-start"),
    weekEnd: flag("--week-end"),
    title: flag("--title"),
  }
}

async function main() {
  const { candidateId, weekSlug, copyPath, weekStart, weekEnd, title } = parseArgs(process.argv.slice(2))

  if (!candidateId || !weekSlug || !copyPath) {
    console.error(
      "Usage: draft-weekly-story <candidate-id> --edition <week-slug> --copy <path-to-json> " +
        "[--week-start YYYY-MM-DD] [--week-end YYYY-MM-DD] [--title \"...\"]",
    )
    process.exit(1)
  }

  const candidate = await weeklyStoryCandidateById(candidateId)
  if (!candidate) {
    console.error(`No weekly_story_candidates row with id "${candidateId}".`)
    process.exit(1)
  }
  if (candidate.status !== "pending") {
    console.error(`Candidate ${candidateId} is already "${candidate.status}" — nothing to draft.`)
    process.exit(1)
  }

  const copy = JSON.parse(readFileSync(copyPath, "utf-8")) as CopyFile
  for (const field of ["headline", "teaser", "body", "ctaLabel", "ctaHref"] as const) {
    if (!copy[field]) {
      console.error(`Copy file is missing required field "${field}".`)
      process.exit(1)
    }
  }

  // Find or create the target edition. Creating never publishes it — that
  // is publish-weekly-edition.ts's job, run once the full week's worth of
  // stories are drafted.
  let [edition] = await db.select().from(weeklyEditions).where(eq(weeklyEditions.weekSlug, weekSlug)).limit(1)
  if (!edition) {
    const range = weekStart && weekEnd ? { weekStart, weekEnd } : weekRange(new Date())
    const [created] = await db
      .insert(weeklyEditions)
      .values({
        id: newId("wed"),
        weekSlug,
        weekStart: range.weekStart,
        weekEnd: range.weekEnd,
        title: title ?? `Week of ${range.weekStart}`,
        published: false,
      })
      .returning()
    edition = created
    console.log(`Created new (unpublished) edition "${weekSlug}" (${range.weekStart} to ${range.weekEnd}).`)
  }

  // Offering-derived defaults, only used when the copy file did not specify
  // them — the editor's explicit values always win.
  const listing = candidate.offeringId ? await offeringById(candidate.offeringId) : null

  const newStory: NewWeeklyStory = {
    id: newId("wst"),
    editionId: edition.id,
    sortOrder: copy.sortOrder ?? 0,
    featuredRank: copy.featuredRank ?? null,
    headline: copy.headline,
    teaser: copy.teaser,
    body: copy.body,
    categoryLabel: copy.categoryLabel ?? null,
    sportId: candidate.sportId,
    locationLabel: copy.locationLabel ?? (listing ? `${listing.town}, ${listing.state}` : null),
    organizationName: listing?.organizationName ?? null,
    organizationId: candidate.organizationId,
    programId: candidate.programId,
    offeringId: candidate.offeringId,
    registrationStatus: listing
      ? computeRegistrationStatus({
          registration_open_date: listing.registrationOpenDate,
          registration_close_date: listing.registrationCloseDate,
          status_override: listing.statusOverride as never,
        })
      : null,
    registrationOpensOn: listing?.registrationOpenDate ?? null,
    registrationClosesOn: listing?.registrationCloseDate ?? null,
    sourceUrl: listing?.sourceUrl ?? null,
    sourceLabel: copy.sourceLabel ?? null,
    ctaLabel: copy.ctaLabel,
    ctaHref: copy.ctaHref,
  }

  await db.transaction(async (tx) => {
    await tx.insert(weeklyStories).values(newStory)
    await tx
      .update(weeklyStoryCandidates)
      .set({
        status: "drafted",
        weeklyStoryId: newStory.id,
        reviewedAt: new Date(),
        reviewedBy: "v0-agent",
        reviewNote: `Drafted into weekly_stories ${newStory.id} for edition ${weekSlug}`,
      })
      .where(eq(weeklyStoryCandidates.id, candidate.id))
  })

  console.log(`Drafted story ${newStory.id} ("${newStory.headline}") into edition "${weekSlug}".`)
  console.log(
    `Next: pnpm --filter @openplay/ingest publish-weekly-edition ${weekSlug} once the week's stories are ready.`,
  )

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
