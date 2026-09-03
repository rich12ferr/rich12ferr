import type {
  GenderEligibility,
  OrganizationType,
  ProgramType,
  RegistrationStatus,
  Season,
  SourceType,
  VerificationStatus,
} from "./enums"
import type { Place } from "./geo"

/**
 * The prototype had a single `Activity` row carrying `season` + `season_year`,
 * so "Montpelier Rec Youth Soccer" became a brand-new record every year. That
 * broke bookmark continuity, alert history, and year-over-year reporting.
 *
 * The model is now split in two:
 *
 *   Program          durable identity — what the organization *offers*
 *   ProgramOffering  a dated instance — the Fall 2026 season of that program
 *
 * Bookmarks, alerts, and reports attach to `Program` so they survive a season
 * rollover. Search indexes `ProgramOffering` because that is what carries the
 * dates and the registration URL a parent actually needs.
 */

export type Organization = {
  id: string
  slug: string
  name: string
  organization_type: OrganizationType
  website_url: string | null
  registration_platform: string | null
  contact_email: string | null
  phone: string | null
  place: Place
  about: string | null

  /** True once a human at the organization has proven control of it. */
  claimed: boolean
  claimed_at: string | null
  verified: boolean
  last_verified_at: string | null

  created_at: string
  updated_at: string
}

/** Who may join. Stable across seasons, so it lives on the Program. */
export type Eligibility = {
  gender: GenderEligibility
  min_age: number | null
  max_age: number | null
  min_grade: number | null
  max_grade: number | null
  residency_requirement: string | null
  experience_level: string | null
  beginner_friendly: boolean
}

export type Program = {
  id: string
  slug: string
  organization_id: string
  sport_id: string

  title: string
  description: string | null
  program_type: ProgramType

  eligibility: Eligibility

  /** Seasons this program usually runs in — powers "expect this again in the fall". */
  typical_seasons: Season[]

  equipment_requirements: string | null
  practice_schedule: string | null
  game_schedule: string | null

  /** Highest trust tier reached by any field on this program. */
  verification_status: VerificationStatus

  active: boolean
  created_at: string
  updated_at: string
}

export type ProgramOffering = {
  id: string
  program_id: string

  season: Season
  season_year: number

  registration_open_date: string | null
  registration_close_date: string | null
  season_start_date: string | null
  season_end_date: string | null

  registration_url: string | null
  registration_provider: string | null
  capacity: number | null
  waitlist_available: boolean | null
  /** Admin override of the date-derived status. Set only with a documented reason. */
  status_override: RegistrationStatus | null

  registration_fee: number | null
  currency: string
  additional_fees: string | null
  scholarship_available: boolean | null

  tryout_required: boolean
  tryout_details: string | null
  tryout_date: string | null

  /** An offering can move venue between seasons, so location lives here. */
  place: Place | null

  contact_name: string | null
  contact_email: string | null
  contact_url: string | null

  /** Freshness: the crawler's promise about how current these dates are. */
  date_last_checked: string | null
  verification_status: VerificationStatus

  published: boolean
  created_at: string
  updated_at: string
}

/** A source document a fact can be traced back to. */
export type Source = {
  id: string
  organization_id: string | null
  url: string
  source_type: SourceType
  /** Crawl cadence in hours; tightened automatically as a deadline approaches. */
  crawl_interval_hours: number
  robots_allowed: boolean
  last_crawled_at: string | null
  last_succeeded_at: string | null
  consecutive_failures: number
  active: boolean
}

/** Denormalized read model: what a search result or detail page renders. */
export type OfferingWithRelations = ProgramOffering & {
  program: Program
  organization: Organization
  /** Resolved location: the offering's own place, falling back to the org's. */
  resolved_place: Place
  /** Miles from the searcher's origin. Null when either side is not geocoded. */
  distance_miles: number | null
}
