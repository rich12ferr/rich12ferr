/**
 * Closed vocabularies shared by every surface: web, mobile, ingestion, and the
 * Postgres schema in @openplay/db. Each list is exported both as a const tuple
 * (so it can seed a Postgres enum and be iterated in UI) and as a union type.
 */

export const SEASONS = ["fall", "winter", "spring", "summer"] as const
export type Season = (typeof SEASONS)[number]

export const PROGRAM_TYPES = ["recreational", "competitive", "school", "club"] as const
export type ProgramType = (typeof PROGRAM_TYPES)[number]

export const GENDER_ELIGIBILITIES = ["girls", "boys", "coed", "any"] as const
export type GenderEligibility = (typeof GENDER_ELIGIBILITIES)[number]

export const ORGANIZATION_TYPES = [
  "school",
  "recreation_department",
  "league",
  "club",
  "nonprofit",
  "other",
] as const
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number]

/**
 * Trust ladder, lowest to highest. Order is meaningful: `verificationRank`
 * relies on the array index, and search ranking prefers higher tiers.
 * An organization's own edit always outranks an AI extraction.
 */
export const VERIFICATION_STATUSES = [
  "unverified",
  "ai_extracted",
  "community_submitted",
  "admin_reviewed",
  "organization_verified",
] as const
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]

export function verificationRank(status: VerificationStatus): number {
  return VERIFICATION_STATUSES.indexOf(status)
}

export const SOURCE_TYPES = [
  "organization_website",
  "school_athletics_page",
  "registration_platform",
  "community_submission",
  "public_calendar",
  "newsletter",
  "organization_api",
  "bulk_upload",
] as const
export type SourceType = (typeof SOURCE_TYPES)[number]

export const REGISTRATION_STATUSES = [
  "upcoming",
  "open",
  "closing_soon",
  "closed",
  "waitlist",
  "unknown",
] as const
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number]

export const REPORT_CATEGORIES = [
  "registration_link_broken",
  "registration_closed",
  "wrong_date",
  "wrong_age",
  "wrong_grade",
  "wrong_cost",
  "program_no_longer_exists",
  "duplicate_activity",
  "other",
] as const
export type ReportCategory = (typeof REPORT_CATEGORIES)[number]

export const ALERT_TRIGGERS = [
  "registration_opened",
  "registration_closing_soon",
  "deadline_changed",
  "new_matching_activity",
  "registration_info_added",
] as const
export type AlertTrigger = (typeof ALERT_TRIGGERS)[number]

export const ALERT_TYPES = ["activity", "sport", "child_match"] as const
export type AlertType = (typeof ALERT_TYPES)[number]
