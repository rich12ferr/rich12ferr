"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CheckIcon, FlagIcon, MailIcon, PencilIcon, SearchIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { reportCategoryLabels } from "@/lib/report-categories"
import type { ReportQueueItem } from "@/lib/queries"
import type { ReportCategory } from "@/lib/types"
import { updateReportStatus } from "@/app/admin/reports/actions"

type Status = ReportQueueItem["status"]

/** A category filed before it existed in the label map still gets a readable fallback. */
function categoryLabel(category: string): string {
  return reportCategoryLabels[category as ReportCategory] ?? category
}

const OPEN_STATUSES: Status[] = ["new", "investigating"]

const statusTone: Record<Status, "default" | "secondary" | "outline"> = {
  new: "default",
  investigating: "secondary",
  resolved: "outline",
  dismissed: "outline",
}

const statusMessages: Record<Status, string> = {
  new: "Reopened",
  investigating: "Marked as investigating",
  resolved: "Marked resolved",
  dismissed: "Dismissed",
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

/** PRD 24. A parent hitting a dead registration link is the worst failure mode. */
export function ReportQueue({ items }: { items: ReportQueueItem[] }) {
  const [rows, setRows] = useState(items)
  const [category, setCategory] = useState<string>("all")
  const [isPending, startTransition] = useTransition()

  // The set of categories actually present, so the filter never offers an
  // option that would show an empty queue.
  const categoryOptions = useMemo(() => {
    const present = [...new Set(items.map((i) => i.category))]
    return present.sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)))
  }, [items])

  const visible = category === "all" ? rows : rows.filter((r) => r.category === category)
  const open = visible.filter((r) => OPEN_STATUSES.includes(r.status))
  const closed = visible.filter((r) => !OPEN_STATUSES.includes(r.status))

  function setStatus(id: string, status: Status) {
    const previous = rows
    // Optimistic: reflect the change immediately, revert if the server rejects.
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)))

    startTransition(async () => {
      const result = await updateReportStatus(id, status)
      if (result.ok) {
        toast.success(statusMessages[status])
      } else {
        setRows(previous)
        toast.error(result.error)
      }
    })
  }

  const openCount = rows.filter((r) => OPEN_STATUSES.includes(r.status)).length

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Accuracy reports</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {openCount} open report{openCount === 1 ? "" : "s"}. Broken registration links and wrong
          deadlines get fixed before anything else on the roadmap.
        </p>
      </header>

      {categoryOptions.length > 0 ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="report-category" className="text-xs font-medium text-muted-foreground">
            Filter by category
          </label>
          <Select value={category} onValueChange={(value) => setCategory(value ?? "all")}>
            <SelectTrigger id="report-category" className="w-full sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categoryOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {categoryLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {open.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FlagIcon />
            </EmptyMedia>
            <EmptyTitle>No open reports</EmptyTitle>
            <EmptyDescription>
              {category === "all"
                ? "Parents have not flagged anything that still needs a decision."
                : "No open reports in this category."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {open.map((report) => (
            <Card key={report.id}>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusTone[report.status]}>{report.status}</Badge>
                  <Badge variant="outline">{categoryLabel(report.category)}</Badge>
                  <span className="text-xs text-muted-foreground">
                    reported {formatDate(report.reportedAt)}
                  </span>
                </div>

                {report.activitySlug ? (
                  <Link
                    href={`/activities/${report.activitySlug}`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {report.activityTitle}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold">{report.activityTitle}</span>
                )}

                {report.details ? (
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                    {report.details}
                  </p>
                ) : null}

                <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MailIcon className="size-3.5" aria-hidden="true" />
                    {report.reporterEmail ?? "Reported anonymously"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {report.offeringId && report.category === "suggested_edit" && (
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <Link href={`/admin/activities/${report.offeringId}?reportId=${report.id}`} />
                        }
                        nativeButton={false}
                      >
                        <PencilIcon data-icon="inline-start" />
                        Edit this activity
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => setStatus(report.id, "dismissed")}
                    >
                      <XIcon data-icon="inline-start" />
                      Dismiss
                    </Button>
                    {report.status === "new" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => setStatus(report.id, "investigating")}
                      >
                        <SearchIcon data-icon="inline-start" />
                        Investigate
                      </Button>
                    )}
                    <Button size="sm" disabled={isPending} onClick={() => setStatus(report.id, "resolved")}>
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
              {closed.map((report, index) => (
                <div
                  key={report.id}
                  className={`flex items-center gap-3 p-4 ${index > 0 ? "border-t" : ""}`}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{report.activityTitle}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {categoryLabel(report.category)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{report.status}</Badge>
                    {!OPEN_STATUSES.includes(report.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => setStatus(report.id, "new")}
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}
