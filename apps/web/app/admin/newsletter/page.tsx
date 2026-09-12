import Link from "next/link"
import { BarChart3Icon, MailIcon, PlusIcon, SendIcon, UsersIcon } from "lucide-react"
import { listIssues, subscriberTotals } from "@openplay/db"
import { createIssueAction } from "./actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Newsletter",
}

export default async function AdminNewsletterPage() {
  const [totals, issues] = await Promise.all([subscriberTotals(), listIssues()])

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-bold tracking-tight">Newsletter</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Compose the weekly digest from a published &ldquo;This Week&rdquo; edition, add a
            sponsorship, preview it, and send to every active subscriber.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button render={<Link href="/admin/newsletter/analytics" />} nativeButton={false} variant="outline">
            <BarChart3Icon data-icon="inline-start" />
            Analytics
          </Button>
          <form action={createIssueAction}>
            <Button type="submit">
              <PlusIcon data-icon="inline-start" />
              New issue
            </Button>
          </form>
        </div>
      </header>

      {/* Subscriber KPIs */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active subscribers
            </CardTitle>
            <UsersIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-bold tabular-nums">{totals.subscribed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unsubscribed (all time)
            </CardTitle>
            <MailIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-bold tabular-nums">{totals.unsubscribed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Issues */}
      {issues.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MailIcon />
            </EmptyMedia>
            <EmptyTitle>No issues yet</EmptyTitle>
            <EmptyDescription>
              Create your first issue to start composing the weekly digest.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {issues.map((issue) => {
            const isSent = issue.status === "sent"
            return (
              <Link
                key={issue.id}
                href={`/admin/newsletter/${issue.id}`}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-ring hover:bg-accent/50"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-base font-bold">{issue.subject}</span>
                    <Badge variant={isSent ? "default" : "secondary"} className="gap-1">
                      {isSent ? <SendIcon className="size-3" aria-hidden="true" /> : null}
                      {isSent ? "Sent" : "Draft"}
                    </Badge>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isSent && issue.sentAt
                      ? `Sent ${new Date(issue.sentAt).toLocaleDateString()} · ${issue.recipientCount} recipient${issue.recipientCount === 1 ? "" : "s"}`
                      : `Created ${new Date(issue.createdAt).toLocaleDateString()}`}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
