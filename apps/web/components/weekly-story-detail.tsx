import Link from "next/link"
import {
  ArrowRightIcon,
  BuildingIcon,
  CalendarIcon,
  ExternalLinkIcon,
  HourglassIcon,
  MapPinIcon,
} from "lucide-react"
import { StatusPill } from "@/components/status-pill"
import { WeeklyStoryMarker } from "@/components/weekly-story-marker"
import { Button } from "@/components/ui/button"
import { sourceHost } from "@/lib/format"
import { formatDate } from "@/lib/registration-status"
import type { WeeklyStory } from "@/lib/types"

function Fact({
  icon: Icon,
  children,
}: {
  icon: typeof CalendarIcon
  children: React.ReactNode
}) {
  return (
    <li className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span>{children}</span>
    </li>
  )
}

/**
 * One development inside the full `/this-week/[week]` article. Unlike the
 * homepage's `WeeklyStoryCard`, this includes the structured facts the spec
 * calls for (org, dates, status, waitlist, source) and a prominent CTA into
 * the corresponding Sign Up Vermont record — the article's job is context,
 * the activity page's job is the registration path.
 */
export function WeeklyStoryDetail({ story, index }: { story: WeeklyStory; index: number }) {
  const isExternalCta = story.ctaHref.startsWith("http")

  return (
    <article
      id={story.id}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-card-foreground sm:p-7"
    >
      <div className="flex items-start gap-3">
        <WeeklyStoryMarker sport={story.sport} season={story.season} size="lg" />
        <div className="flex min-w-0 flex-col gap-1 pt-1">
          <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
            {String(index + 1).padStart(2, "0")}
            {" \u00b7 "}
            {story.sport?.name ?? story.categoryLabel ?? "This week"}
          </p>
          <h3 className="font-display text-xl leading-tight font-extrabold text-balance sm:text-2xl">
            {story.headline}
          </h3>
        </div>
      </div>

      <p className="max-w-3xl leading-relaxed text-foreground/90 text-pretty">{story.body}</p>

      <ul className="grid gap-2 text-sm text-foreground/90 sm:grid-cols-2">
        {story.organizationName ? (
          <Fact icon={BuildingIcon}>
            {story.organizationId ? (
              <Link href={`/organizations/${story.organizationId}`} className="font-medium hover:underline">
                {story.organizationName}
              </Link>
            ) : (
              <span className="font-medium">{story.organizationName}</span>
            )}
          </Fact>
        ) : null}

        {story.locationLabel ? <Fact icon={MapPinIcon}>{story.locationLabel}</Fact> : null}

        {story.registrationStatus ? (
          <Fact icon={CalendarIcon}>
            <span className="inline-flex items-center gap-2">
              <StatusPill status={story.registrationStatus} size="sm" />
              {story.registrationOpensOn ? `Opens ${formatDate(story.registrationOpensOn)}` : null}
              {story.registrationClosesOn ? `Closes ${formatDate(story.registrationClosesOn)}` : null}
            </span>
          </Fact>
        ) : null}

        {story.waitlistStatus ? <Fact icon={HourglassIcon}>{story.waitlistStatus}</Fact> : null}

        {story.programDatesLabel ? <Fact icon={CalendarIcon}>{story.programDatesLabel}</Fact> : null}

        {story.sourceUrl ? (
          <Fact icon={ExternalLinkIcon}>
            <a
              href={story.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {story.sourceLabel ?? sourceHost(story.sourceUrl)}
            </a>
          </Fact>
        ) : null}
      </ul>

      {story.missingActivity ? (
        <p className="rounded-xl bg-secondary/80 px-3.5 py-2.5 text-xs leading-relaxed text-secondary-foreground">
          {story.missingActivityNote ??
            "Not yet listed on Sign Up Vermont — we're tracking it for a future update."}
        </p>
      ) : null}

      <Button render={<Link href={story.ctaHref} />} nativeButton={false} className="w-fit" size="sm">
        {story.ctaLabel}
        {isExternalCta ? (
          <ExternalLinkIcon data-icon="inline-end" />
        ) : (
          <ArrowRightIcon data-icon="inline-end" />
        )}
      </Button>
    </article>
  )
}
