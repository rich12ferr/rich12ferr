import type { Season } from "./enums"

/**
 * Sport taxonomy. Seeded into the `sports` table, but kept here as the canonical
 * source so mobile and ingestion share one vocabulary (including the synonym
 * lists that make "XC" and "cross country" the same query).
 */

export type Sport = {
  id: string
  slug: string
  name: string
  /** Two-letter monogram used as the sport marker across the UI today. */
  monogram: string
  /**
   * Stable, platform-neutral icon identifier. Deliberately NOT a component or an
   * asset path: apps/web maps this to an SVG and a future Expo app maps it to a
   * native asset, from the same key.
   *
   * FUTURE SCOPE: sport-specific iconography rendered beside the sport name in
   * Browse > All sports and By sport, replacing the monogram. Tracked in
   * docs/roadmap.md ("Sport iconography").
   */
  icon_key: string
  /** Theme token for the sport marker, resolved per platform. */
  tone: string
  /** Season the sport is most commonly offered in. */
  primary_seasons: Season[]
  blurb: string
  /** Alternate names parents actually type. Feeds query expansion in search. */
  synonyms: string[]
}

export const SPORTS: Sport[] = [
  {
    id: "sp_baseball",
    slug: "baseball",
    name: "Baseball",
    monogram: "BB",
    icon_key: "sport.baseball",
    tone: "chart-1",
    primary_seasons: ["spring", "summer"],
    blurb: "Little League through middle school travel ball.",
    synonyms: ["little league", "t-ball", "tball", "hardball"],
  },
  {
    id: "sp_basketball",
    slug: "basketball",
    name: "Basketball",
    monogram: "BK",
    icon_key: "sport.basketball",
    tone: "chart-3",
    primary_seasons: ["winter"],
    blurb: "Rec leagues, school teams, and skills clinics.",
    synonyms: ["hoops", "bball"],
  },
  {
    id: "sp_cross_country",
    slug: "cross-country",
    name: "Cross Country",
    monogram: "XC",
    icon_key: "sport.cross-country",
    tone: "chart-2",
    primary_seasons: ["fall"],
    blurb: "Trail and course running for all paces.",
    synonyms: ["xc", "cross country", "distance running"],
  },
  {
    id: "sp_field_hockey",
    slug: "field-hockey",
    name: "Field Hockey",
    monogram: "FH",
    icon_key: "sport.field-hockey",
    tone: "chart-4",
    primary_seasons: ["fall"],
    blurb: "Grass and turf stick skills for school and rec teams.",
    synonyms: [],
  },
  {
    id: "sp_flag_football",
    slug: "flag-football",
    name: "Flag Football",
    monogram: "FF",
    icon_key: "sport.flag-football",
    tone: "chart-5",
    primary_seasons: ["fall"],
    blurb: "No-contact football for younger players.",
    synonyms: ["flag", "non-contact football"],
  },
  {
    id: "sp_football",
    slug: "football",
    name: "Football",
    monogram: "FB",
    icon_key: "sport.football",
    tone: "chart-4",
    primary_seasons: ["fall"],
    blurb: "Tackle football with required equipment.",
    synonyms: ["tackle football", "pop warner"],
  },
  {
    id: "sp_hockey",
    slug: "hockey",
    name: "Hockey",
    monogram: "HK",
    icon_key: "sport.hockey",
    tone: "chart-5",
    primary_seasons: ["winter"],
    blurb: "Learn-to-skate through travel teams.",
    synonyms: ["ice hockey", "learn to skate"],
  },
  {
    id: "sp_ice_skating",
    slug: "ice-skating",
    name: "Ice Skating",
    monogram: "IS",
    icon_key: "sport.ice-skating",
    tone: "chart-5",
    primary_seasons: ["winter", "summer"],
    blurb: "Learn-to-skate lessons and figure skating on the ice.",
    synonyms: ["figure skating", "skating"],
  },
  {
    id: "sp_lacrosse",
    slug: "lacrosse",
    name: "Lacrosse",
    monogram: "LX",
    icon_key: "sport.lacrosse",
    tone: "chart-2",
    primary_seasons: ["spring"],
    blurb: "Stick skills, rec teams, and club programs.",
    synonyms: ["lax"],
  },
  {
    id: "sp_martial_arts",
    slug: "martial-arts",
    name: "Martial Arts",
    monogram: "MA",
    icon_key: "sport.martial-arts",
    tone: "chart-1",
    primary_seasons: ["fall", "winter", "spring", "summer"],
    blurb: "Tae kwon do, karate, judo, and other striking and grappling disciplines.",
    synonyms: ["tae kwon do", "taekwondo", "karate", "judo", "jiu jitsu", "jujitsu", "kung fu", "self defense"],
  },
  {
    id: "sp_soccer",
    slug: "soccer",
    name: "Soccer",
    monogram: "SO",
    icon_key: "sport.soccer",
    tone: "chart-1",
    primary_seasons: ["fall", "spring"],
    blurb: "The most widely offered youth sport in the region.",
    synonyms: ["football club", "futbol", "futsal"],
  },
  {
    id: "sp_softball",
    slug: "softball",
    name: "Softball",
    monogram: "SB",
    icon_key: "sport.softball",
    tone: "chart-3",
    primary_seasons: ["spring", "summer"],
    blurb: "Fastpitch and modified rec softball.",
    synonyms: ["fastpitch", "slowpitch"],
  },
  {
    id: "sp_tennis",
    slug: "tennis",
    name: "Tennis",
    monogram: "TN",
    icon_key: "sport.tennis",
    tone: "chart-2",
    primary_seasons: ["summer", "spring"],
    blurb: "Lessons, ladders, and school teams.",
    synonyms: ["racquet", "racket sports"],
  },
  {
    id: "sp_track_field",
    slug: "track-and-field",
    name: "Track & Field",
    monogram: "TF",
    icon_key: "sport.track-and-field",
    tone: "chart-5",
    primary_seasons: ["spring"],
    blurb: "Sprints, distance, jumps, and throws.",
    synonyms: ["track", "athletics", "field events"],
  },
  // Added for the v3 canonical activity seed (Sign Up Vermont), which expanded
  // coverage beyond youth team sports into adult leagues, camps, and adaptive programs.
  {
    id: "sp_volleyball",
    slug: "volleyball",
    name: "Volleyball",
    monogram: "VB",
    icon_key: "sport.volleyball",
    tone: "chart-3",
    primary_seasons: ["fall", "winter"],
    blurb: "Rec leagues, school teams, and skills clinics, indoor and sand.",
    synonyms: ["indoor volleyball", "sand volleyball"],
  },
  {
    id: "sp_gymnastics",
    slug: "gymnastics",
    name: "Gymnastics",
    monogram: "GY",
    icon_key: "sport.gymnastics",
    tone: "chart-2",
    primary_seasons: ["fall", "winter", "spring", "summer"],
    blurb: "Tumbling, beam, bars, and vault from preschool through competitive levels.",
    synonyms: ["tumbling"],
  },
  {
    id: "sp_swimming",
    slug: "swimming",
    name: "Swimming",
    monogram: "SW",
    icon_key: "sport.swimming",
    tone: "chart-1",
    primary_seasons: ["summer"],
    blurb: "Swim lessons, lifeguard-taught fundamentals, and competitive swim teams.",
    synonyms: ["swim lessons", "swim team", "aquatics"],
  },
  {
    id: "sp_mountain_biking",
    slug: "mountain-biking",
    name: "Mountain Biking",
    monogram: "MB",
    icon_key: "sport.mountain-biking",
    tone: "chart-4",
    primary_seasons: ["summer", "fall"],
    blurb: "Trail skills clinics and camps for riders of all levels.",
    synonyms: ["mtb", "trail riding"],
  },
  {
    id: "sp_sled_hockey",
    slug: "sled-hockey",
    name: "Sled Hockey",
    monogram: "SH",
    icon_key: "sport.sled-hockey",
    tone: "chart-5",
    primary_seasons: ["winter"],
    blurb: "Adaptive ice hockey played from sleds, for skaters with physical disabilities.",
    synonyms: ["adaptive hockey", "para hockey", "sledge hockey"],
  },
  {
    id: "sp_ultimate_frisbee",
    slug: "ultimate-frisbee",
    name: "Ultimate Frisbee",
    monogram: "UF",
    icon_key: "sport.ultimate-frisbee",
    tone: "chart-2",
    primary_seasons: ["spring", "summer", "fall"],
    blurb: "Non-contact disc sport played at camps, in rec leagues, and on club teams.",
    synonyms: ["ultimate", "disc sports"],
  },
  {
    id: "sp_camps_enrichment",
    slug: "camps-enrichment",
    name: "Camps & Enrichment",
    monogram: "CE",
    icon_key: "sport.camps-enrichment",
    tone: "chart-3",
    primary_seasons: ["summer"],
    blurb:
      "General day camps, STEM camps, and other enrichment programs that aren't organized around a single sport.",
    synonyms: ["day camp", "stem camp", "specialty camp", "vacation camp", "multi-sport camp"],
  },
  // Added for the winter v3.1 canonical activity seed (Sign Up Vermont), which
  // expanded coverage into Nordic/alpine ski clubs, ski academies, and
  // biathlon that the original v3 seed had no taxonomy for.
  {
    id: "sp_alpine_skiing",
    slug: "alpine-skiing",
    name: "Alpine Skiing",
    monogram: "AL",
    icon_key: "sport.alpine-skiing",
    tone: "chart-5",
    primary_seasons: ["winter"],
    blurb: "Downhill ski racing and development teams, from learn-to-race through FIS.",
    synonyms: ["downhill skiing", "ski racing", "ski team", "vara"],
  },
  {
    id: "sp_nordic_skiing",
    slug: "nordic-skiing",
    name: "Nordic Skiing",
    monogram: "NS",
    icon_key: "sport.nordic-skiing",
    tone: "chart-2",
    primary_seasons: ["winter"],
    blurb: "Cross-country ski clubs and race programs, from Bill Koch League through masters.",
    synonyms: ["cross country skiing", "xc skiing", "classic skiing", "skate skiing", "bill koch league", "bkl"],
  },
  {
    id: "sp_snowboarding",
    slug: "snowboarding",
    name: "Snowboarding",
    monogram: "SN",
    icon_key: "sport.snowboarding",
    tone: "chart-4",
    primary_seasons: ["winter"],
    blurb: "Freeride and competitive snowboard teams.",
    synonyms: ["ride team", "snowboard team"],
  },
  {
    id: "sp_freestyle_skiing",
    slug: "freestyle-skiing",
    name: "Freestyle Skiing",
    monogram: "FR",
    icon_key: "sport.freestyle-skiing",
    tone: "chart-3",
    primary_seasons: ["winter"],
    blurb: "Freeski and freestyle programs for park, moguls, and slopestyle.",
    synonyms: ["freeski", "freeskiing", "park and pipe", "freestyle"],
  },
  {
    id: "sp_biathlon",
    slug: "biathlon",
    name: "Biathlon",
    monogram: "BI",
    icon_key: "sport.biathlon",
    tone: "chart-1",
    primary_seasons: ["winter"],
    blurb: "Cross-country skiing combined with rifle marksmanship.",
    synonyms: [],
  },
  {
    id: "sp_snow_sports",
    slug: "snow-sports",
    name: "Snow Sports",
    monogram: "SS",
    icon_key: "sport.snow-sports",
    tone: "chart-2",
    primary_seasons: ["winter"],
    blurb:
      "Multi-discipline ski academy winter terms and learn-to-ski/snowboard instruction spanning more than one snow sport.",
    synonyms: ["ski academy", "winter term", "learn to ski", "learn to snowboard", "learn to ride"],
  },
]

export function getSport(id: string): Sport | undefined {
  return SPORTS.find((s) => s.id === id)
}

export function getSportBySlug(slug: string): Sport | undefined {
  return SPORTS.find((s) => s.slug === slug)
}

/**
 * Resolves a free-text fragment to sports, matching name, slug, and synonyms.
 * Used for query expansion so "XC" finds Cross Country.
 */
export function matchSports(query: string): Sport[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return SPORTS.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.slug.includes(q) ||
      s.monogram.toLowerCase() === q ||
      s.synonyms.some((syn) => syn.includes(q) || q.includes(syn)),
  )
}

/** Legacy lookups kept so existing UI keeps compiling during the migration. */
export const sportMonograms: Record<string, string> = Object.fromEntries(
  SPORTS.map((s) => [s.slug, s.monogram]),
)

export const sportTone: Record<string, string> = Object.fromEntries(
  SPORTS.map((s) => [s.slug, s.tone]),
)

/** Icon key by slug — the lookup the future iconography component will consume. */
export const sportIconKeys: Record<string, string> = Object.fromEntries(
  SPORTS.map((s) => [s.slug, s.icon_key]),
)
