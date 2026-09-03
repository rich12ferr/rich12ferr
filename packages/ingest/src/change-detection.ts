/**
 * Change detection.
 *
 * The economics of moderation: crawling 500 sources weekly produces thousands
 * of extracted records, but only a handful actually changed. If every record
 * hits the review queue, moderators stop reading it and the whole trust model
 * collapses. So we compare against what we already have and forward only real
 * deltas.
 *
 * Two levels:
 *   1. Document hash — did the source page change at all? If not, skip the
 *      extraction entirely and save the model spend.
 *   2. Field diff — which specific fields changed, and does each change need a
 *      human? Some do not: a null filling in is strictly additive.
 */

import { createHash } from "node:crypto"

/* -------------------------------------------------------------------------- */
/*  Hashing                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Stable hash of fetched content.
 *
 * Whitespace is collapsed before hashing so cosmetic reflows and template
 * churn do not read as changes. This is intentionally not a full HTML-strip:
 * that belongs in the fetch layer, where the parser already has the DOM.
 */
export function hashContent(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim()
  return createHash("sha256").update(normalized).digest("hex")
}

/**
 * Hash of the extracted values we actually care about.
 *
 * Used to detect that an offering is materially unchanged even when the source
 * page was edited (nav links, unrelated copy). Keys are sorted so property
 * order never affects the hash.
 */
export function hashExtractedFields(fields: Record<string, unknown>): string {
  const sorted = Object.keys(fields)
    .sort()
    .filter((key) => fields[key] !== undefined)
    .map((key) => `${key}=${serializeValue(fields[key])}`)
    .join("|")
  return createHash("sha256").update(sorted).digest("hex")
}

function serializeValue(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (Array.isArray(value)) return value.map(serializeValue).join(",")
  if (typeof value === "number") return String(value)
  if (typeof value === "boolean") return value ? "1" : "0"
  return String(value).trim().toLowerCase()
}

/* -------------------------------------------------------------------------- */
/*  Field-level diffing                                                       */
/* -------------------------------------------------------------------------- */

export type FieldChangeKind =
  /** null -> value. Additive; safe to apply without review. */
  | "filled"
  /** value -> null. Suspicious: usually a parse failure, not a real removal. */
  | "cleared"
  /** value -> different value. Needs review when the field is high-stakes. */
  | "changed"

export type FieldChange = {
  field: string
  kind: FieldChangeKind
  previous: unknown
  next: unknown
  /** Whether this specific change should block on human review. */
  requiresReview: boolean
  note: string | null
}

/**
 * Fields a parent makes decisions on. A wrong value here is worse than a
 * missing one, so changes to them always get reviewed unless the source is
 * authoritative (see `trustedSource`).
 */
const HIGH_STAKES_FIELDS = new Set([
  "registrationOpenDate",
  "registrationCloseDate",
  "registrationUrl",
  "registrationFee",
  "seasonStartDate",
  "seasonEndDate",
  "tryoutDate",
  "tryoutRequired",
  "minAge",
  "maxAge",
  "minGrade",
  "maxGrade",
])

export type DiffOptions = {
  /**
   * Set for structured feeds and organization-verified edits. Those sources
   * are authoritative, so additive changes apply directly; only clears and
   * high-stakes overwrites still get flagged.
   */
  trustedSource?: boolean
  /** Confidence of the extraction, 0..1. Low confidence always gets reviewed. */
  confidence?: number
  /** Minimum confidence to auto-apply an additive change. */
  confidenceThreshold?: number
}

/**
 * Compare extracted values against the current record.
 *
 * Only keys present in `next` are considered — a field the extractor did not
 * mention is not evidence that the field is now empty. This distinction is what
 * stops a partial extraction from wiping good data.
 */
export function diffFields(
  current: Record<string, unknown>,
  next: Record<string, unknown>,
  options: DiffOptions = {},
): FieldChange[] {
  const {
    trustedSource = false,
    confidence = 1,
    confidenceThreshold = 0.75,
  } = options

  const changes: FieldChange[] = []
  const confident = confidence >= confidenceThreshold

  for (const field of Object.keys(next)) {
    const nextValue = next[field]
    if (nextValue === undefined) continue

    const previousValue = current[field] ?? null
    const normalizedNext = nextValue ?? null

    if (serializeValue(previousValue) === serializeValue(normalizedNext)) continue

    const isHighStakes = HIGH_STAKES_FIELDS.has(field)

    if (previousValue === null && normalizedNext !== null) {
      // Filling a gap is the single most valuable ingest outcome: it turns an
      // "info not published" listing into an actionable one.
      changes.push({
        field,
        kind: "filled",
        previous: null,
        next: normalizedNext,
        requiresReview: !(trustedSource || confident),
        note: confident ? null : "Low extraction confidence",
      })
      continue
    }

    if (previousValue !== null && normalizedNext === null) {
      // Never auto-apply. A field going empty is far more often a broken
      // selector or a redesigned page than a genuine removal.
      changes.push({
        field,
        kind: "cleared",
        previous: previousValue,
        next: null,
        requiresReview: true,
        note: "Value disappeared from source; may be an extraction failure",
      })
      continue
    }

    changes.push({
      field,
      kind: "changed",
      previous: previousValue,
      next: normalizedNext,
      requiresReview: isHighStakes ? !trustedSource : !(trustedSource || confident),
      note: isHighStakes ? "Parents make decisions on this field" : null,
    })
  }

  return changes
}

/** True when any change in the set needs a human before it can be applied. */
export function requiresReview(changes: FieldChange[]): boolean {
  return changes.some((change) => change.requiresReview)
}

/** Changes safe to write directly, for the auto-apply path. */
export function autoApplicableChanges(changes: FieldChange[]): FieldChange[] {
  return changes.filter((change) => !change.requiresReview)
}

/* -------------------------------------------------------------------------- */
/*  Crawl scheduling                                                          */
/* -------------------------------------------------------------------------- */

/**
 * How soon to re-check a source, based on the nearest registration deadline it
 * feeds. This is the freshness engine's core rule: a deadline two days out is
 * worth checking daily, a deadline six months out is not.
 *
 * Also backs off exponentially on consecutive failures so a dead domain does
 * not get hammered every cycle.
 */
export function nextCrawlIntervalHours(input: {
  daysUntilNearestDeadline: number | null
  consecutiveFailures: number
  baseIntervalHours?: number
}): number {
  const { daysUntilNearestDeadline, consecutiveFailures } = input
  const base = input.baseIntervalHours ?? 168 // weekly

  let interval = base
  if (daysUntilNearestDeadline !== null) {
    if (daysUntilNearestDeadline < 0) interval = base * 2 // past deadline: relax
    else if (daysUntilNearestDeadline <= 3) interval = 12
    else if (daysUntilNearestDeadline <= 14) interval = 24
    else if (daysUntilNearestDeadline <= 45) interval = 72
  }

  if (consecutiveFailures > 0) {
    interval *= Math.min(2 ** consecutiveFailures, 16)
  }

  // Never faster than 6h (politeness) or slower than 30 days (staleness SLA).
  return Math.min(Math.max(interval, 6), 720)
}
