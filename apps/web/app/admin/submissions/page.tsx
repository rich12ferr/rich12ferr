import { adminSubmissions, allSports } from "@openplay/db"

import { SubmissionQueue } from "@/components/submission-queue"
import { toSubmissionView } from "@/lib/submission-prefill"

export const metadata = {
  title: "Community submissions",
}

export const dynamic = "force-dynamic"

export default async function AdminSubmissionsPage() {
  const [{ pending, decided }, sports] = await Promise.all([adminSubmissions(), allSports()])
  const options = sports.map((s) => ({ slug: s.slug, name: s.name }))

  return (
    <SubmissionQueue
      pending={pending.map((row) => toSubmissionView(row, options))}
      decided={decided.map((row) => toSubmissionView(row, options))}
      sports={options}
    />
  )
}
