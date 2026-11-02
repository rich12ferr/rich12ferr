import {
  CAMP_FOCUS_LABELS,
  CAMP_PERIOD_LABELS,
  CAMP_STAY_LABELS,
  DAY_LENGTH_LABELS,
  SESSION_LENGTH_LABELS,
  sessionLengthBucket,
  type CampFocus,
  type CampPeriod,
  type CampStay,
  type DayLength,
  type SessionLength,
} from "@openplay/core"
import type { Activity } from "@/lib/types"

export function isCamp(activity: Pick<Activity, "program_format">) {
  return activity.program_format === "camp"
}

function labelOf<K extends string>(labels: Record<K, string>, value: string | null | undefined) {
  return value && value in labels ? labels[value as K] : null
}

export const campFocusLabel = (v?: string | null) => labelOf<CampFocus>(CAMP_FOCUS_LABELS, v)
export const campStayLabel = (v?: string | null) => labelOf<CampStay>(CAMP_STAY_LABELS, v)
export const campPeriodLabel = (v?: string | null) => labelOf<CampPeriod>(CAMP_PERIOD_LABELS, v)
export const dayLengthLabel = (v?: string | null) => labelOf<DayLength>(DAY_LENGTH_LABELS, v)

/** The four planning windows in calendar order, starting from winter break. */
const PLANNING_CYCLE = ["winter_break", "february_break", "april_break", "summer"] as const satisfies readonly CampPeriod[]

/** The next break a Vermont parent is likely planning for. Approximate by date. */
export function nextCampPeriod(now: Date): CampPeriod {
  const month = now.getMonth()
  const day = now.getDate()
  if (month === 11 || (month === 0 && day <= 2)) return "winter_break"
  if (month <= 1 && !(month === 1 && day > 22)) return "february_break"
  if (month <= 3 && !(month === 3 && day > 22)) return "april_break"
  if (month <= 7) return "summer"
  return "winter_break"
}

/** Planning windows ordered from the next one, so the soonest break comes first. */
export function upcomingCampPeriods(now: Date): CampPeriod[] {
  const start = PLANNING_CYCLE.indexOf(nextCampPeriod(now) as (typeof PLANNING_CYCLE)[number])
  return [...PLANNING_CYCLE.slice(start), ...PLANNING_CYCLE.slice(0, start)]
}

/**
 * The break or season a camp belongs to. Uses the listed period when set,
 * otherwise infers it from the start month so holiday camps never land in Summer.
 */
export function campPeriodOf(activity: Pick<Activity, "camp_period" | "season" | "season_start_date">): CampPeriod {
  if (activity.camp_period && activity.camp_period in CAMP_PERIOD_LABELS) return activity.camp_period as CampPeriod
  const start = activity.season_start_date ? new Date(`${activity.season_start_date.slice(0, 10)}T00:00:00Z`) : null
  const month = start && !Number.isNaN(start.getTime()) ? start.getUTCMonth() : null
  if (month === 11) return "winter_break"
  if (month === 1) return "february_break"
  if (month === 3) return "april_break"
  if (month !== null && month >= 5 && month <= 7) return "summer"
  if (month === null && activity.season === "summer") return "summer"
  return "other"
}

export const CAMP_GROUP_HEADINGS: Record<CampPeriod, string> = {
  winter_break: "Winter break camps",
  february_break: "February break camps",
  april_break: "April break camps",
  summer: "Summer camps",
  other_break: "Other school-break camps",
  other: "Other times of year",
}

/** "08:30:00" -> "8:30", "15:00" -> "3:00". Hours are shown as posted, in Vermont local time. */
export function formatClock(time: string | null | undefined) {
  if (!time) return null
  const match = /^(\d{1,2}):(\d{2})/.exec(time)
  if (!match) return null
  const hour = Number(match[1])
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display}:${match[2]}${hour < 12 ? "am" : "pm"}`
}

export function dailyHoursLabel(activity: Pick<Activity, "daily_start_time" | "daily_end_time">) {
  const start = formatClock(activity.daily_start_time)
  const end = formatClock(activity.daily_end_time)
  if (start && end) return `${start}\u2013${end}`
  return null
}

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })

function toUtcDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function campDatesLabel(activity: Pick<Activity, "season_start_date" | "season_end_date">) {
  const start = toUtcDate(activity.season_start_date)
  if (!start) return null
  const end = toUtcDate(activity.season_end_date)
  if (!end || end.getTime() === start.getTime()) return shortDate.format(start)
  return `${shortDate.format(start)}\u2013${shortDate.format(end)}`
}

export function sessionLengthLabel(activity: Pick<Activity, "season_start_date" | "season_end_date">) {
  const bucket = sessionLengthBucket(activity.season_start_date, activity.season_end_date) as SessionLength | null
  return bucket ? SESSION_LENGTH_LABELS[bucket] : null
}

export function careLabel(activity: Pick<Activity, "before_care" | "after_care">) {
  if (activity.before_care && activity.after_care) return "Before & after care"
  if (activity.before_care) return "Before care"
  if (activity.after_care) return "After care"
  return null
}

/** Only known pieces; unknowns are omitted rather than shown as "Unknown". */
export function campLineParts(activity: Activity) {
  const parts: string[] = []
  const stay = campStayLabel(activity.camp_stay)
  if (stay) parts.push(stay)
  const length = dayLengthLabel(activity.day_length)
  const hours = dailyHoursLabel(activity)
  if (length || hours) parts.push([length, hours].filter(Boolean).join(" "))
  const dates = campDatesLabel(activity)
  const session = sessionLengthLabel(activity)
  if (dates) parts.push(session ? `${dates} (${session.toLowerCase()})` : dates)
  const care = careLabel(activity)
  if (care) parts.push(care)
  return parts
}
