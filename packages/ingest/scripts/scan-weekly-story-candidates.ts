/**
 * Turns three signals already proven out elsewhere in the schema into a
 * ranked shortlist for the weekly "This Week" editorial feature:
 *
 *   1. `review_candidates` the crawl found and a human already *approved* —
 *      i.e. verified, not raw extraction — since the last scan.
 *   2. Published offerings whose registration closes within 14 days.
 *   3. Published offerings whose registration opened within the last 14 days.
 *
 * This is the "identifies meaningful developments" step of the loop
 * (crawl -> candidates -> verified source -> matched activity -> story ->
 * publish -> homepage promotion): it never invents a development, only
 * re-surfaces ones the pipeline and a reviewer already stood behind. Nothing
 * here is auto-published — see `draft-weekly-story.ts` for the human step
 * that turns a row from this table into a real `weekly_stories` row.
 *
 * Idempotent: re-running a second time in the same week skips anything
 * already surfaced for the same offering/review-candidate rather than
 * duplicating the queue.
 *
 * Usage:
 *   pnpm --filter @openplay/ingest scan-weekly-story-candidates [--lookback-days 8]
 */
import { and, eq, gte, inArray, or } from "drizzle-orm"
import {
  closingSoonOfferings,
  db,
  offeringById,
  pool,
  recentlyOpenedOfferings,
  reviewCandidates,
  weeklyStoryCandidates,
  type OfferingListing,
} from "@openplay/db"
import { daysBetween, formatDate, parseDate } from "@openplay/core"

function newId(): string {
  return `wsc_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`
}

type Draft = {
  sourceKind: "approved_review_candidate" | "closing_soon_offering" | "recently_opened_offering"
  reviewCandidateId: string | null
  offeringId: string | null
  programId: string | null
  organizationId: string | null
  sportId: string | null
  headlineSuggestion: string
  teaserSuggestion: string
  summary: string
  signalDate: string | null
  score: number
}

function draftFromApprovedReviewCandidate(
  candidateId: string,
  confidence: number | null,
  reviewedAt: Date,
  listing: OfferingListing,
): Draft {
  const pct = Math.round((confidence ?? 0.5) * 100)
  return {
    sourceKind: "approved_review_candidate",
    reviewCandidateId: candidateId,
    offeringId: listing.offeringId,
    programId: listing.programId,
    organizationId: listing.organizationId,
    sportId: listing.sportId,
    headlineSuggestion: `New: ${listing.title}`,
    teaserSuggestion: `${listing.organizationName} in ${listing.town} added ${listing.title}${
      listing.registrationOpenDate ? `, with registration opening ${formatDate(listing.registrationOpenDate)}` : ""
    }.`,
    summary: `Newly verified from the review queue (${pct}% extraction confidence, approved ${reviewedAt.toISOString().slice(0, 10)}).`,
    signalDate: reviewedAt.toISOString().slice(0, 10),
    // Verified-new-listing news outranks a routine deadline reminder.
    score: 70 + pct / 10,
  }
}

function draftFromClosingSoon(listing: OfferingListing, now: Date): Draft {
  const closeDate = parseDate(listing.registrationCloseDate)
  const daysLeft = closeDate ? Math.max(daysBetween(now, closeDate), 0) : null
  return {
    sourceKind: "closing_soon_offering",
    reviewCandidateId: null,
    offeringId: listing.offeringId,
    programId: listing.programId,
    organizationId: listing.organizationId,
    sportId: listing.sportId,
    headlineSuggestion: `Registration closing soon: ${listing.title}`,
    teaserSuggestion: `${listing.organizationName}'s ${listing.title} closes registration on ${formatDate(listing.registrationCloseDate)}.`,
    summary:
      daysLeft === null
        ? "Registration closes soon."
        : `Registration closes in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
    signalDate: listing.registrationCloseDate,
    // Highest priority signal, and ranked soonest-first within itself.
    score: 90 - (daysLeft ?? 14),
  }
}

function draftFromRecentlyOpened(listing: OfferingListing, now: Date): Draft {
  const openDate = parseDate(listing.registrationOpenDate)
  const daysAgo = openDate ? Math.max(daysBetween(openDate, now), 0) : null
  return {
    sourceKind: "recently_opened_offering",
    reviewCandidateId: null,
    offeringId: listing.offeringId,
    programId: listing.programId,
    organizationId: listing.organizationId,
    sportId: listing.sportId,
    headlineSuggestion: `Registration now open: ${listing.title}`,
    teaserSuggestion: `${listing.organizationName} opened registration for ${listing.title} on ${formatDate(listing.registrationOpenDate)}.`,
    summary:
      daysAgo === null ? "Registration recently opened." : `Registration opened ${daysAgo} day${daysAgo === 1 ? "" : "s"} ago.`,
    signalDate: listing.registrationOpenDate,
    // Lower baseline than a deadline — informative, less urgent.
    score: 40,
  }
}

async function main() {
  const args = process.argv.slice(2)
  const lookbackFlagIndex = args.indexOf("--lookback-days")
  const lookbackDays = lookbackFlagIndex >= 0 ? Number(args[lookbackFlagIndex + 1]) : 8
  const now = new Date()

  console.log(`Scanning for weekly story candidates (review-approval lookback: ${lookbackDays} days)...`)

  const drafts: Draft[] = []

  // 1. Recently approved review candidates with a real offering behind them.
  const approvedSince = new Date(now.getTime() - lookbackDays * 86_400_000)
  const approved = await db
    .select()
    .from(reviewCandidates)
    .where(and(eq(reviewCandidates.status, "approved"), gte(reviewCandidates.reviewedAt, approvedSince)))
  for (const candidate of approved) {
    if (!candidate.targetOfferingId) continue
    const listing = await offeringById(candidate.targetOfferingId)
    if (!listing || !listing.published) continue
    drafts.push(
      draftFromApprovedReviewCandidate(
        candidate.id,
        candidate.confidence,
        candidate.reviewedAt ?? now,
        listing,
      ),
    )
  }

  // 2. Closing soon.
  const closingSoon = await closingSoonOfferings(14, 20)
  for (const listing of closingSoon) drafts.push(draftFromClosingSoon(listing, now))

  // 3. Recently opened.
  const recentlyOpened = await recentlyOpenedOfferings(14, 20)
  for (const listing of recentlyOpened) drafts.push(draftFromRecentlyOpened(listing, now))

  if (drafts.length === 0) {
    console.log("No signals found.")
    await pool.end()
    return
  }

  // Dedup against anything already surfaced in the last 30 days, regardless
  // of status — a dismissed candidate should not be re-proposed every week
  // just because its underlying offering is still closing soon.
  const dedupWindow = new Date(now.getTime() - 30 * 86_400_000)
  const offeringIds = [...new Set(drafts.map((d) => d.offeringId).filter((v): v is string => Boolean(v)))]
  const reviewCandidateIds = [
    ...new Set(drafts.map((d) => d.reviewCandidateId).filter((v): v is string => Boolean(v))),
  ]
  const matchConditions = [
    offeringIds.length > 0 ? inArray(weeklyStoryCandidates.offeringId, offeringIds) : null,
    reviewCandidateIds.length > 0 ? inArray(weeklyStoryCandidates.reviewCandidateId, reviewCandidateIds) : null,
  ].filter((c): c is NonNullable<typeof c> => c !== null)

  const existing =
    matchConditions.length === 0
      ? []
      : await db
          .select({
            offeringId: weeklyStoryCandidates.offeringId,
            reviewCandidateId: weeklyStoryCandidates.reviewCandidateId,
            sourceKind: weeklyStoryCandidates.sourceKind,
          })
          .from(weeklyStoryCandidates)
          .where(and(gte(weeklyStoryCandidates.discoveredAt, dedupWindow), or(...matchConditions)))
  const seen = new Set(
    existing.map((row) => `${row.sourceKind}:${row.offeringId ?? ""}:${row.reviewCandidateId ?? ""}`),
  )

  const toInsert = drafts.filter(
    (d) => !seen.has(`${d.sourceKind}:${d.offeringId ?? ""}:${d.reviewCandidateId ?? ""}`),
  )

  if (toInsert.length === 0) {
    console.log(`${drafts.length} signal(s) found, all already surfaced in the last 30 days. Nothing new.`)
    await pool.end()
    return
  }

  await db.insert(weeklyStoryCandidates).values(
    toInsert.map((d) => ({
      id: newId(),
      sourceKind: d.sourceKind,
      reviewCandidateId: d.reviewCandidateId,
      offeringId: d.offeringId,
      programId: d.programId,
      organizationId: d.organizationId,
      sportId: d.sportId,
      headlineSuggestion: d.headlineSuggestion,
      teaserSuggestion: d.teaserSuggestion,
      summary: d.summary,
      signalDate: d.signalDate,
      score: d.score,
      status: "pending" as const,
    })),
  )

  console.log(
    `Surfaced ${toInsert.length} new candidate(s) (${drafts.length - toInsert.length} skipped as already-seen).`,
  )
  for (const d of toInsert) {
    console.log(`  [${d.sourceKind}] score=${d.score.toFixed(1)} "${d.headlineSuggestion}"`)
  }

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
