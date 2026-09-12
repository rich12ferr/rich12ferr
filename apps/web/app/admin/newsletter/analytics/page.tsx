import Link from "next/link"
import { ArrowLeftIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react"
import { issueEngagement, subscriberTotals, subscriptionTrend } from "@openplay/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Newsletter analytics",
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

export default async function NewsletterAnalyticsPage() {
  const [totals, trend, issues] = await Promise.all([
    subscriberTotals(),
    subscriptionTrend(90),
    issueEngagement(),
  ])

  // Newest activity first; scale bars to the busiest day in the window.
  const recent = [...trend].reverse().slice(0, 30)
  const maxDaily = Math.max(1, ...trend.map((d) => Math.max(d.subscribed, d.unsubscribed)))
  const periodSubscribed = trend.reduce((sum, d) => sum + d.subscribed, 0)
  const periodUnsubscribed = trend.reduce((sum, d) => sum + d.unsubscribed, 0)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/admin/newsletter"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Newsletter
        </Link>
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-bold tracking-tight">Newsletter analytics</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Subscriber growth and how each issue performed. Open rate is opens divided by delivered
            emails, and depends on Resend open tracking being enabled for your domain.
          </p>
        </header>
      </div>

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active subscribers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-bold tabular-nums">{totals.subscribed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <TrendingUpIcon className="size-4 text-open" aria-hidden="true" />
              Subscribed (90d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-bold tabular-nums">{periodSubscribed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <TrendingDownIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              Unsubscribed (90d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-bold tabular-nums">{periodUnsubscribed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Growth by date */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold">Growth by date</h2>
        {recent.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            No subscribe or unsubscribe activity in the last 90 days yet.
          </p>
        ) : (
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:p-6">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-open" aria-hidden="true" />
                  Subscribed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-muted-foreground/40" aria-hidden="true" />
                  Unsubscribed
                </span>
              </div>
              <ul className="flex flex-col gap-2.5">
                {recent.map((d) => (
                  <li key={d.day} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-xs tabular-nums text-muted-foreground">
                      {new Date(`${d.day}T00:00:00`).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 rounded-full bg-open"
                          style={{ width: `${(d.subscribed / maxDaily) * 100}%` }}
                          aria-hidden="true"
                        />
                        {d.subscribed > 0 ? (
                          <span className="text-xs tabular-nums text-foreground">{d.subscribed}</span>
                        ) : null}
                      </span>
                      {d.unsubscribed > 0 ? (
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 rounded-full bg-muted-foreground/40"
                            style={{ width: `${(d.unsubscribed / maxDaily) * 100}%` }}
                            aria-hidden="true"
                          />
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {d.unsubscribed}
                          </span>
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Per-issue open rate */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold">Per-issue performance</h2>
        {issues.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TrendingUpIcon />
              </EmptyMedia>
              <EmptyTitle>No sent issues yet</EmptyTitle>
              <EmptyDescription>
                Send your first issue to start tracking delivery and open rates.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Card>
            <CardContent className="flex flex-col gap-0 p-0">
              {issues.map((issue, index) => (
                <div
                  key={issue.issueId}
                  className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                    index > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-medium">{issue.subject}</span>
                    <span className="text-xs text-muted-foreground">
                      {issue.sentAt ? new Date(issue.sentAt).toLocaleDateString() : "—"} ·{" "}
                      {issue.recipientCount} sent · {issue.delivered} delivered · {issue.opened} opened
                      {issue.bounced > 0 ? ` · ${issue.bounced} bounced` : ""}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-display text-2xl font-bold tabular-nums">
                      {pct(issue.openRate)}
                    </span>
                    <span className="text-xs text-muted-foreground">open rate</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
