import { sportTone } from "@/lib/data/sports"
import { GenericActivityIcon, sportIcons } from "@/components/sport-icons"
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
 * Color-coded sport marker. The sport is the first thing a parent scans for,
 * so it gets a consistent glyph (icon, not a two-letter monogram) across
 * every surface.
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
  const SportIcon = sportIcons[slug] ?? GenericActivityIcon
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
        size === "sm" && "size-8",
        size === "default" && "size-11",
        size === "lg" && "size-14",
        tone,
        className,
      )}
    >
      <span className="sr-only">{name}</span>
      <SportIcon aria-hidden="true" className={iconSizeClasses[size]} />
    </span>
  )
}
