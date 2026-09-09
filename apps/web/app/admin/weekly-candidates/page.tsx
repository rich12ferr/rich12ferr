import Link from "next/link"
import { CalendarClockIcon, CheckIcon, NewspaperIcon, SparklesIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { weeklyStoryCandidateQueue } from "@/lib/queries"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "This Week candidates",
}

const sourceKindLabels: Record<string, string> = {
  approved_review_candidate: "Newly verified",
  closing_soon_offering: "Closing soon",
  recently_opened_offering: "Just opened",
}

/**
 * Read-only view of the shortlist `scan-weekly-story-candidates.ts` produces.
 *
 * The write path stays a CLI step deliberately, matching `/admin/review`'s
 * "AI extraction is a suggestion, never a publication" rule: turning one of
 * these into a real story is `draft-weekly-story.ts`, run with verified copy
 * an editor actually wrote, not this page's machine-drafted suggestion.
 */
export default async function WeeklyCandidatesPage() {
  const candidates = await weeklyStoryCandidateQueue()

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">This Week candidates</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Auto-surfaced from the crawl: newly verified programs, and offerings whose registration is
          closing soon or just opened. Nothing here publishes itself — draft a story from a candidate with{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            pnpm --filter @openplay/ingest draft-weekly-story &lt;candidate-id&gt; --edition &lt;week-slug&gt;
            --copy &lt;path&gt;
          </code>
          .
        </p>
      </header>

      {candidates.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CheckIcon />
            </EmptyMedia>
            <EmptyTitle>No pending candidates</EmptyTitle>
            <EmptyDescription>
              Run <code className="rounded bg-muted px-1.5 py-0.5 text-xs">scan-weekly-story-candidates</code>{" "}
              after the next crawl to refill this queue.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {candidates.map((candidate) => (
            <Card key={candidate.id}>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <NewspaperIcon className="size-3" aria-hidden="true" />
                        {sourceKindLabels[candidate.sourceKind] ?? candidate.sourceKind}
                      </Badge>
                      {candidate.signalDate ? (
                        <Badge variant="outline" className="gap-1">
                          <CalendarClockIcon className="size-3" aria-hidden="true" />
                          {candidate.signalDate}
                        </Badge>
                      )
                        : null}
                    </div>
                    <CardTitle className="text-base">{candidate.headlineSuggestion}</CardTitle>
                    <p className="text-sm text-muted-foreground">{candidate.summary}</p>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold tabular-nums text-secondary-foreground">
                    <SparklesIcon className="size-3.5" aria-hidden="true" />
                    score {candidate.score.toFixed(1)}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-3">
                <p className="max-w-3xl text-sm leading-relaxed text-foreground/90 text-pretty">
                  {candidate.teaserSuggestion}
                </p>
                <p className="text-xs text-muted-foreground">
                  candidate id{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5">{candidate.id}</code>
                  {candidate.offeringId ? (
                    <>
                      {" \u00b7 "}
                      <Link
                        href={`/admin/activities/${candidate.offeringId}`}
                        className="underline underline-offset-4 hover:text-foreground"
                      >
                        view listing
                      </Link>
                    </>
                  ) : null}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
