"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { CheckCircle2Icon, SendIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { FilterSelect } from "@/components/filter-select"
import { submitActivity } from "@/app/submit/actions"
import { sports } from "@/lib/data/sports"
import { gradeOptions } from "@/lib/format"

type OrganizationOption = { id: string; name: string }

const initial = {
  organization: "",
  organizationOther: "",
  sport: "",
  title: "",
  gradeMin: "",
  gradeMax: "",
  registrationOpens: "",
  registrationCloses: "",
  registrationUrl: "",
  sourceUrl: "",
  comments: "",
  email: "",
}

/** PRD 23. Community submissions never publish directly, they enter Pending Review. */
export function SubmitActivityForm({ organizations }: { organizations: OrganizationOption[] }) {
  const [values, setValues] = useState(initial)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()

  function set(key: keyof typeof initial, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: false }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const required: (keyof typeof initial)[] = ["sport", "title", "sourceUrl", "email"]
    const nextErrors: Record<string, boolean> = {}
    for (const key of required) {
      if (!values[key].trim()) nextErrors[key] = true
    }
    if (!values.organization.trim() && !values.organizationOther.trim()) {
      nextErrors.organization = true
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error("A few required fields are still empty.")
      return
    }

    const organizationName =
      values.organizationOther.trim() ||
      organizations.find((org) => org.id === values.organization)?.name ||
      values.organization

    const sportName = sports.find((sport) => sport.slug === values.sport)?.name ?? values.sport

    const grades = [values.gradeMin, values.gradeMax].filter(Boolean)
    const eligibility = grades.length > 0 ? `Grades ${grades.join("-")}` : undefined

    const dates = [values.registrationOpens, values.registrationCloses].filter(Boolean)
    const registrationDates =
      dates.length > 0
        ? `Opens ${values.registrationOpens || "?"}, closes ${values.registrationCloses || "?"}`
        : undefined

    startTransition(async () => {
      const result = await submitActivity({
        organizationName,
        sportName,
        programName: values.title,
        eligibility,
        registrationDates,
        registrationUrl: values.registrationUrl || undefined,
        sourceUrl: values.sourceUrl,
        comments: values.comments || undefined,
        submitterEmail: values.email,
      })

      if (result.ok) {
        setSubmitted(true)
      } else {
        toast.error(result.error)
      }
    })
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-open/40 bg-open/10 p-8">
        <span className="flex size-11 items-center justify-center rounded-full bg-open text-open-foreground">
          <CheckCircle2Icon className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-bold">Submission received</h2>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            Thanks for filling a gap in the directory. A reviewer checks the source link before this
            becomes public, so it will not appear in search results yet. If we publish it, it will be
            labeled community submitted until the organization confirms the details.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setValues(initial)
              setSubmitted(false)
            }}
          >
            Submit another activity
          </Button>
          <Button render={<Link href="/search" />} nativeButton={false} variant="ghost" size="sm">
            Back to search
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <FieldSet>
        <FieldLegend>Who runs it</FieldLegend>
        <FieldGroup>
          <Field data-invalid={errors.organization || undefined}>
            <FieldLabel htmlFor="s-org">Organization</FieldLabel>
            <FilterSelect
              id="s-org"
              value={values.organization}
              onValueChange={(value) => set("organization", value)}
              placeholder="Select an organization"
              options={organizations.map((org) => ({ value: org.id, label: org.name }))}
            />
            <FieldDescription>
              Not listed? Leave this blank and type the name below.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="s-org-other">New organization name</FieldLabel>
            <Input
              id="s-org-other"
              value={values.organizationOther}
              onChange={(e) => set("organizationOther", e.target.value)}
              placeholder="Northfield Youth Wrestling Club"
            />
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>What the program is</FieldLegend>
        <FieldGroup>
          <Field data-invalid={errors.sport || undefined}>
            <FieldLabel htmlFor="s-sport">Sport</FieldLabel>
            <FilterSelect
              id="s-sport"
              value={values.sport}
              onValueChange={(value) => set("sport", value)}
              placeholder="Select a sport"
              options={sports.map((sport) => ({ value: sport.slug, label: sport.name }))}
            />
          </Field>
          <Field data-invalid={errors.title || undefined}>
            <FieldLabel htmlFor="s-title">Program name</FieldLabel>
            <Input
              id="s-title"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              aria-invalid={errors.title || undefined}
              placeholder="Fall Rec Soccer, Grades 3-4"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="s-grade-min">Lowest grade</FieldLabel>
              <FilterSelect
                id="s-grade-min"
                value={values.gradeMin}
                onValueChange={(value) => set("gradeMin", value)}
                placeholder="Any"
                options={gradeOptions}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="s-grade-max">Highest grade</FieldLabel>
              <FilterSelect
                id="s-grade-max"
                value={values.gradeMax}
                onValueChange={(value) => set("gradeMax", value)}
                placeholder="Any"
                options={gradeOptions}
              />
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Registration</FieldLegend>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="s-opens">Registration opens</FieldLabel>
              <Input
                id="s-opens"
                type="date"
                value={values.registrationOpens}
                onChange={(e) => set("registrationOpens", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="s-closes">Registration closes</FieldLabel>
              <Input
                id="s-closes"
                type="date"
                value={values.registrationCloses}
                onChange={(e) => set("registrationCloses", e.target.value)}
              />
            </Field>
          </div>
          <FieldDescription>
            Leave a date blank if you do not know it. Blank is more useful to families than a guess.
          </FieldDescription>
          <Field>
            <FieldLabel htmlFor="s-reg-url">Registration link</FieldLabel>
            <Input
              id="s-reg-url"
              type="url"
              value={values.registrationUrl}
              onChange={(e) => set("registrationUrl", e.target.value)}
              placeholder="https://"
            />
          </Field>
          <Field data-invalid={errors.sourceUrl || undefined}>
            <FieldLabel htmlFor="s-source-url">Source link</FieldLabel>
            <Input
              id="s-source-url"
              type="url"
              value={values.sourceUrl}
              onChange={(e) => set("sourceUrl", e.target.value)}
              aria-invalid={errors.sourceUrl || undefined}
              placeholder="https://"
            />
            <FieldDescription>
              Where did you see this? A flyer photo URL, league page, or school newsletter all work.
              Reviewers need it to verify.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>About your submission</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="s-comments">Anything else a reviewer should know</FieldLabel>
            <Textarea
              id="s-comments"
              value={values.comments}
              onChange={(e) => set("comments", e.target.value)}
              rows={3}
              placeholder="Coach mentioned the deadline may move to late August."
            />
          </Field>
          <Field data-invalid={errors.email || undefined}>
            <FieldLabel htmlFor="s-email">Your email</FieldLabel>
            <Input
              id="s-email"
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              aria-invalid={errors.email || undefined}
              placeholder="you@example.com"
            />
            <FieldDescription>
              Used only to follow up on this submission. It is never published or shared.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          <SendIcon data-icon="inline-start" />
          {isPending ? "Submitting…" : "Submit for review"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Submissions are reviewed before publishing.
        </p>
      </div>
    </form>
  )
}
