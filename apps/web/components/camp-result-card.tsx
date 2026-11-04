import Link from "next/link"
import { ArrowRightIcon, CalendarDaysIcon, CircleAlertIcon, ExternalLinkIcon, MapPinIcon, TicketIcon, UsersIcon } from "lucide-react"
import { CampLine } from "@/components/camp-line"
import { CustomerStatusPill, customerStateAccent } from "@/components/customer-status-pill"
import { RegistrationHandoffButton } from "@/components/registration-handoff-button"
import { SportMarker } from "@/components/sport-marker"
import { Button } from "@/components/ui/button"
import { buildHandoffProps } from "@/lib/analytics"
import { campDatesLabel } from "@/lib/camp-format"
import { campDateRange, campGroupStatus, campPriceLabel, type CampGroup } from "@/lib/camp-results"
import { distanceLabel, eligibilityLabel, isDemoListing } from "@/lib/format"
import { registrationStatus } from "@/lib/registration-status"
import type { ActivityWithRelations } from "@/lib/types"
import { cn } from "@/lib/utils"

type Session = ActivityWithRelations & { eligibilityNote?: string | null }

/**
 * One card per camp. Multi-session camps collapse into one card whose
 * dates, price and status summarize every session (PRD R7). Field order
 * follows PRD R5: name, organizer, dates, ages, place, price, status, action.
 */
export function CampResultCard({
  group,
  now = new Date(),
  returnTo,
}: {
  group: CampGroup<Session>
  now?: Date
  /** The current results query, so the detail page can link back to it. */
  returnTo?: string
}) {
  const { sessions } = group
  const multi = sessions.length > 1
  const { state, detail, lead, openCount } = campGroupStatus(group, now)
  const demo = isDemoListing(lead)
  const dates = multi ? campDateRange(group) : campDatesLabel(lead)
  const distance = distanceLabel(lead.distance_from_hub, lead.distance_origin)
  const query = returnTo ? `?from=${encodeURIComponent(returnTo)}` : ""
  const detailHref = `/activities/${lead.slug}${query}${multi ? "#sessions" : ""}`
  const canRegister = !multi && !demo && state === "open" && Boolean(lead.registration_url)
  const eligibilityNote = sessions.find((s) => s.eligibilityNote)?.eligibilityNote ?? null

  const statusLine = multi && state === "open" ? `${openCount} of ${sessions.length} sessions open` : detail

  return (
    <article className="group relative min-w-0 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground transition-shadow hover:shadow-md">
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1.5", customerStateAccent[state])} />

      <div className="flex flex-col gap-3 py-5 pl-6 pr-5">
        <div className="flex items-start gap-3">
          <SportMarker slug={lead.sport.slug} name={lead.sport.name} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h3 className="font-display text-base leading-snug font-bold text-pretty">
              <Link
                href={detailHref}
                className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {group.title}
              </Link>
            </h3>
            <p className="truncate text-sm text-muted-foreground">{lead.organization.name}</p>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-1.5">
            <dt>
              <CalendarDaysIcon className="mt-0.5 size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Dates</span>
            </dt>
            <dd className="font-medium">
              {multi ? `${sessions.length} sessions \u00b7 ` : ""}
              {dates ?? "Dates not posted yet"}
            </dd>
          </div>
          <div className="flex items-start gap-1.5">
            <dt>
              <UsersIcon className="mt-0.5 size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Ages</span>
            </dt>
            <dd>{eligibilityLabel(lead)}</dd>
          </div>
          <div className="flex items-start gap-1.5">
            <dt>
              <MapPinIcon className="mt-0.5 size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Location</span>
            </dt>
            <dd>
              {lead.town}, {lead.state}
              {distance ? <span className="text-muted-foreground">{` \u00b7 ${distance}`}</span> : null}
            </dd>
          </div>
          <div className="flex items-start gap-1.5">
            <dt>
              <TicketIcon className="mt-0.5 size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Price</span>
            </dt>
            <dd className={cn(lead.registration_fee === null && !multi && "text-muted-foreground")}>{campPriceLabel(group)}</dd>
          </div>
        </dl>

        <CampLine activity={lead} />

        {eligibilityNote ? (
          <p className="flex w-fit items-start gap-1.5 rounded-lg bg-highlight px-2.5 py-1.5 text-xs font-medium text-highlight-foreground">
            <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {eligibilityNote}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CustomerStatusPill state={state} className="w-fit" />
            {statusLine ? <p className="text-xs leading-relaxed text-muted-foreground">{statusLine}</p> : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canRegister && lead.registration_url ? (
              <RegistrationHandoffButton
                href={lead.registration_url}
                handoff={{
                  ...buildHandoffProps(lead, {
                    ctaLabel: "Register",
                    ctaLocation: "activity_card",
                    status: registrationStatus(lead, now),
                  }),
                  placement: null,
                }}
                size="sm"
                variant="outline"
              >
                Register
                <ExternalLinkIcon data-icon="inline-end" />
              </RegistrationHandoffButton>
            ) : null}
            <Button render={<Link href={detailHref} />} nativeButton={false} size="sm">
              {multi ? `View ${sessions.length} sessions` : "View details"}
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}
