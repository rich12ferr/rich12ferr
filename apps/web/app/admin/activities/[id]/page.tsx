import { notFound } from "next/navigation"

import { ActivityEditor } from "@/components/activity-editor"
import { activityById } from "@/lib/queries"

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

  return <ActivityEditor activity={activity} />
}
