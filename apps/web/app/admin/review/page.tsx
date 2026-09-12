import { ReviewQueue } from "@/components/review-queue"
import { reviewQueue } from "@/lib/queries"

export const metadata = {
  title: "Review queue",
}

// Always reflects the latest crawl/approval state, matching the other
// admin work-queue pages (e.g. /admin/weekly-candidates).
export const dynamic = "force-dynamic"

export default async function AdminReviewPage() {
  const candidates = await reviewQueue()
  return <ReviewQueue candidates={candidates} />
}
