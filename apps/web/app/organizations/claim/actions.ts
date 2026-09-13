"use server"

import { createReport, sendEmail } from "@openplay/db"

export type OrganizationClaimInput = {
  name: string
  role: string
  email: string
  organizationName: string
  organizationId?: string | null
  message: string
}

export type OrganizationClaimResult = { ok: true } | { ok: false; error: string }

/** Same inbox the /contact form and suggested-edit form page &mdash; one place the admin already checks. */
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL

/**
 * Records an organization's self-reported claim/update request as a
 * `reports` row (category "organization_claim", status "new"). Nothing here
 * changes the live listing automatically &mdash; an admin reads the request and
 * updates the organization and its programs by hand, per PRD (claim rights
 * are asserted, not yet verified against the actual org, so no auto-apply).
 *
 * Uses the generic `entityType`/`entityId` columns (rather than
 * `programId`/`offeringId`) because a claim is about the organization as a
 * whole, not a single program or offering.
 *
 * Re-validates server-side because this form is reachable without the
 * client-side checks (disabled JS, direct POST) and requires no account.
 */
export async function submitOrganizationClaim(input: OrganizationClaimInput): Promise<OrganizationClaimResult> {
  const name = input.name.trim()
  const role = input.role.trim()
  const email = input.email.trim()
  const organizationName = input.organizationName.trim()
  const message = input.message.trim()

  if (!name || !role || !organizationName || !message) {
    return { ok: false, error: "A few required fields are still empty." }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "That email address does not look right." }
  }

  const details = [
    `Organization: ${organizationName}${input.organizationId ? ` (${input.organizationId})` : ""}`,
    `Submitted by: ${name}, ${role}`,
    `Official email: ${email}`,
    "",
    message,
  ].join("\n")

  try {
    await createReport({
      category: "organization_claim",
      entityType: input.organizationId ? "organization" : null,
      entityId: input.organizationId ?? null,
      details,
      reporterEmail: email,
    })
  } catch (error) {
    console.error("[v0] Failed to save organization claim:", error)
    return { ok: false, error: "Something went wrong sending your request. Please try again." }
  }

  // Best-effort notification: the request is already saved, so a mail
  // failure here is logged, never surfaced as a form error to the visitor.
  if (CONTACT_TO_EMAIL) {
    const result = await sendEmail({
      to: CONTACT_TO_EMAIL,
      subject: `Organization claim/update: ${organizationName}`,
      text: details,
    })
    if (!result.ok) {
      console.error(`[v0] Organization claim saved but admin email failed to send: ${result.error}`)
    }
  } else {
    console.warn("[v0] CONTACT_TO_EMAIL is not set; skipping admin notification for organization claim.")
  }

  return { ok: true }
}
