"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import type { ReviewCandidate } from "@/lib/types"
import { cn } from "@/lib/utils"

const duplicateLabels: Record<ReviewCandidate["duplicate_assessment"], string> = {
  new: "New listing",
  likely_update: "Update to existing",
  possible_duplicate: "Possible duplicate",
  duplicate: "Confirmed duplicate",
}

const fieldLabels: Record<string, string> = {
  title: "Title",
  sport: "Sport",
  min_grade: "Minimum grade",
  max_grade: "Maximum grade",
  registration_fee: "Registration fee",
  registration_open_date: "Registration opens",
  registration_close_date: "Registration closes",
}

/**
 * Nothing an extractor produces reaches parents without a human decision here.
 * Confidence, inferred fields, and validation issues are all shown up front so
 * the reviewer knows exactly what they are vouching for.
 */
export function ReviewQueue({ candidates }: { candidates: ReviewCandidate[] }) {
  const [pending, setPending] = useState(candidates)

  function resolve(id: string, action: "approved" | "rejected" | "edited") {
    const candidate = pending.find((c) => c.id === id)
    setPending((prev) => prev.filter((c) => c.id !== id))
    const verb =
      action === "approved" ? "Published" : action === "rejected" ? "Rejected" : "Sent to the editor"
    toast.success(`${verb}: ${candidate?.activity_title ?? "candidate"}`, {
      description:
        action === "approved"
          ? "The listing is now visible to parents and marked verified."
          : action === "rejected"
            ? "The source will not be re-proposed for this activity."
            : "Open the activity editor to finish the corrections.",
    })
  }

  const lowConfidence = pending.filter((c) => c.confidence < 0.7).length

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Review queue</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Extracted data is a suggestion, never a publication. {pending.length} candidate
          {pending.length === 1 ? "" : "s"} waiting, {lowConfidence} below the 0.70 confidence line.
        </p>
      </header>

      {pending.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CheckIcon />
            </EmptyMedia>
            <EmptyTitle>Queue is clear</EmptyTitle>
            <EmptyDescription>
              Every extracted candidate has been decided. New ones appear after the next crawl.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {pending.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} onResolve={resolve} />
          ))}
        </div>
      )}
    </div>
  )
}

function CandidateCard({
  candidate,
  onResolve,
}: {
  candidate: ReviewCandidate
  onResolve: (id: string, action: "approved" | "rejected" | "edited") => void
}) {
  const confident = candidate.confidence >= 0.7
  const percent = Math.round(candidate.confidence * 100)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={candidate.kind === "new_activity" ? "default" : "secondary"}>
                {candidate.kind === "new_activity" ? "New activity" : "Field update"}
              </Badge>
              <Badge variant="outline" className="gap-1">
                {candidate.duplicate_assessment === "possible_duplicate" && (
                  <CopyIcon className="size-3" />
                )}
                {duplicateLabels[candidate.duplicate_assessment]}
              </Badge>
            </div>
            <CardTitle className="text-base">{candidate.activity_title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {candidate.organization_name} &middot; found {candidate.discovered_at}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                confident ? "bg-open text-open-foreground" : "bg-soon text-soon-foreground",
              )}
            >
              <SparklesIcon className="size-3.5" aria-hidden="true" />
              {percent}% confidence
            </span>
            {!confident && (
              <span className="text-xs text-muted-foreground">Below auto-suggest threshold</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Proposed changes
          </h3>
          <div className="flex flex-col gap-0 overflow-hidden rounded-lg border">
            {candidate.changes.map((change, index) => (
              <div
                key={change.field}
                className={cn(
                  "flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3",
                  index > 0 && "border-t",
                )}
              >
                <span className="w-44 shrink-0 text-xs font-medium text-muted-foreground">
                  {fieldLabels[change.field] ?? change.field}
                </span>
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground line-through decoration-muted-foreground/50">
                    {change.current_value ?? "empty"}
                  </span>
                  <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="font-semibold">{change.proposed_value ?? "empty"}</span>
                  {change.inferred && (
                    <Badge variant="outline" className="text-[0.6875rem]">
                      inferred
                    </Badge>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {candidate.validation_issues.length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg bg-soon/15 p-3">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
              <AlertTriangleIcon className="size-3.5" aria-hidden="true" />
              Validation issues
            </h3>
            <ul className="flex flex-col gap-1 text-sm">
              {candidate.validation_issues.map((issue) => (
                <li key={issue} className="text-muted-foreground">
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Separator />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            render={<a href={candidate.source_url} target="_blank" rel="noopener noreferrer" />}
            nativeButton={false}
            variant="link"
            size="sm"
            className="h-auto justify-start p-0"
          >
            <ExternalLinkIcon data-icon="inline-start" />
            View the source page
          </Button>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onResolve(candidate.id, "rejected")}>
              <XIcon data-icon="inline-start" />
              Reject
            </Button>
            {candidate.activity_id ? (
              <Button
                render={<Link href={`/admin/activities/${candidate.activity_id}`} />}
                nativeButton={false}
                variant="outline"
                size="sm"
              >
                Edit then publish
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => onResolve(candidate.id, "edited")}>
                Edit then publish
              </Button>
            )}
            <Button size="sm" onClick={() => onResolve(candidate.id, "approved")}>
              <CheckIcon data-icon="inline-start" />
              Approve
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
