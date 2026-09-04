/**
 * Extraction schema.
 *
 * This is the contract between the model and the database. Two properties
 * matter more than completeness:
 *
 *   1. Every field is nullable. The model must be able to say "not stated"
 *      instead of inventing a plausible deadline. A hallucinated registration
 *      date is the single most damaging output this system can produce, because
 *      a parent acts on it and misses a real deadline.
 *
 *   2. Confidence is per field, not per record. A page often states the sport
 *      and org unambiguously while burying the fee in a PDF. One record-level
 *      score would either gate the good fields or wave through the bad one.
 *
 * Was originally shaped around Vermont youth sports specifically; generalized
 * (Canonical Crawl & Data Model PRD) with structured `pricing`,
 * `eligibilityRules`, `registrationPeriods`, and `sessions` arrays so a camp,
 * class, or adult drop-in isn't forced into sports-shaped single-fee/
 * single-window fields. The original flat fields (`registrationFee`,
 * `minAge`/`maxAge`, `registrationOpenDate`/`registrationCloseDate`,
 * `practiceSchedule`/`gameSchedule`) remain the fast path for the common case
 * and take priority — populate the structured array for a field only when the
 * flat field genuinely can't represent what the page states, never both for
 * the same fact.
 */

import { z } from "zod"

/** ISO date (YYYY-MM-DD) or null. Rejects free text like "early April". */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
  .nullable()

const confidence = z
  .number()
  .min(0)
  .max(1)
  .describe("0 = guessed, 1 = explicitly stated on the page")

export const seasonEnum = z.enum(["fall", "winter", "spring", "summer"])
export const genderEnum = z.enum(["girls", "boys", "coed", "any"])
export const programTypeEnum = z.enum(["recreational", "competitive", "school", "club"])

// Added when the model was generalized beyond Vermont youth sports (Canonical
// Crawl & Data Model PRD). `programType` above stays as the legacy
// classification; these are new, independent axes alongside it.
export const programFormatEnum = z.enum([
  "league",
  "class",
  "camp",
  "clinic",
  "tournament",
  "drop_in",
  "recurring_class",
  "other",
])
export const audienceTypeEnum = z.enum(["youth", "adult", "family", "all_ages"])
export const competitionLevelEnum = z.enum(["recreational", "competitive", "travel", "elite"])

const pricingEntrySchema = z.object({
  type: z.enum([
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
  ]),
  amount: z.number().min(0).nullable().describe("Dollars. Null if the page states the tier but not an amount."),
  currency: z.string().length(3).nullable().describe("ISO 4217, e.g. 'USD'. Null defaults to USD downstream."),
})

const eligibilityRuleSchema = z.object({
  type: z.enum([
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
  ]),
  operator: z.enum(["eq", "gte", "lte", "between", "in"]).nullable(),
  min: z.number().nullable(),
  max: z.number().nullable(),
  values: z.array(z.string()).nullable(),
})

const registrationPeriodSchema = z.object({
  type: z.enum(["early_bird", "regular", "late", "walk_in", "waitlist"]),
  opensAt: isoDate,
  closesAt: isoDate,
  price: z.number().min(0).nullable(),
})

const sessionSchema = z.object({
  type: z.enum(["practice", "game", "class", "camp_day", "meeting", "tryout", "other"]),
  startDatetime: z.string().nullable().describe("ISO 8601 datetime if the page states a time, else just a date"),
  endDatetime: z.string().nullable(),
  /** RRULE string, e.g. "FREQ=WEEKLY;BYDAY=MO,WE". Null for one-off sessions. */
  recurrenceRule: z.string().nullable(),
})

export const extractedProgramSchema = z.object({
  // ---- Identity -----------------------------------------------------------
  title: z.string().min(2).describe("Program name exactly as written on the page"),
  sportName: z
    .string()
    .nullable()
    .describe("Sport in plain words, e.g. 'soccer', 'ice hockey'. Null if unclear."),
  organizationName: z
    .string()
    .nullable()
    .describe("Organization running the program, as written"),
  description: z
    .string()
    .nullable()
    .describe("One or two sentences copied or closely paraphrased from the page"),
  programType: programTypeEnum.nullable(),
  programFormat: programFormatEnum
    .nullable()
    .describe("Shape of the offering, e.g. 'league', 'camp', 'drop_in'. Independent of programType."),
  audienceType: audienceTypeEnum.nullable().describe("Who this targets. Independent of gender."),
  competitionLevel: competitionLevelEnum
    .nullable()
    .describe("Independent of programType — a 'club' program can be recreational or elite."),

  // ---- Eligibility --------------------------------------------------------
  gender: genderEnum.nullable(),
  minAge: z.number().int().min(0).max(21).nullable(),
  maxAge: z.number().int().min(0).max(21).nullable(),
  minGrade: z
    .number()
    .int()
    .min(0)
    .max(12)
    .nullable()
    .describe("Kindergarten = 0"),
  maxGrade: z.number().int().min(0).max(12).nullable(),
  residencyRequirement: z.string().nullable(),
  experienceLevel: z.string().nullable(),
  eligibilityRules: z
    .array(eligibilityRuleSchema)
    .nullable()
    .describe(
      "Structured rules beyond minAge/maxAge/minGrade/maxGrade above — only when the page states something those flat fields can't capture (e.g. a birth-year cutoff or residency + school combo). Omit, don't invent, when the flat fields already cover it.",
    ),

  // ---- Season and dates ---------------------------------------------------
  season: seasonEnum.nullable(),
  seasonYear: z
    .number()
    .int()
    .min(2020)
    .max(2100)
    .nullable()
    .describe("Calendar year the season starts in"),
  registrationOpenDate: isoDate,
  registrationCloseDate: isoDate,
  seasonStartDate: isoDate,
  seasonEndDate: isoDate,
  registrationPeriods: z
    .array(registrationPeriodSchema)
    .nullable()
    .describe(
      "Only when the page states more than one registration window (e.g. early-bird vs. regular). Omit when registrationOpenDate/registrationCloseDate above already cover it.",
    ),

  // ---- Registration -------------------------------------------------------
  registrationUrl: z
    .string()
    .nullable()
    .describe("Direct registration link. Null if the page only links to a homepage."),
  registrationFee: z
    .number()
    .min(0)
    .nullable()
    .describe("Base fee in dollars. 0 only when the page says free."),
  additionalFees: z.string().nullable(),
  pricing: z
    .array(pricingEntrySchema)
    .nullable()
    .describe(
      "Only when the page states more than one price tier (e.g. resident vs. nonresident). Omit when registrationFee above already covers it — don't duplicate a single flat fee here.",
    ),
  scholarshipAvailable: z.boolean().nullable(),
  capacity: z.number().int().min(0).nullable(),
  waitlistAvailable: z.boolean().nullable(),

  // ---- Tryouts ------------------------------------------------------------
  tryoutRequired: z.boolean().nullable(),
  tryoutDetails: z.string().nullable(),
  tryoutDate: isoDate,

  // ---- Logistics ----------------------------------------------------------
  town: z.string().nullable(),
  state: z.string().length(2).nullable(),
  zip: z.string().nullable(),
  administrativeArea2: z.string().nullable().describe("County or equivalent, only if the page states one"),
  countryCode: z.string().length(2).nullable().describe("ISO 3166-1 alpha-2. Omit for US pages — it defaults downstream."),
  timezone: z.string().nullable().describe("IANA zone, e.g. 'America/New_York', only if the page states one explicitly"),
  venueName: z.string().nullable(),
  venueAddress: z.string().nullable(),
  practiceSchedule: z.string().nullable(),
  gameSchedule: z.string().nullable(),
  sessions: z
    .array(sessionSchema)
    .nullable()
    .describe(
      "Structured schedule, only when the page states specific dates/times/recurrence beyond a general description. Omit rather than force practiceSchedule/gameSchedule free text into this shape.",
    ),
  equipmentRequirements: z.string().nullable(),
  beginnerFriendly: z.boolean().nullable(),
  tags: z
    .array(z.string())
    .nullable()
    .describe("Freeform labels for search, only for things the sport/programFormat taxonomy doesn't already capture"),

  // ---- Contact ------------------------------------------------------------
  contactName: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactUrl: z.string().nullable(),

  // ---- Self-assessment ----------------------------------------------------
  /**
   * Keyed by field name above. Anything absent is treated as 0 (untrusted)
   * rather than assumed good.
   */
  fieldConfidence: z
    .record(z.string(), confidence)
    .describe("Confidence per field you populated, keyed by field name"),
  /**
   * Forces the model to point at its evidence. In practice this measurably
   * reduces invented dates, because a fabricated value has no quote to cite.
   */
  sourceQuotes: z
    .record(z.string(), z.string())
    .describe("For each date, fee, and URL: the exact text on the page that states it"),
  ambiguities: z
    .array(z.string())
    .describe("Anything genuinely unclear that a human reviewer should check"),
})

export type ExtractedProgram = z.infer<typeof extractedProgramSchema>

/**
 * A page may list many programs (a rec department's seasonal brochure commonly
 * lists a dozen). `isProgramListing` lets the model reject non-program pages
 * outright instead of straining to invent one program from a contact page.
 */
export const extractionResultSchema = z.object({
  isProgramListing: z
    .boolean()
    .describe("False for contact pages, news posts, and other non-program pages"),
  pageSummary: z.string().nullable(),
  programs: z.array(extractedProgramSchema),
})

export type ExtractionResult = z.infer<typeof extractionResultSchema>

/** Fields that must never be trusted below this confidence without review. */
export const HIGH_STAKES_CONFIDENCE_FLOOR = 0.85

/** Bumped whenever the prompt or schema changes, and recorded per run. */
export const EXTRACTION_VERSION = "2026.09.1"
