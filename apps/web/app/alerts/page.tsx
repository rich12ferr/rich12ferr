import { AlertForm } from "@/components/alert-form"

export const metadata = {
  title: "Create an alert",
  description: "Get an email when youth sports registration opens or is about to close.",
}

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>
}) {
  const { sport } = await searchParams

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Create an alert</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Registration windows are short and easy to miss. Tell us what you&apos;re watching for and
          we&apos;ll email you when it opens, and again before it closes.
        </p>
      </header>

      <AlertForm initialSport={sport} />
    </div>
  )
}
