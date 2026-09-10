// Single typed layer over Vercel Analytics custom events (product analytics spec).
//
// Every product event flows through `trackEvent` so payload shapes stay typed
// and consistent, and so cross-page session context (a stable per-visit
// session id, the discovery surface a visitor came from, and whether they
// arrived from an alert) is attached automatically. Session context lives in
// sessionStorage — it must survive client navigations across pages within a
// visit, but should not outlive the browser session.
//
// This module has no "use client" directive on purpose: pure helpers like
// `buildHandoffProps` and `pathToOrigin` are imported by Server Components
// (e.g. the activity detail page) to assemble typed payloads, while the
// browser-only bits are all guarded by `typeof window`.

import { track } from "@vercel/analytics"
import type { ActivityWithRelations, RegistrationStatus, SourceType } from "@/lib/types"

/** The discovery surface a visitor was last on before a conversion. */
export type DiscoveryOrigin =
  | "homepage"
  | "search"
  | "weekly_update"
  | "organization_page"
  | "alert_landing"
  | "direct"

/** Where a registration/website handoff was clicked. */
export type CtaLocation =
  | "activity_detail_primary"
  | "activity_detail_source"
  | "weekly_update_detail"
  | "organization_website"

/**
 * Payload for `registration_handoff_clicked`. Offering-scoped fields are
 * optional because some handoff sites (an organization's own website, a weekly
 * story that points off-site) have no single offering behind them.
 *
 * Spec mapping notes: the spec's `activity_taxonomy_*` has no equivalent here —
 * the only taxonomy in this app is Sport, so it maps to `sport_id`/`sport_name`.
 * The spec's `source_authority` maps to the offering's `source_type`.
 */
export type RegistrationHandoffProps = {
  cta_label: string
  cta_location: CtaLocation
  offering_id?: string | null
  program_id?: string | null
  organization_id?: string | null
  sport_id?: string | null
  sport_name?: string | null
  source_type?: SourceType | null
  registration_provider?: string | null
  registration_status?: RegistrationStatus | null
}

/** Typed map of every product event to its payload shape. */
export interface AnalyticsEventMap {
  discovery_started: { origin: DiscoveryOrigin }
  search_submitted: {
    source: "home_quick_search"
    sport: string | null
    grade: string | null
    has_zip: boolean
  }
  search_results_viewed: {
    result_count: number
    sport: string | null
    season: string | null
    has_filters: boolean
  }
  program_offering_viewed: {
    offering_id: string
    program_id: string
    sport_id: string
    sport_name: string
    organization_id: string
    source_type: SourceType
    registration_status: RegistrationStatus
  }
  organization_viewed: {
    organization_id: string
    organization_name: string
    program_count: number
    open_now_count: number
  }
  weekly_update_activity_clicked: {
    story_id: string
    cta_label: string
    destination: string
  }
  registration_handoff_clicked: RegistrationHandoffProps
  alert_created: {
    alert_type: "activity" | "sport" | "child_match"
    sport_id: string | null
    has_zip: boolean
    trigger_count: number | null
    source: "activity_detail" | "alerts_page"
  }
  activity_submission_started: Record<string, never>
  activity_submission_completed: {
    has_registration_url: boolean
    has_dates: boolean
  }
  activity_report_submitted: {
    source: "report_dialog" | "suggest_edit"
    category: string
    offering_id: string
    program_id: string
  }
}

export type AnalyticsEventName = keyof AnalyticsEventMap

const SESSION_ID_KEY = "suv.analytics.session_id"
const ORIGIN_KEY = "suv.analytics.discovery_origin"
const ALERT_KEY = "suv.analytics.alert_assisted"

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

/** Ensures a stable per-visit session id exists, returning it. */
export function ensureSessionId(): string | null {
  if (typeof window === "undefined") return null
  let id = window.sessionStorage.getItem(SESSION_ID_KEY)
  if (!id) {
    id = randomId()
    window.sessionStorage.setItem(SESSION_ID_KEY, id)
  }
  return id
}

/** Records the discovery surface a visitor is currently on. */
export function setDiscoveryOrigin(origin: DiscoveryOrigin): void {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(ORIGIN_KEY, origin)
}

/** Flags the visit as having arrived via an alert link. Sticky for the session. */
export function markAlertAssisted(): void {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(ALERT_KEY, "true")
}

type SessionContext = {
  session_id: string | null
  discovery_origin: DiscoveryOrigin | null
  alert_assisted: boolean
}

function getSessionContext(): SessionContext {
  if (typeof window === "undefined") {
    return { session_id: null, discovery_origin: null, alert_assisted: false }
  }
  return {
    session_id: window.sessionStorage.getItem(SESSION_ID_KEY),
    discovery_origin: window.sessionStorage.getItem(ORIGIN_KEY) as DiscoveryOrigin | null,
    alert_assisted: window.sessionStorage.getItem(ALERT_KEY) === "true",
  }
}

/** Maps a landing pathname to the discovery surface it represents. */
export function pathToOrigin(pathname: string): DiscoveryOrigin {
  if (pathname === "/") return "homepage"
  if (pathname.startsWith("/search")) return "search"
  if (pathname.startsWith("/this-week")) return "weekly_update"
  if (pathname.startsWith("/organizations")) return "organization_page"
  if (pathname.startsWith("/alerts")) return "alert_landing"
  return "direct"
}

/**
 * Emits a typed product event with session context merged in. Vercel Analytics
 * only sends in production; in every environment this is a safe no-op when the
 * page is server-rendered (guarded by `typeof window`). Keys with `undefined`
 * values are dropped so the payload stays clean.
 */
export function trackEvent<K extends AnalyticsEventName>(name: K, props: AnalyticsEventMap[K]): void {
  if (typeof window === "undefined") return

  const merged: Record<string, string | number | boolean | null> = { ...getSessionContext() }
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined) merged[key] = value as string | number | boolean | null
  }

  track(name, merged)
}

/** Assembles the offering-scoped payload for a registration handoff click. */
export function buildHandoffProps(
  activity: ActivityWithRelations,
  opts: { ctaLabel: string; ctaLocation: CtaLocation; status: RegistrationStatus },
): RegistrationHandoffProps {
  return {
    cta_label: opts.ctaLabel,
    cta_location: opts.ctaLocation,
    offering_id: activity.id,
    program_id: activity.program_id,
    organization_id: activity.organization_id,
    sport_id: activity.sport_id,
    sport_name: activity.sport.name,
    source_type: activity.source_type,
    registration_provider: activity.registration_provider,
    registration_status: opts.status,
  }
}
