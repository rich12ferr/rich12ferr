"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2Icon, XCircleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { unsubscribeByToken } from "@/app/alerts/actions"

type State = "working" | "done" | "error"

/**
 * Fires the unsubscribe on mount so an email link is genuinely one-click — no
 * confirm button to hunt for. It is idempotent server-side, so an email
 * client that prefetches the link (and a real click after) both land on the
 * same "you're unsubscribed" result rather than an error.
 */
export function UnsubscribeAlert({ token }: { token: string }) {
  const [state, setState] = useState<State>("working")

  useEffect(() => {
    let cancelled = false
    unsubscribeByToken(token).then((result) => {
      if (cancelled) return
      setState(result.ok ? "done" : "error")
    })
    return () => {
      cancelled = true
    }
  }, [token])

  if (state === "working") {
    return <p className="text-muted-foreground">Updating your alert preferences…</p>
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-start gap-4">
        <span className="flex size-11 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <XCircleIcon className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-xl font-bold">We couldn&apos;t find that alert</h1>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            The unsubscribe link may be invalid or the alert may already be removed. You can manage
            everything you&apos;re watching from the manage page.
          </p>
        </div>
        <Button render={<Link href="/alerts/manage" />} nativeButton={false} variant="outline" size="sm">
          Manage alerts
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
          That alert is paused and won&apos;t email you again. Changed your mind? You can re-enable it
          anytime from the manage page — no account needed.
        </p>
      </div>
      <Button render={<Link href="/alerts/manage" />} nativeButton={false} variant="outline" size="sm">
        Manage alerts
      </Button>
    </div>
  )
}
