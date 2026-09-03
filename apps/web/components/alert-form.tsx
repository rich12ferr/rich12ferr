"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { BellIcon, CheckCircle2Icon } from "lucide-react"
import { toast } from "sonner"
import { createStandingAlert } from "@/app/alerts/actions"
import { getSportBySlug } from "@/lib/data/sports"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { FilterSelect } from "@/components/filter-select"
import { sports } from "@/lib/data/sports"
import { gradeOptions } from "@/lib/format"
import { DEFAULT_RADIUS, alertTriggerLabels } from "@/lib/labels"
import type { AlertTrigger } from "@/lib/types"

const triggers: AlertTrigger[] = [
  "registration_opened",
  "registration_closing_soon",
  "deadline_changed",
  "new_matching_activity",
  "registration_info_added",
]

const defaultTriggers: AlertTrigger[] = [
  "registration_opened",
  "registration_closing_soon",
  "deadline_changed",
]

/** PRD 17. Sport alert and child-match alert, no account required. */
export function AlertForm({ initialSport }: { initialSport?: string }) {
  const [kind, setKind] = useState<"sport" | "child_match">(initialSport ? "sport" : "child_match")
  const [sport, setSport] = useState(initialSport ?? "")
  const [grade, setGrade] = useState("")
  const [zip, setZip] = useState("")
  const [radius, setRadius] = useState(String(DEFAULT_RADIUS))
  const [email, setEmail] = useState("")
  const [selected, setSelected] = useState<AlertTrigger[]>(defaultTriggers)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  function toggle(trigger: AlertTrigger) {
    setSelected((prev) =>
      prev.includes(trigger) ? prev.filter((t) => t !== trigger) : [...prev, trigger],
    )
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim()) {
      toast.error("Add an email address so we know where to send the alert.")
      return
    }
    if (kind === "sport" && !sport) {
      toast.error("Pick a sport to follow.")
      return
    }
    if (selected.length === 0) {
      toast.error("Choose at least one thing to be notified about.")
      return
    }

    const sportName = kind === "sport" ? (sports.find((s) => s.slug === sport)?.name ?? "That sport") : null
    const gradeLabel = grade ? (gradeOptions.find((g) => g.value === grade)?.label ?? "Any grade") : "Any grade"
    const label =
      kind === "sport"
        ? `${sportName} within ${radius} miles of ${zip || "your area"}`
        : `${gradeLabel} within ${radius} miles of ${zip || "your area"}`

    startTransition(async () => {
      const result = await createStandingAlert({
        email: email.trim(),
        kind,
        sportId: kind === "sport" ? (getSportBySlug(sport)?.id ?? null) : null,
        grade: grade ? Number(grade) : null,
        zip: zip.trim() || null,
        radiusMiles: Number(radius),
        // Frontend and DB AlertTrigger share one vocabulary, so pass through.
        triggers: selected,
        label,
      })
      if (result.ok) {
        setDone(true)
      } else {
        toast.error(result.error)
      }
    })
  }

  if (done) {
    const summary =
      kind === "sport"
        ? `${sports.find((s) => s.slug === sport)?.name ?? "That sport"} in the ${radius}-mile area`
        : `${grade ? gradeOptions.find((g) => g.value === grade)?.label ?? "Any grade" : "Any grade"} within ${radius} miles`

    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-open/40 bg-open/10 p-8">
        <span className="flex size-11 items-center justify-center rounded-full bg-open text-open-foreground">
          <CheckCircle2Icon className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-bold">Alert created</h2>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            We&apos;ll email {email} about {summary}. Every alert email includes a one-click unsubscribe,
            and you can pause or remove your alerts anytime &mdash; no account needed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setDone(false)}>
            Create another alert
          </Button>
          <Button
            render={<Link href={`/alerts/manage?email=${encodeURIComponent(email)}`} />}
            nativeButton={false}
            variant="ghost"
            size="sm"
          >
            Manage alerts
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <FieldSet>
        <FieldLegend>What should we watch</FieldLegend>
        <FieldGroup>
          <Field>
            <ToggleGroup
              value={[kind]}
              onValueChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value
                if (next === "sport" || next === "child_match") setKind(next)
              }}
              variant="outline"
              size="lg"
              spacing={0}
              className="w-full"
            >
              <ToggleGroupItem
                value="child_match"
                className="flex-1 aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                A child&apos;s age and area
              </ToggleGroupItem>
              <ToggleGroupItem
                value="sport"
                className="flex-1 aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                One specific sport
              </ToggleGroupItem>
            </ToggleGroup>
            <FieldDescription>
              {kind === "sport"
                ? "Good for: notify me when baseball registration opens anywhere nearby."
                : "Good for: notify me about new activities for an eighth grader within 15 miles."}
            </FieldDescription>
          </Field>

          {kind === "sport" ? (
            <Field>
              <FieldLabel htmlFor="a-sport">Sport</FieldLabel>
              <FilterSelect
                id="a-sport"
                value={sport}
                onValueChange={setSport}
                placeholder="Select a sport"
                options={sports.map((s) => ({ value: s.slug, label: s.name }))}
              />
            </Field>
          ) : (
            <Field>
              <FieldLabel htmlFor="a-grade">Grade this fall</FieldLabel>
              <FilterSelect
                id="a-grade"
                value={grade}
                onValueChange={setGrade}
                placeholder="Any grade"
                options={gradeOptions}
              />
              <FieldDescription>
                We only need the grade, never the child&apos;s name or birthday.
              </FieldDescription>
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="a-zip">Home ZIP</FieldLabel>
              <Input
                id="a-zip"
                inputMode="numeric"
                maxLength={5}
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="05602"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="a-radius">Distance</FieldLabel>
              <FilterSelect
                id="a-radius"
                value={radius}
                onValueChange={setRadius}
                options={[10, 15, 20, 25, 40].map((m) => ({
                  value: String(m),
                  label: `Within ${m} miles`,
                }))}
              />
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>When should we email you</FieldLegend>
        <FieldGroup>
          {triggers.map((trigger) => (
            <Field key={trigger} orientation="horizontal">
              <Checkbox
                id={`trigger-${trigger}`}
                checked={selected.includes(trigger)}
                onCheckedChange={() => toggle(trigger)}
              />
              <FieldLabel htmlFor={`trigger-${trigger}`} className="font-normal">
                {alertTriggerLabels[trigger]}
              </FieldLabel>
            </Field>
          ))}
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Where to send it</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="a-email">Email</FieldLabel>
            <Input
              id="a-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <FieldDescription>
              No account needed. Every email has a one-click unsubscribe, and we never share your
              address with organizations.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      <div>
        <Button type="submit" disabled={pending}>
          <BellIcon data-icon="inline-start" />
          {pending ? "Creating alert…" : "Create alert"}
        </Button>
      </div>
    </form>
  )
}
