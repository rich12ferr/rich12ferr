"use server"

import { createFeaturedImpression, offeringById, offeringFeaturedAt } from "@openplay/db"
import type { FeaturedSurface } from "@/lib/analytics"

const SURFACES: FeaturedSurface[] = ["homepage", "sport_page"]

/**
 * Persists one Featured card impression. The client only supplies which
 * listing and surface; organization fields are read from the database, and
 * the write is dropped unless the listing is currently Featured — so the
 * per-organization report can't be padded by arbitrary calls. Never throws.
 */
export async function recordFeaturedImpression(input: {
  offeringId: string
  surface: FeaturedSurface
  sessionId: string | null
}): Promise<void> {
  try {
    if (!SURFACES.includes(input.surface) || typeof input.offeringId !== "string") return
    const [featuredAt, listing] = await Promise.all([
      offeringFeaturedAt(input.offeringId),
      offeringById(input.offeringId),
    ])
    if (!featuredAt || !listing) return
    await createFeaturedImpression({
      surface: input.surface,
      offeringId: listing.offeringId,
      programId: listing.programId,
      organizationId: listing.organizationId,
      organizationName: listing.organizationName,
      sportSlug: listing.sportSlug,
      sessionId: typeof input.sessionId === "string" ? input.sessionId.slice(0, 64) : null,
    })
  } catch (error) {
    console.error("[v0] Failed to record featured impression:", error)
  }
}
