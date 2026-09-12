import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { AdminAuthForm } from "@/components/admin-auth-form"
import { auth, isAdminEmail } from "@/lib/auth"

export const metadata = {
  title: "Admin sign in",
}

/**
 * Not nested under `app/admin` on purpose: that layout's `requireAdminPage()`
 * check would otherwise redirect here in an infinite loop the moment an
 * unauthenticated visitor lands on this very page.
 */
export default async function AdminSignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user && isAdminEmail(session.user.email)) {
    redirect("/admin")
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center px-4 py-12">
      <AdminAuthForm />
    </div>
  )
}
