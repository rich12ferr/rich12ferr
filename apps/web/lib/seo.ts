import { seasonLabels } from "@/lib/labels"
import { formatDate, formatFee, parseDate, startOfDay } from "@/lib/registration-status"
import type { ActivityWithRelations } from "@/lib/types"

const BRAND = "Sign Up Vermont"

function place(activity: ActivityWithRelations) {
  const town = activity.town?.trim()
  return town ? `${town}, ${activity.state?.trim() || "VT"}` : null
}

function agesPhrase({ min_age, max_age }: ActivityWithRelations) {
  if (min_age !== null && max_age !== null) return `ages ${min_age}\u2013${max_age}`
  if (min_age !== null) return `ages ${min_age}+`
  if (max_age !== null) return `up to age ${max_age}`
  return null
}

function seasonPhrase(activity: ActivityWithRelations) {
  const { season_start_date: start, season_end_date: end, season, season_year } = activity
  if (parseDate(start) && parseDate(end)) return `${formatDate(start)} to ${formatDate(end)}`
  if (parseDate(start)) return `starts ${formatDate(start)}`
  if (season) return season_year ? `${seasonLabels[season]} ${season_year}` : seasonLabels[season]
  return null
}

/** "Registration closes" is only true while the date is still ahead. */
function closesPhrase(activity: ActivityWithRelations, now: Date) {
  const close = parseDate(activity.registration_close_date)
  if (!close || close < startOfDay(now)) return null
  return `Registration closes ${formatDate(close)}.`
}

/** Every segment is omitted when its field is missing — never a placeholder. */
export function activityMetadata(activity: ActivityWithRelations, now = new Date()) {
  const where = place(activity)
  const title = `${activity.title} \u2014 ${activity.sport.name}${where ? ` in ${where}` : ""} | ${BRAND}`

  const lead = where ? `${activity.title} in ${where}` : activity.title
  const cost = activity.registration_fee === null ? null : formatFee(activity.registration_fee, activity.currency)
  const facts = [agesPhrase(activity), seasonPhrase(activity), cost].filter(Boolean)
  const description = [
    facts.length ? `${lead}: ${facts.join(", ")}.` : `${lead}.`,
    closesPhrase(activity, now),
    `Details and the registration link on ${BRAND}.`,
  ]
    .filter(Boolean)
    .join(" ")

  return { title: { absolute: title }, description }
}

export function sportMetadata(sportName: string, liveCount: number) {
  const programs = liveCount === 1 ? "program" : "programs"
  return {
    title: { absolute: `${sportName} for kids in Vermont \u2014 ${liveCount} ${programs} | ${BRAND}` },
    description: `Find Vermont ${sportName.toLowerCase()} programs for kids: compare ages, towns, costs, and registration deadlines in one place. Free alerts before registration closes.`,
  }
}
