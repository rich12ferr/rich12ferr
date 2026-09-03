import Link from "next/link"
import { PencilIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusPill } from "@/components/status-pill"
import { allActivities } from "@/lib/queries"
import { registrationStatus } from "@/lib/registration-status"

/**
 * Always server-rendered: an admin must see the effect of an edit immediately,
 * and stale verification state here would undermine the review workflow.
 */
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Activities",
}

export default async function AdminActivitiesPage() {
  const now = new Date()
  const rows = (await allActivities())
    .map((activity) => ({ activity, status: registrationStatus(activity, now) }))
    .sort((a, b) => a.activity.title.localeCompare(b.activity.title))

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Activities</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {rows.length} listings in the catalog. Open any one to edit its details, change its
          verification state, or unpublish it.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-0 p-0">
          {rows.map(({ activity, status }, index) => (
            <div
              key={activity.id}
              className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 ${
                index > 0 ? "border-t" : ""
              }`}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold">{activity.title}</span>
                  {!activity.published && <Badge variant="outline">draft</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {activity.organization.name} &middot; {activity.sport.name} &middot; {activity.town}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {activity.verification_status.replace(/_/g, " ")}
                </Badge>
                <StatusPill status={status} size="sm" />
                <Button
                  render={<Link href={`/admin/activities/${activity.id}`} />}
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                >
                  <PencilIcon data-icon="inline-start" />
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
