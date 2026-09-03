/**
 * Entity resolution.
 *
 * Every crawl re-discovers programs that already exist. Without resolution the
 * database fills with near-duplicates ("Youth Soccer" vs "Youth Soccer - Fall")
 * and the review queue becomes unusable.
 *
 * Two layers:
 *   1. A deterministic `matchKey` for cheap exact blocking (indexed lookup).
 *   2. A weighted similarity score for the ambiguous remainder, which decides
 *      whether something is new, an update to an existing record, or a dupe.
 *
 * The output is an assessment, never a silent merge. Anything uncertain goes to
 * a human — merging two distinct programs is much worse than a duplicate row.
 */

import { matchSports } from "@openplay/core"

/* -------------------------------------------------------------------------- */
/*  Normalization                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Organizational and program noise words. Dropped before comparison so
 * "Montpelier Parks & Recreation Department" and "Montpelier Parks & Rec"
 * produce the same key.
 */
const NOISE_WORDS = new Set([
  "the", "of", "and", "a", "an", "at", "in", "for",
  "department", "dept", "association", "assoc", "organization", "org",
  "program", "programs", "league", "club", "team", "teams",
  "youth", "junior", "jr", "community", "recreation", "rec",
  "inc", "llc", "nonprofit",
])

/** Lowercase, strip punctuation/diacritics, collapse whitespace. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Normalize, then drop noise words. Falls back to the full text if empty. */
export function significantTokens(value: string): string[] {
  const tokens = normalizeText(value).split(" ").filter(Boolean)
  const meaningful = tokens.filter((t) => !NOISE_WORDS.has(t))
  return meaningful.length > 0 ? meaningful : tokens
}

/**
 * Resolve a free-text sport name to a canonical sport slug.
 *
 * Delegates to the shared synonym table in @openplay/core so "XC", "hockey",
 * and "b-ball" collapse to the same slug the UI filters on. Returns the
 * normalized raw text when nothing matches, so two unrecognized-but-identical
 * names still compare equal rather than both becoming empty.
 */
export function resolveSportSlug(sportName: string | null | undefined): string {
  if (!sportName) return ""
  const matches = matchSports(sportName)
  return matches[0]?.slug ?? normalizeText(sportName)
}

/* -------------------------------------------------------------------------- */
/*  Match keys — cheap deterministic blocking                                 */
/* -------------------------------------------------------------------------- */

/**
 * Organization key: significant name tokens (sorted, so word order does not
 * matter) plus town. Town is included because "Recreation Department" alone is
 * not distinguishing — nearly every town has one.
 */
export function organizationMatchKey(name: string, town: string, state: string): string {
  const tokens = significantTokens(name).sort().join("-")
  return `${tokens}|${normalizeText(town)}|${normalizeText(state)}`
}

/**
 * Program key: organization + sport + gender + the age band. Deliberately does
 * NOT include the title, because titles are the least stable field across
 * crawls, nor the season/year, because a program is the durable thing that
 * spans years.
 */
export function programMatchKey(input: {
  organizationId: string
  sportId: string
  gender: string
  minAge: number | null
  maxAge: number | null
  minGrade: number | null
  maxGrade: number | null
}): string {
  const band =
    input.minAge !== null || input.maxAge !== null
      ? `a${input.minAge ?? "x"}-${input.maxAge ?? "x"}`
      : `g${input.minGrade ?? "x"}-${input.maxGrade ?? "x"}`
  return `${input.organizationId}|${input.sportId}|${input.gender}|${band}`
}

/* -------------------------------------------------------------------------- */
/*  Similarity                                                               */
/* -------------------------------------------------------------------------- */

/** Character trigrams, matching how Postgres pg_trgm compares strings. */
function trigrams(value: string): Set<string> {
  const padded = `  ${normalizeText(value)} `
  const result = new Set<string>()
  for (let i = 0; i < padded.length - 2; i += 1) {
    result.add(padded.slice(i, i + 3))
  }
  return result
}

/** Jaccard similarity over trigrams, 0..1. */
export function trigramSimilarity(a: string, b: string): number {
  if (!a || !b) return 0
  const setA = trigrams(a)
  const setB = trigrams(b)
  if (setA.size === 0 || setB.size === 0) return 0

  let shared = 0
  for (const gram of setA) if (setB.has(gram)) shared += 1
  return shared / (setA.size + setB.size - shared)
}

/** Token overlap (Jaccard over significant tokens), 0..1. */
export function tokenSimilarity(a: string, b: string): number {
  const setA = new Set(significantTokens(a))
  const setB = new Set(significantTokens(b))
  if (setA.size === 0 || setB.size === 0) return 0

  let shared = 0
  for (const token of setA) if (setB.has(token)) shared += 1
  return shared / (setA.size + setB.size - shared)
}

/** Do two age/grade bands overlap at all? Null bounds are open-ended. */
function bandsOverlap(
  aMin: number | null,
  aMax: number | null,
  bMin: number | null,
  bMax: number | null,
): boolean | null {
  const aUnset = aMin === null && aMax === null
  const bUnset = bMin === null && bMax === null
  if (aUnset || bUnset) return null

  const lowA = aMin ?? Number.NEGATIVE_INFINITY
  const highA = aMax ?? Number.POSITIVE_INFINITY
  const lowB = bMin ?? Number.NEGATIVE_INFINITY
  const highB = bMax ?? Number.POSITIVE_INFINITY
  return lowA <= highB && lowB <= highA
}

export type ProgramCandidate = {
  title: string
  organizationId: string | null
  sportId: string | null
  sportName?: string | null
  gender?: string | null
  minAge?: number | null
  maxAge?: number | null
  minGrade?: number | null
  maxGrade?: number | null
}

export type DuplicateAssessment = "new" | "possible_duplicate" | "likely_update" | "duplicate"

export type MatchEvaluation = {
  score: number
  assessment: DuplicateAssessment
  /** Human-readable reasons, surfaced in the review queue. */
  reasons: string[]
}

const WEIGHTS = {
  organization: 0.3,
  sport: 0.25,
  title: 0.25,
  band: 0.12,
  gender: 0.08,
} as const

/**
 * Score a freshly extracted candidate against an existing program.
 *
 * Organization and sport dominate the weighting because they are the fields
 * extraction gets right most reliably. Title is weighted lower on purpose:
 * orgs rewrite titles between seasons constantly.
 */
export function evaluateProgramMatch(
  candidate: ProgramCandidate,
  existing: ProgramCandidate,
): MatchEvaluation {
  const reasons: string[] = []
  let score = 0

  // Organization — an exact id match is strong evidence; a mismatch is strong
  // counter-evidence, so we short-circuit rather than let other fields carry it.
  if (candidate.organizationId && existing.organizationId) {
    if (candidate.organizationId === existing.organizationId) {
      score += WEIGHTS.organization
      reasons.push("Same organization")
    } else {
      return {
        score: 0,
        assessment: "new",
        reasons: ["Different organization"],
      }
    }
  }

  // Sport — compare ids when both are resolved, otherwise fall back to names.
  const candidateSport = candidate.sportId ?? resolveSportSlug(candidate.sportName)
  const existingSport = existing.sportId ?? resolveSportSlug(existing.sportName)
  if (candidateSport && existingSport) {
    if (candidateSport === existingSport) {
      score += WEIGHTS.sport
      reasons.push("Same sport")
    } else {
      return { score: 0, assessment: "new", reasons: ["Different sport"] }
    }
  }

  // Title — blend trigram and token similarity. Trigrams catch typos and
  // truncation; tokens catch reordering.
  const titleScore =
    0.5 * trigramSimilarity(candidate.title, existing.title) +
    0.5 * tokenSimilarity(candidate.title, existing.title)
  score += WEIGHTS.title * titleScore
  if (titleScore > 0.7) reasons.push("Very similar title")
  else if (titleScore > 0.4) reasons.push("Somewhat similar title")

  // Age / grade band.
  const ageOverlap = bandsOverlap(
    candidate.minAge ?? null,
    candidate.maxAge ?? null,
    existing.minAge ?? null,
    existing.maxAge ?? null,
  )
  const gradeOverlap = bandsOverlap(
    candidate.minGrade ?? null,
    candidate.maxGrade ?? null,
    existing.minGrade ?? null,
    existing.maxGrade ?? null,
  )
  const overlap = ageOverlap ?? gradeOverlap
  if (overlap === true) {
    score += WEIGHTS.band
    reasons.push("Overlapping age/grade range")
  } else if (overlap === false) {
    reasons.push("Non-overlapping age/grade range")
  }

  // Gender — "coed"/"any" are compatible with anything.
  const openGenders = new Set(["coed", "any", "", null, undefined])
  if (
    candidate.gender === existing.gender ||
    openGenders.has(candidate.gender as string) ||
    openGenders.has(existing.gender as string)
  ) {
    score += WEIGHTS.gender
  } else {
    reasons.push("Different gender division")
  }

  return { score, assessment: assessmentFor(score), reasons }
}

/**
 * Thresholds are intentionally conservative. Only >= 0.9 auto-resolves to an
 * update; the 0.55-0.9 band goes to a human. False "new" rows are cheap to
 * merge later; a wrong auto-merge silently destroys a real program.
 */
function assessmentFor(score: number): DuplicateAssessment {
  if (score >= 0.9) return "likely_update"
  if (score >= 0.55) return "possible_duplicate"
  return "new"
}

/** Best match across all existing programs, or null when nothing is close. */
export function findBestMatch<T extends ProgramCandidate>(
  candidate: ProgramCandidate,
  existing: T[],
): { match: T; evaluation: MatchEvaluation } | null {
  let best: { match: T; evaluation: MatchEvaluation } | null = null

  for (const item of existing) {
    const evaluation = evaluateProgramMatch(candidate, item)
    if (evaluation.assessment === "new") continue
    if (!best || evaluation.score > best.evaluation.score) {
      best = { match: item, evaluation }
    }
  }

  return best
}
