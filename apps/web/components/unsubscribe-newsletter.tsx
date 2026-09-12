"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2Icon, XCircleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { unsubscribeNewsletterByToken } from "@/app/newsletter/actions"

type State = "working" | "done" | "error"

/**
 * Fires the unsubscribe on mount so an email footer link is genuinely
 * one-click. Idempotent server-side, so an email client prefetching the link
 * and a real click both land on the same "unsubscribed" result.
 */
export function UnsubscribeNewsletter({ token }: { token: string }) {
  const [state, setState] = useState<State>("working")

  useEffect(() => {
    let cancelled = false
    unsubscribeNewsletterByToken(token).then((result) => {
      if (cancelled) return
      setState(result.ok ? "done" : "error")
    })
    return () => {
      cancelled = true
    }
  }, [token])

  if (state === "working") {
    return <p className="text-muted-foreground">Updating your subscription…</p>
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-start gap-4">
        <span className="flex size-11 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <XCircleIcon className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-xl font-bold">We couldn&apos;t find that subscription</h1>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            The unsubscribe link may be invalid or you may already be unsubscribed. You can also
            manage your email preferences from the alerts page.
          </p>
        </div>
        <Button render={<Link href="/alerts" />} nativeButton={false} variant="outline" size="sm">
          Manage email preferences
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-4">
      <span className="flex size-11 items-center justify-center rounded-full bg-open text-open-foreground">
        <CheckCircle2Icon className="size-6" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-xl font-bold">You&apos;re unsubscribed</h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          You won&apos;t receive the weekly digest anymore. Changed your mind? You can resubscribe
          anytime from the homepage or the alerts page &mdash; no account needed.
        </p>
      </div>
      <Button render={<Link href="/alerts" />} nativeButton={false} variant="outline" size="sm">
        Manage email preferences
      </Button>
    </div>
  )
}
