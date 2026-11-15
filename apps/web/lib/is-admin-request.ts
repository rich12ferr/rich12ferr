import "server-only"

import { headers } from "next/headers"
import { auth, isAdminEmail } from "@/lib/auth"

/** True when the current request comes from a signed-in admin, so their own browsing stays out of conversion metrics. */
export async function isAdminRequest(): Promise<boolean> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    return Boolean(session?.user && isAdminEmail(session.user.email))
  } catch {
    return false
  }
}
