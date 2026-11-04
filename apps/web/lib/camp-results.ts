import type { ActivityWithRelations, CustomerFacingState } from "@/lib/types"
import { customerFacingState, formatFee, formatShortDate, hasSeasonEnded, parseDate, startOfDay } from "@/lib/registration-status"

/**
 * Explicit session markers only ("Session 2", "Week 3", "— Session 1"). A
 * title without one never groups, so two genuinely different camps that
 * happen to share a name stay separate (PRD R7: uncertain groupings stay
 * separate).
 */
const SESSION_MARKER = /\s*[-–—:,(]?\s*\b(session|week)\s*#?\s*\d+\b\)?\s*$/i

export function campBaseTitle(title: string) {
  return title.replace(SESSION_MARKER, "").trim() || title
}

/**
 * Sessions of one camp share organizer, base title, town, day/overnight and
 * age range. Differing ages count as a materially different experience, so
 * those records stay separate.
 */
export function campGroupKey(activity: ActivityWithRelations) {
  if (!SESSION_MARKER.test(activity.title)) return `single:${activity.id}`
  return [
    activity.organization_id,
    campBaseTitle(activity.title).toLowerCase(),
    activity.town.toLowerCase(),
    activity.camp_stay ?? "",
    activity.min_age ?? "",
    activity.max_age ?? "",
  ].join("|")
}

/**
 * A session is past once it has ended. Undated records count as past only
 * when their season year is behind us, or it is this year's summer and
 * summer is over, so an undated listing is never relabeled as upcoming
 * just because its dates are missing.
 */
export function isPastCampSession(activity: ActivityWithRelations, now = new Date()) {
  if (hasSeasonEnded(activity, now)) return true
  if (activity.season_start_date || activity.season_end_date) return false
  const year = activity.season_year
  if (!year) return false
  const currentYear = now.getFullYear()
  if (year < currentYear) return true
  return year === currentYear && (activity.season === "summer" || activity.season === "spring") && now.getMonth() >= 8
}

export type CampGroup<T extends ActivityWithRelations = ActivityWithRelations> = {
  key: string
  title: string
  /** Chronological; the first is the next session to run. */
  sessions: T[]
}

export function groupCampSessions<T extends ActivityWithRelations>(results: T[]): CampGroup<T>[] {
  const groups = new Map<string, CampGroup<T>>()
  for (const result of results) {
    const key = campGroupKey(result)
    const existing = groups.get(key)
    if (existing) existing.sessions.push(result)
    else groups.set(key, { key, title: result.title, sessions: [result] })
  }
  return [...groups.values()].map((group) => {
    const sessions = [...group.sessions].sort((a, b) => startTime(a) - startTime(b))
    return { ...group, sessions, title: sessions.length > 1 ? campBaseTitle(sessions[0].title) : sessions[0].title }
  })
}

function startTime(activity: ActivityWithRelations) {
  return parseDate(activity.season_start_date)?.getTime() ?? Number.POSITIVE_INFINITY
}

/** Every known session fee, ignoring sessions with no posted price. */
function knownFees(sessions: ActivityWithRelations[]) {
  return sessions.map((s) => s.registration_fee).filter((fee): fee is number => fee !== null)
}

/** Lowest known price, for sorting. Unknown prices sort last. */
export function groupMinFee(group: CampGroup) {
  const fees = knownFees(group.sessions)
  return fees.length ? Math.min(...fees) : Number.POSITIVE_INFINITY
}

/**
 * "$2,400", "$2,400 per session", "From $2,400 per session" or "Price not
 * listed". "From" appears only when posted prices actually differ.
 */
export function campPriceLabel(group: CampGroup) {
  const fees = knownFees(group.sessions)
  if (fees.length === 0) return "Price not listed"
  const currency = group.sessions[0].currency
  const min = Math.min(...fees)
  const multi = group.sessions.length > 1
  if (min === 0 && fees.every((fee) => fee === 0)) return "Free"
  const amount = formatFee(min, currency)
  if (!multi) return amount
  const varies = fees.some((fee) => fee !== min) || fees.length < group.sessions.length
  return varies ? `From ${amount} per session` : `${amount} per session`
}

/** "Jun 27 – Aug 21, 2027" across every session, or null when undated. */
export function campDateRange(group: CampGroup) {
  const starts = group.sessions.map((s) => parseDate(s.season_start_date)).filter((d): d is Date => d !== null)
  const ends = group.sessions.map((s) => parseDate(s.season_end_date ?? s.season_start_date)).filter((d): d is Date => d !== null)
  if (starts.length === 0) return null
  const first = new Date(Math.min(...starts.map((d) => d.getTime())))
  const last = ends.length ? new Date(Math.max(...ends.map((d) => d.getTime()))) : first
  const year = last.getFullYear()
  if (first.getTime() === last.getTime()) return `${formatShortDate(first)}, ${year}`
  return `${formatShortDate(first)} \u2013 ${formatShortDate(last)}, ${year}`
}

const STATE_RANK: Record<CustomerFacingState, number> = { open: 0, coming_up: 1, check_with_org: 2, closed: 3 }

/**
 * The group's headline status is its most actionable session's: one open
 * session makes the camp open. `openCount` lets the card say how many.
 */
export function campGroupStatus(group: CampGroup, now = new Date()) {
  const states = group.sessions.map((session) => ({ session, ...customerFacingState(session, now) }))
  const best = [...states].sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state])[0]
  return {
    state: best.state,
    detail: best.detail,
    lead: best.session,
    openCount: states.filter((s) => s.state === "open").length,
  }
}

export const CAMP_SORTS = ["best", "start", "distance", "price"] as const
export type CampSort = (typeof CAMP_SORTS)[number]

export const CAMP_SORT_LABELS: Record<CampSort, string> = {
  best: "Best match",
  start: "Soonest start",
  distance: "Closest",
  price: "Lowest price",
}

export function parseCampSort(value: string | undefined | null): CampSort {
  return CAMP_SORTS.includes(value as CampSort) ? (value as CampSort) : "best"
}

/**
 * Best match: open registration, then upcoming, then needs-checking, then
 * closed; soonest start breaks ties. Every other sort puts unknown values
 * last so missing data never wins (PRD R6).
 */
export function sortCampGroups(groups: CampGroup[], sort: CampSort, now = new Date()) {
  const today = startOfDay(now).getTime()
  const nextStart = (group: CampGroup) => {
    const upcoming = group.sessions.map(startTime).filter((t) => t >= today)
    return upcoming.length ? Math.min(...upcoming) : Math.min(...group.sessions.map(startTime))
  }
  const distance = (group: CampGroup) =>
    Math.min(...group.sessions.map((s) => s.distance_from_hub ?? Number.POSITIVE_INFINITY))
  const byNumber = (pick: (group: CampGroup) => number) => (a: CampGroup, b: CampGroup) => {
    const av = pick(a)
    const bv = pick(b)
    if (av === bv) return nextStart(a) - nextStart(b)
    if (!Number.isFinite(av)) return 1
    if (!Number.isFinite(bv)) return -1
    return av - bv
  }

  const sorted = [...groups]
  if (sort === "start") return sorted.sort(byNumber(nextStart))
  if (sort === "distance") return sorted.sort(byNumber(distance))
  if (sort === "price") return sorted.sort(byNumber(groupMinFee))
  return sorted.sort((a, b) => {
    const rank = STATE_RANK[campGroupStatus(a, now).state] - STATE_RANK[campGroupStatus(b, now).state]
    if (rank !== 0) return rank
    return byNumber(nextStart)(a, b)
  })
}
