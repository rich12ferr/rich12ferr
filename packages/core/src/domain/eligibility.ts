import type { GenderEligibility } from "./enums"
import type { Eligibility } from "./program"

/**
 * Eligibility is evaluated as *hard filters* — a child who cannot join must
 * never appear, however relevant the program otherwise looks. Ranking
 * (see ../search/ranking.ts) only reorders what survives this gate.
 *
 * Unknown bounds are treated as permissive. An unpublished age range is a gap
 * in our data, not a restriction the organization stated, and hiding a program
 * over missing metadata is the worse of the two failures.
 */

export type ChildProfile = {
  id: string
  nickname: string
  /** Year only. Full DOB is deliberately not collected — see COPPA notes in the roadmap. */
  birth_year: number
  /** Current school grade. 0 represents kindergarten. */
  grade: number
  gender_preference: GenderEligibility
  home_zip: string
  sport_interests: string[]
  distance_preference: number
}

/**
 * Age a child reaches during a given calendar year. Youth leagues almost always
 * use "age as of <cutoff>" rather than age today, and birth *year* is what we
 * store, so this is the honest granularity.
 */
export function ageInYear(child: Pick<ChildProfile, "birth_year">, year: number): number {
  return year - child.birth_year
}

export const ELIGIBILITY_REASONS = ["age", "grade", "gender"] as const
export type EligibilityReason = (typeof ELIGIBILITY_REASONS)[number]

export type EligibilityResult = {
  eligible: boolean
  /** Which constraints excluded the child — powers "relax this filter" prompts. */
  failed: EligibilityReason[]
  /** Constraints we could not evaluate because the program has not published them. */
  unknown: EligibilityReason[]
}

function genderMatches(required: GenderEligibility, preference: GenderEligibility): boolean {
  if (required === "any" || required === "coed") return true
  if (preference === "any") return true
  return required === preference
}

export function checkEligibility(
  eligibility: Eligibility,
  child: ChildProfile,
  seasonYear: number = new Date().getFullYear(),
): EligibilityResult {
  const failed: EligibilityReason[] = []
  const unknown: EligibilityReason[] = []

  const age = ageInYear(child, seasonYear)
  const { min_age, max_age, min_grade, max_grade } = eligibility

  if (min_age === null && max_age === null) {
    unknown.push("age")
  } else if ((min_age !== null && age < min_age) || (max_age !== null && age > max_age)) {
    failed.push("age")
  }

  if (min_grade === null && max_grade === null) {
    unknown.push("grade")
  } else if (
    (min_grade !== null && child.grade < min_grade) ||
    (max_grade !== null && child.grade > max_grade)
  ) {
    failed.push("grade")
  }

  if (!genderMatches(eligibility.gender, child.gender_preference)) {
    failed.push("gender")
  }

  // Age and grade are strongly correlated; a program that publishes only one of
  // them should not be excluded because the other is silent. Only treat the pair
  // as disqualifying when the constraint we *could* check actually failed.
  return { eligible: failed.length === 0, failed, unknown }
}

/** Human-readable age range, e.g. "Ages 8-12", "Ages 10+", "All ages". */
export function describeAgeRange(eligibility: Pick<Eligibility, "min_age" | "max_age">): string {
  const { min_age, max_age } = eligibility
  if (min_age === null && max_age === null) return "All ages"
  if (min_age !== null && max_age !== null) return `Ages ${min_age}-${max_age}`
  if (min_age !== null) return `Ages ${min_age}+`
  return `Ages up to ${max_age}`
}

/** Human-readable grade range. 0 is kindergarten. */
export function describeGradeRange(
  eligibility: Pick<Eligibility, "min_grade" | "max_grade">,
): string | null {
  const { min_grade, max_grade } = eligibility
  if (min_grade === null && max_grade === null) return null
  const label = (g: number) => (g === 0 ? "K" : String(g))
  if (min_grade !== null && max_grade !== null) {
    return min_grade === max_grade
      ? `Grade ${label(min_grade)}`
      : `Grades ${label(min_grade)}-${label(max_grade)}`
  }
  if (min_grade !== null) return `Grade ${label(min_grade)} and up`
  return `Up to grade ${label(max_grade as number)}`
}

export const genderLabels: Record<GenderEligibility, string> = {
  girls: "Girls",
  boys: "Boys",
  coed: "Coed",
  any: "Open to all",
}
