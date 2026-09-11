"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { signIn, signUp } from "@/lib/auth-client"

type Mode = "sign-in" | "create-account"

/**
 * There is exactly one admin account, so "create account" here isn't a
 * public sign-up form in disguise — the server rejects any email but
 * ADMIN_EMAIL (see `validateUserInfo` in `lib/auth.ts`). It exists so the
 * one administrator can set their own password on first use without a
 * separate setup script.
 */
export function AdminAuthForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("sign-in")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const { error: authError } =
      mode === "sign-in"
        ? await signIn.email({ email, password })
        : await signUp.email({ email, password, name: email.split("@")[0] })

    if (authError) {
      setError(
        mode === "sign-in"
          ? "Incorrect email or password."
          : "Couldn't create that account. Sign in instead if you already have one.",
      )
      setPending(false)
      return
    }

    router.push("/admin")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "sign-in" ? "Admin sign in" : "Create admin account"}</CardTitle>
        <CardDescription>
          {mode === "sign-in"
            ? "Sign in with your administrator account to continue."
            : "First time here? Set a password for the administrator account."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending} className="mt-1 w-full">
            {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "sign-in" ? "create-account" : "sign-in")
            setError(null)
          }}
          className={cn(
            "mt-4 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline",
          )}
        >
          {mode === "sign-in" ? "First time here? Create the admin account" : "Already have an account? Sign in"}
        </button>
      </CardContent>
    </Card>
  )
}
