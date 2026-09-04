import Link from "next/link"
import { CalendarCheckIcon, CalendarClockIcon, CalendarXIcon, ClipboardListIcon } from "lucide-react"
import { SportMarker } from "@/components/sport-marker"
import { eligibilityLabel } from "@/lib/format"
import { calendarEventLabels, type CalendarEvent, type CalendarEventKind } from "@/lib/queries"

export const calendarEventKindStyles: Record<CalendarEventKind, { icon: typeof CalendarCheckIcon; className: string }> = {
  registration_open: { icon: CalendarCheckIcon, className: "bg-open text-open-foreground" },
  registration_close: { icon: CalendarXIcon, className: "bg-soon text-soon-foreground" },
  tryout: { icon: ClipboardListIcon, className: "bg-highlight text-highlight-foreground" },
  season_start: { icon: CalendarClockIcon, className: "bg-upcoming text-upcoming-foreground" },
}

/**
 * Relative day label for a calendar event's date, including dates before
 * `now`. The homepage's discovery fallback deliberately surfaces season
 * starts that already happened this month, so "in N days" alone isn't
 * enough — unlike `/calendar`, which only ever lists what's ahead.
 */
export function calendarDaysAwayLabel(date: Date, now: Date) {
  const days = Math.round((date.getTime() - now.getTime()) / 86_400_000)
  if (days === 0) return "today"
  if (days === 1) return "tomorrow"
  if (days === -1) return "yesterday"
  if (days > 0) return days < 30 ? `in ${days} days` : `in ${Math.round(days / 7)} weeks`
  const past = Math.abs(days)
  return past < 30 ? `${past} days ago` : `${Math.round(past / 7)} weeks ago`
}

/** One row of the `/calendar` timeline — also reused by the homepage's discovery fallback. */
export function CalendarEventRow({ event, now }: { event: CalendarEvent; now: Date }) {
  const { icon: Icon, className } = calendarEventKindStyles[event.kind]
  return (
    <Link
      href={`/activities/${event.activity.slug}`}
      className="flex items-center gap-4 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-ring hover:bg-accent/40"
    >
      <div className="flex w-14 shrink-0 flex-col items-center">
        <span className="font-display text-lg leading-none font-bold tabular-nums">{event.date.getDate()}</span>
        <span className="text-xs text-muted-foreground">
          {event.date.toLocaleDateString("en-US", { weekday: "short" })}
        </span>
      </div>

      <SportMarker slug={event.activity.sport.slug} name={event.activity.sport.name} size="sm" />

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
        {calendarDaysAwayLabel(event.date, now)}
      </span>
    </Link>
  )
}
