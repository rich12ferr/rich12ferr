import Link from "next/link"
import { notFound } from "next/navigation"
import { BadgeCheckIcon, ExternalLinkIcon, MailIcon, MapPinIcon, PhoneIcon } from "lucide-react"
import { ActivityCard } from "@/components/activity-card"
import { SectionHeading } from "@/components/section-heading"
import { Button } from "@/components/ui/button"
import { activitiesForOrganization, organizationById, seasonLabels } from "@/lib/queries"
import { formatDate, registrationStatus } from "@/lib/registration-status"
import { sourceHost } from "@/lib/format"
import type { Season } from "@/lib/types"

/**
 * Registration status and "checked N days ago" are computed from the current
 * time, so this page must not be frozen at build time. Re-rendered at most
 * every 5 minutes — well inside the day-level granularity of a deadline.
 */
export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const organization = await organizationById(id)
  if (!organization) return { title: "Organization not found" }
  return { title: organization.name, description: organization.about ?? undefined }
}

const typeLabels: Record<string, string> = {
  school: "School",
  recreation_department: "Recreation department",
  league: "League",
  club: "Club",
  nonprofit: "Nonprofit",
  other: "Organization",
}

const order: Season[] = ["fall", "winter", "spring", "summer"]

export default async function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const organization = await organizationById(id)
  if (!organization) notFound()

  const now = new Date()
  const all = await activitiesForOrganization(organization.slug)
  const openNow = all.filter((a) => ["open", "closing_soon"].includes(registrationStatus(a, now)))
  const bySeason = order
    .map((season) => ({ season, items: all.filter((a) => a.season === season) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
            {typeLabels[organization.organization_type]}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-balance">
              {organization.name}
            </h1>
            {organization.verified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-open px-2.5 py-1 text-xs font-semibold text-open-foreground">
                <BadgeCheckIcon className="size-3.5" aria-hidden="true" />
                Verified by the organization
              </span>
            ) : null}
          </div>
          <p className="max-w-2xl leading-relaxed text-muted-foreground">{organization.about}</p>
        </div>

        <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[1fr_auto]">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <dt className="sr-only">Location</dt>
              <dd className="inline-flex items-center gap-1.5 text-muted-foreground">
                <MapPinIcon className="size-3.5" aria-hidden="true" />
                {organization.town}, {organization.state} {organization.zip}
              </dd>
            </div>
            {organization.contact_email ? (
              <div className="flex items-center gap-2">
                <dt className="sr-only">Email</dt>
                <dd className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <MailIcon className="size-3.5" aria-hidden="true" />
                  <a href={`mailto:${organization.contact_email}`} className="hover:text-foreground hover:underline">
                    {organization.contact_email}
                  </a>
                </dd>
              </div>
            ) : null}
            {organization.phone ? (
              <div className="flex items-center gap-2">
                <dt className="sr-only">Phone</dt>
                <dd className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <PhoneIcon className="size-3.5" aria-hidden="true" />
                  {organization.phone}
                </dd>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <dt className="sr-only">Programs</dt>
              <dd className="text-muted-foreground">
                <span className="font-medium text-foreground">{all.length}</span> programs listed,{" "}
                <span className="font-medium text-foreground">{openNow.length}</span> open now
              </dd>
            </div>
          </dl>

          {/* Omitted entirely when unknown — a button to nowhere is worse than no button. */}
          {organization.website_url && (
            <div className="flex items-start">
              <Button
                render={
                  <a href={organization.website_url} target="_blank" rel="noopener noreferrer" />
                }
                nativeButton={false}
                variant="outline"
                size="sm"
              >
                {sourceHost(organization.website_url)}
                <ExternalLinkIcon data-icon="inline-end" />
              </Button>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {organization.last_verified_at
            ? `Organization details last verified ${formatDate(organization.last_verified_at)}.`
            : "These organization details have not been verified yet."}
          {organization.registration_platform
            ? ` Registration is handled through ${organization.registration_platform}.`
            : ""}
        </p>
      </header>

      {bySeason.map(({ season, items }) => (
        <section key={season} className="mb-10">
          <SectionHeading
            eyebrow={`${items.length} ${items.length === 1 ? "program" : "programs"}`}
            title={seasonLabels[season]}
          />
          <ul className="grid gap-4 lg:grid-cols-2">
            {items.map((activity) => (
              <li key={activity.id}>
                <ActivityCard activity={activity} now={now} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-secondary/60 p-6">
        <h2 className="font-display text-lg font-bold">Do you run this organization?</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Claiming your listing lets you confirm details and update registration dates directly, so
          families always see the current information.
        </p>
        <Button render={<Link href="/about" />} nativeButton={false} variant="outline" size="sm" className="mt-1">
          How organizations work with OpenPlay
        </Button>
      </div>
    </div>
  )
}
