import Link from "next/link"
import { BellIcon, CalendarCheckIcon, CalendarClockIcon, CalendarXIcon, ClipboardListIcon } from "lucide-react"
import { SportMarker } from "@/components/sport-marker"
import { Button } from "@/components/ui/button"
import { calendarEventLabels, calendarEvents, groupEventsByMonth, type CalendarEventKind } from "@/lib/queries"
import { eligibilityLabel } from "@/lib/format"

/**
 * Registration status and "checked N days ago" are computed from the current
 * time, so this page must not be frozen at build time. Re-rendered at most
 * every 5 minutes — well inside the day-level granularity of a deadline.
 */
export const revalidate = 300

export const metadata = {
  title: "Registration calendar",
  description: "Every upcoming registration window, tryout, and season start in one timeline.",
}

const kindStyles: Record<
  CalendarEventKind,
  { icon: typeof CalendarCheckIcon; className: string }
> = {
  registration_open: { icon: CalendarCheckIcon, className: "bg-open text-open-foreground" },
  registration_close: { icon: CalendarXIcon, className: "bg-soon text-soon-foreground" },
  tryout: { icon: ClipboardListIcon, className: "bg-highlight text-highlight-foreground" },
  season_start: { icon: CalendarClockIcon, className: "bg-upcoming text-upcoming-foreground" },
}

/** Relative countdown is more useful in the right rail than repeating the date. */
function daysAwayLabel(date: Date, now: Date) {
  const days = Math.round((date.getTime() - now.getTime()) / 86_400_000)
  if (days <= 0) return "today"
  if (days === 1) return "tomorrow"
  if (days < 30) return `in ${days} days`
  const weeks = Math.round(days / 7)
  return `in ${weeks} weeks`
}

export default async function CalendarPage() {
  const now = new Date()
  const months = groupEventsByMonth(await calendarEvents(now))

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Registration calendar</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Deadlines are the thing families miss most, so every date in the directory shows up here:
          registration opening, registration closing, tryouts, and season starts.
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(kindStyles) as CalendarEventKind[]).map((kind) => {
            const { icon: Icon, className } = kindStyles[kind]
            return (
              <span
                key={kind}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {calendarEventLabels[kind]}
              </span>
            )
          })}
        </div>
      </header>

      <div className="flex flex-col gap-8">
        {months.map((month) => (
          <section key={month.label} aria-labelledby={`month-${month.label}`}>
            <h2
              id={`month-${month.label}`}
              className="sticky top-16 z-10 -mx-1 mb-3 bg-background/90 px-1 py-2 font-display text-xl font-extrabold tracking-tight backdrop-blur"
            >
              {month.label}
            </h2>
            <ul className="flex flex-col gap-2">
              {month.events.map((event) => {
                const { icon: Icon, className } = kindStyles[event.kind]
                return (
                  <li key={event.id}>
                    <Link
                      href={`/activities/${event.activity.slug}`}
                      className="flex items-center gap-4 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-ring hover:bg-accent/40"
                    >
                      <div className="flex w-14 shrink-0 flex-col items-center">
                        <span className="font-display text-lg leading-none font-bold tabular-nums">
                          {event.date.getDate()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {event.date.toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                      </div>

                      <SportMarker
                        slug={event.activity.sport.slug}
                        name={event.activity.sport.name}
                        size="sm"
                      />

                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span
                          className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${className}`}
                        >
                          <Icon className="size-3" aria-hidden="true" />
                          {calendarEventLabels[event.kind]}
                        </span>
                        <span className="truncate font-medium">{event.activity.title}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {event.activity.organization.name} &middot; {eligibilityLabel(event.activity)}
                        </span>
                      </div>

                      <span className="ml-auto hidden shrink-0 text-xs text-muted-foreground sm:block">
                        {daysAwayLabel(event.date, now)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-start gap-2 rounded-2xl border border-border bg-secondary/60 p-6">
        <h2 className="font-display text-lg font-bold">Get the dates that matter to you</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Rather than watching this page, set an alert for the sports your kids play. We&apos;ll email you
          when registration opens and again before it closes.
        </p>
        <Button render={<Link href="/alerts" />} nativeButton={false} size="sm" className="mt-1">
          <BellIcon data-icon="inline-start" />
          Create an alert
        </Button>
      </div>
    </div>
  )
}
