"use client"

import { useEffect, useRef } from "react"
import {
  setDiscoveryOrigin,
  trackEvent,
  type AnalyticsEventMap,
  type AnalyticsEventName,
  type DiscoveryOrigin,
} from "@/lib/analytics"

/**
 * A render-nothing beacon dropped into a Server Component page to fire a
 * view-level event and/or record the discovery surface on mount. Discovery
 * pages (search, org, weekly) pass `discoveryOrigin` so a later handoff is
 * attributed to them; destination pages (an activity offering) fire a view
 * event without touching the origin, preserving where the visitor came from.
 */
export function TrackView<K extends AnalyticsEventName>({
  event,
  payload,
  discoveryOrigin,
}: {
  event?: K
  payload?: AnalyticsEventMap[K]
  discoveryOrigin?: DiscoveryOrigin
}) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    // Origin is set before the view event so the event's own context reflects it.
    if (discoveryOrigin) setDiscoveryOrigin(discoveryOrigin)
    if (event) trackEvent(event, payload as AnalyticsEventMap[K])
  }, [event, payload, discoveryOrigin])

  return null
}
