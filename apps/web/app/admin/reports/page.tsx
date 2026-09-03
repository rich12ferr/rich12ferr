import { ReportQueue } from "@/components/report-queue"
import { reports } from "@/lib/data/moderation"
import { activities } from "@/lib/data/activities"

export const metadata = {
  title: "Accuracy reports",
}

export default function AdminReportsPage() {
  const enriched = reports.map((report) => {
    const activity = activities.find((a) => a.id === report.activity_id)
    return {
      report,
      activityTitle: activity?.title ?? "Unknown activity",
      activitySlug: activity?.slug ?? null,
    }
  })

  return <ReportQueue items={enriched} />
}
