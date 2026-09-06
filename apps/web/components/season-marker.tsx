import { seasonIcons, seasonTone } from "@/components/season-icons"
import { seasonLabels } from "@/lib/labels"
import type { Season } from "@/lib/types"
import { cn } from "@/lib/utils"

const toneClasses: Record<string, string> = {
  "chart-1": "bg-chart-1/15 text-chart-1 ring-chart-1/25",
  "chart-2": "bg-chart-2/15 text-chart-2 ring-chart-2/25",
  "chart-3": "bg-chart-3/20 text-chart-3 ring-chart-3/30",
  "chart-4": "bg-chart-4/15 text-chart-4 ring-chart-4/25",
  "chart-5": "bg-chart-5/15 text-chart-5 ring-chart-5/25",
}

const iconSizeClasses: Record<"default" | "sm" | "lg", string> = {
  sm: "size-4",
  default: "size-5",
  lg: "size-7",
}

/**
 * Color-coded season marker, following the same pattern as `SportMarker`: a
 * consistent glyph and color for each season across the homepage, sport and
 * organization pages, and search filter chips.
 */
export function SeasonMarker({
  season,
  size = "default",
  className,
}: {
  season: Season
  size?: "default" | "sm" | "lg"
  className?: string
}) {
  const tone = toneClasses[seasonTone[season]]
  const SeasonIcon = seasonIcons[season]
  return (
    <span
      title={seasonLabels[season]}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
        size === "sm" && "size-8",
        size === "default" && "size-11",
        size === "lg" && "size-14",
        tone,
        className,
      )}
    >
      <span className="sr-only">{seasonLabels[season]}</span>
      <SeasonIcon aria-hidden="true" className={iconSizeClasses[size]} />
    </span>
  )
}
