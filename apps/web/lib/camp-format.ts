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
