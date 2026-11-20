import type { Metadata } from "next"
import Link from "next/link"
import { TentIcon } from "lucide-react"
import { CAMP_FOCUS_LABELS, CAMP_PERIOD_LABELS, type CampFocus } from "@openplay/core"
import { ActivityDiscovery } from "@/components/activity-discovery"
import { AppliedCampFilters } from "@/components/applied-camp-filters"
import { CampDiscoveryControls, CampFacetSelect } from "@/components/camp-discovery-controls"
import { CampResultCard } from "@/components/camp-result-card"
import { CampSortSelect } from "@/components/camp-search-bar"
import { NewsletterCta } from "@/components/newsletter-cta"
import { OutOfAreaNotice } from "@/components/out-of-area-notice"
import { TrackView } from "@/components/track-view"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { eligibilityLabel } from "@/lib/format"
import { campPeriodOf } from "@/lib/camp-format"
import { buildCampInventory, groupCampSessions, parseCampSort, sortCampGroups, type CampGroup } from "@/lib/camp-results"
import { originSummary, resolveSearchOrigin } from "@/lib/origin"
import { countActiveFilters, parseFilters, searchActivitiesNearby, type SearchParamsShape } from "@/lib/queries"

export const metadata: Metadata = {
  title: "Explore Vermont camps",
  description:
    "Browse Vermont camps by activity, town, age and school break. Compare sessions, schedules and registration in one place.",
  alternates: { canonical: "/camps" },
}
const collections = [
  ["Outdoor adventures", "outdoors", "focus", "outdoor_adventure"],
  ["Sports camps", "sports", "focus", "sports"],
  ["Arts & creativity", "arts", "focus", "arts"],
  ["Overnight camps", "overnight", "stay", "overnight"],
] as const
const groupOptions: [string, string][] = [
  ["town", "Town"],
  ["age", "Age range"],
  ["stay", "Day or overnight"],
  ["break", "School break"],
]
function groupLabel({ sessions: [s] }: CampGroup, by: string) {
  if (by === "town") return s.town || "Town not posted"
  if (by === "age") return eligibilityLabel(s).split(" · ")[0]
  if (by === "stay")
    return s.camp_stay === "day" ? "Day camps" : s.camp_stay === "overnight" ? "Overnight camps" : "Stay not posted"
  if (by === "break")
    return s.camp_period || s.season_start_date ? CAMP_PERIOD_LABELS[campPeriodOf(s)] : "Dates not posted yet"
  return CAMP_FOCUS_LABELS[s.camp_focus as CampFocus] ?? s.sport.name
}
export default async function CampsPage({ searchParams }: { searchParams: Promise<SearchParamsShape> }) {
  const params = await searchParams,
    now = new Date()
  const filters = { ...parseFilters(params), format: "camp" }
  const origin = await resolveSearchOrigin({ zip: filters.zip, near: params.near })
  const nearby = await searchActivitiesNearby(filters, now, origin)
  const sort = parseCampSort(typeof params.sort === "string" ? params.sort : null)
  const inventory = buildCampInventory(nearby.results, now)
  const confirmed = sortCampGroups(groupCampSessions(inventory.upcoming), sort, now)
  const soonKeys = new Set(inventory.comingSoon.map((g) => g.key))
  const groups = [...confirmed, ...inventory.comingSoon.sort((a, b) => a.title.localeCompare(b.title))]
  const active = countActiveFilters(filters)
  const query: Record<string, string> = Object.fromEntries(
    Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string"),
  )
  const href = (key?: string, value?: string) => {
    const q = new URLSearchParams(query)
    if (key) {
      if (!value || q.get(key) === value) q.delete(key)
      else q.set(key, value)
    }
    return `/camps${q.size ? `?${q}` : ""}`
  }
  const by = query.group || "activity"
  const sections = new Map<string, typeof groups>()
  for (const g of groups) {
    const label = sort === "best" ? groupLabel(g, by) : "Matching camps"
    const bucket = sections.get(label) ?? []
    bucket.push(g)
    sections.set(label, bucket)
  }
  const cards = (items: typeof groups) => (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((g) => (
        <li key={g.key}>
          <CampResultCard group={g} now={now} returnTo={href()} comingSoon={soonKeys.has(g.key)} />
        </li>
      ))}
    </ul>
  )
  return (
    <ActivityDiscovery
      eyebrow="Vermont field guide"
      title="Explore Vermont camps"
      description="Start with what they love. Then find a town, a week, and a camp that fits."
      collections={collections.map(([title, image, key, value]) => ({
        title,
        image: `/images/camp-${image}.webp`,
        href: href(key, value),
        active: query[key] === value,
      }))}
      filters={<CampDiscoveryControls origin={originSummary(origin)} count={groups.length} />}
    >
      <TrackView
        discoveryOrigin="camps"
        event="search_results_viewed"
        payload={{ result_count: groups.length, sport: null, season: filters.period, has_filters: active > 0 }}
      />
      <AppliedCampFilters params={query} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight" aria-live="polite">
            {groups.length} {groups.length === 1 ? "camp" : "camps"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {nearby.widened ? "Across Vermont" : `Within ${filters.radius} miles of ${origin.label}`}
            {inventory.comingSoon.length > 0 && ` · ${confirmed.length} with dates, ${inventory.comingSoon.length} coming soon`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {sort === "best" && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Group by</span>
              <CampFacetSelect field="group" label="Activity type" options={groupOptions} />
            </div>
          )}
          <CampSortSelect />
        </div>
      </div>
      {nearby.widened && <OutOfAreaNotice place={origin.label} radius={filters.radius} noun="camps" />}
      {sections.size === 0 ? (
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TentIcon />
            </EmptyMedia>
            <EmptyTitle>No upcoming camps match</EmptyTitle>
            <EmptyDescription>
              {active
                ? "Try another collection or clear your filters."
                : "Upcoming sessions will appear here when camps post their schedules."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex gap-4 text-sm font-semibold text-primary">
              {active > 0 && (
                <Link href="/camps" className="underline">
                  Clear filters
                </Link>
              )}
              <Link href="/submit" className="underline">
                Submit a camp
              </Link>
            </div>
          </EmptyContent>
        </Empty>
      ) : (
        [...sections].map(([name, items]) => (
          <section key={name} aria-label={name}>
            <h2 className="mb-3 font-display text-xl font-bold">{name}</h2>
            {cards(items)}
          </section>
        ))
      )}
      <NewsletterCta
        source="camps_page"
        headingId="camps-newsletter"
        eyebrow="Camp alerts"
        title="Hear when new sessions open"
        description="Get Vermont vacation-week and summer camp updates by email."
      />
    </ActivityDiscovery>
  )
}
