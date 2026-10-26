import type { Metadata } from "next"
import Link from "next/link"
import { PlusIcon, TentIcon } from "lucide-react"
import { ActivityCard } from "@/components/activity-card"
import { CampFilters } from "@/components/camp-filters"
import { CampQuickPicks } from "@/components/camp-quick-picks"
import { NewsletterCta } from "@/components/newsletter-cta"
import { TrackView } from "@/components/track-view"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { resolveSearchOrigin } from "@/lib/origin"
import { countActiveFilters, parseFilters, searchActivities, sortCamps, type SearchParamsShape } from "@/lib/queries"

export const metadata: Metadata = {
  title: "Camps in central Vermont",
  description:
    "Find summer, school-break, day and overnight camps by dates, age, town, focus and daily schedule — sports, arts, STEM and outdoor adventure.",
  alternates: { canonical: "/camps" },
}

const CAMP_PARAM_KEYS = ["period", "stay", "focus", "length", "coverage", "from", "to", "age", "grade", "town", "zip"] as const

/** The next Vermont school break a parent is likely planning for. Approximate by month. */
function nextBreak(now: Date) {
  const month = now.getMonth()
  if (month === 11 && now.getDate() < 24) return "Winter break"
  if (month <= 1 && !(month === 1 && now.getDate() > 22)) return "February break"
  if (month <= 3 && !(month === 3 && now.getDate() > 22)) return "April break"
  if (month <= 7) return "Summer"
  return "Winter break"
}

export default async function CampsPage({ searchParams }: { searchParams: Promise<SearchParamsShape> }) {
  const params = await searchParams
  const now = new Date()
  const filters = { ...parseFilters(params), format: "camp" }
  const origin = await resolveSearchOrigin(filters.zip)
  const results = sortCamps(await searchActivities(filters, now, origin))

  const dated = results.filter((r) => r.season_start_date)
  const undated = results.filter((r) => !r.season_start_date)
  const openCount = results.filter((r) => r.customerState === "open").length

  const chipParams: Record<string, string | undefined> = {}
  for (const key of CAMP_PARAM_KEYS) {
    const value = params[key]
    chipParams[key] = typeof value === "string" ? value : undefined
  }
  const activeFilters = countActiveFilters(filters)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <TrackView
        discoveryOrigin="camps"
        event="search_results_viewed"
        payload={{ result_count: results.length, sport: null, season: filters.period, has_filters: activeFilters > 0 }}
      />

      <section aria-labelledby="camps-newsletter" className="mb-8">
        <NewsletterCta
          source="camps_page"
          headingId="camps-newsletter"
          eyebrow="Free camp alerts"
          title="Planning for Summer 2027?"
          description="Be the first to know when Vermont camps announce their schedules and open registration."
        />
      </section>

      <header className="mb-5 flex flex-col gap-3">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-primary uppercase">
          <TentIcon className="size-4" aria-hidden="true" />
          Camps
        </p>
        <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight text-balance">
          Find a camp that fits your calendar
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground text-pretty">
          Summer, school-break, day and overnight camps. Pick the week you need covered, then narrow by age,
          town and hours.
        </p>
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Listed</dt>
            <dd className="font-bold tabular-nums">{results.length}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Open now</dt>
            <dd className="font-bold tabular-nums">{openCount}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Next break</dt>
            <dd className="font-bold">{nextBreak(now)}</dd>
          </div>
        </dl>
      </header>

      <div className="mb-6">
        <CampQuickPicks params={chipParams} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[17.5rem_minmax(0,1fr)]">
        <aside aria-label="Camp filters" className="min-w-0">
          <CampFilters />
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <CampFilters variant="sheet" />
            {activeFilters > 0 ? (
              <Link href="/camps" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
                Clear {activeFilters} {activeFilters === 1 ? "filter" : "filters"}
              </Link>
            ) : null}
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-8">
          {results.length === 0 ? (
            <Empty className="rounded-2xl border border-border bg-card">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TentIcon />
                </EmptyMedia>
                <EmptyTitle>No camps match these filters</EmptyTitle>
                <EmptyDescription>
                  Many camps post details late. Clear a filter, or tell us about a camp we&apos;re missing.
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
          ) : null}

          {dated.length > 0 ? (
            <section aria-labelledby="camps-dated" className="flex flex-col gap-4">
              <h2 id="camps-dated" className="font-display text-lg font-bold">
                {dated.length} {dated.length === 1 ? "camp" : "camps"} with dates
              </h2>
              <ul className="flex flex-col gap-4">
                {dated.map((result) => (
                  <li key={result.id}>
                    <ActivityCard activity={result} eligibilityNote={result.eligibilityNote} now={now} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

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
              <ul className="flex flex-col gap-4">
                {undated.map((result) => (
                  <li key={result.id}>
                    <ActivityCard activity={result} eligibilityNote={result.eligibilityNote} now={now} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
