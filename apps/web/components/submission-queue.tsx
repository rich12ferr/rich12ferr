"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CheckIcon, ExternalLinkIcon, InboxIcon, XIcon } from "lucide-react"
import { CAMP_PERIOD_LABELS, CAMP_STAY_LABELS } from "@openplay/core"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FilterSelect, type SelectOption } from "@/components/filter-select"
import type { SubmissionDraft, SubmissionView } from "@/lib/submission-prefill"
import { declineSubmissionAction, publishSubmissionAction } from "@/app/admin/submissions/actions"

const SEASON_OPTIONS: SelectOption[] = [
  { value: "summer", label: "Summer" },
  { value: "fall", label: "Fall" },
  { value: "winter", label: "Winter" },
  { value: "spring", label: "Spring" },
]

const FORMAT_OPTIONS: SelectOption[] = [
  { value: "camp", label: "Camp" },
  { value: "league", label: "League" },
  { value: "class", label: "Class" },
  { value: "clinic", label: "Clinic" },
  { value: "tournament", label: "Tournament" },
  { value: "drop_in", label: "Drop-in" },
  { value: "other", label: "Other" },
]

const STAY_OPTIONS = Object.entries(CAMP_STAY_LABELS).map(([value, label]) => ({ value, label }))
const PERIOD_OPTIONS = Object.entries(CAMP_PERIOD_LABELS).map(([value, label]) => ({ value, label }))

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function SubmissionQueue({
  pending,
  decided,
  sports,
}: {
  pending: SubmissionView[]
  decided: SubmissionView[]
  sports: { slug: string; name: string }[]
}) {
  const sportOptions = sports.map((s) => ({ value: s.slug, label: s.name }))

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Community submissions</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
          Activities suggested by parents and organizers through the public form. Check the details
          against the source page, fill in anything missing, then publish. Nothing goes live until you do.
        </p>
      </header>

      <section aria-labelledby="pending-heading" className="flex flex-col gap-4">
        <h2 id="pending-heading" className="flex items-center gap-2 text-lg font-semibold">
          Waiting for review
          <Badge variant="secondary">{pending.length}</Badge>
        </h2>
        {pending.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
              <InboxIcon className="size-5" aria-hidden="true" />
              No submissions waiting. New ones from the Suggest an activity form will appear here.
            </CardContent>
          </Card>
        ) : (
          pending.map((submission) => (
            <PendingSubmission key={submission.id} submission={submission} sportOptions={sportOptions} />
          ))
        )}
      </section>

      {decided.length > 0 && (
        <section aria-labelledby="decided-heading" className="flex flex-col gap-3">
          <h2 id="decided-heading" className="text-lg font-semibold">
            Recently reviewed
          </h2>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {decided.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{s.programName}</span>
                  <span className="text-muted-foreground">{s.organizationName}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Badge variant={s.status === "approved" ? "default" : "outline"}>
                    {s.status === "approved" ? "Published" : "Declined"}
                  </Badge>
                  {s.reviewedAt && <span>{formatDate(s.reviewedAt)}</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function SubmittedDetail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-relaxed break-words">{value}</dd>
    </div>
  )
}

function PendingSubmission({
  submission,
  sportOptions,
}: {
  submission: SubmissionView
  sportOptions: SelectOption[]
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<SubmissionDraft>(submission.draft)
  const [error, setError] = useState<string | null>(null)
  const [published, setPublished] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const set = (key: keyof SubmissionDraft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }))
  const input = (key: keyof SubmissionDraft) => ({
    value: draft[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key)(e.target.value),
  })

  function publish() {
    setError(null)
    startTransition(async () => {
      const result = await publishSubmissionAction(submission.id, draft)
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast.success(`Published "${draft.title}"`)
      setPublished(result.programSlug ?? "")
    })
  }

  function decline() {
    startTransition(async () => {
      const result = await declineSubmissionAction(submission.id)
      if (result.ok) toast.success("Submission declined")
      else toast.error(result.error)
    })
  }

  const fieldId = (key: string) => `${submission.id}-${key}`

  return (
    <Card>
      <CardHeader className="flex flex-col gap-1">
        <CardTitle className="text-base text-balance">{submission.programName}</CardTitle>
        <CardDescription>
          {submission.organizationName} · submitted {formatDate(submission.submittedAt)}
          {submission.submitterEmail ? ` by ${submission.submitterEmail}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <SubmittedDetail label="Activity" value={submission.sportName} />
          <SubmittedDetail label="Eligibility" value={submission.eligibility} />
          <SubmittedDetail label="Registration dates" value={submission.registrationDates} />
          <SubmittedDetail label="Notes" value={submission.comments} />
        </dl>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {submission.sourceUrl && (
            <a href={submission.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
              Source page <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
            </a>
          )}
          {submission.registrationUrl && submission.registrationUrl !== submission.sourceUrl && (
            <a href={submission.registrationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
              Registration link <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
            </a>
          )}
        </div>

        {published !== null ? (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <CheckIcon className="size-4 text-primary" aria-hidden="true" />
            Published.
            {published && (
              <Link href={`/activities/${published}`} className="text-primary underline-offset-4 hover:underline">
                View the listing
              </Link>
            )}
          </p>
        ) : !open ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setOpen(true)}>Review &amp; publish</Button>
            <Button variant="outline" onClick={decline} disabled={isPending}>
              <XIcon aria-hidden="true" /> Decline
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-6 border-t border-border pt-5"
            onSubmit={(e) => {
              e.preventDefault()
              publish()
            }}
          >
            <FieldSet>
              <FieldLegend>Listing</FieldLegend>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor={fieldId("title")}>Title</FieldLabel>
                  <Input id={fieldId("title")} required {...input("title")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor={fieldId("sport")}>Activity</FieldLabel>
                  <FilterSelect id={fieldId("sport")} value={draft.sportSlug} onValueChange={set("sportSlug")} options={sportOptions} placeholder="Pick an activity" />
                </Field>
                <Field>
                  <FieldLabel htmlFor={fieldId("format")}>Format</FieldLabel>
                  <FilterSelect id={fieldId("format")} value={draft.programFormat} onValueChange={set("programFormat")} options={FORMAT_OPTIONS} placeholder="Not specified" />
                </Field>
                {draft.programFormat === "camp" && (
                  <>
                    <Field>
                      <FieldLabel htmlFor={fieldId("stay")}>Day or overnight</FieldLabel>
                      <FilterSelect id={fieldId("stay")} value={draft.campStay} onValueChange={set("campStay")} options={STAY_OPTIONS} placeholder="Not specified" />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={fieldId("period")}>Camp period</FieldLabel>
                      <FilterSelect id={fieldId("period")} value={draft.campPeriod} onValueChange={set("campPeriod")} options={PERIOD_OPTIONS} placeholder="Work it out from the dates" />
                    </Field>
                  </>
                )}
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor={fieldId("description")}>Description</FieldLabel>
                  <Textarea id={fieldId("description")} rows={4} {...input("description")} />
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Organization and location</FieldLegend>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor={fieldId("org")}>Organization</FieldLabel>
                  <Input id={fieldId("org")} required {...input("organizationName")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor={fieldId("town")}>Town</FieldLabel>
                  <Input id={fieldId("town")} required {...input("town")} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor={fieldId("state")}>State</FieldLabel>
                    <Input id={fieldId("state")} required maxLength={2} {...input("state")} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={fieldId("zip")}>ZIP</FieldLabel>
                    <Input id={fieldId("zip")} inputMode="numeric" {...input("zip")} />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor={fieldId("venue")}>Venue</FieldLabel>
                  <Input id={fieldId("venue")} {...input("venueName")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor={fieldId("address")}>Address</FieldLabel>
                  <Input id={fieldId("address")} {...input("venueAddress")} />
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Dates, ages and price</FieldLegend>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={fieldId("season")}>Season</FieldLabel>
                  <FilterSelect id={fieldId("season")} value={draft.season} onValueChange={set("season")} options={SEASON_OPTIONS} placeholder="Pick a season" />
                </Field>
                <Field>
                  <FieldLabel htmlFor={fieldId("year")}>Year</FieldLabel>
                  <Input id={fieldId("year")} required inputMode="numeric" {...input("seasonYear")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor={fieldId("start")}>Program starts</FieldLabel>
                  <Input id={fieldId("start")} type="date" {...input("seasonStartDate")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor={fieldId("end")}>Program ends</FieldLabel>
                  <Input id={fieldId("end")} type="date" {...input("seasonEndDate")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor={fieldId("open")}>Registration opens</FieldLabel>
                  <Input id={fieldId("open")} type="date" {...input("registrationOpenDate")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor={fieldId("close")}>Registration closes</FieldLabel>
                  <Input id={fieldId("close")} type="date" {...input("registrationCloseDate")} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor={fieldId("minAge")}>Min age</FieldLabel>
                    <Input id={fieldId("minAge")} inputMode="numeric" {...input("minAge")} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={fieldId("maxAge")}>Max age</FieldLabel>
                    <Input id={fieldId("maxAge")} inputMode="numeric" {...input("maxAge")} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor={fieldId("minGrade")}>Min grade (K = 0)</FieldLabel>
                    <Input id={fieldId("minGrade")} inputMode="numeric" {...input("minGrade")} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={fieldId("maxGrade")}>Max grade</FieldLabel>
                    <Input id={fieldId("maxGrade")} inputMode="numeric" {...input("maxGrade")} />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor={fieldId("fee")}>Price ($)</FieldLabel>
                  <Input id={fieldId("fee")} inputMode="decimal" {...input("registrationFee")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor={fieldId("feeNotes")}>Price notes</FieldLabel>
                  <Input id={fieldId("feeNotes")} placeholder="e.g. per session, sibling discount" {...input("additionalFees")} />
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Links and contact</FieldLegend>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={fieldId("source")}>Source page</FieldLabel>
                  <Input id={fieldId("source")} type="url" required {...input("sourceUrl")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor={fieldId("reg")}>Registration link</FieldLabel>
                  <Input id={fieldId("reg")} type="url" {...input("registrationUrl")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor={fieldId("email")}>Contact email</FieldLabel>
                  <Input id={fieldId("email")} type="email" {...input("contactEmail")} />
                </Field>
              </FieldGroup>
            </FieldSet>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Publishing…" : "Publish listing"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
