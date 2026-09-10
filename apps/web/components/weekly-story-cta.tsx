"use client"

import Link from "next/link"
import { ArrowRightIcon, ExternalLinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackEvent } from "@/lib/analytics"
import type { WeeklyStory } from "@/lib/types"

/**
 * The primary CTA inside a full weekly-edition story. A story either points at
 * a Sign Up Vermont page (internal — a discovery click) or off-site (external —
 * a registration handoff), so the click is attributed to the matching event.
 */
export function WeeklyStoryCta({ story }: { story: WeeklyStory }) {
  const isExternal = story.ctaHref.startsWith("http")

  function handleClick() {
    if (isExternal) {
      trackEvent("registration_handoff_clicked", {
        cta_label: story.ctaLabel,
        cta_location: "weekly_update_detail",
        organization_id: story.organizationId,
        registration_status: story.registrationStatus,
      })
    } else {
      trackEvent("weekly_update_activity_clicked", {
        story_id: story.id,
        cta_label: story.ctaLabel,
        destination: story.ctaHref,
      })
    }
  }

  return (
    <Button
      render={
        isExternal ? (
          <a href={story.ctaHref} target="_blank" rel="noopener noreferrer" onClick={handleClick} />
        ) : (
          <Link href={story.ctaHref} onClick={handleClick} />
        )
      }
      nativeButton={false}
      className="w-fit"
      size="sm"
    >
      {story.ctaLabel}
      {isExternal ? (
        <ExternalLinkIcon data-icon="inline-end" />
      ) : (
        <ArrowRightIcon data-icon="inline-end" />
      )}
    </Button>
  )
}
