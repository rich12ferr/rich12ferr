"use client"

import { useEffect } from "react"
import { trackEvent } from "@/lib/analytics"

const SCROLL_THRESHOLDS = [25, 50, 75, 100] as const
const SECTION_VISIBLE_RATIO = 0.3

/**
 * Reports how far a visitor gets down the homepage: furthest scroll depth and
 * which `[data-home-section]` blocks were actually seen. Each signal fires at
 * most once per page view. Renders nothing.
 */
export function HomepageEngagementTracker() {
  useEffect(() => {
    const firedDepths = new Set<number>()
    let frame = 0

    function reportDepth() {
      frame = 0
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      if (scrollable <= 0) return
      const percent = (window.scrollY / scrollable) * 100
      for (const threshold of SCROLL_THRESHOLDS) {
        if (percent >= threshold - 1 && !firedDepths.has(threshold)) {
          firedDepths.add(threshold)
          trackEvent("homepage_scrolled", { depth_percent: threshold })
        }
      }
    }

    function onScroll() {
      if (frame === 0) frame = window.requestAnimationFrame(reportDepth)
    }

    window.addEventListener("scroll", onScroll, { passive: true })

    const seenSections = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const section = (entry.target as HTMLElement).dataset.homeSection
          if (!entry.isIntersecting || !section || seenSections.has(section)) continue
          seenSections.add(section)
          trackEvent("homepage_section_viewed", { section })
          observer.unobserve(entry.target)
        }
      },
      { threshold: SECTION_VISIBLE_RATIO },
    )
    document.querySelectorAll("[data-home-section]").forEach((el) => observer.observe(el))

    return () => {
      window.removeEventListener("scroll", onScroll)
      if (frame !== 0) window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return null
}
