// This module reaches the database, so importing it from a Client Component
// would pull the Postgres driver into the browser bundle. Fails fast with a
// clear message instead of the opaque "Can't resolve 'net'" build error.
// Display labels live in `lib/labels.ts`, which is safe to import anywhere.
import "server-only"

import {
  adminCounts,
  closingSoonOfferings,
  listOrganizations,
  listSports,
  listTowns,
  offeringById,
  offeringsByOrganizationSlug,
  offeringsByProgramSlug,
  offeringsBySportSlug,
  organizationByIdOrSlug,
  programSlugsForStaticParams,
  recentlyOpenedOfferings,
  searchOfferings,
  type OfferingListing,
} from "@openplay/db"
import { LAUNCH_HUB, SEASONS } from "@openplay/core"
import { DEFAULT_RADIUS as DEFAULT_RADIUS_MILES } from "@/lib/labels"
import {
  CLOSING_SOON_DAYS,
  daysBetween,
  parseDate,
  registrationStatus,
  startOfDay,
} from "@/lib/registration-status"
import type {
  Activity,
  ActivityWithRelations,
  AlertTrigger,
  Organization,
  RegistrationStatus,
  Season,
  Sport,
} from "@/lib/types"

/**
 * The launch-region hub, used as the default search origin.
 *
 * Distances are now computed with real PostGIS geography rather than the
 * hand-maintained `distance_from_hub` column the prototype carried.
 */
export const HUB = { town: "Montpelier", state: "VT", zip: "05602" }

/**
 * Postgres timestamps to the plain `YYYY-MM-DD` strings the UI formats.
 *
 * Truncating to a calendar date avoids the off-by-one that appears when a
 * timestamp is rendered in a timezone behind UTC.
 */
function toDateString(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null
}

/**
 * Labels and filter constants now live in `lib/labels.ts` so Client Components
 * can import them without pulling the Postgres driver into the browser bundle.
 * Imported (not just re-exported) because this module uses DEFAULT_RADIUS
 * itself, then re-exported so existing server-side imports keep working.
 */
export {
  DEFAULT_RADIUS,
  alertTriggerLabels,
  genderLabels,
  programTypeLabels,
  seasonLabels,
  towns,
  verificationLabels,
} from "@/lib/labels"

export async function listTownNames() {
  return listTowns()
}

/** Organization id/name pairs for the "who runs it" picker on `/submit`. */
export async function organizationOptions() {
  const rows = await listOrganizations()
  return rows.map((row) => ({ id: row.id, name: row.name }))
}

/* -------------------------------------------------------------------------- */
/*  Adapter: OfferingListing -> ActivityWithRelations                         */
/* -------------------------------------------------------------------------- */

/**
 * Project a joined offering row onto the prototype's flat `Activity` shape.
 *
 * The database now models a durable `program` separately from its dated
 * `program_offering`, but every existing component reads the flattened shape.
 * Keeping this adapter means the schema split shipped without a UI rewrite,
 * and components can migrate to the richer shape incrementally.
 */
export function listingToActivity(listing: OfferingListing): ActivityWithRelations {
  const organization: Organization = {
    id: listing.organizationId,
    name: listing.organizationName,
    slug: listing.organizationSlug,
    organization_type: listing.organizationType as Organization["organization_type"],
    website_url: listing.organizationWebsite,
    town: listing.town,
    state: listing.state,
    verified: listing.organizationVerified,
  }

  const sport: Sport = {
    id: listing.sportId,
    name: listing.sportName,
    slug: listing.sportSlug,
    monogram: listing.sportMonogram,
    tone: listing.sportTone,
    icon_key: listing.sportIconKey,
    primarySeasons: listing.sportPrimarySeasons ?? [],
    blurb: listing.sportBlurb ?? "",
  }

  const activity: Activity = {
    id: listing.offeringId,
    slug: listing.programSlug,
    organization_id: listing.organizationId,
    sport_id: listing.sportId,
    program_id: listing.programId,
    title: listing.title,
    description: listing.description ?? "",
    program_type: listing.programType as Activity["program_type"],
    gender: listing.gender as Activity["gender"],
    min_age: listing.minAge,
    max_age: listing.maxAge,
    min_grade: listing.minGrade,
    max_grade: listing.maxGrade,
    season: listing.season,
    season_year: listing.seasonYear,
    registration_open_date: listing.registrationOpenDate,
    registration_close_date: listing.registrationCloseDate,
    season_start_date: listing.seasonStartDate,
    season_end_date: listing.seasonEndDate,
    registration_url: listing.registrationUrl,
    registration_provider: listing.registrationProvider,
    status_override: listing.statusOverride as Activity["status_override"],
    registration_fee: listing.registrationFee,
    currency: listing.currency,
    scholarship_available: listing.scholarshipAvailable,
    additional_fees: listing.additionalFees,
    tryout_required: listing.tryoutRequired,
    tryout_details: listing.tryoutDetails,
    tryout_date: listing.tryoutDate,
    town: listing.town,
    state: listing.state,
    zip: listing.zip,
    venue_name: listing.venueName,
    venue_address: listing.venueAddress,
    // Real geodesic distance, replacing the prototype's hardcoded value. Stays
    // null (never 0) when ungeocoded — a fallback of 0 would render as "in
    // Montpelier" for an activity that could be anywhere in the state.
    distance_from_hub: listing.distanceMiles,
    residency_requirement: listing.residencyRequirement,
    experience_level: listing.experienceLevel,
    beginner_friendly: listing.beginnerFriendly,
    equipment_requirements: listing.equipmentRequirements,
    practice_schedule: listing.practiceSchedule,
    game_schedule: listing.gameSchedule,
    capacity: listing.capacity,
    waitlist_available: listing.waitlistAvailable,
    contact_name: listing.contactName,
    contact_email: listing.contactEmail,
    contact_url: listing.contactUrl,

    // Provenance. The trust note renders these, so they are mapped explicitly
    // rather than defaulted — an empty source would silently weaken the claim.
    source_url: listing.sourceUrl ?? "",
    source_type: listing.sourceType as Activity["source_type"],
    date_discovered: toDateString(listing.dateDiscovered) ?? "",
    verification_method: listing.verificationMethod ?? "",
    verification_status: listing.offeringVerificationStatus as Activity["verification_status"],
    date_last_checked: toDateString(listing.dateLastChecked),

    published: listing.published,
    created_at: listing.createdAt.toISOString(),
    updated_at: listing.updatedAt.toISOString(),
  }

  return { ...activity, organization, sport }
}

/* -------------------------------------------------------------------------- */
/*  Reads                                                                     */
/* -------------------------------------------------------------------------- */

/** Every published offering, ordered by registration urgency. */
export async function allActivities(): Promise<ActivityWithRelations[]> {
  const rows = await searchOfferings({ origin: LAUNCH_HUB, radiusMiles: null })
  return rows.map(listingToActivity)
}

/**
 * Resolve a program slug to its most relevant offering.
 *
 * A program has many offerings across seasons, but the detail page URL is the
 * durable program slug. The newest season-year is the one a parent means when
 * they open the page, so ordering comes from the query rather than insertion
 * order. Falls back to an offering-id lookup so older links keep working.
 */
export async function activityBySlug(slug: string) {
  const rows = await offeringsByProgramSlug(slug)
  if (rows[0]) return listingToActivity(rows[0])

  const byId = await offeringById(slug)
  return byId ? listingToActivity(byId) : null
}

/**
 * Every program slug with at least one published offering, for
 * `generateStaticParams` on the activity detail page.
 */
export async function allPublishedActivitySlugs() {
  return programSlugsForStaticParams()
}

/** Lookup by offering id. Admin surfaces address a specific dated offering. */
export async function activityById(id: string) {
  const row = await offeringById(id)
  return row ? listingToActivity(row) : null
}

export async function activitiesForOrganization(slug: string) {
  const rows = await offeringsByOrganizationSlug(slug)
  return rows.map(listingToActivity)
}

export async function activitiesForSport(slug: string) {
  const rows = await offeringsBySportSlug(slug)
  return rows.map(listingToActivity)
}

/**
 * Organizations by slug, mapped to the snake_case shape the UI reads.
 *
 * The database uses camelCase columns; translating here keeps that boundary in
 * one place instead of spreading naming conversions across components.
 */
/**
 * Maps a raw (camelCase) Drizzle organizations row onto the snake_case
 * `Organization` shape the UI reads. Shared by every query that returns an
 * organization so `website_url` and friends aren't silently dropped by a
 * naive `as unknown as Organization` cast — that previously left the "visit
 * website" button unable to render on the admin organizations list even when
 * the row had a website_url.
 */
function toOrganization(row: NonNullable<Awaited<ReturnType<typeof organizationByIdOrSlug>>>): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    organization_type: row.organizationType as Organization["organization_type"],
    website_url: row.websiteUrl,
    registration_platform: row.registrationPlatform,
    contact_email: row.contactEmail,
    phone: row.phone,
    town: row.town,
    state: row.state,
    zip: row.zip,
    verified: row.verified,
    last_verified_at: row.lastVerifiedAt ? row.lastVerifiedAt.toISOString().slice(0, 10) : null,
    about: row.about,
  }
}

export async function organizationById(idOrSlug: string): Promise<Organization | null> {
  // Existing links address organizations by id; newer ones use the slug.
  // Accepting both means neither form 404s.
  const row = await organizationByIdOrSlug(idOrSlug)
  if (!row) return null
  return toOrganization(row)
}

/* -------------------------------------------------------------------------- */
/*  Search                                                                    */
/* -------------------------------------------------------------------------- */

export type SearchParamsShape = {
  q?: string
  sport?: string
  age?: string
  grade?: string
  season?: string
  town?: string
  zip?: string
  radius?: string
  gender?: string
  level?: string
  status?: string
  tryouts?: string
  cost?: string
  sort?: string
}

export type SearchFilters = {
  q: string | null
  sport: string | null
  age: number | null
  grade: number | null
  season: Season | null
  town: string | null
  zip: string | null
  radius: number
  gender: string | null
  level: string | null
  status: string | null
  tryouts: string | null
  cost: string | null
  sort: string
}

export function parseFilters(params: SearchParamsShape): SearchFilters {
  const num = (v?: string) => {
    if (!v) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return {
    q: params.q?.trim() || null,
    sport: params.sport && params.sport !== "any" ? params.sport : null,
    age: num(params.age),
    grade: num(params.grade),
    season: params.season && params.season !== "any" ? (params.season as Season) : null,
    town: params.town && params.town !== "any" ? params.town : null,
    zip: params.zip || null,
    radius: num(params.radius) ?? DEFAULT_RADIUS_MILES,
    gender: params.gender && params.gender !== "any" ? params.gender : null,
    level: params.level && params.level !== "any" ? params.level : null,
    status: params.status && params.status !== "any" ? params.status : null,
    tryouts: params.tryouts && params.tryouts !== "any" ? params.tryouts : null,
    cost: params.cost && params.cost !== "any" ? params.cost : null,
    sort: params.sort ?? "relevance",
  }
}

export type EligibilityFlag = "eligible" | "check_rules" | "no_criteria"

function inRange(value: number | null, min: number | null, max: number | null) {
  if (value === null) return null
  if (min === null && max === null) return null
  if (min !== null && value < min) return false
  if (max !== null && value > max) return false
  return true
}

/**
 * Deterministic eligibility (PRD 31). When age and grade disagree, the activity
 * is surfaced with a caution note rather than silently excluded.
 *
 * Search filters carry a loose age/grade rather than a full child profile, so
 * this stays local instead of using core's stricter `checkEligibility`, which
 * requires gender preference and a birth year.
 */
function evaluateEligibility(
  bounds: {
    minAge: number | null
    maxAge: number | null
    minGrade: number | null
    maxGrade: number | null
  },
  filters: Pick<SearchFilters, "age" | "grade">,
): { include: boolean; flag: EligibilityFlag; note: string | null } {
  const ageMatch = inRange(filters.age, bounds.minAge, bounds.maxAge)
  const gradeMatch = inRange(filters.grade, bounds.minGrade, bounds.maxGrade)

  if (ageMatch === null && gradeMatch === null) {
    return { include: true, flag: "no_criteria", note: null }
  }
  if (ageMatch === false && gradeMatch === false) {
    return { include: false, flag: "check_rules", note: null }
  }
  if (ageMatch === false || gradeMatch === false) {
    return {
      include: true,
      flag: "check_rules",
      note: "Eligibility may depend on program rules.",
    }
  }
  return { include: true, flag: "eligible", note: null }
}

export type SearchResult = ActivityWithRelations & {
  status: RegistrationStatus
  eligibility: EligibilityFlag
  eligibilityNote: string | null
}

/**
 * Run a search against the database.
 *
 * Hard filters (sport, season, town, radius, gender, cost, status) execute in
 * SQL so the database does the narrowing. Eligibility and ordering then run in
 * the shared core package, which keeps ranking identical between web and any
 * future mobile client.
 */
export async function searchActivities(
  filters: SearchFilters,
  now = new Date(),
): Promise<SearchResult[]> {
  const rows = await searchOfferings({
    query: filters.q,
    origin: LAUNCH_HUB,
    radiusMiles: filters.radius,
    sportSlugs: filters.sport ? [filters.sport] : undefined,
    season: filters.season,
    towns: filters.town ? [filters.town] : undefined,
    gender: filters.gender,
    programTypes:
      filters.level === "recreational"
        ? ["recreational", "school"]
          : filters.level === "competitive"
            ? ["competitive", "club"]
            : undefined,
    tryoutRequired: filters.tryouts === "yes" ? true : filters.tryouts === "no" ? false : null,
    freeOnly: filters.cost === "free",
  })

  const results: SearchResult[] = []

  for (const row of rows) {
    const activity = listingToActivity(row)
    const status = registrationStatus(activity, now)

    if (filters.status) {
      if (filters.status === "open" && !["open", "closing_soon"].includes(status)) continue
      if (filters.status === "upcoming" && status !== "upcoming") continue
      if (filters.status === "closing_soon" && status !== "closing_soon") continue
      if (filters.status === "not_closed" && status === "closed") continue
    }

    const eligibility = evaluateEligibility(
      {
        minAge: row.minAge,
        maxAge: row.maxAge,
        minGrade: row.minGrade,
        maxGrade: row.maxGrade,
      },
      { age: filters.age, grade: filters.grade },
    )
    if (!eligibility.include) continue

    results.push({
      ...activity,
      status,
      eligibility: eligibility.flag,
      eligibilityNote: eligibility.note,
    })
  }

  return sortResults(results, filters, now)
}

const urgencyRank: Record<RegistrationStatus, number> = {
  closing_soon: 0,
  open: 1,
  waitlist: 2,
  upcoming: 3,
  unknown: 4,
  closed: 5,
}

/**
 * Neutral ordering only (PRD 47): eligibility, then registration urgency,
 * then distance. Never ability, reputation, or paid placement.
 */
export function sortResults(results: SearchResult[], filters: SearchFilters, now = new Date()) {
  const sorted = [...results]
  if (filters.sort === "deadline") {
    return sorted.sort((a, b) => {
      const ad = parseDate(a.registration_close_date)?.getTime() ?? Number.POSITIVE_INFINITY
      const bd = parseDate(b.registration_close_date)?.getTime() ?? Number.POSITIVE_INFINITY
      return ad - bd
    })
  }
  if (filters.sort === "distance") {
    return sorted.sort(
      (a, b) =>
        (a.distance_from_hub ?? Number.POSITIVE_INFINITY) -
        (b.distance_from_hub ?? Number.POSITIVE_INFINITY),
    )
  }
  if (filters.sort === "cost") {
    return sorted.sort(
      (a, b) =>
        (a.registration_fee ?? Number.POSITIVE_INFINITY) -
        (b.registration_fee ?? Number.POSITIVE_INFINITY),
    )
  }
  return sorted.sort((a, b) => {
    const eligibilityRank = (r: SearchResult) => (r.eligibility === "check_rules" ? 1 : 0)
    if (eligibilityRank(a) !== eligibilityRank(b)) return eligibilityRank(a) - eligibilityRank(b)
    if (urgencyRank[a.status] !== urgencyRank[b.status]) return urgencyRank[a.status] - urgencyRank[b.status]
    return (a.distance_from_hub ?? Number.POSITIVE_INFINITY) - (b.distance_from_hub ?? Number.POSITIVE_INFINITY)
  })
}

export function countActiveFilters(filters: SearchFilters) {
  let count = 0
  if (filters.sport) count++
  if (filters.age !== null) count++
  if (filters.grade !== null) count++
  if (filters.season) count++
  if (filters.town) count++
  if (filters.gender) count++
  if (filters.level) count++
  if (filters.status) count++
  if (filters.tryouts) count++
  if (filters.cost) count++
  if (filters.radius !== DEFAULT_RADIUS_MILES) count++
  return count
}

/* -------------------------------------------------------------------------- */
/*  Home page collections                                                     */
/* -------------------------------------------------------------------------- */

export async function closingSoon(now = new Date(), limit = 4) {
  const rows = await closingSoonOfferings(CLOSING_SOON_DAYS, limit)
  return rows.map(listingToActivity)
}

export async function recentlyOpened(now = new Date(), limit = 4) {
  const rows = await recentlyOpenedOfferings(14, limit)
  return rows.map(listingToActivity)
}

export async function upcomingSeasonCounts(now = new Date()) {
  const list = await allActivities()
  return SEASONS.map((season) => {
    const items = list.filter((a) => a.season === season)
    const openNow = items.filter((a) =>
      ["open", "closing_soon"].includes(registrationStatus(a, now)),
    ).length
    return { season, total: items.length, openNow }
  })
}

export async function sportSummaries(now = new Date()) {
  const [sportRows, list] = await Promise.all([listSports(), allActivities()])
  return sportRows
    .map((sport) => {
      const items = list.filter((a) => a.sport_id === sport.id)
      const openNow = items.filter((a) =>
        ["open", "closing_soon"].includes(registrationStatus(a, now)),
      ).length
      return { sport: sport as unknown as Sport, total: items.length, openNow }
    })
    .sort((a, b) => b.total - a.total || a.sport.name.localeCompare(b.sport.name))
}

export async function organizationSummaries(now = new Date()) {
  const [orgRows, list] = await Promise.all([listOrganizations(), allActivities()])
  return orgRows
    .map((row) => {
      const organization = toOrganization(row)
      const items = list.filter((a) => a.organization_id === organization.id)
      const openNow = items.filter((a) =>
        ["open", "closing_soon"].includes(registrationStatus(a, now)),
      ).length
      return { organization, total: items.length, openNow }
    })
    .sort((a, b) => b.total - a.total)
}

/* -------------------------------------------------------------------------- */
/*  Calendar                                                                  */
/* -------------------------------------------------------------------------- */

export type CalendarEventKind = "registration_open" | "registration_close" | "tryout" | "season_start"

export type CalendarEvent = {
  id: string
  kind: CalendarEventKind
  date: Date
  activity: ActivityWithRelations
}

export const calendarEventLabels: Record<CalendarEventKind, string> = {
  registration_open: "Registration opens",
  registration_close: "Registration closes",
  tryout: "Tryouts / evaluations",
  season_start: "Season starts",
}

export async function calendarEvents(now = new Date()) {
  const events: CalendarEvent[] = []
  const list = await allActivities()
  for (const activity of list) {
    const push = (kind: CalendarEventKind, value: string | null) => {
      const date = parseDate(value)
      if (!date) return
      events.push({ id: `${activity.id}_${kind}`, kind, date, activity })
    }
    push("registration_open", activity.registration_open_date)
    push("registration_close", activity.registration_close_date)
    push("tryout", activity.tryout_date)
    push("season_start", activity.season_start_date)
  }
  return events
    .filter((e) => daysBetween(startOfDay(now), e.date) >= 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

export function groupEventsByMonth(events: CalendarEvent[]) {
  const groups = new Map<string, { label: string; events: CalendarEvent[] }>()
  for (const event of events) {
    const key = `${event.date.getFullYear()}-${event.date.getMonth()}`
    if (!groups.has(key)) {
      groups.set(key, {
        label: event.date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        events: [],
      })
    }
    groups.get(key)!.events.push(event)
  }
  return Array.from(groups.values())
}

/* -------------------------------------------------------------------------- */
/*  Admin metrics                                                             */
/* -------------------------------------------------------------------------- */

export async function adminMetrics(now = new Date()) {
  const [counts, all] = await Promise.all([adminCounts(30), allActivities()])
  return {
    active: counts.publishedOfferings,
    unverified: counts.unverified,
    deadlineSoon: counts.closingSoon,
    missingDates: counts.missingDates,
    stale: counts.stale,
    closingSoonWindow: CLOSING_SOON_DAYS,
    all,
  }
}
