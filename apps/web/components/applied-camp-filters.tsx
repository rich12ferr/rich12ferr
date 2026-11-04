import Link from "next/link"
import { XIcon } from "lucide-react"
import {
  CAMP_FOCUS_LABELS,
  CAMP_PERIOD_LABELS,
  CAMP_STAY_LABELS,
  DAY_LENGTH_LABELS,
  SESSION_LENGTH_LABELS,
  type CampFocus,
  type CampPeriod,
  type CampStay,
  type DayLength,
  type SessionLength,
} from "@openplay/core"
import { formatShortDate } from "@/lib/registration-status"

type Params = Record<string, string | undefined>

function chipLabel(key: string, value: string, params: Params): string | null {
  switch (key) {
    case "period":
      return CAMP_PERIOD_LABELS[value as CampPeriod] ?? null
    case "age":
      return `Age ${value}`
    case "grade":
      return value === "0" ? "Kindergarten" : `Grade ${value}`
    case "town":
      return value
    case "zip":
      return `Near ${value}`
    case "near":
      return "Near my location"
    case "radius":
      return `Within ${value} mi`
    case "focus":
      return CAMP_FOCUS_LABELS[value as CampFocus] ?? null
    case "stay":
      return CAMP_STAY_LABELS[value as CampStay] ?? null
    case "length":
      return DAY_LENGTH_LABELS[value as DayLength] ?? SESSION_LENGTH_LABELS[value as SessionLength] ?? null
    case "coverage":
      return "Full workday"
    case "from":
      return `From ${formatShortDate(value)}`
    case "to":
      return params.from ? null : `Until ${formatShortDate(value)}`
    case "past":
      return "Including past sessions"
    default:
      return null
  }
}

const CHIP_KEYS = ["period", "age", "grade", "town", "zip", "near", "radius", "focus", "stay", "length", "coverage", "from", "to", "past"]

/** Every applied filter as a removable chip, plus one Clear all (PRD R2). */
export function AppliedCampFilters({ params }: { params: Params }) {
  const chips = CHIP_KEYS.flatMap((key) => {
    const value = params[key]
    if (!value || value === "any") return []
    const label = key === "from" && params.to ? `${formatShortDate(value)} \u2013 ${formatShortDate(params.to)}` : chipLabel(key, value, params)
    if (!label) return []
    const next = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (!v || k === key || (key === "from" && k === "to")) continue
      next.set(k, v)
    }
    const query = next.toString()
    return [{ key, label, href: `/camps${query ? `?${query}` : ""}` }]
  })

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="sr-only">Applied filters:</span>
      <ul className="contents">
        {chips.map((chip) => (
          <li key={chip.key}>
            <Link
              href={chip.href}
              scroll={false}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {chip.label}
              <XIcon className="size-3.5" aria-hidden="true" />
              <span className="sr-only">(remove filter)</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/camps"
        scroll={false}
        className="inline-flex min-h-9 items-center px-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        Clear all
      </Link>
    </div>
  )
}
