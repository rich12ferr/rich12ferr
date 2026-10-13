import type { Activity } from "@/lib/types"

export type DateFilter = "all" | "season" | "registration"

export function parseDateFilter(value: string | undefined): DateFilter {
  return value === "season" || value === "registration" ? value : "all"
}

type DateFields = Pick<
  Activity,
  | "season_start_date"
  | "season_end_date"
  | "registration_open_date"
  | "registration_close_date"
  | "dates_reviewed_at"
>

/**
 * What a cleanup pass can still fix on a listing. An admin confirming the
 * dates (including "this program has none") clears every gap, so those
 * listings never come back to the queue.
 */
export function dateGaps(activity: DateFields) {
  const reviewed = Boolean(activity.dates_reviewed_at)
  return {
    reviewed,
    seasonStart: !reviewed && !activity.season_start_date,
    seasonEnd: !reviewed && !activity.season_end_date,
    registration:
      !reviewed && !activity.registration_open_date && !activity.registration_close_date,
  }
}

export function matchesDateFilter(activity: DateFields, filter: DateFilter): boolean {
  const gaps = dateGaps(activity)
  if (filter === "season") return gaps.seasonStart || gaps.seasonEnd
  if (filter === "registration") return gaps.registration
  return true
}
