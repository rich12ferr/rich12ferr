import Link from "next/link"
import { ArrowRight, CalendarDays, MapPin } from "lucide-react"
import { CustomerStatusPill } from "@/components/customer-status-pill"
import { RegistrationHandoffButton } from "@/components/registration-handoff-button"
import { buildHandoffProps } from "@/lib/analytics"
import { campDatesLabel } from "@/lib/camp-format"
import { campGroupStatus, campPriceLabel, type CampGroup } from "@/lib/camp-results"
import { eligibilityLabel, isDemoListing } from "@/lib/format"
import { registrationStatus } from "@/lib/registration-status"
import type { ActivityWithRelations } from "@/lib/types"

export function CampResultCard({
  group,
  now = new Date(),
  returnTo,
}: {
  group: CampGroup<ActivityWithRelations & { eligibilityNote?: string | null }>
  now?: Date
  returnTo?: string
}) {
  const { lead, state } = campGroupStatus(group, now)
  const multi = group.sessions.length > 1
  const href = `/activities/${lead.slug}${returnTo ? `?from=${encodeURIComponent(returnTo)}` : ""}${multi ? "#sessions" : ""}`
  const dates = Array.from(new Set(group.sessions.map(campDatesLabel).filter(Boolean)))
  const eligibility = eligibilityLabel(lead)
  const note = group.sessions.find((s) => s.eligibilityNote)?.eligibilityNote
  return (
    <article className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5 text-card-foreground">
      <div className="flex items-center justify-between gap-2">
        <CustomerStatusPill state={state} />
        {lead.camp_stay && (
          <span className="text-sm text-muted-foreground">
            {lead.camp_stay === "overnight" ? "Overnight" : "Day camp"}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{lead.organization.name}</p>
        <h3 className="mt-1 font-display text-xl leading-tight font-bold">
          <Link href={href} className="hover:underline">
            {group.title}
          </Link>
        </h3>
      </div>
      <p className="flex flex-wrap items-center gap-1.5 text-sm">
        <MapPin size={15} aria-hidden="true" />
        {lead.town}
        {eligibility !== "Eligibility not published" && <span>· {eligibility}</span>}
      </p>
      {dates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays size={16} aria-hidden="true" />
          {dates.slice(0, 2).map((d) => (
            <span key={d} className="rounded bg-muted px-2 py-1">
              {d}
            </span>
          ))}
          {dates.length > 2 && <span>+{dates.length - 2}</span>}
        </div>
      )}
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm font-semibold">
        {group.sessions.some((s) => s.registration_fee !== null) && <span>{campPriceLabel(group)}</span>}
        {!multi && !isDemoListing(lead) && state === "open" && lead.registration_url && (
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
          </RegistrationHandoffButton>
        )}
        <Link href={href} className="ml-auto inline-flex items-center gap-2 text-primary hover:underline">
          {multi ? `View ${group.sessions.length} sessions` : "View camp"}
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  )
}
