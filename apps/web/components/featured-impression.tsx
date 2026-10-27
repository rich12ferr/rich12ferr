"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { recordFeaturedImpression } from "@/lib/actions/featured-impressions"
import { ensureSessionId, trackEvent, type FeaturedSurface } from "@/lib/analytics"

/**
 * Counts one impression when its Featured card is at least half on screen,
 * once per mount (one page view). A card rendered below the fold that is
 * never scrolled to is not counted.
 */
export function FeaturedImpression({
  offeringId,
  organizationId,
  surface,
  children,
  className,
}: {
  offeringId: string
  organizationId: string
  surface: FeaturedSurface
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        trackEvent("featured_impression", { listing_id: offeringId, organization_id: organizationId, surface })
        void recordFeaturedImpression({ offeringId, surface, sessionId: ensureSessionId() }).catch(() => {})
      },
      { threshold: 0.5 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [offeringId, organizationId, surface])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
