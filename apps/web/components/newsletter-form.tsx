"use client"

import { useState, useTransition } from "react"
import { CheckCircle2Icon, MailIcon } from "lucide-react"
import { toast } from "sonner"
import { subscribeToNewsletterAction } from "@/app/newsletter/actions"
import { trackEvent } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Deliberately simple: catches obviously malformed input (no @, no domain)
// without trying to fully validate RFC 5322 email syntax client-side — the
// server action is the real source of truth for what counts as a valid address.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Compact email capture for the weekly digest. Rendered on the homepage and
 * the Alerts page (the `source` prop distinguishes them for funnel reporting).
 * Login-free, single field — the whole point is zero friction.
 */
export function NewsletterForm({ source }: { source: "homepage" | "alerts_page" }) {
  const [email, setEmail] = useState("")
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      toast.error("Add an email address to subscribe.")
      return
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      toast.error("That doesn't look like a valid email address.")
      return
    }

    startTransition(async () => {
      const result = await subscribeToNewsletterAction(trimmed, source)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (result.outcome === "already_subscribed") {
        toast.info("You're already subscribed — check your inbox each week.")
        setDone(true)
        return
      }
      trackEvent("newsletter_subscribed", { source, outcome: result.outcome })
      setDone(true)
    })
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 text-foreground">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-open text-open-foreground">
          <CheckCircle2Icon className="size-5" aria-hidden="true" />
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground">
          You&apos;re on the list. The next weekly digest lands in {email.trim()}. Every issue has
          a one-click unsubscribe.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2 sm:flex-row">
      <label htmlFor={`newsletter-email-${source}`} className="sr-only">
        Email address
      </label>
      <Input
        id={`newsletter-email-${source}`}
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        // Solid card surface + a visible border so the field reads clearly
        // against any section background, light or dark.
        className="h-11 flex-1 border-input bg-background px-3.5 text-base shadow-sm"
      />
      <Button type="submit" disabled={pending} size="lg" className="h-11 shrink-0">
        <MailIcon data-icon="inline-start" />
        {pending ? "Subscribing…" : "Subscribe"}
      </Button>
    </form>
  )
}
