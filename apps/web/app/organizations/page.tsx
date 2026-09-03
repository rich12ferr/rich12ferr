import Link from "next/link"
import { ArrowRightIcon, BadgeCheckIcon } from "lucide-react"
import { organizationSummaries } from "@/lib/queries"

/**
 * Registration status and "checked N days ago" are computed from the current
 * time, so this page must not be frozen at build time. Re-rendered at most
 * every 5 minutes — well inside the day-level granularity of a deadline.
 */
export const revalidate = 300

export const metadata = {
  title: "Organizations",
  description: "Schools, recreation departments, leagues, and clubs offering youth sports nearby.",
}

const typeLabels: Record<string, string> = {
  school: "School",
  recreation_department: "Recreation department",
  league: "League",
  club: "Club",
  nonprofit: "Nonprofit",
  other: "Organization",
}

export default async function OrganizationsPage() {
  const now = new Date()
  const rows = await organizationSummaries(now)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Organizations</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Every program in OpenPlay belongs to one of these organizations. Registration always happens on
          their own site.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {rows.map(({ organization, total, openNow }) => (
          <li key={organization.id}>
            <Link
              href={`/organizations/${organization.id}`}
              className="flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-ring hover:bg-accent/40"
            >
              <div className="flex items-start gap-2">
                <h2 className="font-display text-lg leading-snug font-bold text-pretty">
                  {organization.name}
                </h2>
                {organization.verified ? (
                  <BadgeCheckIcon
                    className="mt-1 size-4 shrink-0 text-open-foreground"
                    aria-label="Verified by the organization"
                  />
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {typeLabels[organization.organization_type]} &middot; {organization.town},{" "}
                {organization.state}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">{organization.about}</p>
              <div className="mt-auto flex items-center gap-2 pt-2 text-sm">
                <span className="font-medium">
                  {total} {total === 1 ? "program" : "programs"}
                </span>
                {openNow > 0 ? (
                  <span className="rounded-full bg-open px-2 py-0.5 text-xs font-semibold text-open-foreground">
                    {openNow} open
                  </span>
                ) : null}
                <ArrowRightIcon className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
