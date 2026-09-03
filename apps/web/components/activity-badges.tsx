import { Badge } from "@/components/ui/badge"
import type { Activity, RegistrationStatus } from "@/lib/types"
import { isRecentlyAdded } from "@/lib/registration-status"

/** Optional badges from PRD 14. */
export function ActivityBadges({
  activity,
  status,
  now = new Date(),
}: {
  activity: Activity
  status: RegistrationStatus
  now?: Date
}) {
  const badges: { label: string; variant?: "secondary" | "outline" }[] = []

  if (activity.registration_fee === 0) badges.push({ label: "Free" })
  if (activity.tryout_required) badges.push({ label: "Tryouts required", variant: "outline" })
  if (activity.beginner_friendly) badges.push({ label: "Beginner friendly", variant: "secondary" })
  if (activity.verification_status === "organization_verified")
    badges.push({ label: "Verified", variant: "secondary" })
  if (activity.verification_status === "community_submitted")
    badges.push({ label: "Community submitted", variant: "outline" })
  if (activity.verification_status === "unverified")
    badges.push({ label: "Needs recheck", variant: "outline" })
  if (isRecentlyAdded(activity, now)) badges.push({ label: "Recently added", variant: "secondary" })
  if (status === "waitlist") badges.push({ label: "Waitlist", variant: "outline" })

  if (badges.length === 0) return null

  return (
    <ul className="flex flex-wrap items-center gap-1.5">
      {badges.map((badge) => (
        <li key={badge.label}>
          <Badge variant={badge.variant ?? "secondary"}>{badge.label}</Badge>
        </li>
      ))}
    </ul>
  )
}
