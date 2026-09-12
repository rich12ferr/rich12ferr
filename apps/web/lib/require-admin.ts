import "server-only"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth, isAdminEmail } from "@/lib/auth"

/**
 * Server Component guard for every page under `/admin`. Redirects rather
 * than throwing, since a page render should navigate the visitor away, not
 * show an error boundary.
 */
export async function requireAdminPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user || !isAdminEmail(session.user.email)) {
    redirect("/admin-sign-in")
  }
  return session
}

/**
 * Server Action guard for admin mutations (e.g. `saveActivity`,
 * `updateReportStatus`). Actions are independently callable endpoints —
 * the `/admin` layout's redirect never runs for a direct action call — so
 * every admin action must re-check the session itself. Throws instead of
 * redirecting since actions return data to the calling component, not a
 * navigation.
 */
export async function requireAdminAction() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user || !isAdminEmail(session.user.email)) {
    throw new Error("Unauthorized")
  }
  return session
}
