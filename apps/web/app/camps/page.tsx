import type { Metadata } from "next"
import Link from "next/link"
import { HistoryIcon, PlusIcon, TentIcon } from "lucide-react"
import { AppliedCampFilters } from "@/components/applied-camp-filters"
import { CampFilters } from "@/components/camp-filters"
import { CampQuickPicks } from "@/components/camp-quick-picks"
import { CampResultCard } from "@/components/camp-result-card"
import { CampSearchBar, CampSortSelect } from "@/components/camp-search-bar"
import { NewsletterCta } from "@/components/newsletter-cta"
import { OutOfAreaNotice } from "@/components/out-of-area-notice"
import { TrackView } from "@/components/track-view"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { CAMP_PERIOD_LABELS, type CampPeriod } from "@openplay/core"
import { CAMP_GROUP_HEADINGS, campPeriodOf, nextCampPeriod, upcomingCampPeriods } from "@/lib/camp-format"
import { groupCampSessions, isPastCampSession, parseCampSort, sortCampGroups, type CampGroup } from "@/lib/camp-results"
import { originSummary, resolveSearchOrigin } from "@/lib/origin"
import { countActiveFilters, parseFilters, searchActivitiesNearby, type SearchParamsShape } from "@/lib/queries"

export const metadata: Metadata = {
  title: "Camps in central Vermont",
  description:
    "Find camps for every Vermont school vacation and summer — fall break, winter break, February break, April break and summer weeks — by dates, age, town, focus and daily schedule.",
  alternates: { canonical: "/camps" },
}

const CAMP_PARAM_KEYS = [
  "period", "stay", "focus", "length", "coverage", "from", "to", "age", "grade", "town", "zip", "near", "radius", "sort", "past",
] as const

function newsletterTitle(period: CampPeriod, now: Date) {
  if (period === "summer") {
    const year = now.getMonth() > 7 ? now.getFullYear() + 1 : now.getFullYear()
    return `Planning for summer ${year}?`
  }
  return `Planning for ${CAMP_PERIOD_LABELS[period].toLowerCase()}?`
}

export default async function CampsPage({ searchParams }: { searchParams: Promise<SearchParamsShape> }) {
  const params = await searchParams
  const now = new Date()
  const filters = { ...parseFilters(params), format: "camp" }
  const sort = parseCampSort(typeof params.sort === "string" ? params.sort : null)
  const showPast = params.past === "1"
  const origin = await resolveSearchOrigin({ zip: filters.zip, near: params.near })
  const location = originSummary(origin)
  const nearby = await searchActivitiesNearby(filters, now, origin)

  const upcoming = nearby.results.filter((r) => !isPastCampSession(r, now))
  const past = nearby.results.filter((r) => isPastCampSession(r, now))
  const groups = sortCampGroups(groupCampSessions(upcoming), sort, now)
  const pastGroups = sortCampGroups(groupCampSessions(past), "start", now).reverse()

  const nextPeriod = nextCampPeriod(now)
  const periodOrder = upcomingCampPeriods(now)

  // Break-by-break sections only for the default view; an explicit sort or
  // a chosen break reads as one ranked list.
  const sectioned = sort === "best" && !filters.period
  const dated = groups.filter((g) => g.sessions.some((s) => s.season_start_date))
  const undated = groups.filter((g) => !g.sessions.some((s) => s.season_start_date))
  const byPeriod = new Map<CampPeriod, CampGroup[]>()
  for (const group of dated) {
    const period = campPeriodOf(group.sessions[0])
    byPeriod.set(period, [...(byPeriod.get(period) ?? []), group])
  }
  const rank = (period: CampPeriod) => {
    const index = periodOrder.indexOf(period)
    return index === -1 ? periodOrder.length : index
  }
  const sections = [...byPeriod.entries()].sort((a, b) => rank(a[0]) - rank(b[0]))

  const nextBreakMissing = sectioned && !nearby.widened && groups.length > 0 && !byPeriod.has(nextPeriod)
  const nextBreakLabel = CAMP_PERIOD_LABELS[nextPeriod].toLowerCase()

  const chipParams: Record<string, string | undefined> = {}
  for (const key of CAMP_PARAM_KEYS) {
    const value = params[key]
    chipParams[key] = typeof value === "string" ? value : undefined
  }
  const returnQuery = new URLSearchParams(
    Object.entries(chipParams).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString()
  const returnTo = `/camps${returnQuery ? `?${returnQuery}` : ""}`
  const pastToggle = new URLSearchParams(returnQuery)
  if (showPast) pastToggle.delete("past")
  else pastToggle.set("past", "1")
  const pastToggleHref = `/camps${pastToggle.toString() ? `?${pastToggle.toString()}` : ""}`

  const activeFilters = countActiveFilters(filters)
  const sessionCount = upcoming.length
  const distanceNote =
    location.source === "zip" ? `Distances from ${location.label} (${location.zip})` : `Distances from ${location.label}`

  const card = (group: CampGroup) => (
    <li key={group.key}>
      <CampResultCard group={group} now={now} returnTo={returnTo} />
    </li>
  )

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <TrackView
        discoveryOrigin="camps"
        event="search_results_viewed"
        payload={{ result_count: groups.length, sport: null, season: filters.period, has_filters: activeFilters > 0 }}
      />

      <header className="mb-5 flex flex-col gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-primary uppercase">
          <TentIcon className="size-4" aria-hidden="true" />
          Camps
        </p>
        <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight text-balance">
          Find a camp that fits your calendar
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground text-pretty">
          Every school break and summer week. Start with where, when and your child&apos;s age.
        </p>
      </header>

      <div className="mb-4">
        <CampSearchBar origin={location} />
      </div>

      <div className="mb-6 flex flex-col gap-3">
        <CampQuickPicks params={chipParams} periodOrder={periodOrder} />
        <AppliedCampFilters params={chipParams} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[17.5rem_minmax(0,1fr)]">
        <aside aria-label="More camp filters" className="min-w-0">
          <CampFilters origin={location} />
          <div className="lg:hidden">
            <CampFilters variant="sheet" origin={location} resultCount={groups.length} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="font-display text-lg font-bold" aria-live="polite">
                {groups.length} {groups.length === 1 ? "camp" : "camps"}
                {sessionCount > groups.length ? (
                  <span className="font-sans text-sm font-normal text-muted-foreground">{` \u00b7 ${sessionCount} sessions`}</span>
                ) : null}
              </p>
              <p className="text-sm text-muted-foreground">{distanceNote}</p>
            </div>
            <CampSortSelect />
          </div>

          {nearby.widened ? <OutOfAreaNotice place={origin.label} radius={filters.radius} noun="camps" /> : null}

          {nextBreakMissing ? (
            <div role="status" className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
              <TentIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-display text-base font-bold text-foreground text-balance">
                  No {nextBreakLabel} camps within {filters.radius} miles of {origin.label} yet
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  The camps below are for later breaks. Change where you&apos;re searching from, or{" "}
                  <Link
                    href={`/camps?period=${nextPeriod}&radius=75`}
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    see {nextBreakLabel} camps across Vermont
                  </Link>
                  .
                </p>
              </div>
            </div>
          ) : null}

          {groups.length === 0 ? (
            <Empty className="rounded-2xl border border-border bg-card">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TentIcon />
                </EmptyMedia>
                <EmptyTitle>No upcoming camps match these filters</EmptyTitle>
                <EmptyDescription>
                  Many camps post details late. Remove a filter above, or tell us about a camp we&apos;re missing.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button render={<Link href="/camps" />} nativeButton={false} variant="outline">
                    Clear all filters
                  </Button>
                  <Button render={<Link href="/submit" />} nativeButton={false}>
                    <PlusIcon data-icon="inline-start" />
                    Submit a camp
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          ) : sectioned ? (
            <>
              {sections.map(([period, items]) => (
                <section key={period} aria-labelledby={`camps-${period}`} className="flex flex-col gap-4">
                  <h2 id={`camps-${period}`} className="flex items-baseline gap-2 font-display text-lg font-bold">
                    {CAMP_GROUP_HEADINGS[period]}
                    <span className="text-sm font-semibold text-muted-foreground tabular-nums">{items.length}</span>
                  </h2>
                  <ul className="flex flex-col gap-4">{items.map(card)}</ul>
                </section>
              ))}
              {undated.length > 0 ? (
                <section aria-labelledby="camps-undated" className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <h2 id="camps-undated" className="font-display text-lg font-bold">
                      Dates not posted yet
                    </h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      These camps match everything else. Check the program page for this year&apos;s weeks.
                    </p>
                  </div>
                  <ul className="flex flex-col gap-4">{undated.map(card)}</ul>
                </section>
              ) : null}
            </>
          ) : (
            <ul className="flex flex-col gap-4">{groups.map(card)}</ul>
          )}

          {past.length > 0 ? (
            <section aria-labelledby="camps-past" className="flex flex-col gap-4 border-t border-border pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="camps-past" className="flex items-center gap-2 font-display text-base font-bold text-muted-foreground">
                  <HistoryIcon className="size-4" aria-hidden="true" />
                  {past.length} past {past.length === 1 ? "session" : "sessions"}
                </h2>
                <Link
                  href={pastToggleHref}
                  scroll={false}
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {showPast ? "Hide past sessions" : "Show past sessions"}
                </Link>
              </div>
              {showPast ? <ul className="flex flex-col gap-4 opacity-80">{pastGroups.map(card)}</ul> : null}
            </section>
          ) : null}

          <section aria-labelledby="camps-newsletter" className="mt-2">
            <NewsletterCta
              source="camps_page"
              headingId="camps-newsletter"
              eyebrow="Free camp alerts"
              title={newsletterTitle(nextPeriod, now)}
              description="Be the first to know when Vermont camps post vacation-week and summer schedules and open registration."
            />
          </section>
        </div>
      </div>
    </div>
  )
}
