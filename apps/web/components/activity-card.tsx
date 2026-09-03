import Link from "next/link"
import { CircleAlertIcon, MapPinIcon, TicketIcon } from "lucide-react"
import { ActivityBadges } from "@/components/activity-badges"
import { SportMarker } from "@/components/sport-marker"
import { StatusPill, statusAccent } from "@/components/status-pill"
import { TrustNote } from "@/components/trust-note"
import type { ActivityWithRelations, RegistrationStatus } from "@/lib/types"
import { formatFee, registrationStatus, statusDetail } from "@/lib/registration-status"
import { distanceLabel, eligibilityLabel, programLabel, seasonLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

export type ActivityCardProps = {
  activity: ActivityWithRelations
  status?: RegistrationStatus
  eligibilityNote?: string | null
  now?: Date
  className?: string
}

/**
 * The result card from PRD 13. Every field a parent needs to decide whether to
 * click: sport, program, org, eligibility, season, deadline, cost, distance.
 */
export function ActivityCard({
  activity,
  status,
  eligibilityNote,
  now = new Date(),
  className,
}: ActivityCardProps) {
  const resolved = status ?? registrationStatus(activity, now)

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card text-card-foreground transition-shadow hover:shadow-md",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute inset-y-0 left-0 w-1.5", statusAccent[resolved])}
      />

      <div className="flex flex-col gap-3 py-5 pl-6 pr-5">
        <div className="flex items-start gap-3">
          <SportMarker slug={activity.sport.slug} name={activity.sport.name} />
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="font-display text-base leading-snug font-bold text-pretty">
              <Link
                href={`/activities/${activity.slug}`}
                className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {activity.title}
              </Link>
            </h3>
            <p className="truncate text-sm text-muted-foreground">
              <Link href={`/organizations/${activity.organization_id}`} className="hover:text-foreground hover:underline">
                {activity.organization.name}
              </Link>
            </p>
          </div>
          <StatusPill status={resolved} className="ml-auto" />
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="sr-only">Eligibility</dt>
            <dd className="font-medium">{eligibilityLabel(activity)}</dd>
          </div>
          <div className="flex gap-2 text-muted-foreground">
            <dt className="sr-only">Season and program</dt>
            <dd>
              {seasonLabel(activity)} &middot; {programLabel(activity)}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Registration</dt>
            <dd className="font-medium">{statusDetail(activity, now)}</dd>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
            <dt className="sr-only">Cost and location</dt>
            <dd className="inline-flex items-center gap-1.5">
              <TicketIcon className="size-3.5" aria-hidden="true" />
              {formatFee(activity.registration_fee, activity.currency)}
            </dd>
            <dd className="inline-flex items-center gap-1.5">
              <MapPinIcon className="size-3.5" aria-hidden="true" />
              {activity.town}, {activity.state} &middot; {distanceLabel(activity.distance_from_hub)}
            </dd>
          </div>
        </dl>

        {eligibilityNote ? (
          <p className="flex w-fit items-start gap-1.5 rounded-lg bg-highlight px-2.5 py-1.5 text-xs font-medium text-highlight-foreground">
            <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {eligibilityNote}
          </p>
        ) : null}

        <ActivityBadges activity={activity} status={resolved} now={now} />

        <TrustNote activity={activity} now={now} className="pt-0.5" />
      </div>
    </article>
  )
}
