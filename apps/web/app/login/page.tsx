import Link from "next/link"
import { SearchIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { LoginForm } from "@/components/login-form"

export const metadata = {
  title: "Sign in",
  description: "Sign in to save activities, manage alerts, and keep child profiles.",
}

export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Sign in</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          An account lets you save activities, manage alerts, and store child profiles. You never need
          one to search the directory.
        </p>
      </header>

      <LoginForm />

      <Alert className="mt-8">
        <SearchIcon />
        <AlertTitle>Searching does not require an account</AlertTitle>
        <AlertDescription>
          Every listing, filter, and registration date is public and visible without signing in.
          <Button
            render={<Link href="/search" />}
            nativeButton={false}
            variant="link"
            size="sm"
            className="h-auto px-0"
          >
            Browse activities instead
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}
