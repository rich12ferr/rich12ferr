import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { WeeklyStoryDetail } from "@/components/weekly-story-detail"
import { weekRangeLabel } from "@/lib/queries"
import type { WeeklyEdition, WeeklyEditionSummary } from "@/lib/types"

/**
 * The full body of one weekly update — shared by the bare `/this-week`
 * (current edition) and `/this-week/[week]` (any edition, including the
 * current one) routes so there is exactly one rendering of an edition to
 * keep in sync.
 */
export function WeeklyEditionArticle({
  edition,
  summaries,
  isCurrent,
}: {
  edition: WeeklyEdition
  summaries: WeeklyEditionSummary[]
  isCurrent: boolean
}) {
  const index = summaries.findIndex((s) => s.weekSlug === edition.weekSlug)
  // Summaries are newest-first, so the array's previous index is the newer
  // (next) week and the next index is the older (previous) week.
  const newer = index > 0 ? summaries[index - 1] : null
  const older = index >= 0 && index < summaries.length - 1 ? summaries[index + 1] : null

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8">
      <header className="flex flex-col gap-3">
        {isCurrent ? (
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-highlight px-3 py-1 text-xs font-semibold text-highlight-foreground">
            This week
          </p>
        ) : (
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            Archived edition &mdash; a historical snapshot
          </p>
        )}
        <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl">
          {edition.title}
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          {weekRangeLabel(edition.weekStart, edition.weekEnd)}
          {", "}
          {new Date(`${edition.weekStart}T12:00:00`).getFullYear()}
        </p>
        {edition.intro ? (
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty">{edition.intro}</p>
        ) : null}
        {!isCurrent ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
            Registration details below reflect what was true when this update was published, not current
            availability &mdash; check each activity&apos;s page for the latest status.
          </p>
        ) : null}
      </header>

      <div className="flex flex-col gap-5">
        {edition.stories.map((story, i) => (
          <WeeklyStoryDetail key={story.id} story={story} index={i} isCurrent={isCurrent} />
        ))}
      </div>

      <nav aria-label="Other weeks" className="flex items-center justify-between gap-4 border-t border-border pt-5">
        {older ? (
          <Link
            href={`/this-week/${older.weekSlug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronLeftIcon className="size-4" aria-hidden="true" />
            {weekRangeLabel(older.weekStart, older.weekEnd)}
          </Link>
        ) : (
          <span />
        )}
        {newer ? (
          <Link
            href={`/this-week/${newer.weekSlug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {weekRangeLabel(newer.weekStart, newer.weekEnd)}
            <ChevronRightIcon className="size-4" aria-hidden="true" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  )
}
