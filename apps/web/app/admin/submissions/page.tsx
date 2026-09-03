import { SubmissionQueue } from "@/components/submission-queue"
import { submissions } from "@/lib/data/moderation"

export const metadata = {
  title: "Community submissions",
}

export default function AdminSubmissionsPage() {
  return <SubmissionQueue submissions={submissions} />
}
