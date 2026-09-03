import { SPORTS } from "@openplay/core"
import type { Sport } from "@/lib/types"

/**
 * Sport taxonomy, derived from the single canonical list in @openplay/core.
 *
 * This file previously held its own copy of every sport plus separate monogram
 * and tone lookup maps. That was three places to edit for one new sport, and
 * the seed script already used the core list — so the fixture could disagree
 * with the database. Deriving instead keeps one source of truth.
 */
export const sports: Sport[] = SPORTS.map((sport) => ({
  id: sport.id,
  slug: sport.slug,
  name: sport.name,
  monogram: sport.monogram,
  tone: sport.tone,
  icon_key: sport.icon_key,
  primarySeasons: sport.primary_seasons,
  blurb: sport.blurb,
}))

/** Two-letter monogram used as the sport marker across the UI. */
export const sportMonograms: Record<string, string> = Object.fromEntries(
  SPORTS.map((sport) => [sport.slug, sport.monogram]),
)

/** Sport marker color, drawn from the theme's chart/highlight tokens. */
export const sportTone: Record<string, string> = Object.fromEntries(
  SPORTS.map((sport) => [sport.slug, sport.tone]),
)

export function getSport(id: string) {
  return sports.find((s) => s.id === id)
}

export function getSportBySlug(slug: string) {
  return sports.find((s) => s.slug === slug)
}
