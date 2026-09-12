"use client"

import { useState, useTransition } from "react"
import { CheckCircle2Icon } from "lucide-react"
import { toast } from "sonner"
import { unsubscribeNewsletterByEmailAction } from "@/app/newsletter/actions"
import { NewsletterForm } from "@/components/newsletter-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * The Alerts-page entry point for the weekly digest: subscribe up top, and a
 * disclosure-style unsubscribe-by-email below (for people who no longer have
 * an email footer link in hand). Unsubscribe never reveals whether the address
 * was actually on the list, so it always confirms success.
 */
export function NewsletterManage() {
  const [showUnsub, setShowUnsub] = useState(false)
  const [unsubEmail, setUnsubEmail] = useState("")
  const [unsubDone, setUnsubDone] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleUnsubscribe(event: React.FormEvent) {
    event.preventDefault()
    if (!unsubEmail.trim()) {
      toast.error("Enter the email address to unsubscribe.")
      return
    }
    startTransition(async () => {
      const result = await unsubscribeNewsletterByEmailAction(unsubEmail.trim())
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong. Please try again.")
        return
      }
      setUnsubDone(true)
    })
  }

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display text-xl font-bold tracking-tight">Weekly digest</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          A single email each week with bite-sized summaries of new programs, registration openings,
          and deadlines around Vermont. Separate from your alerts &mdash; subscribe even if you have
          no alerts set up.
        </p>
      </div>

      <NewsletterForm source="alerts_page" />

      <div className="border-t border-border pt-4">
        {unsubDone ? (
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-open text-open-foreground">
              <CheckCircle2Icon className="size-4" aria-hidden="true" />
            </span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Done. If that address was subscribed, it won&apos;t receive the weekly digest anymore.
            </p>
          </div>
        ) : showUnsub ? (
          <form onSubmit={handleUnsubscribe} className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="newsletter-unsub-email" className="sr-only">
              Email address to unsubscribe
            </label>
            <Input
              id="newsletter-unsub-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={unsubEmail}
              onChange={(e) => setUnsubEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 flex-1"
            />
            <Button type="submit" variant="outline" disabled={pending} className="h-11 shrink-0">
              {pending ? "Unsubscribing…" : "Unsubscribe"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Want to stop the weekly digest?{" "}
            <button
              type="button"
              onClick={() => setShowUnsub(true)}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Unsubscribe by email
            </button>
            .
          </p>
        )}
      </div>
    </section>
  )
}
