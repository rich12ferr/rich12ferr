import Link from "next/link"
import { notFound } from "next/navigation"
import { BellIcon, PlusIcon } from "lucide-react"
import { ActivityCard } from "@/components/activity-card"
import { SectionHeading } from "@/components/section-heading"
import { SportMarker } from "@/components/sport-marker"
import { Button } from "@/components/ui/button"
import { sports, getSportBySlug } from "@/lib/data/sports"
import { activitiesForSport, seasonLabels } from "@/lib/queries"
import { registrationStatus } from "@/lib/registration-status"
import type { Season } from "@/lib/types"

/**
 * Registration status and "checked N days ago" are computed from the current
 * time, so this page must not be frozen at build time. Re-rendered at most
 * every 5 minutes — well inside the day-level granularity of a deadline.
 */
export const revalidate = 300

export function generateStaticParams() {
  return sports.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sport = getSportBySlug(slug)
  if (!sport) return { title: "Sport not found" }
  return { title: `${sport.name} programs`, description: sport.blurb }
}

const order: Season[] = ["fall", "winter", "spring", "summer"]

export default async function SportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sport = getSportBySlug(slug)
  if (!sport) notFound()

  const now = new Date()
  const all = await activitiesForSport(sport.slug)
  const openNow = all.filter((a) => ["open", "closing_soon"].includes(registrationStatus(a, now)))

  const bySeason = order
    .map((season) => ({ season, items: all.filter((a) => a.season === season) }))
    .filter((group) => group.items.length > 0)
  // Rolling-enrollment and drop-in offerings (e.g. martial arts, swim lessons)
  // have no fixed season. Without this bucket they'd be counted in "Programs
  // listed" above but never actually rendered in any of the season sections.
  const ongoing = all.filter((a) => !a.season)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <SportMarker slug={sport.slug} name={sport.name} size="lg" />
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-3xl font-extrabold tracking-tight">{sport.name}</h1>
            <p className="text-muted-foreground">{sport.blurb}</p>
          </div>
        </div>

        <dl className="flex flex-wrap gap-x-8 gap-y-2 rounded-2xl border border-border bg-card px-5 py-4">
          <div className="flex flex-col">
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Programs listed
            </dt>
            <dd className="font-display text-xl font-bold">{all.length}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Open now
            </dt>
            <dd className="font-display text-xl font-bold">{openNow.length}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Usually played
            </dt>
            <dd className="font-display text-xl font-bold">
              {sport.primarySeasons.map((s) => seasonLabels[s]).join(" & ")}
            </dd>
          </div>
          <div className="ml-auto flex items-end gap-2">
            <Button
              render={<Link href={`/search?sport=${sport.slug}`} />}
              nativeButton={false}
              variant="outline"
              size="sm"
            >
              Filter these programs
            </Button>
            <Button render={<Link href="/alerts" />} nativeButton={false} size="sm">
              <BellIcon data-icon="inline-start" />
              Alert me
            </Button>
          </div>
        </dl>
      </header>

      {bySeason.map(({ season, items }) => (
        <section key={season} className="mb-10">
          <SectionHeading eyebrow={`${items.length} ${items.length === 1 ? "program" : "programs"}`} title={seasonLabels[season]} />
          <ul className="grid gap-4 lg:grid-cols-2">
            {items.map((activity) => (
              <li key={activity.id}>
                <ActivityCard activity={activity} now={now} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {ongoing.length > 0 ? (
        <section className="mb-10">
          <SectionHeading
            eyebrow={`${ongoing.length} ${ongoing.length === 1 ? "program" : "programs"}`}
            title="Year-round & ongoing"
          />
          <ul className="grid gap-4 lg:grid-cols-2">
            {ongoing.map((activity) => (
              <li key={activity.id}>
                <ActivityCard activity={activity} now={now} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-secondary/60 p-6">
        <h2 className="font-display text-lg font-bold">Missing a {sport.name.toLowerCase()} program?</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          A gap here usually means we haven&apos;t found the program yet, not that it doesn&apos;t exist.
          Send it in and a reviewer will verify it against the organization&apos;s own page.
        </p>
        <Button render={<Link href="/submit" />} nativeButton={false} variant="outline" size="sm" className="mt-1">
          <PlusIcon data-icon="inline-start" />
          Submit an activity
        </Button>
      </div>
    </div>
  )
}
