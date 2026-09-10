import { Badge } from "@/components/ui/badge"
import type { Activity } from "@/lib/types"
import { isRecentlyAdded, isStartingSoon } from "@/lib/registration-status"

/**
 * Optional badges from PRD 14. Deliberately independent of internal
 * `verification_status` — that vocabulary belongs to the admin console, not
 * a parent-facing badge (see `TrustNote` for the provenance line that
 * replaces it). Waitlist/closing-soon urgency also isn't repeated here;
 * that's already the customer-facing state's detail line, not a separate badge.
 */
export function ActivityBadges({
  activity,
  now = new Date(),
}: {
  activity: Activity
  now?: Date
}) {
  const badges: { label: string; variant?: "secondary" | "outline" }[] = []

  if (activity.registration_fee === 0) badges.push({ label: "Free" })
  // Independent of registration status: a class can be "open" for
  // registration for months before it starts, so caregivers still need a
  // signal tied to when the season itself begins.
  if (isStartingSoon(activity, now)) badges.push({ label: "Starts soon" })
  if (activity.tryout_required) badges.push({ label: "Tryouts required", variant: "outline" })
  if (activity.beginner_friendly) badges.push({ label: "Beginner friendly", variant: "secondary" })
  if (isRecentlyAdded(activity, now)) badges.push({ label: "Recently added", variant: "secondary" })

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
