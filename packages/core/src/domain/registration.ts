import type { RegistrationStatus } from "./enums"
import type { ProgramOffering } from "./program"
import type { FreshnessBucket } from "./provenance"

/** Configurable thresholds (PRD 12 and 16). */
export const CLOSING_SOON_DAYS = 14
export const RECENTLY_OPENED_DAYS = 21
export const RECENTLY_ADDED_DAYS = 30

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Parses a `YYYY-MM-DD` date as local midnight, avoiding UTC off-by-one-day. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000)
}

/** The date fields the status calculation depends on. */
export type RegistrationWindow = Pick<
  ProgramOffering,
  "registration_open_date" | "registration_close_date" | "status_override"
>

/**
 * Deterministic registration status, computed from dates unless an
 * administrator has set an explicit override.
 */
export function registrationStatus(
  offering: RegistrationWindow,
  now = new Date(),
): RegistrationStatus {
  if (offering.status_override) return offering.status_override

  const open = parseDate(offering.registration_open_date)
  const close = parseDate(offering.registration_close_date)
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
  unknown: "Unknown",
}

/** Days until registration closes. Negative once past, null when unpublished. */
export function daysUntilClose(offering: RegistrationWindow, now = new Date()): number | null {
  const close = parseDate(offering.registration_close_date)
  if (!close) return null
  return daysBetween(startOfDay(now), close)
}

export function isRecentlyOpened(offering: RegistrationWindow, now = new Date()): boolean {
  const open = parseDate(offering.registration_open_date)
  if (!open) return false
  const days = daysBetween(open, now)
  return days >= 0 && days <= RECENTLY_OPENED_DAYS
}

export function isRecentlyAdded(createdAt: string | null, now = new Date()): boolean {
  const created = parseDate(createdAt)
  if (!created) return false
  return daysBetween(created, now) <= RECENTLY_ADDED_DAYS
}

export function daysSinceLastChecked(
  offering: Pick<ProgramOffering, "date_last_checked">,
  now = new Date(),
): number | null {
  const checked = parseDate(offering.date_last_checked)
  if (!checked) return null
  return daysBetween(checked, now)
}

/**
 * Which re-crawl cadence this offering deserves right now. Drives the freshness
 * engine: an imminent deadline gets checked daily, an off-season program monthly.
 */
export function freshnessBucket(offering: RegistrationWindow, now = new Date()): FreshnessBucket {
  const status = registrationStatus(offering, now)
  if (status === "closing_soon") return "urgent"
  if (status === "open" || status === "upcoming" || status === "waitlist") return "active"
  return "dormant"
}
