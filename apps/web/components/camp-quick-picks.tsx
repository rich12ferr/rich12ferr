import Link from "next/link"
import { cn } from "@/lib/utils"

const PICKS = [
  { label: "Summer", key: "period", value: "summer" },
  { label: "February break", key: "period", value: "february_break" },
  { label: "April break", key: "period", value: "april_break" },
  { label: "Winter break", key: "period", value: "winter_break" },
  { label: "Day camps", key: "stay", value: "day" },
  { label: "Overnight", key: "stay", value: "overnight" },
  { label: "Sports", key: "focus", value: "sports" },
  { label: "Arts", key: "focus", value: "arts" },
  { label: "STEM", key: "focus", value: "stem" },
  { label: "Outdoor", key: "focus", value: "outdoor_adventure" },
] as const

/**
 * One-tap entry points. Each chip toggles a single facet on the current URL,
 * so picks combine ("Summer" + "Arts") and stay shareable.
 */
export function CampQuickPicks({ params }: { params: Record<string, string | undefined> }) {
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
