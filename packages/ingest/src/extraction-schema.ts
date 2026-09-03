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
  venueName: z.string().nullable(),
  venueAddress: z.string().nullable(),
  practiceSchedule: z.string().nullable(),
  gameSchedule: z.string().nullable(),
  equipmentRequirements: z.string().nullable(),
  beginnerFriendly: z.boolean().nullable(),

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
export const EXTRACTION_VERSION = "2026.08.1"
