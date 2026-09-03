/**
 * AI extraction of program data from crawled pages.
 *
 * Server-only. Uses `generateObject` so the model is constrained by the schema
 * rather than trusted to emit valid JSON.
 *
 * The prompt's job is almost entirely about suppressing helpfulness. A general
 * model asked to fill a form will fill it — inferring "registration probably
 * opens in March" from a season that starts in April. That inference is exactly
 * the failure mode that makes a parent miss a deadline, so most of the prompt
 * is spent forbidding it.
 */

import { generateObject } from "ai"
import {
  EXTRACTION_VERSION,
  HIGH_STAKES_CONFIDENCE_FLOOR,
  extractionResultSchema,
  type ExtractedProgram,
  type ExtractionResult,
} from "./extraction-schema"

/**
 * Default model: cheap and fast, because this runs across every source on every
 * crawl cycle. Extraction here is bounded reading comprehension over a single
 * page, not reasoning, so a flash-tier model is the right trade. Escalation to
 * a stronger model is worthwhile only for pages that fail validation.
 */
export const DEFAULT_EXTRACTION_MODEL = "google/gemini-3.5-flash"

const SYSTEM_PROMPT = `You extract youth sports program information from web pages for a public directory that parents rely on to avoid missing registration deadlines.

Your accuracy standard is legal-grade: a parent will act on what you output.

ABSOLUTE RULES
1. Never infer, estimate, or guess. If the page does not state a value, return null.
2. Never convert vague timing into a date. "Registration opens in the spring", "sign up soon", and "TBD" are all null — not a made-up date.
3. Copy dates exactly as stated, converted to YYYY-MM-DD. If a year is not stated anywhere on the page, return null rather than assuming the current year.
4. A fee of 0 means the page explicitly says free, no charge, or $0. Unstated cost is null, never 0.
5. registrationUrl must be a link that actually starts registration. A link to the organization's homepage or a generic "learn more" is null.
6. Grade values: kindergarten = 0, 1st grade = 1, and so on. Do not translate grades into ages or ages into grades — report only what the page states.
7. If the page lists several distinct programs, return one entry per program. Do not merge them, and do not split a single program into several entries per age group unless the page itself separates them with different dates or fees.
8. For every date, fee, and URL you populate, put the exact supporting text from the page in sourceQuotes. If you cannot quote it, the value must be null.
9. Set fieldConfidence per field: 1.0 only for values stated plainly and unambiguously; 0.5 or below when you had to interpret layout, footnotes, or tables.
10. Put anything a human should double-check in ambiguities. An honest ambiguity is more valuable than a confident guess.

Set isProgramListing to false for contact pages, news posts, staff directories, and general information pages that do not describe a specific program with its own registration.`

export type ExtractInput = {
  /** Cleaned text of the fetched page. */
  content: string
  sourceUrl: string
  /** Known org name, when the source is already tied to an organization. */
  organizationHint?: string | null
  /** Fetch date, so relative phrasing like "next Monday" can be rejected. */
  fetchedAt?: Date
  model?: string
}

export type ExtractOutput = {
  result: ExtractionResult
  usage: {
    inputTokens: number | null
    outputTokens: number | null
  }
  model: string
  promptVersion: string
  /** Mean confidence across populated fields, for run-level telemetry. */
  meanConfidence: number | null
}

function buildUserPrompt(input: ExtractInput): string {
  const parts = [
    `SOURCE URL: ${input.sourceUrl}`,
    `FETCHED: ${(input.fetchedAt ?? new Date()).toISOString().slice(0, 10)}`,
  ]

  if (input.organizationHint) {
    parts.push(
      `KNOWN ORGANIZATION: ${input.organizationHint} (use this only if the page agrees; do not overwrite a different org named on the page)`,
    )
  }

  parts.push(
    "",
    "Extract every distinct program described below. Remember: unstated means null.",
    "",
    "--- PAGE CONTENT ---",
    input.content,
  )

  return parts.join("\n")
}

/** Mean of populated per-field confidences across all programs in a run. */
function computeMeanConfidence(result: ExtractionResult): number | null {
  const scores = result.programs.flatMap((program) =>
    Object.values(program.fieldConfidence ?? {}),
  )
  if (scores.length === 0) return null
  return scores.reduce((sum, value) => sum + value, 0) / scores.length
}

/**
 * Run extraction over one document.
 *
 * `temperature: 0` because this is transcription, not generation — we want the
 * same page to yield the same output so change detection stays meaningful.
 */
export async function extractPrograms(input: ExtractInput): Promise<ExtractOutput> {
  const model = input.model ?? DEFAULT_EXTRACTION_MODEL

  const { object, usage } = await generateObject({
    model,
    schema: extractionResultSchema,
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(input),
    temperature: 0,
    maxOutputTokens: 8_000,
  })

  return {
    result: object,
    usage: {
      inputTokens: usage?.inputTokens ?? null,
      outputTokens: usage?.outputTokens ?? null,
    },
    model,
    promptVersion: EXTRACTION_VERSION,
    meanConfidence: computeMeanConfidence(object),
  }
}

/* -------------------------------------------------------------------------- */
/*  Post-extraction validation                                                */
/* -------------------------------------------------------------------------- */

export type ValidationIssue = {
  field: string
  severity: "error" | "warning"
  message: string
}

/**
 * Deterministic checks the model cannot be trusted to self-enforce.
 *
 * These run on every extraction regardless of reported confidence. A model that
 * is confidently wrong about date ordering is precisely what this catches, and
 * cheap arithmetic beats another model call every time.
 */
export function validateExtraction(program: ExtractedProgram): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const day = (value: string | null) => (value ? new Date(`${value}T00:00:00Z`) : null)
  const open = day(program.registrationOpenDate)
  const close = day(program.registrationCloseDate)
  const start = day(program.seasonStartDate)
  const end = day(program.seasonEndDate)

  if (open && close && open > close) {
    issues.push({
      field: "registrationCloseDate",
      severity: "error",
      message: "Registration closes before it opens",
    })
  }

  if (start && end && start > end) {
    issues.push({
      field: "seasonEndDate",
      severity: "error",
      message: "Season ends before it starts",
    })
  }

  // A registration window that closes well after the season starts usually
  // means two different dates on the page were conflated.
  if (close && start && close.getTime() - start.getTime() > 45 * 86_400_000) {
    issues.push({
      field: "registrationCloseDate",
      severity: "warning",
      message: "Registration closes more than 45 days after the season starts",
    })
  }

  if (
    program.minAge !== null &&
    program.maxAge !== null &&
    program.minAge > program.maxAge
  ) {
    issues.push({
      field: "maxAge",
      severity: "error",
      message: "Minimum age exceeds maximum age",
    })
  }

  if (
    program.minGrade !== null &&
    program.maxGrade !== null &&
    program.minGrade > program.maxGrade
  ) {
    issues.push({
      field: "maxGrade",
      severity: "error",
      message: "Minimum grade exceeds maximum grade",
    })
  }

  // Registration URL must be a usable absolute link.
  if (program.registrationUrl) {
    try {
      const url = new URL(program.registrationUrl)
      if (!["http:", "https:"].includes(url.protocol)) {
        issues.push({
          field: "registrationUrl",
          severity: "error",
          message: "Registration URL is not http(s)",
        })
      }
    } catch {
      issues.push({
        field: "registrationUrl",
        severity: "error",
        message: "Registration URL is not a valid absolute URL",
      })
    }
  }

  // Dates and fees must be quoted. An unquoted value is an unsupported claim.
  for (const field of [
    "registrationOpenDate",
    "registrationCloseDate",
    "registrationFee",
    "tryoutDate",
  ] as const) {
    const populated = program[field] !== null && program[field] !== undefined
    if (populated && !program.sourceQuotes?.[field]) {
      issues.push({
        field,
        severity: "warning",
        message: "Value has no supporting quote from the source",
      })
    }
  }

  // Low self-reported confidence on a decision-driving field.
  for (const [field, score] of Object.entries(program.fieldConfidence ?? {})) {
    const isHighStakes = [
      "registrationOpenDate",
      "registrationCloseDate",
      "registrationFee",
      "registrationUrl",
      "tryoutDate",
    ].includes(field)
    if (isHighStakes && score < HIGH_STAKES_CONFIDENCE_FLOOR) {
      issues.push({
        field,
        severity: "warning",
        message: `Confidence ${score.toFixed(2)} below floor for a high-stakes field`,
      })
    }
  }

  return issues
}

/** True when issues include anything that must block publication. */
export function hasBlockingIssues(issues: ValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === "error")
}
