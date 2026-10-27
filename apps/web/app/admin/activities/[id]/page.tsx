import { notFound } from "next/navigation"

import { ActivityAuditLog } from "@/components/activity-audit-log"
import { ActivityEditor } from "@/components/activity-editor"
import { AdminFeaturedToggle } from "@/components/admin-featured-toggle"
import { activityById } from "@/lib/queries"
import { auditLogForEntity, offeringFeaturedAt } from "@openplay/db"

/**
 * Always server-rendered: an admin must see the effect of an edit immediately,
 * and stale verification state here would undermine the review workflow.
 */
export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const found = await activityById(id)
  return { title: found ? `Edit ${found.title}` : "Activity not found" }
}

export default async function AdminActivityEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const activity = await activityById(id)
  if (!activity) notFound()

  const [auditEntries, featuredAt] = await Promise.all([
    auditLogForEntity("program_offering", id),
    offeringFeaturedAt(id),
  ])

  return (
    <div className="flex flex-col gap-6">
      <AdminFeaturedToggle offeringId={id} featuredAt={featuredAt ? featuredAt.toISOString() : null} />
      <ActivityEditor activity={activity} />
      <ActivityAuditLog entries={auditEntries} />
    </div>
  )
}
