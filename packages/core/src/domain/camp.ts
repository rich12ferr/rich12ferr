import type { CampFocus, CampPeriod, CampStay, SessionLength } from "./enums"

/** Slug of the catch-all sport that non-sport camps are filed under. */
export const CAMPS_ENRICHMENT_SPORT_SLUG = "camps-enrichment"

const CAMP_TITLE = /\bcamps?\b/i

/** Title-only camp detection, used when the extractor returned no format. */
export function looksLikeCamp(title: string | null | undefined): boolean {
  return !!title && CAMP_TITLE.test(title)
}

const FOCUS_KEYWORDS: Array<[CampFocus, RegExp]> = [
  ["stem", /\b(stem|steam|science|robotic|coding|code|engineer|lego|tech|math|maker)/i],
  ["arts", /\b(art|arts|theater|theatre|drama|music|dance|paint|craft|pottery|film|musical|circus)/i],
  ["outdoor_adventure", /\b(outdoor|nature|adventure|wilderness|hiking|forest|farm|paddl|kayak|canoe|explor|ecology)/i],
  ["academic", /\b(academic|reading|writing|tutor|literacy|chess|debate)/i],
  ["sports", /\b(sports?|athletic|multi-?sport)/i],
]

/** Activities filed as sports in the taxonomy that parents think of as arts. */
const ARTS_SPORT_SLUGS = new Set(["dance", "theater", "music"])

/**
 * A real sport means a sports camp (arts-like activities excepted). Under the
 * catch-all sport, fall back to title keywords, then to a traditional day camp.
 */
export function inferCampFocus(title: string, sportSlug: string | null | undefined): CampFocus {
  if (sportSlug && ARTS_SPORT_SLUGS.has(sportSlug)) return "arts"
  if (sportSlug && sportSlug !== CAMPS_ENRICHMENT_SPORT_SLUG) return "sports"
  for (const [focus, pattern] of FOCUS_KEYWORDS) if (pattern.test(title)) return focus
  return "general"
}

export function inferCampStay(text: string | null | undefined): CampStay {
  return text && /\b(overnight|residential|sleep-?away|sleepover)\b/i.test(text) ? "overnight" : "day"
}

/** Only summer is safe to infer from the season; breaks need stated text. */
export function inferCampPeriod(season: string | null | undefined): CampPeriod | null {
  return season === "summer" ? "summer" : null
}

function toUtcDay(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return Date.UTC(y, m - 1, d) / 86_400_000
}

/** Inclusive calendar-day span, or null when either date is missing. */
export function campDurationDays(start: string | null | undefined, end: string | null | undefined): number | null {
  if (!start) return null
  const days = toUtcDay(end ?? start) - toUtcDay(start) + 1
  return days >= 1 ? days : null
}

export function sessionLengthBucket(start: string | null | undefined, end: string | null | undefined): SessionLength | null {
  const days = campDurationDays(start, end)
  if (days == null) return null
  if (days === 1) return "single_day"
  if (days <= 4) return "few_days"
  if (days <= 7) return "one_week"
  return "multi_week"
}

/** A parent working 9–5 can use it: full day, or care on both ends. */
export function coversWorkday(input: {
  dayLength?: string | null
  beforeCare?: boolean | null
  afterCare?: boolean | null
}): boolean {
  return input.dayLength === "full_day" || (input.beforeCare === true && input.afterCare === true)
}

/** "08:30:00" -> "8:30", "13:00" -> "1:00". Shown as written, local time. */
export function formatCampTime(value: string | null | undefined): string | null {
  if (!value) return null
  const [h, m] = value.split(":").map(Number)
  if (Number.isNaN(h)) return null
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m ?? 0).padStart(2, "0")}`
}

export function formatCampHours(start: string | null | undefined, end: string | null | undefined): string | null {
  const s = formatCampTime(start)
  const e = formatCampTime(end)
  if (s && e) return `${s}–${e}`
  return null
}
