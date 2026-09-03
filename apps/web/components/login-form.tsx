"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MailIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"

/** PRD 34. Magic link is the primary method; prototype simulates the emailed link. */
export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim()) {
      toast.error("Enter your email address.")
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-6">
        <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <MailIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-bold">Check your email</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We sent a sign-in link to {email}. The link expires in 15 minutes. There is no password to
            remember.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => router.push("/account")}>
            Open the link (prototype)
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <FieldDescription>
            We&apos;ll email you a sign-in link. No password required.
          </FieldDescription>
        </Field>
        <Button type="submit">
          <MailIcon data-icon="inline-start" />
          Email me a sign-in link
        </Button>
      </FieldGroup>
    </form>
  )
}
