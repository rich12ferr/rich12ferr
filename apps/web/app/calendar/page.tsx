import Link from "next/link"
import { BellIcon } from "lucide-react"
import { CalendarEventRow } from "@/components/calendar-event-row"
import { CalendarFilters } from "@/components/calendar-filters"
import { Button } from "@/components/ui/button"
import {
  AUDIENCE_FILTER_TO_TYPES,
  calendarEvents,
  DEFAULT_CALENDAR_KINDS,
  groupEventsByMonth,
  type CalendarEventKind,
} from "@/lib/queries"

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

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ kinds?: string; audience?: string }>
}) {
  const { kinds: kindsParam, audience: audienceParam } = await searchParams
  const kinds = kindsParam ? (kindsParam.split(",") as CalendarEventKind[]) : DEFAULT_CALENDAR_KINDS
  const audience = audienceParam && audienceParam in AUDIENCE_FILTER_TO_TYPES ? audienceParam : "youth"

  const now = new Date()
  const months = groupEventsByMonth(
    await calendarEvents(now, { kinds, audienceTypes: AUDIENCE_FILTER_TO_TYPES[audience] }),
  )

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Registration calendar</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Deadlines are the thing families miss most, so this defaults to registration opening and
          closing dates &mdash; toggle on tryouts and season starts, or switch the audience, below.
        </p>
        <CalendarFilters />
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
              {month.events.map((event) => (
                <li key={event.id}>
                  <CalendarEventRow event={event} now={now} />
                </li>
              ))}
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
