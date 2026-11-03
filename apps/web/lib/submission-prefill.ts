import type { SubmissionRow } from "@openplay/db"

/** Editable, structured draft of a listing, prefilled from a free-text submission. */
export type SubmissionDraft = {
  title: string
  description: string
  organizationName: string
  town: string
  state: string
  zip: string
  venueName: string
  venueAddress: string
  sportSlug: string
  programFormat: string
  campStay: string
  campPeriod: string
  season: string
  seasonYear: string
  seasonStartDate: string
  seasonEndDate: string
  registrationOpenDate: string
  registrationCloseDate: string
  minAge: string
  maxAge: string
  minGrade: string
  maxGrade: string
  registrationFee: string
  additionalFees: string
  registrationUrl: string
  sourceUrl: string
  contactEmail: string
}

export type SubmissionView = {
  id: string
  submittedAt: string
  submitterEmail: string | null
  organizationName: string
  sportName: string | null
  programName: string
  eligibility: string | null
  registrationDates: string | null
  registrationUrl: string | null
  sourceUrl: string | null
  comments: string | null
  status: string
  reviewedAt: string | null
  reviewedBy: string | null
  draft: SubmissionDraft
}

type SportOption = { slug: string; name: string }

const ISO_DATE = /\b(20\d{2}-\d{2}-\d{2})\b/g

function range(text: string | null, word: RegExp): [string, string] {
  if (!text) return ["", ""]
  const match = text.match(new RegExp(`${word.source}\\s*(\\d{1,2})\\s*(?:-|–|to)\\s*(\\d{1,2})`, "i"))
  if (match) return [match[1], match[2]]
  const single = text.match(new RegExp(`${word.source}\\s*(\\d{1,2})\\b`, "i"))
  return single ? [single[1], single[1]] : ["", ""]
}

function guessSeason(text: string): string {
  const lower = text.toLowerCase()
  if (/summer/.test(lower)) return "summer"
  if (/fall|autumn/.test(lower)) return "fall"
  if (/winter|holiday|february|december/.test(lower)) return "winter"
  if (/spring|april/.test(lower)) return "spring"
  return ""
}

function guessCampPeriod(text: string, season: string): string {
  // Notes often mention other months ("enrollment open through February"), so
  // a summer season wins over a stray month name.
  if (season === "summer") return "summer"
  const lower = text.toLowerCase()
  if (/february/.test(lower)) return "february_break"
  if (/april/.test(lower)) return "april_break"
  if (/holiday|winter break|december/.test(lower)) return "winter_break"
  return season === "summer" ? "summer" : ""
}

/**
 * Best-effort structure from the submitter's free text. Everything here is
 * a starting point the reviewer confirms; nothing publishes from a guess.
 */
export function toSubmissionView(row: SubmissionRow, sports: SportOption[]): SubmissionView {
  const text = [row.programName, row.comments, row.eligibility, row.registrationDates]
    .filter(Boolean)
    .join(" ")

  const sport =
    sports.find((s) => s.name.toLowerCase() === row.sportName?.trim().toLowerCase()) ??
    sports.find((s) => s.slug === row.sportName?.trim().toLowerCase().replace(/[^a-z]+/g, "-"))

  const [minGrade, maxGrade] = range(row.eligibility, /grades?/)
  const [minAge, maxAge] = range(row.eligibility, /ages?/)

  const regDates = [...(row.registrationDates ?? "").matchAll(ISO_DATE)].map((m) => m[1])
  const isCamp = /\bcamps?\b/i.test(row.programName) || sport?.slug === "camps-enrichment"
  const season = guessSeason(text)
  const yearMatch =
    row.programName.match(/20\d{2}/) ?? row.comments?.match(/\b20\d{2}\b/) ?? regDates.at(-1)?.match(/20\d{2}/)
  const fee = row.comments?.match(/\$(\d[\d,]*(?:\.\d{2})?)/)

  return {
    id: row.id,
    submittedAt: row.submittedAt.toISOString(),
    submitterEmail: row.submitterEmail,
    organizationName: row.organizationName,
    sportName: row.sportName,
    programName: row.programName,
    eligibility: row.eligibility,
    registrationDates: row.registrationDates,
    registrationUrl: row.registrationUrl,
    sourceUrl: row.sourceUrl,
    comments: row.comments,
    status: row.status,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewedBy: row.reviewedBy,
    draft: {
      title: row.programName,
      description: row.comments ?? "",
      organizationName: row.organizationName,
      town: "",
      state: "VT",
      zip: "",
      venueName: "",
      venueAddress: "",
      sportSlug: sport?.slug ?? "",
      programFormat: isCamp ? "camp" : "",
      campStay: isCamp ? (/sleepaway|overnight|residential/i.test(text) ? "overnight" : "day") : "",
      campPeriod: isCamp ? guessCampPeriod(text, season) : "",
      season,
      seasonYear: yearMatch?.[0] ?? "",
      seasonStartDate: "",
      seasonEndDate: "",
      registrationOpenDate: regDates[0] ?? "",
      registrationCloseDate: regDates[1] ?? "",
      minAge,
      maxAge,
      minGrade,
      maxGrade,
      registrationFee: fee ? fee[1].replace(/,/g, "") : "",
      additionalFees: "",
      registrationUrl: row.registrationUrl ?? "",
      sourceUrl: row.sourceUrl ?? row.registrationUrl ?? "",
      contactEmail: "",
    },
  }
}
