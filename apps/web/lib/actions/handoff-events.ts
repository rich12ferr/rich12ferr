"use server"

import { createHandoffEvent } from "@openplay/db"
import { PAGE_TYPES, type PageType, type RegistrationHandoffProps } from "@/lib/analytics"
import { isAdminRequest } from "@/lib/is-admin-request"

/**
 * Persists one registration/website handoff click to `handoff_events`.
 *
 * Called fire-and-forget from `RegistrationHandoffButton` and the weekly
 * story CTA's external branch, alongside (not instead of) the existing
 * `registration_handoff_clicked` Vercel Analytics beacon — this is what makes
 * "how many clicks by organization, by date" a plain SQL query against our
 * own database instead of something only the Analytics dashboard can answer.
 *
 * Takes the exact same payload shape the analytics beacon already gets
 * (`RegistrationHandoffProps`), so every call site builds one object for
 * both. Never throws: a database hiccup here must not be visible to the
 * visitor or block the outbound navigation the button already started.
 */
export async function recordRegistrationHandoff(
  props: RegistrationHandoffProps & {
    destination_url: string
    session_id?: string | null
    discovery_origin?: string | null
    page?: string | null
  },
): Promise<void> {
  try {
    // Admin clicks are internal testing; keep them out of conversion metrics.
    if (await isAdminRequest()) return
    const page = PAGE_TYPES.includes(props.page as PageType) ? (props.page as PageType) : null
    await createHandoffEvent({
      page,
      ctaLabel: props.cta_label,
      ctaLocation: props.cta_location,
      destinationUrl: props.destination_url,
      registrationStatus: props.registration_status ?? null,
      registrationProvider: props.registration_provider ?? null,
      sourceType: props.source_type ?? null,
      offeringId: props.offering_id ?? null,
      programId: props.program_id ?? null,
      organizationId: props.organization_id ?? null,
      organizationName: props.organization_name ?? null,
      organizationType: props.organization_type ?? null,
      sportId: props.sport_id ?? null,
      sportSlug: props.sport_slug ?? null,
      sportName: props.sport_name ?? null,
      town: props.town ?? null,
      state: props.state ?? null,
      zip: props.zip ?? null,
      sessionId: props.session_id ?? null,
      discoveryOrigin: props.discovery_origin ?? null,
      // Whitelisted, not passed through: only the literal "featured" is a placement.
      placement: props.placement === "featured" ? "featured" : null,
    })
  } catch (error) {
    console.error("[v0] Failed to record handoff event:", error)
  }
}
