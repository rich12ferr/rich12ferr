// Canonical OpenPlay domain types (PRD sections 20-22).
// The prototype stores these in-memory; field names match the future Postgres schema.

export type Season = "fall" | "winter" | "spring" | "summer"

export type ProgramType = "recreational" | "competitive" | "school" | "club"

export type GenderEligibility = "girls" | "boys" | "coed" | "any"

export type OrganizationType =
  | "school"
  | "recreation_department"
  | "league"
  | "club"
  | "nonprofit"
  | "other"

export type VerificationStatus =
  | "unverified"
  | "ai_extracted"
  | "community_submitted"
  | "admin_reviewed"
  | "organization_verified"

export type SourceType =
  | "organization_website"
  | "school_athletics_page"
  | "registration_platform"
  | "community_submission"
  | "public_calendar"
  | "newsletter"

export type RegistrationStatus =
  | "upcoming"
  | "open"
  | "closing_soon"
  | "closed"
  | "waitlist"
  | "unknown"

export type Sport = {
  id: string
  slug: string
  name: string
  /** Two-letter marker shown beside the sport name. */
  monogram: string
  /** Palette key driving the marker's colour. */
  tone: string
  /**
   * Stable key for the sport's icon, used to attach per-sport iconography
   * without re-deriving it from the display name.
   */
  icon_key?: string
  /** Season the sport is most commonly offered in. */
  primarySeasons: Season[]
  blurb: string
}

// Nullable where real ingested data may legitimately lack the field. The
// prototype's fixtures were always complete; crawled sources are not, and
// pretending otherwise would push empty strings into the UI.
export type Organization = {
  id: string
  name: string
  slug: string
  organization_type: OrganizationType
  website_url: string | null
  registration_platform?: string | null
  contact_email?: string | null
  phone?: string | null
  town: string
  state: string
  zip?: string | null
  verified: boolean
  last_verified_at?: string | null
  about?: string | null
}

export type Activity = {
  id: string
  slug: string
  organization_id: string
  sport_id: string
  /**
   * Durable program identity behind this offering. Alerts point here (not at
   * `id`, which is the offering) so a watch survives into next season.
   */
  program_id: string

  title: string
  description: string

  program_type: ProgramType
  gender: GenderEligibility

  min_age: number | null
  max_age: number | null
  min_grade: number | null
  max_grade: number | null
  residency_requirement: string | null
  experience_level: string | null

  /** Null for offerings with no fixed season, e.g. year-round drop-ins or rolling-enrollment classes. */
  season: Season | null
  season_year: number | null

  registration_open_date: string | null
  registration_close_date: string | null
  season_start_date: string | null
  season_end_date: string | null

  registration_url: string | null
  registration_provider: string | null
  capacity: number | null
  waitlist_available: boolean | null
  /** Admin override of the computed registration status (PRD 16). */
  status_override: RegistrationStatus | null

  registration_fee: number | null
  currency: string
  /** Whether financial aid is offered — a cost barrier parents actively filter on. */
  scholarship_available: boolean | null
  additional_fees: string | null
  equipment_requirements: string | null

  tryout_required: boolean
  tryout_details: string | null
  tryout_date: string | null
  practice_schedule: string | null
  game_schedule: string | null

  beginner_friendly: boolean

  town: string
  state: string
  /** Null when the source page never published one. */
  zip: string | null
  /**
   * Straight-line miles from the search origin. Null when neither the
   * offering nor its organization has been geocoded yet — never coerce this
   * to 0, which would falsely claim the activity is located at the origin.
   */
  distance_from_hub: number | null
  venue_name: string | null
  venue_address: string | null

  contact_name: string | null
  contact_email: string | null
  contact_url: string | null

  source_url: string
  source_type: SourceType
  date_discovered: string
  /** Null until the listing has been re-checked at least once. */
  date_last_checked: string | null
  verification_status: VerificationStatus
  verification_method: string

  published: boolean
  created_at: string
  updated_at: string
}

export type ActivityWithRelations = Activity & {
  organization: Organization
  sport: Sport
}

/** A community-submitted activity awaiting moderation (PRD 23). */
export type Submission = {
  id: string
  submitted_at: string
  submitter_email: string
  organization_name: string
  sport_name: string
  program_name: string
  eligibility: string
  registration_dates: string
  registration_url: string | null
  source_url: string | null
  comments: string | null
  status: "pending" | "approved" | "rejected"
}

export type ReportCategory =
  | "registration_link_broken"
  | "registration_closed"
  | "wrong_date"
  | "wrong_age"
  | "wrong_grade"
  | "wrong_cost"
  | "program_no_longer_exists"
  | "duplicate_activity"
  | "other"
  /** Filed from the general /contact form rather than an activity page — not tied to a listing. */
  | "general_inquiry"

/**
 * An incorrect-information report (PRD 24). This mirrors the mock moderation
 * data shape used by the not-yet-rewired admin reports queue — the real
 * `reports` DB row (see `packages/db/src/schema.ts`) is camelCase and has a
 * few different fields (programId/offeringId instead of activity_id). Do not
 * widen this type until the admin console is reconnected to the live database.
 */
export type Report = {
  id: string
  activity_id: string
  category: ReportCategory
  details: string
  reporter_email: string | null
  reported_at: string
  /**
   * "dismissed" closes a report without a data change — the listing was already
   * correct. Distinct from "resolved", which means something was actually fixed,
   * so the two are not collapsed.
   */
  status: "new" | "investigating" | "resolved" | "dismissed"
}

/** An AI-extracted candidate awaiting human review (PRD 25 review queue). */
export type ReviewCandidate = {
  id: string
  kind: "new_activity" | "field_update"
  activity_id: string | null
  activity_title: string
  organization_name: string
  source_url: string
  confidence: number
  discovered_at: string
  changes: {
    field: string
    current_value: string | null
    proposed_value: string
    inferred: boolean
  }[]
  validation_issues: string[]
  duplicate_assessment: "new" | "possible_duplicate" | "likely_update" | "duplicate"
}

export type AlertType = "activity" | "sport" | "child_match"

/** PRD 17 trigger events. */
export type AlertTrigger =
  | "registration_opened"
  | "registration_closing_soon"
  | "deadline_changed"
  | "new_matching_activity"
  | "registration_info_added"

export type ParentAlert = {
  id: string
  type: AlertType
  label: string
  criteria: string
  created_at: string
  triggers: AlertTrigger[]
  active: boolean
}

export type ChildProfile = {
  id: string
  nickname: string
  birth_year: number
  grade: number
  gender_preference: GenderEligibility
  home_zip: string
  sport_interests: string[]
  distance_preference: number
}
