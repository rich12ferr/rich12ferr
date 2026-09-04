import type { Activity, RegistrationStatus } from "@/lib/types"

/** Configurable thresholds (PRD 12 and 16). */
export const CLOSING_SOON_DAYS = 14
export const RECENTLY_OPENED_DAYS = 21
export const RECENTLY_ADDED_DAYS = 30
export const STARTING_SOON_DAYS = 21

export function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function parseDate(value: string | null) {
  if (!value) return null
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function daysBetween(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000)
}

/**
 * Deterministic registration status. Computed from dates unless an
 * administrator has set an explicit override.
 */
export function registrationStatus(activity: Activity, now = new Date()): RegistrationStatus {
  if (activity.status_override) return activity.status_override

  const open = parseDate(activity.registration_open_date)
  const close = parseDate(activity.registration_close_date)
  const today = startOfDay(now)

  if (!open && !close) return "unknown"
  if (open && today < open) return "upcoming"
  if (close && today > close) return "closed"
  if (close && daysBetween(today, close) <= CLOSING_SOON_DAYS) return "closing_soon"
  if (open && today >= open) return "open"
  return "unknown"
}

export const statusLabels: Record<RegistrationStatus, string> = {
  upcoming: "Registration upcoming",
  open: "Registration open",
  closing_soon: "Closing soon",
  closed: "Registration closed",
  waitlist: "Waitlist only",
  unknown: "Dates not published",
}

export const statusShortLabels: Record<RegistrationStatus, string> = {
  upcoming: "Upcoming",
  open: "Open",
  closing_soon: "Closing soon",
  closed: "Closed",
  waitlist: "Waitlist",
  // "Unknown" tells a parent nothing actionable, and the detail line right
  // below the pill already spells out "Registration information hasn't been
  // published yet" — this just needs to name the same fact concisely.
  unknown: "Not published",
}

/** Plain-language explanation shown next to the status. */
export function statusDetail(activity: Activity, now = new Date()) {
  const status = registrationStatus(activity, now)
  const open = parseDate(activity.registration_open_date)
  const close = parseDate(activity.registration_close_date)

  switch (status) {
    case "upcoming":
      return open ? `Opens ${formatDate(open)}` : "Opening date not published"
    case "open":
      return close ? `Closes ${formatDate(close)}` : "No closing date published"
    case "closing_soon": {
      if (!close) return "Closing soon"
      const days = daysBetween(startOfDay(now), close)
      if (days <= 0) return "Closes today"
      if (days === 1) return "Closes tomorrow"
      return `Closes in ${days} days, on ${formatDate(close)}`
    }
    case "closed":
      return close ? `Closed ${formatDate(close)}` : "Registration closed"
    case "waitlist":
      return "Roster full, waitlist open"
    default:
      return "Registration information hasn't been published yet"
  }
}

export function formatDate(date: Date | string | null) {
  const d = typeof date === "string" ? parseDate(date) : date
  if (!d) return "Not published"
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

export function formatShortDate(date: Date | string | null) {
  const d = typeof date === "string" ? parseDate(date) : date
  if (!d) return "TBD"
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function formatFee(fee: number | null, currency = "USD") {
  if (fee === null) return "Cost not published"
  if (fee === 0) return "Free"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(fee)
}

export function isRecentlyOpened(activity: Activity, now = new Date()) {
  const open = parseDate(activity.registration_open_date)
  if (!open) return false
  const days = daysBetween(open, now)
  return days >= 0 && days <= RECENTLY_OPENED_DAYS
}

/**
 * True when the season/session itself is about to begin, independent of
 * registration status — a class can be fully "open" for registration for
 * months before it starts, so this needs its own signal tied to
 * season_start_date rather than being folded into the registration pill.
 */
export function isStartingSoon(activity: Activity, now = new Date()) {
  const start = parseDate(activity.season_start_date)
  if (!start) return false
  const days = daysBetween(startOfDay(now), start)
  return days >= 0 && days <= STARTING_SOON_DAYS
}

export function isRecentlyAdded(activity: Activity, now = new Date()) {
  const created = parseDate(activity.created_at)
  if (!created) return false
  return daysBetween(created, now) <= RECENTLY_ADDED_DAYS
}

export function daysSinceLastChecked(activity: Activity, now = new Date()) {
  const checked = parseDate(activity.date_last_checked)
  if (!checked) return null
  return daysBetween(checked, now)
}
