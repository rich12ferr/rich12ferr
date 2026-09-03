"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckIcon, ExternalLinkIcon, InboxIcon, MailIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import type { Submission } from "@/lib/types"

/** PRD 23. Parents and coaches fill the gaps a crawler cannot reach. */
export function SubmissionQueue({ submissions }: { submissions: Submission[] }) {
  const [items, setItems] = useState(submissions)
  const pending = items.filter((s) => s.status === "pending")
  const decided = items.filter((s) => s.status !== "pending")

  function decide(id: string, status: "approved" | "rejected") {
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)))
    toast.success(status === "approved" ? "Submission accepted" : "Submission declined", {
      description:
        status === "approved"
          ? "It moves to the activity editor so you can verify the details before publishing."
          : "The submitter will be thanked without the listing going live.",
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Community submissions</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {pending.length} waiting on review. Nothing here is published automatically, no matter how
          complete it looks.
        </p>
      </header>

      {pending.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <InboxIcon />
            </EmptyMedia>
            <EmptyTitle>No submissions waiting</EmptyTitle>
            <EmptyDescription>New parent and coach submissions land here for review.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {pending.map((submission) => (
            <Card key={submission.id}>
              <CardHeader>
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{submission.sport_name}</Badge>
                    <span className="text-xs text-muted-foreground">
                      submitted {submission.submitted_at}
                    </span>
                  </div>
                  <CardTitle className="text-base">{submission.program_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{submission.organization_name}</p>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-4">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Detail label="Who can play">{submission.eligibility}</Detail>
                  <Detail label="Registration dates">{submission.registration_dates}</Detail>
                  <Detail label="Registration link">
                    {submission.registration_url ? (
                      <a
                        href={submission.registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Open link
                        <ExternalLinkIcon className="size-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Not provided</span>
                    )}
                  </Detail>
                  <Detail label="Source page">
                    {submission.source_url ? (
                      <a
                        href={submission.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Open source
                        <ExternalLinkIcon className="size-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Not provided</span>
                    )}
                  </Detail>
                </dl>

                {submission.comments && (
                  <p className="rounded-lg bg-muted p-3 text-sm leading-relaxed">
                    &ldquo;{submission.comments}&rdquo;
                  </p>
                )}

                <Separator />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MailIcon className="size-3.5" aria-hidden="true" />
                    {submission.submitter_email}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => decide(submission.id, "rejected")}>
                      <XIcon data-icon="inline-start" />
                      Decline
                    </Button>
                    <Button size="sm" onClick={() => decide(submission.id, "approved")}>
                      <CheckIcon data-icon="inline-start" />
                      Accept for editing
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <section aria-labelledby="decided" className="flex flex-col gap-3">
          <h2 id="decided" className="font-display text-lg font-semibold">
            Recently decided
          </h2>
          <Card>
            <CardContent className="flex flex-col gap-0 p-0">
              {decided.map((submission, index) => (
                <div
                  key={submission.id}
                  className={`flex items-center gap-3 p-4 ${index > 0 ? "border-t" : ""}`}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{submission.program_name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {submission.organization_name}
                    </span>
                  </div>
                  <Badge variant={submission.status === "approved" ? "default" : "outline"}>
                    {submission.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}
