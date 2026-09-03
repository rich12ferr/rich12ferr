"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CheckIcon, FlagIcon, MailIcon, SearchIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { reportCategoryLabels } from "@/lib/report-categories"
import type { Report } from "@/lib/types"

type Item = { report: Report; activityTitle: string; activitySlug: string | null }

const statusTone: Record<Report["status"], "default" | "secondary" | "outline"> = {
  new: "default",
  investigating: "secondary",
  resolved: "outline",
  dismissed: "outline",
}

/** PRD 24. A parent hitting a dead registration link is the worst failure mode. */
export function ReportQueue({ items }: { items: Item[] }) {
  const [rows, setRows] = useState(items)
  const open = rows.filter((r) => r.report.status === "new" || r.report.status === "investigating")
  const closed = rows.filter((r) => r.report.status === "resolved" || r.report.status === "dismissed")

  function setStatus(id: string, status: Report["status"]) {
    setRows((prev) =>
      prev.map((row) => (row.report.id === id ? { ...row, report: { ...row.report, status } } : row)),
    )
    const messages: Record<Report["status"], string> = {
      new: "Reopened",
      investigating: "Marked as investigating",
      resolved: "Marked resolved",
      dismissed: "Dismissed",
    }
    toast.success(messages[status])
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Accuracy reports</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {open.length} open report{open.length === 1 ? "" : "s"}. Broken registration links and wrong
          deadlines get fixed before anything else on the roadmap.
        </p>
      </header>

      {open.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FlagIcon />
            </EmptyMedia>
            <EmptyTitle>No open reports</EmptyTitle>
            <EmptyDescription>
              Parents have not flagged anything that still needs a decision.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {open.map(({ report, activityTitle, activitySlug }) => (
            <Card key={report.id}>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusTone[report.status]}>{report.status}</Badge>
                  <Badge variant="outline">{reportCategoryLabels[report.category]}</Badge>
                  <span className="text-xs text-muted-foreground">reported {report.reported_at}</span>
                </div>

                {activitySlug ? (
                  <Link
                    href={`/activities/${activitySlug}`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {activityTitle}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold">{activityTitle}</span>
                )}

                <p className="text-sm leading-relaxed text-muted-foreground">{report.details}</p>

                <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MailIcon className="size-3.5" aria-hidden="true" />
                    {report.reporter_email ?? "Reported anonymously"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setStatus(report.id, "dismissed")}>
                      <XIcon data-icon="inline-start" />
                      Dismiss
                    </Button>
                    {report.status === "new" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatus(report.id, "investigating")}
                      >
                        <SearchIcon data-icon="inline-start" />
                        Investigate
                      </Button>
                    )}
                    <Button size="sm" onClick={() => setStatus(report.id, "resolved")}>
                      <CheckIcon data-icon="inline-start" />
                      Resolve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <section aria-labelledby="closed" className="flex flex-col gap-3">
          <h2 id="closed" className="font-display text-lg font-semibold">
            Closed
          </h2>
          <Card>
            <CardContent className="flex flex-col gap-0 p-0">
              {closed.map(({ report, activityTitle }, index) => (
                <div
                  key={report.id}
                  className={`flex items-center gap-3 p-4 ${index > 0 ? "border-t" : ""}`}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{activityTitle}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {reportCategoryLabels[report.category]}
                    </span>
                  </div>
                  <Badge variant="outline">{report.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}
