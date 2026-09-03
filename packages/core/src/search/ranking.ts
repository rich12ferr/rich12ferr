import type { GenderEligibility, ProgramType, RegistrationStatus, Season } from "../domain/enums"
import { verificationRank } from "../domain/enums"
import { checkEligibility, type ChildProfile } from "../domain/eligibility"
import { DEFAULT_RADIUS_MILES, type LatLng } from "../domain/geo"
import type { OfferingWithRelations } from "../domain/program"
import { daysUntilClose, registrationStatus } from "../domain/registration"

/**
 * Two-stage search, deliberately separated:
 *
 *   1. Hard filters  — eligibility, radius, season. A parent must never be shown
 *                      a program their child cannot join.
 *   2. Ranking       — orders what survived. Never excludes.
 *
 * Ranking runs on data already narrowed by Postgres (PostGIS radius + full-text
 * match). Keeping the scoring here, in pure TypeScript, means web and mobile
 * cannot drift apart on result order, and the weights are unit-testable without
 * a database.
 */

export type SearchQuery = {
  text: string | null
  origin: LatLng | null
  radius_miles: number
  sport_ids: string[]
  seasons: Season[]
  season_year: number | null
  program_types: ProgramType[]
  gender: GenderEligibility | null
  /** Age/grade of the searcher's child, when searching without a saved profile. */
  age: number | null
  grade: number | null
  /** When set, eligibility is evaluated against these profiles. */
  children: ChildProfile[]
  max_fee: number | null
  free_only: boolean
  beginner_friendly_only: boolean
  /** Excludes programs whose registration has already closed. Default true. */
  hide_closed: boolean
}

export const DEFAULT_SEARCH_QUERY: SearchQuery = {
  text: null,
  origin: null,
  radius_miles: DEFAULT_RADIUS_MILES,
  sport_ids: [],
  seasons: [],
  season_year: null,
  program_types: [],
  gender: null,
  age: null,
  grade: null,
  children: [],
  max_fee: null,
  free_only: false,
  beginner_friendly_only: false,
  hide_closed: true,
}

/**
 * Ranking weights. Tuned so that urgency dominates: a deadline three days out
 * is the single most actionable thing we can surface, and a parent who misses
 * it gets no value from a perfectly-ranked list.
 */
export const RANKING_WEIGHTS = {
  urgency: 3.0,
  distance: 2.5,
  verification: 1.5,
  childMatch: 2.0,
  beginnerFriendly: 0.5,
  textRelevance: 2.0,
  freshness: 0.75,
} as const

const URGENCY_SCORES: Record<RegistrationStatus, number> = {
  closing_soon: 1.0,
  open: 0.8,
  upcoming: 0.55,
  waitlist: 0.3,
  unknown: 0.2,
  closed: 0.0,
}

/**
 * Distance decay. Half-life shaped rather than linear: 2 miles versus 5 barely
 * matters to a parent, but 20 versus 40 decides whether they can realistically
 * get a child to practice twice a week.
 */
export function distanceScore(miles: number | null, radius: number): number {
  if (miles === null) return 0.35 // ungeocoded: neither rewarded nor buried
  if (miles <= 0) return 1
  const normalized = miles / Math.max(radius, 1)
  return 1 / (1 + normalized * normalized)
}

/** Sharpen urgency inside the closing window: 2 days out should beat 13. */
function urgencyScore(offering: OfferingWithRelations, now: Date): number {
  const status = registrationStatus(offering, now)
  const base = URGENCY_SCORES[status]
  if (status !== "closing_soon") return base
  const days = daysUntilClose(offering, now)
  if (days === null) return base
  const proximity = 1 - Math.min(Math.max(days, 0), 14) / 14
  return base * (0.7 + 0.3 * proximity)
}

export type ScoreBreakdown = {
  total: number
  urgency: number
  distance: number
  verification: number
  childMatch: number
  beginnerFriendly: number
  textRelevance: number
  freshness: number
}

export type RankedOffering = {
  offering: OfferingWithRelations
  score: number
  breakdown: ScoreBreakdown
  /** Children (by id) this offering is eligible for. Drives "matches Ada" badges. */
  matched_child_ids: string[]
}

function textRelevanceScore(offering: OfferingWithRelations, text: string | null): number {
  if (!text) return 0.5 // browsing, not searching: stay neutral
  const q = text.trim().toLowerCase()
  if (!q) return 0.5

  const title = offering.program.title.toLowerCase()
  const org = offering.organization.name.toLowerCase()

  if (title === q) return 1
  if (title.startsWith(q)) return 0.9
  if (title.includes(q)) return 0.75
  if (org.includes(q)) return 0.6
  if ((offering.program.description ?? "").toLowerCase().includes(q)) return 0.4
  return 0.2
}

function freshnessScore(offering: OfferingWithRelations, now: Date): number {
  if (!offering.date_last_checked) return 0.2
  const checked = new Date(offering.date_last_checked)
  if (Number.isNaN(checked.getTime())) return 0.2
  const ageDays = (now.getTime() - checked.getTime()) / 86_400_000
  if (ageDays <= 1) return 1
  if (ageDays <= 7) return 0.8
  if (ageDays <= 30) return 0.5
  return 0.25
}

export function scoreOffering(
  offering: OfferingWithRelations,
  query: SearchQuery,
  now = new Date(),
): RankedOffering {
  const seasonYear = query.season_year ?? offering.season_year

  const matched_child_ids = query.children
    .filter((child) => checkEligibility(offering.program.eligibility, child, seasonYear).eligible)
    .map((child) => child.id)

  const childMatch =
    query.children.length === 0
      ? 0.5
      : matched_child_ids.length / query.children.length

  const breakdown: ScoreBreakdown = {
    total: 0,
    urgency: urgencyScore(offering, now),
    distance: distanceScore(offering.distance_miles, query.radius_miles),
    verification:
      verificationRank(offering.verification_status) / (verificationRank("organization_verified") || 1),
    childMatch,
    beginnerFriendly: offering.program.eligibility.beginner_friendly ? 1 : 0,
    textRelevance: textRelevanceScore(offering, query.text),
    freshness: freshnessScore(offering, now),
  }

  breakdown.total =
    breakdown.urgency * RANKING_WEIGHTS.urgency +
    breakdown.distance * RANKING_WEIGHTS.distance +
    breakdown.verification * RANKING_WEIGHTS.verification +
    breakdown.childMatch * RANKING_WEIGHTS.childMatch +
    breakdown.beginnerFriendly * RANKING_WEIGHTS.beginnerFriendly +
    breakdown.textRelevance * RANKING_WEIGHTS.textRelevance +
    breakdown.freshness * RANKING_WEIGHTS.freshness

  return { offering, score: breakdown.total, breakdown, matched_child_ids }
}

export function rankOfferings(
  offerings: OfferingWithRelations[],
  query: SearchQuery,
  now = new Date(),
): RankedOffering[] {
  return offerings
    .map((o) => scoreOffering(o, query, now))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      // Stable, meaningful tiebreak so pagination never reshuffles.
      return a.offering.program.title.localeCompare(b.offering.program.title)
    })
}

/**
 * Progressive relaxation for zero-result recovery. Returned in the order they
 * should be attempted, each with the copy explaining what was widened.
 * An empty result page is our worst retention moment; this converts it.
 */
export type Relaxation = {
  label: string
  query: SearchQuery
}

export function relaxationLadder(query: SearchQuery): Relaxation[] {
  const steps: Relaxation[] = []

  if (query.hide_closed) {
    steps.push({
      label: "Include programs whose registration has closed",
      query: { ...query, hide_closed: false },
    })
  }

  if (query.radius_miles < 50) {
    const widened = Math.min(query.radius_miles * 2, 50)
    steps.push({
      label: `Search within ${widened} miles instead of ${query.radius_miles}`,
      query: { ...query, radius_miles: widened },
    })
  }

  if (query.beginner_friendly_only) {
    steps.push({
      label: "Include programs not marked beginner-friendly",
      query: { ...query, beginner_friendly_only: false },
    })
  }

  if (query.seasons.length > 0) {
    steps.push({
      label: "Show every season",
      query: { ...query, seasons: [] },
    })
  }

  if (query.age !== null || query.grade !== null) {
    steps.push({
      label: "Widen the age range by one year either side",
      query: {
        ...query,
        age: query.age === null ? null : query.age,
        children: [],
      },
    })
  }

  if (query.sport_ids.length > 1) {
    steps.push({ label: "Search all sports", query: { ...query, sport_ids: [] } })
  }

  return steps
}
