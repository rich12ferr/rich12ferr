import type { Activity, ActivityWithRelations, CustomerFacingState, RegistrationStatus } from "@/lib/types"

/** Configurable thresholds (PRD 12 and 16). */
export const CLOSING_SOON_DAYS = 14
export const RECENTLY_OPENED_DAYS = 21
export const RECENTLY_ADDED_DAYS = 30
export const STARTING_SOON_DAYS = 21

/**
 * Freshness ceilings for the two customer states that assert something
 * time-sensitive. Open is the highest-stakes claim (a parent may act on it
 * immediately), so it gets the tightest window; Coming Up can tolerate more
 * age since nothing is actionable yet. Closed and Check with Organization
 * are exempt — the former doesn't need re-confirming, the latter already
 * states the uncertainty explicitly.
 */
export const OPEN_STALE_DAYS = 30
export const COMING_UP_STALE_DAYS = 60

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

export const customerStateLabels: Record<CustomerFacingState, string> = {
  open: "Registration Open",
  coming_up: "Coming Up",
  check_with_org: "Check with Organization",
  closed: "Registration Closed",
}

export type CustomerStateResult = {
  state: CustomerFacingState
  /** The one line shown under the state — never a stack of separate "not published" fields. */
  detail: string | null
  /** True when the underlying dates are internally inconsistent and an admin should look at this listing. */
  reviewRequired: boolean
}

/** Registration-open detail line: closing-soon urgency, an exact close date, or nothing if open-ended. */
function openDetail(activity: ActivityWithRelations, now: Date) {
  const close = parseDate(activity.registration_close_date)
  if (!close) return null
  const days = daysBetween(startOfDay(now), close)
  if (days <= 0) return "Closes today"
  if (days === 1) return "Closes tomorrow"
  if (days <= CLOSING_SOON_DAYS) return `Closes in ${days} days`
  return `Closes ${formatDate(close)}`
}

/**
 * Context-aware "Check with Organization" copy (never a blanket "handled
 * directly by the organization" claim, since we don't actually know that's
 * why the state is unknown). Picks the most specific true statement the data
 * supports, from most to least actionable.
 */
function checkWithOrgDetail(activity: ActivityWithRelations) {
  if (activity.registration_url) {
    return "Check the organization for current registration details."
  }
  if (activity.organization.website_url) {
    return "Current registration details haven't been confirmed. Visit the organization for the latest information."
  }
  if (activity.contact_email || activity.contact_url || activity.organization.phone) {
    return "Contact the organization for current enrollment information."
  }
  return "Current registration details haven't been confirmed for this listing."
}

/**
 * The single deterministic source of truth for the 4 parent-facing states.
 * Collapses `RegistrationStatus`'s finer granularity (closing_soon/waitlist
 * become a detail line under Open) and resolves the true "we don't know"
 * case into Check with Organization instead of leaving several fields to
 * independently render their own "not published" string.
 */
export function customerFacingState(activity: ActivityWithRelations, now = new Date()): CustomerStateResult {
  const today = startOfDay(now)
  const open = parseDate(activity.registration_open_date)
  const close = parseDate(activity.registration_close_date)
  const seasonStart = parseDate(activity.season_start_date)
  const seasonEnd = parseDate(activity.season_end_date)

  // Step 1: invalid/conflicting dates never resolve to a confident state —
  // surface the uncertainty and flag it for a human instead of guessing.
  const datesConflict = (open && close && open > close) || (open && seasonEnd && open > seasonEnd)
  if (datesConflict) {
    return { state: "check_with_org", detail: checkWithOrgDetail(activity), reviewRequired: true }
  }

  // Step 2: an admin override wins outright and skips the freshness guard —
  // a human has already vouched for it being current.
  const override = activity.status_override
  if (override === "open") return { state: "open", detail: openDetail(activity, now), reviewRequired: false }
  if (override === "waitlist") return { state: "open", detail: "Waitlist currently available", reviewRequired: false }
  if (override === "upcoming")
    return { state: "coming_up", detail: open ? `Opens ${formatDate(open)}` : null, reviewRequired: false }
  if (override === "closed")
    return { state: "closed", detail: close ? `Closed ${formatDate(close)}` : null, reviewRequired: false }

  // Steps 3-6: derive a tentative state from dates alone.
  let state: CustomerFacingState
  let detail: string | null

  if ((close && close < today) || (!close && seasonEnd && seasonEnd < today)) {
    state = "closed"
    detail = close ? `Closed ${formatDate(close)}` : `Season ended ${formatDate(seasonEnd)}`
  } else if (open && open <= today && (!close || close >= today)) {
    state = "open"
    detail = openDetail(activity, now)
  } else if (open && open > today) {
    state = "coming_up"
    detail = `Opens ${formatDate(open)}`
  } else if (!open && !close && seasonStart && seasonStart > today) {
    // Only a future season start keeps this "Coming Up" — once the season
    // has already started with no registration evidence, we no longer know
    // whether registration is open, rolling, or closed, so it falls through
    // to Check with Organization rather than a stale "coming up" guess.
    state = "coming_up"
    detail = `Season starts ${formatDate(seasonStart)}`
  } else {
    state = "check_with_org"
    detail = checkWithOrgDetail(activity)
  }

  // Step 7: freshness guard. Only Open and Coming Up assert something
  // time-sensitive enough to need periodic re-confirmation; a listing we
  // haven't re-checked recently downgrades to Check with Organization
  // rather than keep asserting a status that may no longer be true.
  const daysSinceChecked = daysSinceLastChecked(activity, now)
  const stale =
    daysSinceChecked !== null &&
    ((state === "open" && daysSinceChecked > OPEN_STALE_DAYS) ||
      (state === "coming_up" && daysSinceChecked > COMING_UP_STALE_DAYS))

  if (stale) {
    return {
      state: "check_with_org",
      detail: `Last confirmed ${formatDate(activity.date_last_checked)} — verify current details with the organization.`,
      reviewRequired: false,
    }
  }

  return { state, detail, reviewRequired: false }
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
