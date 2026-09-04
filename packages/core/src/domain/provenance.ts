import type { SourceType, VerificationStatus } from "./enums"
import { verificationRank } from "./enums"

/**
 * The prototype carried one `verification_status` per activity. But reports
 * arrive per *field* (`wrong_date`, `wrong_cost`, `wrong_age`), so a single
 * record-level flag cannot answer the question a parent actually has:
 * "is *this date* trustworthy?" — nor can it let the crawler re-verify only
 * the field that went stale.
 *
 * Provenance is therefore tracked per field. This is what makes field-level
 * confidence badges possible, and it is the difference between "we scraped
 * this page" and "this fee was confirmed by the organization on March 3".
 */

export const ENTITY_TYPES = ["organization", "program", "program_offering"] as const
export type EntityType = (typeof ENTITY_TYPES)[number]

/** How a value came to be. Distinct from *who* vouched for it. */
export const EXTRACTION_METHODS = [
  "ai_extraction",
  "structured_feed", // registration-platform API or ICS
  "manual_entry",
  "organization_edit",
  "community_submission",
  "inferred", // derived from another field, e.g. grade from age
] as const
export type ExtractionMethod = (typeof EXTRACTION_METHODS)[number]

export type FieldProvenance = {
  id: string
  entity_type: EntityType
  entity_id: string
  /** Column name on the target entity, e.g. "registration_close_date". */
  field: string
  /** The normalized value, serialized to text so one table covers all columns. */
  value: string | null
  /** Raw value as it appeared in the source, before normalization into `value`. Optional — additive. */
  extracted_value?: string | null
  /** Verbatim quoted text backing the value — the human-checkable citation. Optional — additive. */
  source_excerpt?: string | null
  /**
   * True when the value was inferred/guessed rather than explicitly stated in
   * the source. AI-inferred information must never be indistinguishable from
   * explicitly sourced data — `needsHumanReview` below floors confidence to
   * "low" whenever this is true. Optional field; treat undefined as false.
   */
  is_inferred?: boolean

  source_id: string | null
  source_type: SourceType | null
  extraction_method: ExtractionMethod
  /** Which `extraction_runs` row produced this value, if any. Optional — additive. */
  extraction_run_id?: string | null
  /** Model confidence in [0,1]. Null for human entry, which carries its own tier. */
  confidence: number | null
  /** Prompt/model version, so a quality regression can be traced to a change. */
  extraction_version: string | null

  verification_status: VerificationStatus
  /** Last time a human or authoritative feed affirmed this exact value. */
  verified_at: string | null
  verified_by: string | null

  /** Set when a report disputes this field; suppresses confident display. */
  disputed_at: string | null

  created_at: string
}

export const CONFIDENCE_TIERS = ["high", "medium", "low"] as const
export type ConfidenceTier = (typeof CONFIDENCE_TIERS)[number]

/** Route low-confidence extractions to human review instead of publishing them. */
export const REVIEW_CONFIDENCE_THRESHOLD = 0.75
export const HIGH_CONFIDENCE_THRESHOLD = 0.9

export function confidenceTier(
  p: Pick<FieldProvenance, "confidence" | "verification_status" | "disputed_at" | "is_inferred">,
): ConfidenceTier {
  if (p.disputed_at) return "low"
  // A human or the organization vouched for it; model confidence is irrelevant.
  if (verificationRank(p.verification_status) >= verificationRank("admin_reviewed")) return "high"
  // A guessed value must never look as trustworthy as an explicitly sourced one.
  if (p.is_inferred) return "low"
  if (p.confidence === null) return "medium"
  if (p.confidence >= HIGH_CONFIDENCE_THRESHOLD) return "high"
  if (p.confidence >= REVIEW_CONFIDENCE_THRESHOLD) return "medium"
  return "low"
}

export function needsHumanReview(
  p: Pick<FieldProvenance, "confidence" | "verification_status" | "disputed_at" | "is_inferred">,
): boolean {
  return confidenceTier(p) === "low"
}

/**
 * Freshness policy. A date inside the closing window must be re-checked daily,
 * because a wrong "registration is open" alert costs more trust than a missed one.
 */
export const STALENESS_SLA_DAYS = {
  /** Registration deadline is within 14 days. */
  urgent: 1,
  /** Registration is open or opening soon. */
  active: 7,
  /** Off-season. */
  dormant: 30,
} as const

export type FreshnessBucket = keyof typeof STALENESS_SLA_DAYS

export function isStale(
  lastCheckedISO: string | null,
  bucket: FreshnessBucket,
  now = new Date(),
): boolean {
  if (!lastCheckedISO) return true
  const checked = new Date(lastCheckedISO)
  if (Number.isNaN(checked.getTime())) return true
  const ageDays = (now.getTime() - checked.getTime()) / 86_400_000
  return ageDays > STALENESS_SLA_DAYS[bucket]
}
