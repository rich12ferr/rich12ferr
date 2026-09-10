"use client"

import Link from "next/link"
import { ArrowRightIcon, MapPinIcon } from "lucide-react"
import { WeeklyStoryMarker } from "@/components/weekly-story-marker"
import { trackEvent } from "@/lib/analytics"
import type { WeeklyStory } from "@/lib/types"

/**
 * The homepage's "What's happening this week" teaser card. Deliberately
 * lighter than `ActivityCard` — no status pill, no fee, no distance — this is
 * a headline and a pointer, not a listing. The whole card is one link (the
 * story's own `ctaHref`), which per the product spec resolves to a Sign Up
 * Vermont activity, search, or organization page, never straight off-site.
 */
export function WeeklyStoryCard({ story }: { story: WeeklyStory }) {
  const meta = [story.sport?.name ?? story.categoryLabel, story.locationLabel].filter(Boolean)

  return (
    <Link
      href={story.ctaHref}
      onClick={() =>
        trackEvent("weekly_update_activity_clicked", {
          story_id: story.id,
          cta_label: story.ctaLabel,
          destination: story.ctaHref,
        })
      }
      className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-card-foreground transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="flex items-start gap-3">
        <WeeklyStoryMarker sport={story.sport} season={story.season} />
        <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
          {meta.length > 0 ? (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {meta[0]}
              {story.locationLabel ? (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <MapPinIcon className="size-3" aria-hidden="true" />
                  {story.locationLabel}
                </>
              ) : null}
            </p>
          ) : null}
          <h3 className="font-display text-lg leading-snug font-bold text-pretty group-hover:underline">
            {story.headline}
          </h3>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{story.teaser}</p>

      <p className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        {story.ctaLabel}
        <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </p>
    </Link>
  )
}
