import { BellIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { ManageAlertsByEmail } from "@/components/manage-alerts-by-email"
import { listAlertsByEmail } from "@/app/alerts/actions"

export const metadata = {
  title: "Manage your alerts",
  description: "View, pause, or delete the youth sports alerts you've set up — no account needed.",
}

/**
 * Login-free alert management (see the alerts-before-auth decision).
 *
 * A parent proves control of their email by entering it here; we then list
 * that email's alerts. This is a GET form so the email lands in the URL and
 * the page stays a server component that can query directly. Once accounts
 * exist, a logged-in parent can be routed straight here with their session
 * email prefilled — no rework of this page required.
 */
export default async function ManageAlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams
  const normalized = email?.trim().toLowerCase() ?? ""
  const alerts = normalized ? await listAlertsByEmail(normalized) : null

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Manage your alerts</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Enter the email you used to set up your alerts. We&apos;ll show everything you&apos;re
          watching so you can pause or remove any of it — no account needed.
        </p>
      </header>

      <form method="get" className="mb-8 flex flex-col gap-2">
        <Field>
          <FieldLabel htmlFor="manage-email">Email</FieldLabel>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="manage-email"
              name="email"
              type="email"
              required
              defaultValue={normalized}
              placeholder="you@example.com"
              className="min-w-0 flex-1 sm:w-72"
            />
            <Button type="submit">
              <BellIcon data-icon="inline-start" />
              Show my alerts
            </Button>
          </div>
          <FieldDescription>
            We only display alerts already tied to this address.
          </FieldDescription>
        </Field>
      </form>

      {alerts !== null && <ManageAlertsByEmail email={normalized} alerts={alerts} />}
    </div>
  )
}
