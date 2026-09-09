import { CalendarDaysIcon } from "lucide-react"
import { SeasonMarker } from "@/components/season-marker"
import { SportMarker } from "@/components/sport-marker"
import type { Season, Sport } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Icon tile for a "This Week" story. Reuses `SportMarker`/`SeasonMarker` when
 * a story is tied to one — the same glyph a parent already recognizes from
 * search and activity pages — and falls back to a neutral calendar tile for
 * stories that span more than one sport (e.g. a broad seasonal roundup).
 */
export function WeeklyStoryMarker({
  sport,
  season,
  size = "default",
  className,
}: {
  sport: Sport | null
  season: Season | null
  size?: "default" | "sm" | "lg"
  className?: string
}) {
  if (sport) return <SportMarker slug={sport.slug} name={sport.name} size={size} className={className} />
  if (season) return <SeasonMarker season={season} size={size} className={className} />

  const iconSizeClasses: Record<"default" | "sm" | "lg", string> = {
    sm: "size-4",
    default: "size-5",
    lg: "size-7",
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground ring-1 ring-inset ring-accent/40",
        size === "sm" && "size-8",
        size === "default" && "size-11",
        size === "lg" && "size-14",
        className,
      )}
    >
      <span className="sr-only">This week</span>
      <CalendarDaysIcon aria-hidden="true" className={iconSizeClasses[size]} />
    </span>
  )
}
