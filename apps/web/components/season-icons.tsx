import type { ComponentType, SVGProps } from "react"
import { Flower2, Leaf, Snowflake, Sun } from "lucide-react"
import type { Season } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Season iconography, mirroring `sport-icons.tsx`. Lucide already ships an
 * exact match for all four seasons (a leaf, a snowflake, a flower, a sun), so
 * nothing needs to be hand-drawn here — they're reused as-is to stay
 * pixel-consistent with every other icon in the app.
 */
export const seasonIcons: Record<Season, ComponentType<SVGProps<SVGSVGElement>>> = {
  fall: Leaf,
  winter: Snowflake,
  spring: Flower2,
  summer: Sun,
}

/**
 * Season marker color, drawn from the same chart tokens as `sportTone` so no
 * new colors enter the palette. Chosen for the seasonal association: amber
 * for foliage, cyan for ice, green for bloom, blue for summer sky/water.
 */
export const seasonTone: Record<Season, string> = {
  fall: "chart-3",
  winter: "chart-5",
  spring: "chart-2",
  summer: "chart-1",
}

const toneTextClasses: Record<string, string> = {
  "chart-1": "text-chart-1",
  "chart-2": "text-chart-2",
  "chart-3": "text-chart-3",
  "chart-4": "text-chart-4",
  "chart-5": "text-chart-5",
}

/** Bare, color-coded season glyph for inline use (e.g. alongside other small icons on `ActivityCard`). */
export function SeasonIcon({ season, className, ...props }: SVGProps<SVGSVGElement> & { season: Season }) {
  const Icon = seasonIcons[season]
  return <Icon className={cn(toneTextClasses[seasonTone[season]], className)} {...props} />
}
