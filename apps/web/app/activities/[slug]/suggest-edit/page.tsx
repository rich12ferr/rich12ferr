import Link from "next/link"
import { notFound } from "next/navigation"
import { SuggestEditForm } from "@/components/suggest-edit-form"
import { activityBySlug } from "@/lib/queries"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const activity = await activityBySlug(slug)
  if (!activity) return { title: "Activity not found" }
  return { title: `Suggest an edit — ${activity.title}` }
}

/** PRD-adjacent: lets any visitor (no account required) propose a correction to a
 * program's published details. Every submission lands in the `reports` queue as a
 * draft — nothing here writes to the live listing directly. */
export default async function SuggestEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const activity = await activityBySlug(slug)
  if (!activity) notFound()

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href={`/activities/${activity.slug}`} className="hover:text-foreground hover:underline">
              {activity.title}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="truncate font-medium text-foreground">
            Suggest an edit
          </li>
        </ol>
      </nav>

      <header className="mb-8 flex flex-col gap-2">
        <h1 className="font-display text-2xl leading-tight font-extrabold tracking-tight text-balance sm:text-3xl">
          Suggest an edit
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground text-pretty">
          Found something out of date, or have information the organization just shared? Community
          corrections keep this directory accurate for every family that searches it &mdash; here&apos;s
          how to send one in.
        </p>
      </header>

      <SuggestEditForm
        programId={activity.program_id}
        offeringId={activity.id}
        activitySlug={activity.slug}
        activityTitle={activity.title}
        organizationName={activity.organization.name}
        registrationUrl={activity.registration_url}
        websiteUrl={activity.organization.website_url}
        registrationOpenDate={activity.registration_open_date}
        registrationCloseDate={activity.registration_close_date}
      />
    </div>
  )
}
