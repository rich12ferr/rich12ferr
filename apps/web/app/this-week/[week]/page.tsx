import { notFound } from "next/navigation"
import { TrackView } from "@/components/track-view"
import { WeeklyArchiveNav } from "@/components/weekly-archive-nav"
import { WeeklyEditionArticle } from "@/components/weekly-edition-article"
import { currentWeeklyEdition, weeklyEditionBySlug, weeklyEditionSummaries } from "@/lib/queries"

/**
 * Registration status embedded in each story is time-sensitive, so this page
 * must not be frozen at build time.
 */
export const revalidate = 300

export async function generateStaticParams() {
  const summaries = await weeklyEditionSummaries()
  return summaries.map((s) => ({ week: s.weekSlug }))
}

export async function generateMetadata({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params
  const edition = await weeklyEditionBySlug(week)
  if (!edition) return { title: "This Week" }
  return {
    title: `${edition.title} — This Week — Sign Up Vermont`,
    description: edition.intro ?? "New programs, registration openings, and deadlines around Vermont.",
  }
}

export default async function WeeklyEditionPage({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params
  const [edition, summaries, current] = await Promise.all([
    weeklyEditionBySlug(week),
    weeklyEditionSummaries(),
    currentWeeklyEdition(),
  ])
  if (!edition) notFound()

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-8 px-4 py-10 sm:px-6">
      <TrackView discoveryOrigin="weekly_update" />
      <WeeklyArchiveNav editions={summaries} currentSlug={edition.weekSlug} />
      <WeeklyEditionArticle
        edition={edition}
        summaries={summaries}
        isCurrent={current?.weekSlug === edition.weekSlug}
      />
    </div>
  )
}
