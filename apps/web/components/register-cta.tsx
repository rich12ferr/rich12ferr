import { ArrowUpRightIcon } from "lucide-react"
import { RegistrationHandoffButton } from "@/components/registration-handoff-button"
import { buildHandoffProps, type CtaLocation } from "@/lib/analytics"
import { isDemoListing } from "@/lib/format"
import { customerFacingState, formatDate, parseDate, registrationStatus } from "@/lib/registration-status"
import type { ActivityWithRelations } from "@/lib/types"
import { cn } from "@/lib/utils"

const MAX_SHORT_NAME_LENGTH = 24

/**
 * "Burlington Parks, Recreation & Waterfront" -> "Burlington Parks".
 * Returns null when no short form fits, so callers fall back to "Register now".
 */
export function orgShortName(name: string): string | null {
  const short = name
    .replace(/^(the\s+)?(city|town|village)\s+of\s+/i, "")
    .split(/,|\s\(|\s[-\u2013\u2014]\s/)[0]
    .trim()
  return short && short.length <= MAX_SHORT_NAME_LENGTH ? short : null
}

export function registerLabel(orgName: string) {
  const short = orgShortName(orgName)
  return short ? `Register on ${short}` : "Register now"
}

type Placement = "header" | "inline" | "sticky"

const ctaLocationByPlacement: Record<Placement, CtaLocation> = {
  header: "activity_detail_header",
  inline: "activity_detail_inline",
  sticky: "activity_detail_sticky",
}

/**
 * The listing-page Register call-to-action. One component drives all three
 * placements so the label, destination, and open/closed rules can't drift.
 */
export function RegisterCta({
  activity,
  now,
  placement,
  className,
}: {
  activity: ActivityWithRelations
  now: Date
  placement: Placement
  className?: string
}) {
  if (isDemoListing(activity)) return null

  const { state } = customerFacingState(activity, now)
  const href = activity.registration_url ?? activity.source_url

  if (state === "closed") {
    // Nothing to act on, so the sticky bar would just take up screen space.
    if (placement === "sticky") return null
    return (
      <p className={cn("text-sm font-medium text-muted-foreground", className)}>Registration closed</p>
    )
  }

  if (!href) return null

  const opens = parseDate(activity.registration_open_date)
  const sublabel = state === "coming_up" && opens && opens > now ? `Opens ${formatDate(opens)}` : null
  const label = registerLabel(activity.organization.name)

  const button = (
    <RegistrationHandoffButton
      href={href}
      registerClickout
      handoff={buildHandoffProps(activity, {
        ctaLabel: label,
        ctaLocation: ctaLocationByPlacement[placement],
        status: registrationStatus(activity, now),
      })}
      size="lg"
      className="h-12 w-full text-base sm:w-auto"
    >
      {label}
      <ArrowUpRightIcon data-icon="inline-end" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </RegistrationHandoffButton>
  )

  if (placement === "sticky") {
    return (
      <div
        data-sticky-register=""
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden",
          className,
        )}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-1">
          {button}
          {sublabel ? <p className="text-center text-xs text-muted-foreground">{sublabel}</p> : null}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3", className)}>
      {button}
      {sublabel ? <p className="text-sm text-muted-foreground">{sublabel}</p> : null}
    </div>
  )
}
