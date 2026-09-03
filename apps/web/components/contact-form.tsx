"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { CheckCircle2Icon, SendIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { FilterSelect } from "@/components/filter-select"
import { submitContactForm } from "@/app/contact/actions"

const categoryOptions = [
  { value: "general_inquiry", label: "General question" },
  { value: "other", label: "Something about a listing" },
]

const initial = {
  name: "",
  email: "",
  category: "general_inquiry",
  message: "",
}

export function ContactForm() {
  const [values, setValues] = useState(initial)
  const [sent, setSent] = useState(false)
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()

  function set(key: keyof typeof initial, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: false }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const required: (keyof typeof initial)[] = ["name", "email", "message"]
    const nextErrors: Record<string, boolean> = {}
    for (const key of required) {
      if (!values[key].trim()) nextErrors[key] = true
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error("A few required fields are still empty.")
      return
    }

    startTransition(async () => {
      const result = await submitContactForm(values)
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
          <h2 className="font-display text-xl font-bold">Message sent</h2>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            Thanks for reaching out. We read every message and will follow up at the email you
            provided if a reply is needed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setValues(initial)
              setSent(false)
            }}
          >
            Send another message
          </Button>
          <Button render={<Link href="/search" />} nativeButton={false} variant="ghost" size="sm">
            Back to search
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={errors.name || undefined}>
          <FieldLabel htmlFor="c-name">Your name</FieldLabel>
          <Input
            id="c-name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            aria-invalid={errors.name || undefined}
            placeholder="Jamie Rivera"
          />
        </Field>
        <Field data-invalid={errors.email || undefined}>
          <FieldLabel htmlFor="c-email">Your email</FieldLabel>
          <Input
            id="c-email"
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            aria-invalid={errors.email || undefined}
            placeholder="you@example.com"
          />
          <FieldDescription>Used only to reply to you. It is never published or shared.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="c-category">What is this about</FieldLabel>
          <FilterSelect
            id="c-category"
            value={values.category}
            onValueChange={(value) => set("category", value)}
            placeholder="Select a topic"
            options={categoryOptions}
          />
        </Field>
        <Field data-invalid={errors.message || undefined}>
          <FieldLabel htmlFor="c-message">Message</FieldLabel>
          <Textarea
            id="c-message"
            value={values.message}
            onChange={(e) => set("message", e.target.value)}
            aria-invalid={errors.message || undefined}
            rows={5}
            placeholder="Tell us what's going on."
          />
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          <SendIcon data-icon="inline-start" />
          {isPending ? "Sending…" : "Send message"}
        </Button>
        <p className="text-xs text-muted-foreground">We typically reply within a few days.</p>
      </div>
    </form>
  )
}
