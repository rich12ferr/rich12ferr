"use server"

import {
  createAlert,
  deleteAlert,
  getAlertsByEmail,
  setAlertActive,
  unsubscribeAlert,
  type AlertTrigger,
} from "@openplay/db"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Trigger set offered for a single-program ("activity") watch. */
const ACTIVITY_TRIGGERS: AlertTrigger[] = [
  "registration_opened",
  "registration_closing_soon",
  "deadline_changed",
]

export type CreateActivityAlertInput = {
  email: string
  programId: string
  /** Captured for a stable manage-list label even if the program is renamed. */
  label: string
}

export type CreateAlertResult =
  | { ok: true; unsubscribeToken: string }
  | { ok: false; error: string }

/**
 * Creates an "activity" alert from the inline capture on an activity page.
 *
 * Runs with no session on purpose: the whole point of inline capture is that a
 * parent can subscribe without an account. Email is validated server-side
 * because a server action is a public endpoint reachable without the client
 * form's checks.
 */
export async function createActivityAlert(
  input: CreateActivityAlertInput,
): Promise<CreateAlertResult> {
  const email = input.email.trim().toLowerCase()

  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "That email address does not look right." }
  }
  if (!input.programId) {
    return { ok: false, error: "Missing the activity to watch." }
  }

  try {
    const row = await createAlert({
      email,
      kind: "activity",
      programId: input.programId,
      triggers: ACTIVITY_TRIGGERS,
      label: input.label,
    })
    // Delivery (confirmation email + trigger scanning) is wired in the
    // delivery task; the row exists and is active now.
    return { ok: true, unsubscribeToken: row.unsubscribeToken }
  } catch (error) {
    console.error("[v0] Failed to create activity alert:", error)
    return { ok: false, error: "Something went wrong saving your alert. Please try again." }
  }
}

export type CreateStandingAlertInput = {
  email: string
  kind: "sport" | "child_match"
  /** Sport slug resolved to an id by the caller; null for child_match. */
  sportId?: string | null
  grade?: number | null
  zip?: string | null
  radiusMiles?: number | null
  triggers: AlertTrigger[]
  label: string
}

/**
 * Creates a "sport" or "child_match" alert from the standalone /alerts form.
 * These watch a query over future activities, so they carry geo criteria
 * instead of a single program id.
 */
export async function createStandingAlert(
  input: CreateStandingAlertInput,
): Promise<CreateAlertResult> {
  const email = input.email.trim().toLowerCase()

  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Add an email address so we know where to send the alert." }
  }
  if (input.kind === "sport" && !input.sportId) {
    return { ok: false, error: "Pick a sport to follow." }
  }
  if (input.triggers.length === 0) {
    return { ok: false, error: "Choose at least one thing to be notified about." }
  }

  try {
    const row = await createAlert({
      email,
      kind: input.kind,
      sportId: input.kind === "sport" ? input.sportId : null,
      grade: input.grade ?? null,
      zip: input.zip ?? null,
      radiusMiles: input.radiusMiles ?? null,
      triggers: input.triggers,
      label: input.label,
    })
    return { ok: true, unsubscribeToken: row.unsubscribeToken }
  } catch (error) {
    console.error("[v0] Failed to create standing alert:", error)
    return { ok: false, error: "Something went wrong saving your alert. Please try again." }
  }
}

export type AlertListItem = {
  id: string
  kind: string
  label: string
  triggers: string[]
  active: boolean
  createdAt: string
}

/** Loads a parent's alerts by email for the login-free manage view. */
export async function listAlertsByEmail(email: string): Promise<AlertListItem[]> {
  const normalized = email.trim().toLowerCase()
  if (!EMAIL_RE.test(normalized)) return []

  const rows = await getAlertsByEmail(normalized)
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    label: row.label,
    triggers: row.triggers,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  }))
}

/**
 * Pauses or resumes an alert from the login-free manage view. Email is passed
 * (not a session) and enforced in the query so a bare id cannot toggle someone
 * else's alert.
 */
export async function toggleAlertActive(
  id: string,
  email: string,
  active: boolean,
): Promise<{ ok: boolean }> {
  try {
    const row = await setAlertActive(id, email, active)
    return { ok: row !== null }
  } catch (error) {
    console.error("[v0] Failed to toggle alert:", error)
    return { ok: false }
  }
}

/** Permanently deletes an alert from the manage view. Email-scoped. */
export async function deleteAlertAction(
  id: string,
  email: string,
): Promise<{ ok: boolean }> {
  try {
    const ok = await deleteAlert(id, email)
    return { ok }
  } catch (error) {
    console.error("[v0] Failed to delete alert:", error)
    return { ok: false }
  }
}

/** One-click, login-free unsubscribe from an email link. Idempotent. */
export async function unsubscribeByToken(token: string): Promise<{ ok: boolean }> {
  try {
    const row = await unsubscribeAlert(token)
    return { ok: row !== null }
  } catch (error) {
    console.error("[v0] Failed to unsubscribe:", error)
    return { ok: false }
  }
}
