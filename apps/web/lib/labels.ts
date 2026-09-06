/**
 * Display labels and filter constants — pure data, no database access.
 *
 * These live apart from `lib/queries.ts` deliberately. That module imports the
 * Postgres driver, so anything a Client Component touches must not reach it:
 * a single label import would otherwise pull `pg` into the browser bundle and
 * fail the build on `net`/`tls`. Keeping constants here lets client and server
 * code share one source of truth for wording.
 */

import type { AlertTrigger, Season } from "@/lib/types"

/** Default search radius in miles. */
export const DEFAULT_RADIUS = 20

export const seasonLabels: Record<Season, string> = {
  fall: "Fall",
  winter: "Winter",
  spring: "Spring",
  summer: "Summer",
}

export const programTypeLabels = {
  recreational: "Recreational",
  competitive: "Competitive",
  school: "School team",
  club: "Club",
} as const

export const genderLabels = {
  girls: "Girls",
  boys: "Boys",
  coed: "Coed",
  any: "All players",
} as const

export type CalendarEventKind = "registration_open" | "registration_close" | "tryout" | "season_start"

export const calendarEventLabels: Record<CalendarEventKind, string> = {
  registration_open: "Registration opens",
  registration_close: "Registration closes",
  tryout: "Tryouts / evaluations",
  season_start: "Season starts",
}

/** Default view (PRD priority): registration windows, not tryouts/season starts. */
export const DEFAULT_CALENDAR_KINDS: CalendarEventKind[] = ["registration_open", "registration_close"]

export const alertTriggerLabels: Record<AlertTrigger, string> = {
  registration_opened: "Registration opens",
  registration_closing_soon: "Registration is closing soon",
  deadline_changed: "A registration deadline changes",
  new_matching_activity: "A new matching activity is published",
  registration_info_added: "Missing registration details get filled in",
}

export const verificationLabels = {
  unverified: "Unverified",
  ai_extracted: "Automated import",
  community_submitted: "Community submitted",
  admin_reviewed: "Admin reviewed",
  organization_verified: "Organization verified",
} as const

/**
 * Launch-region towns used as the filter dropdown's initial options.
 *
 * The database is authoritative (`listTownNames()`), but the filter panel is a
 * Client Component and cannot await. A town present in the data but missing
 * here still appears in results; only the dropdown's options are affected.
 */
export const towns = ["Barre", "Berlin", "Montpelier", "Northfield", "Waterbury"]
