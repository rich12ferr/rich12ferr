"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { CheckCircle2Icon, SendIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { submitOrganizationClaim } from "@/app/organizations/claim/actions"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function OrganizationClaimForm({
  organizationId,
  organizationName,
  organizationHref,
}: {
  organizationId: string | null
  organizationName: string
  organizationHref: string | null
}) {
  const [values, setValues] = useState({
    name: "",
    role: "",
    email: "",
    organizationName,
    message: "",
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
    const required: (keyof typeof values)[] = ["name", "role", "organizationName", "message"]
    const nextErrors: Record<string, boolean> = {}
    for (const key of required) {
      if (!values[key].trim()) nextErrors[key] = true
    }
    if (!EMAIL_RE.test(values.email.trim())) nextErrors.email = true
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error("A few required fields are still empty.")
      return
    }

    startTransition(async () => {
      const result = await submitOrganizationClaim({
        ...values,
        organizationId,
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
          <CheckCircle2Icon className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-bold">Request received</h2>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            Thanks for reaching out. We&apos;ll update the listing and follow up at the email you
            provided with more details.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {organizationHref ? (
            <Button render={<Link href={organizationHref} />} nativeButton={false} size="sm">
              Back to {organizationName}
            </Button>
          ) : (
            <Button render={<Link href="/organizations" />} nativeButton={false} size="sm">
              Back to organizations
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={errors.name || undefined}>
          <FieldLabel htmlFor="oc-name">Your name</FieldLabel>
          <Input
            id="oc-name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            aria-invalid={errors.name || undefined}
            placeholder="Jamie Rivera"
          />
        </Field>
        <Field data-invalid={errors.role || undefined}>
          <FieldLabel htmlFor="oc-role">Your role</FieldLabel>
          <Input
            id="oc-role"
            value={values.role}
            onChange={(e) => set("role", e.target.value)}
            aria-invalid={errors.role || undefined}
            placeholder="Head coach, program director, town rec director…"
          />
        </Field>
        <Field data-invalid={errors.email || undefined}>
          <FieldLabel htmlFor="oc-email">Official email</FieldLabel>
          <Input
            id="oc-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            aria-invalid={errors.email || undefined}
            placeholder="you@organization.org"
          />
          <FieldDescription>
            Ideally an email at the organization&apos;s own domain, so we can confirm you&apos;re
            affiliated with it. Never published or shared.
          </FieldDescription>
        </Field>
        <Field data-invalid={errors.organizationName || undefined}>
          <FieldLabel htmlFor="oc-org-name">Organization</FieldLabel>
          <Input
            id="oc-org-name"
            value={values.organizationName}
            onChange={(e) => set("organizationName", e.target.value)}
            aria-invalid={errors.organizationName || undefined}
            placeholder="Name of the organization you run"
          />
        </Field>
        <Field data-invalid={errors.message || undefined}>
          <FieldLabel htmlFor="oc-message">What would you like to update?</FieldLabel>
          <Textarea
            id="oc-message"
            rows={5}
            value={values.message}
            onChange={(e) => set("message", e.target.value)}
            aria-invalid={errors.message || undefined}
            placeholder={
              'For example: "Change our soccer time from 9 AM to 10 AM" or "Add this registration URL: https://…"'
            }
          />
          <FieldDescription>
            Schedule changes, new images, a corrected registration link, or anything else about your
            listing.
          </FieldDescription>
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          <SendIcon data-icon="inline-start" />
          {isPending ? "Sending…" : "Send request"}
        </Button>
        <p className="text-xs text-muted-foreground">We typically reply within a few days.</p>
      </div>
    </form>
  )
}
