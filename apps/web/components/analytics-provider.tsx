"use client"

import { useEffect } from "react"
import { ensureSessionId, markAlertAssisted, pathToOrigin, setDiscoveryOrigin, trackEvent } from "@/lib/analytics"

const STARTED_KEY = "suv.analytics.discovery_started"

/**
 * Bootstraps analytics session context for the visit and fires
 * `discovery_started` once. Reads `window.location` directly (rather than the
 * router hooks) so it never forces a Suspense boundary or opts pages out of
 * static rendering. Page-level `TrackView` beacons refine the discovery origin
 * as the visitor moves between discovery surfaces.
 */
export function AnalyticsProvider() {
  useEffect(() => {
    ensureSessionId()

    // An alert link arrival is sticky for the session, so a later handoff can
    // be attributed as alert-assisted. Alert emails aren't sending yet, so in
    // practice this stays false today — the plumbing is here for when they do.
    const query = new URLSearchParams(window.location.search)
    if (query.get("src") === "alert" || query.get("utm_source") === "alert") {
      markAlertAssisted()
    }

    if (window.sessionStorage.getItem(STARTED_KEY)) return
    const origin = pathToOrigin(window.location.pathname)
    setDiscoveryOrigin(origin)
    trackEvent("discovery_started", { origin })
    window.sessionStorage.setItem(STARTED_KEY, "1")
  }, [])

  return null
}
