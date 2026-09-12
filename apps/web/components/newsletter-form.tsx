"use client"

import { useState, useTransition } from "react"
import { CheckCircle2Icon, MailIcon } from "lucide-react"
import { toast } from "sonner"
import { subscribeToNewsletterAction } from "@/app/newsletter/actions"
import { trackEvent } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * Compact email capture for the weekly digest. Rendered on the homepage and
 * the Alerts page (the `source` prop distinguishes them for funnel reporting).
 * Login-free, single field — the whole point is zero friction.
 *
 * `tone="onDark"` restyles it for placement over a dark/photographic band
 * (the homepage footer CTA) versus the default card surface.
 */
export function NewsletterForm({
  source,
  tone = "default",
}: {
  source: "homepage" | "alerts_page"
  tone?: "default" | "onDark"
}) {
  const [email, setEmail] = useState("")
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim()) {
      toast.error("Add an email address to subscribe.")
      return
    }

    startTransition(async () => {
      const result = await subscribeToNewsletterAction(email.trim(), source)
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
      <div
        className={
          tone === "onDark"
            ? "flex items-center gap-3 text-white"
            : "flex items-center gap-3 text-foreground"
        }
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-open text-open-foreground">
          <CheckCircle2Icon className="size-5" aria-hidden="true" />
        </span>
        <p className={tone === "onDark" ? "text-sm leading-relaxed text-white/90" : "text-sm leading-relaxed text-muted-foreground"}>
          You&apos;re on the list. The next weekly digest lands in {email}. Every issue has a
          one-click unsubscribe.
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
        className={
          tone === "onDark"
            ? "h-11 flex-1 border-white/30 bg-white/10 text-white placeholder:text-white/60"
            : "h-11 flex-1"
        }
      />
      <Button type="submit" disabled={pending} size="lg" className="h-11 shrink-0">
        <MailIcon data-icon="inline-start" />
        {pending ? "Subscribing…" : "Subscribe"}
      </Button>
    </form>
  )
}
