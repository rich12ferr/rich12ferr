"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOutIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/auth-client"

export function AdminSignOutButton({ email }: { email: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleSignOut() {
    setPending(true)
    await signOut()
    router.push("/admin-sign-in")
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
      <Button variant="outline" size="sm" onClick={handleSignOut} disabled={pending}>
        <LogOutIcon aria-hidden="true" />
        {pending ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  )
}
