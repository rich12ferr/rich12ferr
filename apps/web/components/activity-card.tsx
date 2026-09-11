import Link from "next/link"
import { CircleAlertIcon, ExternalLinkIcon, MapPinIcon, TicketIcon } from "lucide-react"
import { ActivityBadges } from "@/components/activity-badges"
import { CustomerStatusPill, customerStateAccent } from "@/components/customer-status-pill"
import { RegistrationHandoffButton } from "@/components/registration-handoff-button"
import { SeasonIcon } from "@/components/season-icons"
import { SportMarker } from "@/components/sport-marker"
import { TrustNote } from "@/components/trust-note"
import type { ActivityWithRelations } from "@/lib/types"
import { customerFacingState, formatFee, registrationStatus } from "@/lib/registration-status"
import { distanceLabel, eligibilityLabel, isDemoListing, programLabel, seasonLabel } from "@/lib/format"
import { buildHandoffProps } from "@/lib/analytics"
import { cn } from "@/lib/utils"

export type ActivityCardProps = {
  activity: ActivityWithRelations
  eligibilityNote?: string | null
  now?: Date
  className?: string
}

/**
 * The result card from PRD 13. Every field a parent needs to decide whether to
 * click: sport, program, org, eligibility, season, deadline, cost, distance.
 */
export function ActivityCard({ activity, eligibilityNote, now = new Date(), className }: ActivityCardProps) {
  const { state: resolved, detail } = customerFacingState(activity, now)
  const canRegister = resolved === "open"
  const demo = isDemoListing(activity)
  // Kept only for analytics attribution, mirroring the activity detail page —
  // every label/branch below reads `resolved` (the collapsed 4-state value)
  // instead.
  const analyticsStatus = registrationStatus(activity, now)

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card text-card-foreground transition-shadow hover:shadow-md",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute inset-y-0 left-0 w-1.5", customerStateAccent[resolved])}
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
          <CustomerStatusPill state={resolved} className="ml-auto" />
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="sr-only">Eligibility</dt>
            <dd className="font-medium">{eligibilityLabel(activity)}</dd>
          </div>
          <div className="flex gap-2 text-muted-foreground">
            <dt className="sr-only">Season and program</dt>
            <dd className="inline-flex items-center gap-1.5">
              {activity.season && activity.season_year ? (
                <SeasonIcon
                  season={activity.season}
                  className="size-3.5 shrink-0"
                  aria-hidden="true"
                />
              ) : null}
              {seasonLabel(activity)} &middot; {programLabel(activity)}
            </dd>
          </div>
          {detail ? (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Registration</dt>
              <dd className="font-medium">{detail}</dd>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
            <dt className="sr-only">Cost and location</dt>
            <dd className="inline-flex items-center gap-1.5">
              <TicketIcon className="size-3.5" aria-hidden="true" />
              {formatFee(activity.registration_fee, activity.currency)}
            </dd>
            <dd className="inline-flex items-center gap-1.5">
              <MapPinIcon className="size-3.5" aria-hidden="true" />
              {activity.town}, {activity.state}
              {distanceLabel(activity.distance_from_hub) ? ` \u00b7 ${distanceLabel(activity.distance_from_hub)}` : ""}
            </dd>
          </div>
        </dl>

        {eligibilityNote ? (
          <p className="flex w-fit items-start gap-1.5 rounded-lg bg-highlight px-2.5 py-1.5 text-xs font-medium text-highlight-foreground">
            <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {eligibilityNote}
          </p>
        ) : null}

        <ActivityBadges activity={activity} now={now} />

        {/*
         * Every field above answers "is this worth it?" — this row answers
         * "where do I click?" On a dense results list a parent skims cards,
         * not detail pages, so the same registration/source handoff the
         * detail page's rail offers must be one click from here too, not
         * two. Only rendered when there's a real destination: unlike the
         * detail rail, a disabled placeholder button on every closed/demo
         * card in a long list would just be noise the status pill already
         * covers.
         */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
          <TrustNote activity={activity} now={now} className="min-w-0" />
          {!demo && canRegister && activity.registration_url ? (
            <RegistrationHandoffButton
              href={activity.registration_url}
              handoff={buildHandoffProps(activity, {
                ctaLabel: "Register",
                ctaLocation: "activity_card",
                status: analyticsStatus,
              })}
              size="sm"
              className="shrink-0"
            >
              Register
              <ExternalLinkIcon data-icon="inline-end" />
            </RegistrationHandoffButton>
          ) : !demo && resolved !== "closed" && activity.source_url ? (
            <RegistrationHandoffButton
              href={activity.source_url}
              handoff={buildHandoffProps(activity, {
                ctaLabel: "View program page",
                ctaLocation: "activity_card",
                status: analyticsStatus,
              })}
              size="sm"
              variant="outline"
              className="shrink-0"
            >
              View program page
              <ExternalLinkIcon data-icon="inline-end" />
            </RegistrationHandoffButton>
          ) : null}
        </div>
      </div>
    </article>
  )
}
