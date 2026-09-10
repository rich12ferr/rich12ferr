import { ExternalLinkIcon, ShieldCheckIcon, ShieldAlertIcon, FlaskConicalIcon } from "lucide-react"
import type { ActivityWithRelations } from "@/lib/types"
import { freshnessLabel, isDemoListing, isStale, sourceHost } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * PRD 15: every listing states where its information came from, when it was
 * last checked, and links to the original source so parents can confirm.
 *
 * Deliberately shows only provenance — organization name, freshness, and a
 * link to the source — never the internal `verification_status` value
 * (e.g. "Unverified", "Admin reviewed"). That vocabulary is for the admin
 * console; to a parent it reads as an accusation against small orgs that
 * simply haven't been individually reviewed yet, not a useful trust signal.
 *
 * Demo/placeholder listings (no real crawl source yet) never show a
 * provenance claim or a fake source link — they get a distinct "Demo
 * listing" badge instead, so they can never be mistaken for a verified
 * program at a real organization.
 */
export function TrustNote({
  activity,
  now = new Date(),
  withSourceLink = true,
  className,
}: {
  activity: ActivityWithRelations
  now?: Date
  withSourceLink?: boolean
  className?: string
}) {
  const stale = isStale(activity, now)
  const Icon = stale ? ShieldAlertIcon : ShieldCheckIcon
  const isDemo = isDemoListing(activity)

  if (isDemo) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground",
          className,
        )}
      >
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <FlaskConicalIcon className="size-3.5" aria-hidden="true" />
          Demo listing &mdash; not a real program
        </span>
        <span aria-hidden="true">&middot;</span>
        <span>No source yet</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <Icon className={cn("size-3.5", stale && "text-soon-foreground")} aria-hidden="true" />
        Source: {activity.organization.name}
      </span>
      <span aria-hidden="true">&middot;</span>
      <span className={cn(stale && "font-medium text-foreground")}>{freshnessLabel(activity, now)}</span>
      {withSourceLink ? (
        <>
          <span aria-hidden="true">&middot;</span>
          <a
            href={activity.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
          >
            {sourceHost(activity.source_url)}
            <ExternalLinkIcon className="size-3" aria-hidden="true" />
          </a>
        </>
      ) : null}
    </div>
  )
}
