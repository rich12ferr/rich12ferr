import { SubmitActivityForm } from "@/components/submit-activity-form"
import { organizationOptions } from "@/lib/queries"

export const metadata = {
  title: "Submit an activity",
  description: "Know about a youth sports program that is not listed? Add it to the directory.",
}

export default async function SubmitPage() {
  const organizations = await organizationOptions()

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Submit an activity</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The directory is only as complete as the community makes it. If you know about a program that
          is not listed, add what you know. You do not need every field, and you do not need an account.
        </p>
      </header>

      <SubmitActivityForm organizations={organizations} />
    </div>
  )
}
