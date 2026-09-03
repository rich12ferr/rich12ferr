import Link from "next/link"
import {
  AlertTriangleIcon,
  CalendarClockIcon,
  CircleHelpIcon,
  ClockIcon,
  ListChecksIcon,
  ShieldQuestionIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusPill } from "@/components/status-pill"
import { reports, reviewQueue, submissions } from "@/lib/data/moderation"
import { adminMetrics } from "@/lib/queries"
import { registrationStatus } from "@/lib/registration-status"

/**
 * Always server-rendered: an admin must see the effect of an edit immediately,
 * and stale verification state here would undermine the review workflow.
 */
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Admin dashboard",
}

/**
 * A listing counts as trustworthy only when a human vouched for it — an admin
 * review or the organization itself. AI extraction and community submissions
 * are useful but still owe a confirmation.
 */
const TRUSTED_STATUSES = new Set(["admin_reviewed", "organization_verified"])

export default async function AdminDashboardPage() {
  const now = new Date()
  const metrics = await adminMetrics(now)

  const pendingSubmissions = submissions.filter((s) => s.status === "pending").length
  const openReports = reports.filter((r) => r.status !== "resolved").length
  const lowConfidence = reviewQueue.filter((c) => c.confidence < 0.7).length

  const healthCards = [
    {
      label: "Active activities",
      value: metrics.active,
      hint: "Published and visible to parents",
      icon: ListChecksIcon,
    },
    {
      label: "Unverified",
      value: metrics.unverified,
      hint: "Never confirmed against the source",
      icon: ShieldQuestionIcon,
    },
    {
      label: `Closing within ${metrics.closingSoonWindow} days`,
      value: metrics.deadlineSoon,
      hint: "Highest-stakes accuracy window",
      icon: CalendarClockIcon,
    },
    {
      label: "Missing dates",
      value: metrics.missingDates,
      hint: "No open or close date on record",
      icon: CircleHelpIcon,
    },
    {
      label: "Not checked in 30 days",
      value: metrics.stale,
      hint: "Candidates for a re-crawl",
      icon: ClockIcon,
    },
  ]

  const queues = [
    {
      label: "Review queue",
      count: reviewQueue.length,
      description: `${lowConfidence} below the 0.70 confidence line`,
      href: "/admin/review",
    },
    {
      label: "Community submissions",
      count: pendingSubmissions,
      description: "Waiting on a first pass",
      href: "/admin/submissions",
    },
    {
      label: "Accuracy reports",
      count: openReports,
      description: "Parents flagged something wrong",
      href: "/admin/reports",
    },
  ]

  const attention = metrics.all
    .filter((a) => a.published)
    .map((a) => ({ activity: a, status: registrationStatus(a, now) }))
    .filter(
      ({ activity, status }) =>
        status === "unknown" || !TRUSTED_STATUSES.has(activity.verification_status),
    )
    .slice(0, 6)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Data health</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Every number here is a promise to a parent. Verified listings and correct deadlines matter more
          than total coverage.
        </p>
      </header>

      <section aria-labelledby="health" className="flex flex-col gap-4">
        <h2 id="health" className="sr-only">
          Health metrics
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {healthCards.map((card) => (
            <Card key={card.label}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardDescription>{card.label}</CardDescription>
                  <card.icon className="size-4 text-muted-foreground" />
                </div>
                <CardTitle className="font-display text-4xl tabular-nums">{card.value}</CardTitle>
                <CardDescription className="text-xs">{card.hint}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="queues" className="flex flex-col gap-4">
        <h2 id="queues" className="font-display text-xl font-semibold">
          Work queues
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {queues.map((queue) => (
            <Card key={queue.label} className="flex flex-col">
              <CardHeader className="flex-1">
                <CardTitle className="flex items-baseline gap-2 text-base">
                  {queue.label}
                  <Badge variant="secondary" className="tabular-nums">
                    {queue.count}
                  </Badge>
                </CardTitle>
                <CardDescription>{queue.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  render={<Link href={queue.href} />}
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Open queue
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="attention" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="attention" className="font-display text-xl font-semibold">
            Needs attention
          </h2>
          <p className="text-sm text-muted-foreground">
            Published listings that are unverified or missing registration dates.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col gap-0 p-0">
            {attention.map(({ activity, status }, index) => (
              <div
                key={activity.id}
                className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4 ${
                  index > 0 ? "border-t" : ""
                }`}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link
                    href={`/admin/activities/${activity.id}`}
                    className="truncate text-sm font-semibold hover:underline"
                  >
                    {activity.title}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {activity.organization.name} &middot; last checked {activity.date_last_checked ?? "never"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!TRUSTED_STATUSES.has(activity.verification_status) && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <AlertTriangleIcon className="size-3" />
                      {activity.verification_status.replace(/_/g, " ")}
                    </Badge>
                  )}
                  <StatusPill status={status} size="sm" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
