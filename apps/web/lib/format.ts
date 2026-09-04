import type { Activity } from "@/lib/types"
import { genderLabels, programTypeLabels, seasonLabels, verificationLabels } from "@/lib/labels"
import { daysSinceLastChecked, formatDate } from "@/lib/registration-status"

const ordinal = (n: number) => {
  if (n === 0) return "K"
  const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"
  return `${n}${suffix}`
}

/** "Ages 8-10" / "Grades 3-5" / both, per PRD 13. */
export function eligibilityLabel(activity: Activity) {
  const parts: string[] = []
  const { min_age, max_age, min_grade, max_grade } = activity

  if (min_age !== null && max_age !== null) parts.push(`Ages ${min_age}\u2013${max_age}`)
  else if (min_age !== null) parts.push(`Ages ${min_age}+`)
  else if (max_age !== null) parts.push(`Up to age ${max_age}`)

  if (min_grade !== null && max_grade !== null)
    parts.push(`Grades ${ordinal(min_grade)}\u2013${ordinal(max_grade)}`)
  else if (min_grade !== null) parts.push(`Grade ${ordinal(min_grade)}+`)
  else if (max_grade !== null) parts.push(`Up to grade ${ordinal(max_grade)}`)

  if (parts.length === 0) return "Eligibility not published"
  return parts.join(" \u00b7 ")
}

export function gradeLabel(grade: number) {
  return grade === 0 ? "Kindergarten" : `Grade ${ordinal(grade)}`
}

/** K through 12, shared by the search filters and the submission form. */
export const gradeOptions = Array.from({ length: 13 }, (_, i) => ({
  value: String(i),
  label: gradeLabel(i),
}))

export function seasonLabel(activity: Activity) {
  if (!activity.season || !activity.season_year) return "Year-round / ongoing"
  return `${seasonLabels[activity.season]} ${activity.season_year}`
}

export function programLabel(activity: Activity) {
  return `${genderLabels[activity.gender]} \u00b7 ${programTypeLabels[activity.program_type]}`
}

export function distanceLabel(miles: number) {
  if (miles < 1) return "In Montpelier"
  return `${miles} mi from Montpelier`
}

/**
 * Trust line shown on every listing (PRD 15): where the information came from
 * and how fresh it is. Never presented as a guarantee.
 */
export function freshnessLabel(activity: Activity, now = new Date()) {
  const days = daysSinceLastChecked(activity, now)
  if (days === null) return "Last checked date unknown"
  if (days <= 0) return "Checked today"
  if (days === 1) return "Checked yesterday"
  if (days < 30) return `Checked ${days} days ago`
  return `Checked ${formatDate(activity.date_last_checked)}`
}

export function isStale(activity: Activity, now = new Date()) {
  const days = daysSinceLastChecked(activity, now)
  return days === null || days > 30
}

export function verificationLabel(activity: Activity) {
  return verificationLabels[activity.verification_status]
}

export function sourceHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

/**
 * Some launch-region organizations are placeholders seeded for demoing the
 * product before a real crawl source exists. Their listings must never read
 * as a verified claim about a real place, so the UI checks this instead of
 * trusting `verification_status` alone.
 */
export function isDemoListing(activity: Activity) {
  return sourceHost(activity.source_url) === "example.org"
}
