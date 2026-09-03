import { ReviewQueue } from "@/components/review-queue"
import { reviewQueue } from "@/lib/data/moderation"

export const metadata = {
  title: "Review queue",
}

export default function AdminReviewPage() {
  return <ReviewQueue candidates={reviewQueue} />
}
