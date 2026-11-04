import Link from "next/link"
import type { CampPeriod } from "@openplay/core"
import { cn } from "@/lib/utils"

const PERIOD_PICK_LABELS: Partial<Record<CampPeriod, string>> = {
  fall_break: "Fall break",
  winter_break: "Winter break",
  february_break: "February break",
  april_break: "April break",
  summer: "Summer",
}

const FACET_PICKS = [
  { label: "Day camps", key: "stay", value: "day" },
  { label: "Overnight", key: "stay", value: "overnight" },
  { label: "Sports", key: "focus", value: "sports" },
  { label: "Arts", key: "focus", value: "arts" },
  { label: "STEM", key: "focus", value: "stem" },
  { label: "Outdoor", key: "focus", value: "outdoor_adventure" },
] as const

/**
 * One-tap entry points. Each chip toggles a single facet on the current URL,
 * so picks combine ("Summer" + "Arts") and stay shareable. Breaks are listed
 * soonest-first so the next school vacation leads.
 */
export function CampQuickPicks({
  params,
  periodOrder,
}: {
  params: Record<string, string | undefined>
  periodOrder: CampPeriod[]
}) {
  const PICKS = [
    ...periodOrder.flatMap((value) => {
      const label = PERIOD_PICK_LABELS[value]
      return label ? [{ label, key: "period", value }] : []
    }),
    ...FACET_PICKS,
  ]
  return (
    <nav aria-label="Quick camp filters" className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {PICKS.map((pick) => {
          const active = params[pick.key] === pick.value
          const next = new URLSearchParams()
          for (const [k, v] of Object.entries(params)) if (v) next.set(k, v)
          if (active) next.delete(pick.key)
          else next.set(pick.key, pick.value)
          const query = next.toString()
          return (
            <li key={`${pick.key}-${pick.value}`}>
              <Link
                href={`/camps${query ? `?${query}` : ""}`}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/60",
                )}
              >
                {pick.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
