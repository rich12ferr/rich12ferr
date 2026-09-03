import { sportMonograms, sportTone } from "@/lib/data/sports"
import { cn } from "@/lib/utils"

const toneClasses: Record<string, string> = {
  "chart-1": "bg-chart-1/15 text-chart-1 ring-chart-1/25",
  "chart-2": "bg-chart-2/15 text-chart-2 ring-chart-2/25",
  "chart-3": "bg-chart-3/20 text-chart-3 ring-chart-3/30",
  "chart-4": "bg-chart-4/15 text-chart-4 ring-chart-4/25",
  "chart-5": "bg-chart-5/15 text-chart-5 ring-chart-5/25",
}

/**
 * Two-letter sport monogram. The sport is the first thing a parent scans for,
 * so it gets a consistent, color-coded marker across every surface.
 */
export function SportMarker({
  slug,
  name,
  size = "default",
  className,
}: {
  slug: string
  name: string
  size?: "default" | "sm" | "lg"
  className?: string
}) {
  const tone = toneClasses[sportTone[slug] ?? "chart-1"]
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl font-display font-bold tabular-nums ring-1 ring-inset",
        size === "sm" && "size-8 text-xs",
        size === "default" && "size-11 text-sm",
        size === "lg" && "size-14 text-lg",
        tone,
        className,
      )}
    >
      <span className="sr-only">{name}</span>
      <span aria-hidden="true">{sportMonograms[slug] ?? name.slice(0, 2).toUpperCase()}</span>
    </span>
  )
}
