"use client"

import { useState, useTransition } from "react"
import { BellIcon, BellRingIcon, Share2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createActivityAlert } from "@/app/alerts/actions"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Alert capture + share on an activity page.
 *
 * The alert flow is deliberately inline and login-free (see product decision):
 * "Alert me" reveals an email field right here, the parent submits without
 * leaving the page, and success is shown in place. No redirect to sign-in.
 * Bookmarking/"Save" is intentionally deferred, so it is not offered here.
 */
export function ActivityActions({
  activityTitle,
  programId,
  layout = "row",
}: {
  activityTitle: string
  /** Durable program to watch — the alert survives into next season. */
  programId: string
  layout?: "row" | "stack"
}) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [email, setEmail] = useState("")
  const [pending, startTransition] = useTransition()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = email.trim()
    if (!EMAIL_RE.test(value)) {
      toast.error("That email address does not look right.")
      return
    }
    startTransition(async () => {
      const result = await createActivityAlert({
        email: value,
        programId,
        label: activityTitle,
      })
      if (result.ok) {
        setDone(true)
        toast.success("You're on the list", {
          description: `We'll email you when registration opens for ${activityTitle}.`,
        })
      } else {
        toast.error(result.error)
      }
    })
  }

  async function share() {
    const url = typeof window === "undefined" ? "" : window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied")
    } catch {
      toast.message("Copy this link", { description: url })
    }
  }

  const isStack = layout === "stack"

  // Success state: replaces the button in place, parent never navigated away.
  if (done) {
    return (
      <div className={isStack ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-2"}>
        <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground">
          <BellRingIcon data-icon="inline-start" aria-hidden="true" />
          We&apos;ll email you when registration opens.
        </div>
        <Button variant="ghost" onClick={share}>
          <Share2Icon data-icon="inline-start" />
          Share
        </Button>
      </div>
    )
  }

  return (
    <div className={isStack ? "flex flex-col gap-3" : "flex flex-col gap-3"}>
      {open ? (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <label htmlFor="alert-email" className="text-sm font-medium">
            Get an email when registration opens
          </label>
          <div className={isStack ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-2"}>
            <Input
              id="alert-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-w-0 flex-1 sm:w-64"
              aria-describedby="alert-email-note"
            />
            <Button type="submit" disabled={pending}>
              {pending ? "Setting up…" : "Notify me"}
            </Button>
          </div>
          <p id="alert-email-note" className="text-xs text-muted-foreground text-pretty">
            No account needed. Every email has a one-click unsubscribe.
          </p>
        </form>
      ) : (
        <div className={isStack ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-2"}>
          <Button variant="outline" onClick={() => setOpen(true)}>
            <BellIcon data-icon="inline-start" />
            Alert me
          </Button>
          <Button variant="ghost" onClick={share}>
            <Share2Icon data-icon="inline-start" />
            Share
          </Button>
        </div>
      )}
    </div>
  )
}
