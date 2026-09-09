import { ReportQueue } from "@/components/report-queue"
import { reportQueue } from "@/lib/queries"

export const metadata = {
  title: "Accuracy reports",
}

// Moderation state changes on every action; never serve a cached queue.
export const dynamic = "force-dynamic"

export default async function AdminReportsPage() {
  const items = await reportQueue()
  return <ReportQueue items={items} />
}
