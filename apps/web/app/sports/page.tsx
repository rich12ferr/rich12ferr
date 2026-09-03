import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { SportMarker } from "@/components/sport-marker"
import { seasonLabels, sportSummaries } from "@/lib/queries"

/**
 * Registration status and "checked N days ago" are computed from the current
 * time, so this page must not be frozen at build time. Re-rendered at most
 * every 5 minutes — well inside the day-level granularity of a deadline.
 */
export const revalidate = 300

export const metadata = {
  title: "Browse sports",
  description: "Every sport offered by schools, rec departments, leagues, and clubs in the area.",
}

export default async function SportsPage() {
  const now = new Date()
  const rows = await sportSummaries(now)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Browse by sport</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {rows.length} sports offered across the region. A sport appears here as soon as one program
          is listed, so an empty season is real information too.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ sport, total, openNow }) => (
          <li key={sport.id}>
            <Link
              href={`/sports/${sport.slug}`}
              className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-ring hover:bg-accent/40"
            >
              <div className="flex items-center gap-3">
                <SportMarker slug={sport.slug} name={sport.name} />
                <div className="flex flex-col">
                  <h2 className="font-display text-lg font-bold">{sport.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {sport.primarySeasons.map((s) => seasonLabels[s]).join(" & ")}
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{sport.blurb}</p>
              <div className="mt-auto flex items-center gap-2 pt-1 text-sm">
                <span className="font-medium">
                  {total} {total === 1 ? "program" : "programs"}
                </span>
                {openNow > 0 ? (
                  <span className="rounded-full bg-open px-2 py-0.5 text-xs font-semibold text-open-foreground">
                    {openNow} open
                  </span>
                ) : null}
                <ArrowRightIcon className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
