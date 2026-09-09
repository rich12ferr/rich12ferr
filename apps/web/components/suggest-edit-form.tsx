"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { HeartHandshakeIcon, SendIcon, ShieldCheckIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { submitSuggestedEdit } from "@/app/activities/[slug]/suggest-edit/actions"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function SuggestEditForm({
  programId,
  offeringId,
  activitySlug,
  activityTitle,
  organizationName,
  registrationUrl,
  websiteUrl,
  registrationOpenDate,
  registrationCloseDate,
}: {
  programId: string
  offeringId: string
  activitySlug: string
  activityTitle: string
  organizationName: string
  registrationUrl: string | null
  websiteUrl: string | null
  registrationOpenDate: string | null
  registrationCloseDate: string | null
}) {
  const [values, setValues] = useState({
    email: "",
    registrationUrl: registrationUrl ?? "",
    websiteUrl: websiteUrl ?? "",
    registrationOpenDate: registrationOpenDate ?? "",
    registrationCloseDate: registrationCloseDate ?? "",
    context: "",
  })
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  function set(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: false }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const nextErrors: Record<string, boolean> = {}
    if (!EMAIL_RE.test(values.email.trim())) nextErrors.email = true
    if (!values.context.trim()) nextErrors.context = true
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error("A couple of fields still need attention.")
      return
    }

    startTransition(async () => {
      const result = await submitSuggestedEdit({
        programId,
        offeringId,
        activityTitle,
        organizationName,
        ...values,
      })
      if (result.ok) {
        setSent(true)
      } else {
        toast.error(result.error)
      }
    })
  }

  if (sent) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-open/40 bg-open/10 p-8">
        <span className="flex size-11 items-center justify-center rounded-full bg-open text-open-foreground">
          <HeartHandshakeIcon className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-bold">Thank you for strengthening this listing</h2>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground text-pretty">
            Sign Up Vermont only works because people like you notice when something has changed and
            take a minute to say so. Your suggestion is now with a reviewer, who will check it against
            the source before anything changes on the live listing &mdash; that verification step is
            what keeps every family&apos;s information here trustworthy.
          </p>
        </div>
        <Button render={<Link href={`/activities/${activitySlug}`} />} nativeButton={false} size="sm">
          Back to {activityTitle}
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/60 p-4">
        <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          You&apos;re suggesting an edit to{" "}
          <span className="font-medium text-foreground">{activityTitle}</span>, run by{" "}
          <span className="font-medium text-foreground">{organizationName}</span>. Nothing you submit
          changes the live listing right away &mdash; a Sign Up Vermont reviewer verifies every
          suggested change against the source first.
        </p>
      </div>

      <FieldGroup>
        <Field data-invalid={errors.email || undefined}>
          <FieldLabel htmlFor="se-email">Your email</FieldLabel>
          <Input
            id="se-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            aria-invalid={errors.email || undefined}
            placeholder="you@example.com"
          />
          <FieldDescription>Used only if a reviewer needs to follow up. Never published.</FieldDescription>
        </Field>
      </FieldGroup>

      <Separator />

      <div className="flex flex-col gap-1">
        <h2 className="font-display text-sm font-bold">Organization</h2>
        <p className="text-sm text-muted-foreground">{organizationName}</p>
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="se-website">Organization website</FieldLabel>
          <Input
            id="se-website"
            type="url"
            value={values.websiteUrl}
            onChange={(e) => set("websiteUrl", e.target.value)}
            placeholder="https://"
          />
          <FieldDescription>Edit this if the organization&apos;s website has changed.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="se-registration-url">Registration link</FieldLabel>
          <Input
            id="se-registration-url"
            type="url"
            value={values.registrationUrl}
            onChange={(e) => set("registrationUrl", e.target.value)}
            placeholder="https://"
          />
          <FieldDescription>Edit this if the sign-up link is broken or has moved.</FieldDescription>
        </Field>
      </FieldGroup>

      <Separator />

      <div className="flex flex-col gap-1">
        <h2 className="font-display text-sm font-bold">Registration dates</h2>
        <p className="text-sm text-muted-foreground">
          Currently shown as {registrationOpenDate ?? "not published"} through{" "}
          {registrationCloseDate ?? "not published"}.
        </p>
      </div>

      <FieldGroup className="sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
        <Field>
          <FieldLabel htmlFor="se-open-date">Registration opens</FieldLabel>
          <Input
            id="se-open-date"
            type="date"
            value={values.registrationOpenDate}
            onChange={(e) => set("registrationOpenDate", e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="se-close-date">Registration closes</FieldLabel>
          <Input
            id="se-close-date"
            type="date"
            value={values.registrationCloseDate}
            onChange={(e) => set("registrationCloseDate", e.target.value)}
          />
        </Field>
      </FieldGroup>

      <Separator />

      <FieldGroup>
        <Field data-invalid={errors.context || undefined}>
          <FieldLabel htmlFor="se-context">
            Please provide additional context to help us verify this change:
          </FieldLabel>
          <Textarea
            id="se-context"
            rows={5}
            value={values.context}
            onChange={(e) => set("context", e.target.value)}
            aria-invalid={errors.context || undefined}
            placeholder="For example: I coach this team and registration actually opens October 1, per the league email sent last week."
          />
          <FieldDescription>
            A link to the correct source, or how you know, helps a reviewer verify this fastest.
          </FieldDescription>
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          <SendIcon data-icon="inline-start" />
          {isPending ? "Submitting…" : "Submit suggested edit"}
        </Button>
        <p className="text-xs text-muted-foreground">Reviewed by Sign Up Vermont before it goes live.</p>
      </div>
    </form>
  )
}
