import { type RegistrationStatus } from "../domain/enums"
import {
  daysBetween,
  parseDate,
  registrationStatus,
  startOfDay,
  type RegistrationWindow,
} from "../domain/registration"

/**
 * Display formatting. Intl is available on both browsers and React Native
 * (Hermes ships full ICU), so these are safe to share.
 */

export function formatDate(date: Date | string | null): string {
  const d = typeof date === "string" ? parseDate(date) : date
  if (!d) return "Not published"
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

export function formatShortDate(date: Date | string | null): string {
  const d = typeof date === "string" ? parseDate(date) : date
  if (!d) return "TBD"
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Dates not published"
  if (start && !end) return `Starts ${formatShortDate(start)}`
  if (!start && end) return `Ends ${formatShortDate(end)}`
  return `${formatShortDate(start)} - ${formatShortDate(end)}`
}

export function formatFee(fee: number | null, currency = "USD"): string {
  if (fee === null) return "Cost not published"
  if (fee === 0) return "Free"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(fee)
}

export function formatDistance(miles: number | null): string {
  if (miles === null) return "Distance unknown"
  if (miles < 0.1) return "Here"
  if (miles < 10) return `${miles.toFixed(1)} mi`
  return `${Math.round(miles)} mi`
}

/** Plain-language explanation shown next to the registration status. */
export function statusDetail(offering: RegistrationWindow, now = new Date()): string {
  const status: RegistrationStatus = registrationStatus(offering, now)
  const open = parseDate(offering.registration_open_date)
  const close = parseDate(offering.registration_close_date)

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

/** "Checked 2 days ago" — the freshness promise, stated plainly. */
export function formatLastChecked(lastChecked: string | null, now = new Date()): string {
  const checked = parseDate(lastChecked)
  if (!checked) return "Never verified"
  const days = daysBetween(checked, now)
  if (days <= 0) return "Checked today"
  if (days === 1) return "Checked yesterday"
  if (days < 30) return `Checked ${days} days ago`
  const months = Math.round(days / 30)
  return `Checked ${months} month${months === 1 ? "" : "s"} ago`
}

export function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}
