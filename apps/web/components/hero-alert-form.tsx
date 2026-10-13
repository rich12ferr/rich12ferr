"use client"

import { useId, useState, useTransition } from "react"
import { BellIcon, CheckCircle2Icon } from "lucide-react"
import { toast } from "sonner"
import type { AlertTrigger } from "@openplay/db"
import { createStandingAlert } from "@/app/alerts/actions"
import { FilterSelect } from "@/components/filter-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { trackEvent } from "@/lib/analytics"
import { getSportBySlug, sports } from "@/lib/data/sports"

const ALL_TRIGGERS: AlertTrigger[] = [
  "registration_opened",
  "registration_closing_soon",
  "deadline_changed",
  "new_matching_activity",
  "registration_info_added",
]

const DEFAULT_RADIUS_MILES = 25

const sportOptions = [
  { value: "any", label: "Pick a sport" },
  ...sports.map((s) => ({ value: s.slug, label: s.name })),
]

/**
 * One-line sport alert for the homepage hero. Creates the same standing sport
 * alert as the full /alerts form, minus the optional zip and radius fields —
 * the only things a parent must give are a sport and an email.
 */
export function HeroAlertForm() {
  const fieldId = useId()
  const [sport, setSport] = useState("any")
  const [email, setEmail] = useState("")
  const [done, setDone] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const selected = getSportBySlug(sport)
    if (!selected) {
      toast.error("Pick a sport to follow.")
      return
    }
    startTransition(async () => {
      const result = await createStandingAlert({
        email: email.trim(),
        kind: "sport",
        sportId: selected.id,
        radiusMiles: DEFAULT_RADIUS_MILES,
        triggers: ALL_TRIGGERS,
        label: `${selected.name} registration`,
      })
      if (result.ok) {
        trackEvent("alert_created", {
          alert_type: "sport",
          sport_id: selected.id,
          has_zip: false,
          trigger_count: ALL_TRIGGERS.length,
          source: "homepage_hero",
        })
        setDone(selected.name)
      } else {
        toast.error(result.error)
      }
    })
  }

  if (done) {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm shadow-sm sm:items-center"
      >
        <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-open-foreground sm:mt-0" aria-hidden="true" />
        <p className="leading-relaxed text-pretty">
          <span className="font-semibold">You&apos;re on the list for {done}.</span>{" "}
          <span className="text-muted-foreground">
            We&apos;ll email you when registration opens or a deadline is close.
          </span>
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      onFocusCapture={() => trackEvent("search_focused", { source: "home_alert_form" })}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:gap-3"
      aria-label="Get an email when registration opens"
    >
      <p className="flex items-center gap-2 text-sm font-semibold sm:shrink-0">
        <BellIcon className="size-4" aria-hidden="true" />
        Alert me when registration opens
      </p>
      <div className="flex flex-1 flex-col gap-3 sm:flex-row">
        <div className="sm:w-44">
          <FilterSelect
            id={`${fieldId}-sport`}
            value={sport}
            onValueChange={setSport}
            options={sportOptions}
            aria-label="Sport to follow"
          />
        </div>
        <Input
          id={`${fieldId}-email`}
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          aria-label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-9 sm:flex-1"
        />
        <Button type="submit" disabled={pending} className="h-9 w-full sm:w-auto">
          {pending ? "Saving..." : "Notify me"}
        </Button>
      </div>
    </form>
  )
}
