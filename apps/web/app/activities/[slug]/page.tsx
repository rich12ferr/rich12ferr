import Link from "next/link"
import { notFound } from "next/navigation"
import {
  BuildingIcon,
  CalendarIcon,
  ClipboardListIcon,
  ExternalLinkIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldCheckIcon,
  TicketIcon,
  UsersIcon,
} from "lucide-react"
import { ActivityActions } from "@/components/activity-actions"
import { ActivityBadges } from "@/components/activity-badges"
import { ActivityCard } from "@/components/activity-card"
import { ReportDialog } from "@/components/report-dialog"
import { SectionHeading } from "@/components/section-heading"
import { SportMarker } from "@/components/sport-marker"
import { StatusPill } from "@/components/status-pill"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { allPublishedActivitySlugs, activityBySlug, activitiesForSport, genderLabels, programTypeLabels } from "@/lib/queries"
import { distanceLabel, eligibilityLabel, freshnessLabel, isDemoListing, seasonLabel, sourceHost, verificationLabel } from "@/lib/format"
import { formatDate, formatFee, registrationStatus, statusDetail } from "@/lib/registration-status"

/**
 * Registration status and "checked N days ago" are computed from the current
 * time, so this page must not be frozen at build time. Re-rendered at most
 * every 5 minutes — well inside the day-level granularity of a deadline.
 */
export const revalidate = 300

export async function generateStaticParams() {
  const slugs = await allPublishedActivitySlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const activity = await activityBySlug(slug)
  if (!activity) return { title: "Activity not found" }
  return {
    title: `${activity.title} — ${activity.organization.name}`,
    description: activity.description,
  }
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarIcon
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
        <dd className="text-sm leading-relaxed">{children}</dd>
      </div>
    </div>
  )
}

export default async function ActivityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const activity = await activityBySlug(slug)
  if (!activity) notFound()

  const now = new Date()
  const status = registrationStatus(activity, now)
  const canRegister = ["open", "closing_soon", "waitlist"].includes(status)

  const similar = (await activitiesForSport(activity.sport.slug))
    .filter((a) => a.id !== activity.id)
    .slice(0, 2)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/search" className="hover:text-foreground hover:underline">
              Activities
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/sports/${activity.sport.slug}`} className="hover:text-foreground hover:underline">
              {activity.sport.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="truncate font-medium text-foreground">
            {activity.title}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <article className="flex flex-col gap-6">
          <header className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <SportMarker slug={activity.sport.slug} name={activity.sport.name} size="lg" />
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight text-balance">
                  {activity.title}
                </h1>
                <p className="text-muted-foreground">
                  <Link
                    href={`/organizations/${activity.organization_id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {activity.organization.name}
                  </Link>
                  {" \u00b7 "}
                  {activity.sport.name}
                  {" \u00b7 "}
                  {seasonLabel(activity)}
                </p>
              </div>
            </div>

            <ActivityBadges activity={activity} status={status} now={now} />

            <p className="max-w-2xl leading-relaxed text-muted-foreground text-pretty">
              {activity.description}
            </p>
          </header>

          <Separator />

          <section aria-labelledby="details-heading">
            <h2 id="details-heading" className="mb-2 font-display text-lg font-bold">
              Program details
            </h2>
            <dl className="divide-y divide-border">
              <DetailRow icon={UsersIcon} label="Who can play">
                {eligibilityLabel(activity)}
                <br />
                <span className="text-muted-foreground">
                  {genderLabels[activity.gender]} &middot; {programTypeLabels[activity.program_type]}
                  {activity.experience_level ? ` \u00b7 ${activity.experience_level}` : ""}
                </span>
                {activity.residency_requirement ? (
                  <>
                    <br />
                    <span className="text-muted-foreground">{activity.residency_requirement}</span>
                  </>
                ) : null}
              </DetailRow>

              <DetailRow icon={CalendarIcon} label="Dates">
                <ul className="flex flex-col gap-0.5">
                  <li>Registration opens: {formatDate(activity.registration_open_date)}</li>
                  <li>Registration closes: {formatDate(activity.registration_close_date)}</li>
                  <li>Season: {formatDate(activity.season_start_date)} to {formatDate(activity.season_end_date)}</li>
                  {activity.tryout_required ? (
                    <li>Tryouts / evaluations: {formatDate(activity.tryout_date)}</li>
                  ) : null}
                </ul>
              </DetailRow>

              <DetailRow icon={TicketIcon} label="Cost">
                <span className="font-medium">{formatFee(activity.registration_fee, activity.currency)}</span>
                {activity.additional_fees ? (
                  <>
                    <br />
                    <span className="text-muted-foreground">{activity.additional_fees}</span>
                  </>
                ) : null}
                {activity.equipment_requirements ? (
                  <>
                    <br />
                    <span className="text-muted-foreground">
                      Equipment: {activity.equipment_requirements}
                    </span>
                  </>
                ) : null}
              </DetailRow>

              <DetailRow icon={ClipboardListIcon} label="Schedule and commitment">
                <ul className="flex flex-col gap-0.5">
                  {activity.practice_schedule ? <li>Practices: {activity.practice_schedule}</li> : null}
                  {activity.game_schedule ? <li>Games: {activity.game_schedule}</li> : null}
                  {activity.tryout_details ? <li>{activity.tryout_details}</li> : null}
                  {!activity.practice_schedule && !activity.game_schedule ? (
                    <li className="text-muted-foreground">Schedule not published yet.</li>
                  ) : null}
                </ul>
              </DetailRow>

              <DetailRow icon={MapPinIcon} label="Where">
                {activity.venue_name ?? `${activity.town}, ${activity.state}`}
                {activity.venue_address ? (
                  <>
                    <br />
                    <span className="text-muted-foreground">{activity.venue_address}</span>
                  </>
                ) : null}
                {distanceLabel(activity.distance_from_hub) ? (
                  <>
                    <br />
                    <span className="text-muted-foreground">{distanceLabel(activity.distance_from_hub)}</span>
                  </>
                ) : null}
              </DetailRow>

              <DetailRow icon={BuildingIcon} label="Run by">
                <Link href={`/organizations/${activity.organization_id}`} className="font-medium hover:underline">
                  {activity.organization.name}
                </Link>
                <ul className="mt-1 flex flex-col gap-1 text-muted-foreground">
                  {activity.contact_email ? (
                    <li className="flex items-center gap-1.5">
                      <MailIcon className="size-3.5" aria-hidden="true" />
                      <a href={`mailto:${activity.contact_email}`} className="hover:text-foreground hover:underline">
                        {activity.contact_email}
                      </a>
                      {activity.contact_name ? ` (${activity.contact_name})` : ""}
                    </li>
                  ) : null}
                  {activity.organization.phone ? (
                    <li className="flex items-center gap-1.5">
                      <PhoneIcon className="size-3.5" aria-hidden="true" />
                      {activity.organization.phone}
                    </li>
                  ) : null}
                </ul>
              </DetailRow>
            </dl>
          </section>

          <section
            aria-labelledby="source-heading"
            className="rounded-2xl border border-border bg-secondary/60 p-5"
          >
            <h2 id="source-heading" className="mb-2 flex items-center gap-2 font-display text-base font-bold">
              <ShieldCheckIcon className="size-4" aria-hidden="true" />
              Where this information came from
            </h2>
            {isDemoListing(activity) ? (
              <p className="text-sm font-medium text-foreground">
                This is a demo listing seeded for the launch region &mdash; it does not represent a
                real program, and there is no source to verify it against yet.
              </p>
            ) : (
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Source</dt>
                  <dd>
                    <a
                      href={activity.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
                    >
                      {sourceHost(activity.source_url)}
                      <ExternalLinkIcon className="size-3" aria-hidden="true" />
                    </a>
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Verification</dt>
                  <dd className="font-medium">{verificationLabel(activity)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Last checked</dt>
                  <dd className="font-medium">{freshnessLabel(activity, now)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Method</dt>
                  <dd className="font-medium">{activity.verification_method}</dd>
                </div>
              </dl>
            )}
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Sign Up Vermont is a directory, not the organizer. Always confirm details on the
              organization&apos;s own page before you pay &mdash; and tell us if something looks off.
            </p>
            <div className="mt-2 -ml-2">
              <ReportDialog activityTitle={activity.title} />
            </div>
          </section>

          {similar.length > 0 ? (
            <section aria-labelledby="similar-heading">
              <SectionHeading
                title={`Other ${activity.sport.name.toLowerCase()} programs`}
                className="mb-4"
              />
              <h2 id="similar-heading" className="sr-only">
                Similar activities
              </h2>
              <ul className="grid gap-4">
                {similar.map((item) => (
                  <li key={item.id}>
                    <ActivityCard activity={item} now={now} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </article>

        {/* Registration rail */}
        <aside className="lg:sticky lg:top-20 lg:h-fit">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col gap-2">
              <StatusPill status={status} className="w-fit" />
              <p className="font-display text-lg leading-snug font-bold text-pretty">
                {statusDetail(activity, now)}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatFee(activity.registration_fee, activity.currency)}
                {activity.capacity ? ` \u00b7 ${activity.capacity} spots` : ""}
              </p>
            </div>

            {isDemoListing(activity) ? (
              <Button size="lg" disabled>
                No registration &mdash; demo listing
              </Button>
            ) : canRegister && activity.registration_url ? (
              <Button
                render={
                  <a href={activity.registration_url} target="_blank" rel="noopener noreferrer" />
                }
                nativeButton={false}
                size="lg"
              >
                {status === "waitlist" ? "Join the waitlist" : "Register"}
                <ExternalLinkIcon data-icon="inline-end" />
              </Button>
            ) : status !== "closed" && activity.source_url ? (
              <Button
                render={<a href={activity.source_url} target="_blank" rel="noopener noreferrer" />}
                nativeButton={false}
                size="lg"
                variant="outline"
              >
                View program page
                <ExternalLinkIcon data-icon="inline-end" />
              </Button>
            ) : (
              <Button size="lg" disabled>
                {status === "closed"
                  ? "Registration closed"
                  : status === "upcoming"
                    ? "Registration not open yet"
                    : "Registration info not published"}
              </Button>
            )}

            {!isDemoListing(activity) && !activity.registration_url && status !== "closed" && activity.source_url ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                We don&apos;t have a direct signup link yet &mdash; this opens the organization&apos;s
                program page, where you can find how to register.
              </p>
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Registration happens on{" "}
                {activity.registration_provider ?? activity.organization.name}&apos;s site. Sign Up
                Vermont never collects payment or personal details.
              </p>
            )}

            <Separator />

            <ActivityActions
              activityTitle={activity.title}
              programId={activity.program_id}
              layout="stack"
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
