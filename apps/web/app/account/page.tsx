import Link from "next/link"
import { BookmarkIcon, SearchIcon } from "lucide-react"
import { ActivityCard } from "@/components/activity-card"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { savedActivityIds } from "@/lib/data/moderation"
import { allActivities } from "@/lib/queries"
import { CLOSING_SOON_DAYS, customerFacingState, daysBetween, parseDate, startOfDay } from "@/lib/registration-status"

/**
 * Always server-rendered: an admin must see the effect of an edit immediately,
 * and stale verification state here would undermine the review workflow.
 */
export const dynamic = "force-dynamic"

export const metadata = { title: "Saved activities" }

export default async function SavedPage() {
  const now = new Date()
  const saved = (await allActivities()).filter((a) => savedActivityIds.includes(a.id))

  // "Closing soon" is surfaced as a detail line under Open on each card
  // (see `customerFacingState`) — recomputed here only for this summary count.
  const closingSoon = saved.filter((a) => {
    if (customerFacingState(a, now).state !== "open") return false
    const close = parseDate(a.registration_close_date)
    if (!close) return false
    const days = daysBetween(startOfDay(now), close)
    return days >= 0 && days <= CLOSING_SOON_DAYS
  })

  if (saved.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookmarkIcon />
          </EmptyMedia>
          <EmptyTitle>Nothing saved yet</EmptyTitle>
          <EmptyDescription>
            Save an activity from any listing to keep track of it while you decide.
          </EmptyDescription>
        </EmptyHeader>
        <Button render={<Link href="/search" />} nativeButton={false} size="sm">
          <SearchIcon data-icon="inline-start" />
          Find activities
        </Button>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-extrabold tracking-tight">
          {saved.length} saved {saved.length === 1 ? "activity" : "activities"}
        </h2>
        {closingSoon.length > 0 && (
          <p className="text-sm font-medium text-soon">
            {closingSoon.length} closing soon
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-3">
        {saved.map((activity) => (
          <li key={activity.id}>
            <ActivityCard activity={activity} now={now} />
          </li>
        ))}
      </ul>
    </div>
  )
}
