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
  "municipal_recreation",
  "school",
  "school_district",
  "league",
  "club",
  "nonprofit",
  "commercial_provider",
  "camp_provider",
  "state_association",
  "national_association",
  "community_group",
  "facility_operator",
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

export const ALERT_TYPES = ["activity", "sport", "child_match", "organization"] as const
export type AlertType = (typeof ALERT_TYPES)[number]

/**
 * The vocabularies below were added when the model was generalized beyond
 * Vermont youth sports (Canonical Crawl & Data Model PRD) so a camp, class,
 * or adult drop-in can be described without overloading sports-shaped fields.
 */

/** Shape of the offering itself, independent of `programType`/`competitionLevel`. */
export const PROGRAM_FORMATS = [
  "league",
  "class",
  "camp",
  "clinic",
  "tournament",
  "drop_in",
  "recurring_class",
  "other",
] as const
export type ProgramFormat = (typeof PROGRAM_FORMATS)[number]

/** Who the program/offering targets. Independent of `genderEligibility`. */
export const AUDIENCE_TYPES = ["youth", "adult", "family", "all_ages"] as const
export type AudienceType = (typeof AUDIENCE_TYPES)[number]

/** Independent of `programType` — a "club" program can be recreational or elite. */
export const COMPETITION_LEVELS = ["recreational", "competitive", "travel", "elite"] as const
export type CompetitionLevel = (typeof COMPETITION_LEVELS)[number]

export const ORGANIZATION_STATUSES = ["active", "inactive", "merged", "closed"] as const
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number]

export const PROGRAM_STATUSES = ["active", "inactive", "discontinued"] as const
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number]

/** Registration platform a `source` runs on. Drives which ingest adapter parses it. */
export const SOURCE_PLATFORMS = [
  "myrec",
  "sportsengine",
  "webtrac",
  "rectrac",
  "civicrec",
  "leagueapps",
  "usta",
  "facebook",
  "generic_html",
  "pdf",
  "custom",
] as const
export type SourcePlatform = (typeof SOURCE_PLATFORMS)[number]

/**
 * Drives conflict resolution when two sources disagree on the same field —
 * distinct from `VerificationStatus`, which tracks trust on the resulting
 * canonical record rather than the source itself.
 */
export const SOURCE_AUTHORITY_LEVELS = ["primary", "secondary", "discovery_only", "community_submitted"] as const
export type SourceAuthorityLevel = (typeof SOURCE_AUTHORITY_LEVELS)[number]

/** How an extraction run produced its candidates. Distinct from `ExtractionMethod`, which is per-field. */
export const EXTRACTOR_TYPES = [
  "structured_parser",
  "platform_adapter",
  "html_parser",
  "pdf_parser",
  "llm_extraction",
  "manual",
] as const
export type ExtractorType = (typeof EXTRACTOR_TYPES)[number]

/** `pricing[].type` on a program offering. */
export const PRICING_TYPES = [
  "registration",
  "resident",
  "nonresident",
  "early_bird",
  "late_fee",
  "equipment",
  "membership",
  "deposit",
  "daily",
  "weekly",
  "season",
  "free",
  "other",
] as const
export type PricingType = (typeof PRICING_TYPES)[number]

/** `eligibility_rules[].type` on a program offering. */
export const ELIGIBILITY_RULE_TYPES = [
  "age",
  "grade",
  "birth_year",
  "gender",
  "residency",
  "school",
  "school_district",
  "skill_level",
  "experience",
  "membership",
  "league_division",
  "tryout_required",
  "adult_age",
] as const
export type EligibilityRuleType = (typeof ELIGIBILITY_RULE_TYPES)[number]

/** Why a `review_candidates` row needs human attention. */
export const REVIEW_REASONS = [
  "new_offering",
  "new_organization",
  "new_program",
  "ambiguous_taxonomy",
  "changed_deadline",
  "conflicting_age_range",
  "possible_duplicate",
  "new_source",
] as const
export type ReviewReason = (typeof REVIEW_REASONS)[number]

/**
 * `review_candidates.status`. Was already a closed vocabulary enforced by the
 * `review_status_check` constraint in Postgres but undocumented in TypeScript
 * until now — this mirrors the live constraint rather than introducing a new
 * one, so it can't drift from what the database actually allows.
 */
export const REVIEW_CANDIDATE_STATUSES = ["pending", "approved", "rejected", "superseded"] as const
export type ReviewCandidateStatus = (typeof REVIEW_CANDIDATE_STATUSES)[number]
