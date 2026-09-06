import Link from "next/link"
import { ArrowRightIcon, BellIcon, CalendarDaysIcon, PlusIcon } from "lucide-react"
import { ActivityCard } from "@/components/activity-card"
import { CalendarEventRow } from "@/components/calendar-event-row"
import { QuickSearch } from "@/components/quick-search"
import { SeasonMarker } from "@/components/season-marker"
import { SectionHeading } from "@/components/section-heading"
import { SportMarker } from "@/components/sport-marker"
import { Button } from "@/components/ui/button"
import {
  allActivities,
  closingSoon,
  organizationSummaries,
  recentlyOpened,
  seasonLabels,
  seasonStartsInCurrentMonth,
  sportSummaries,
  upcomingSeasonCounts,
} from "@/lib/queries"

/**
 * Registration status and "checked N days ago" are computed from the current
 * time, so this page must not be frozen at build time. Re-rendered at most
 * every 5 minutes — well inside the day-level granularity of a deadline.
 */
export const revalidate = 300

export default async function HomePage() {
  const now = new Date()
  // Youth is the priority scope for every homepage count and browse list
  // (PRD: youth-only is the default). Family/adult programs stay reachable
  // through the search page's audience filter.
  const YOUTH = ["youth"]
  // Issued together: these six reads are independent, so serialising them would
  // add six round trips to the database for no reason.
  const [deadlines, opened, sportRows, seasons, all, orgRows] = await Promise.all([
    closingSoon(now),
    recentlyOpened(now),
    sportSummaries(now, YOUTH),
    upcomingSeasonCounts(now, YOUTH),
    allActivities(YOUTH),
    organizationSummaries(now, YOUTH),
  ])
  const total = all.length
  const orgCount = orgRows.length
  // Only queried on the empty path — the common case (deadlines exist) never
  // pays for this extra read.
  const monthStarts = deadlines.length === 0 ? await seasonStartsInCurrentMonth(now) : []
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  return (
    <div className="flex flex-col">
      {/* Hero — full-bleed looping video montage, dark scrim for text legibility over
          moving footage, poster frame as the low-data / legacy-browser fallback. */}
      <section className="relative isolate flex min-h-[34rem] items-center overflow-hidden border-b border-border sm:min-h-[38rem]">
        <video
          className="absolute inset-0 -z-10 size-full object-cover"
          poster="/images/hero-poster.png"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/videos/hero-montage.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 -z-10 bg-black/50" aria-hidden="true" />

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:py-16">
          <div className="flex max-w-3xl flex-col gap-4">
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-highlight px-3 py-1 text-xs font-semibold text-highlight-foreground">
              Starting in Central Vermont
            </p>
            <h1 className="font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-balance text-white sm:text-5xl lg:text-6xl">
              Vermont activities, without the signup scramble.
            </h1>
            <p className="text-lg leading-relaxed text-white/90 text-pretty">
              Search sports, camps, arts, and community recreation. Get email alerts when registration
              opens or a deadline is coming.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            <QuickSearch />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/80">
              <span className="font-medium text-white">Popular right now:</span>
              {sportRows.slice(0, 5).map(({ sport }) => (
                <Link
                  key={sport.slug}
                  href={`/search?sport=${sport.slug}`}
                  className="underline decoration-white/40 underline-offset-4 hover:text-white hover:decoration-white"
                >
                  {sport.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Directory stats — moved below the search so the hero leads with the search itself */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6">
        <p className="leading-relaxed text-muted-foreground text-pretty">
          {total} youth programs from {orgCount} local schools, rec departments, leagues, and clubs
          &mdash; sports, camps, arts, and community recreation together in one place.
        </p>
      </section>

      {/* Deadlines — the signature section */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <SectionHeading
          eyebrow="Don't miss these"
          title="Registration closing soon"
          description="Deadlines inside the next two weeks, soonest first."
          action={
            <Button render={<Link href="/calendar" />} nativeButton={false} variant="outline" size="sm">
              <CalendarDaysIcon data-icon="inline-start" />
              Full calendar
            </Button>
          }
        />
        {deadlines.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {deadlines.map((activity) => (
              <li key={activity.id}>
                <ActivityCard activity={activity} now={now} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              No deadlines in the next two weeks. Check the{" "}
              <Link href="/calendar" className="font-medium text-foreground underline underline-offset-4">
                registration calendar
              </Link>{" "}
              for what&apos;s ahead.
            </p>
            {monthStarts.length > 0 ? (
              <div className="flex flex-col gap-3">
                <h3 className="font-display text-lg font-bold tracking-tight">{monthLabel}</h3>
                <ul className="flex flex-col gap-2">
                  {monthStarts.map((event) => (
                    <li key={event.id}>
                      <CalendarEventRow event={event} now={now} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* Recently opened */}
      {opened.length > 0 ? (
        <section className="border-y border-border bg-secondary/60">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
            <SectionHeading
              eyebrow="Just opened"
              title="Newly open registration"
              description="Programs that started accepting signups in the last three weeks."
            />
            <ul className="grid gap-4 sm:grid-cols-2">
              {opened.map((activity) => (
                <li key={activity.id}>
                  <ActivityCard activity={activity} now={now} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Browse by sport */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <SectionHeading
          eyebrow="Browse"
          title="By sport"
          action={
            <Button render={<Link href="/sports" />} nativeButton={false} variant="ghost" size="sm">
              All sports
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          }
        />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sportRows.map(({ sport, total: count, openNow }) => (
            <li key={sport.id}>
              <Link
                href={`/sports/${sport.slug}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-ring hover:bg-accent/50"
              >
                <SportMarker slug={sport.slug} name={sport.name} size="sm" />
                <span className="flex min-w-0 flex-col">
                  <span className="font-display text-sm font-bold">{sport.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {count} {count === 1 ? "program" : "programs"}
                    {openNow > 0 ? ` \u00b7 ${openNow} open now` : ""}
                  </span>
                </span>
                <ArrowRightIcon className="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Seasons */}
      <section className="border-t border-border bg-secondary/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <SectionHeading eyebrow="Plan ahead" title="By season" />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {seasons.map(({ season, total: count, openNow }) => (
              <li key={season}>
                <Link
                  href={`/search?season=${season}`}
                  className="flex h-full items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-ring hover:bg-accent/50"
                >
                  <SeasonMarker season={season} />
                  <span className="flex flex-col gap-1">
                    <span className="font-display text-lg font-bold">{seasonLabels[season]}</span>
                    <span className="text-sm text-muted-foreground">
                      {count} {count === 1 ? "program" : "programs"}
                    </span>
                    {openNow > 0 ? (
                      <span className="mt-1 w-fit rounded-full bg-open px-2 py-0.5 text-xs font-semibold text-open-foreground">
                        {openNow} open now
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Trust + contribute */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-lg font-bold">Where this comes from</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every listing shows its original source and when we last checked it. Sign Up Vermont never
              handles registration or payment &mdash; you always finish on the organization&apos;s own
              site.
            </p>
            <Link
              href="/about"
              className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
            >
              How Sign Up Vermont works
              <ArrowRightIcon className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-lg font-bold">Get signup alerts</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Get an email when registration opens for a sport you care about, and a reminder before the
              deadline closes.
            </p>
            <Button
              render={<Link href="/alerts" />}
              nativeButton={false}
              variant="outline"
              size="sm"
              className="mt-2 w-fit"
            >
              <BellIcon data-icon="inline-start" />
              Get signup alerts
            </Button>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-lg font-bold">Know a program we&apos;re missing?</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Coaches and parents keep this directory honest. Send us a program and we&apos;ll verify it
              before it goes live.
            </p>
            <Button
              render={<Link href="/submit" />}
              nativeButton={false}
              variant="outline"
              size="sm"
              className="mt-2 w-fit"
            >
              <PlusIcon data-icon="inline-start" />
              Submit an activity
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
