"use server"

import { createPageView, offeringsByProgramSlug, organizationByIdOrSlug, sportRowBySlug } from "@openplay/db"
import { pathToPage } from "@/lib/analytics"
import { isAdminRequest } from "@/lib/is-admin-request"

/**
 * Persists one public page view to `page_views`, the denominator for the
 * admin conversion report. The client sends only the pathname; the page type
 * and organization/sport fields are derived here from the URL and database.
 * Admin sessions are skipped. Never throws.
 */
export async function recordPageView(input: { pathname: string; sessionId: string | null }): Promise<void> {
  try {
    if (typeof input.pathname !== "string") return
    const path = input.pathname.slice(0, 300)
    const page = pathToPage(path)
    if (!page) return
    if (await isAdminRequest()) return

    const segment = decodeURIComponent(path.split("/").filter(Boolean)[1] ?? "")
    const fields: Parameters<typeof createPageView>[0] = {
      page,
      path,
      sessionId: typeof input.sessionId === "string" ? input.sessionId.slice(0, 64) : null,
    }

    if (page === "activity_detail") {
      const [listing] = await offeringsByProgramSlug(segment)
      if (!listing) return
      Object.assign(fields, {
        offeringId: listing.offeringId,
        programId: listing.programId,
        organizationId: listing.organizationId,
        organizationName: listing.organizationName,
        sportId: listing.sportId,
        sportSlug: listing.sportSlug,
        sportName: listing.sportName,
      })
    } else if (page === "organization_page") {
      const org = await organizationByIdOrSlug(segment)
      if (!org) return
      Object.assign(fields, { organizationId: org.id, organizationName: org.name })
    } else if (page === "sport_page") {
      const sport = await sportRowBySlug(segment)
      if (!sport) return
      Object.assign(fields, { sportId: sport.id, sportSlug: sport.slug, sportName: sport.name })
    }

    await createPageView(fields)
  } catch (error) {
    console.error("[v0] Failed to record page view:", error)
  }
}
