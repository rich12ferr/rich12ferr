import Link from "next/link"
import { NewspaperIcon } from "lucide-react"
import { WeeklyArchiveNav } from "@/components/weekly-archive-nav"
import { WeeklyEditionArticle } from "@/components/weekly-edition-article"
import { currentWeeklyEdition, weeklyEditionSummaries } from "@/lib/queries"

/**
 * Registration status embedded in each story is time-sensitive, so this page
 * must not be frozen at build time.
 */
export const revalidate = 300

export async function generateMetadata() {
  const edition = await currentWeeklyEdition()
  return {
    title: "This Week — Sign Up Vermont",
    description:
      "New programs, registration openings, and deadlines worth knowing about around Vermont.",
    // The bare "/this-week" is a rolling alias for whichever edition is
    // current, not a stable page of its own — the slugged route is what
    // should get indexed and linked to.
    alternates: edition ? { canonical: `/this-week/${edition.weekSlug}` } : undefined,
  }
}

export default async function ThisWeekArchivePage() {
  const [edition, summaries] = await Promise.all([currentWeeklyEdition(), weeklyEditionSummaries()])

  if (!edition) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
        <NewspaperIcon className="size-8 text-muted-foreground" aria-hidden="true" />
        <h1 className="font-display text-2xl font-bold">This Week is just getting started</h1>
        <p className="text-muted-foreground">
          We publish a new roundup of Vermont registration news as soon as there&apos;s something worth
          telling you. Check back soon, or{" "}
          <Link href="/search" className="font-medium text-foreground underline underline-offset-4">
            browse activities
          </Link>{" "}
          in the meantime.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-8 px-4 py-10 sm:px-6">
      <WeeklyArchiveNav editions={summaries} currentSlug={edition.weekSlug} />
      <WeeklyEditionArticle edition={edition} summaries={summaries} isCurrent />
    </div>
  )
}
