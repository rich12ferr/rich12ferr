import Link from "next/link"
import {
  ArrowRightIcon,
  BellIcon,
  ExternalLinkIcon,
  ScaleIcon,
  ShieldCheckIcon,
  SquarePenIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { verificationLabels } from "@/lib/queries"

/**
 * Registration status and "checked N days ago" are computed from the current
 * time, so this page must not be frozen at build time. Re-rendered at most
 * every 5 minutes — well inside the day-level granularity of a deadline.
 */
export const revalidate = 300

export const metadata = {
  title: "How OpenPlay works",
  description:
    "OpenPlay is a free directory of youth sports programs. It never processes registrations or payments.",
}

const principles = [
  {
    icon: ScaleIcon,
    title: "Results are ordered on neutral criteria only",
    body: "Eligibility first, then how urgent the registration deadline is, then distance. Never athletic ability, coach relationships, family reputation, or past participation. There is no paid placement.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Every listing shows where it came from",
    body: "Each activity links to the source it was read from and shows when it was last checked. If information is more than a month old, the listing says so rather than looking current.",
  },
  {
    icon: ExternalLinkIcon,
    title: "Registration always happens on the organization's site",
    body: "OpenPlay never takes a payment, never holds a roster spot, and never asks for a child's medical or identifying information. The Register button sends you to the organization.",
  },
]

const steps = [
  {
    label: "Search without an account",
    body: "Enter a grade or age and a distance. Everything in the directory is public, and no filter is hidden behind a sign-in.",
    href: "/search",
    action: "Find activities",
  },
  {
    label: "Check the registration window",
    body: "Every listing shows whether registration is open, closing soon, upcoming, or closed, along with the dates that decision came from.",
    href: "/calendar",
    action: "See the calendar",
  },
  {
    label: "Set an alert so you do not have to watch",
    body: "Follow a sport or a child's grade and area. We email you when registration opens and again before it closes.",
    href: "/alerts",
    action: "Create an alert",
  },
]

const statuses: { key: keyof typeof verificationLabels; body: string }[] = [
  { key: "organization_verified", body: "The organization itself confirmed these details." },
  { key: "admin_reviewed", body: "A reviewer checked the source and confirmed the details." },
  { key: "community_submitted", body: "A parent or coach submitted it and a reviewer accepted it." },
  { key: "ai_extracted", body: "Read automatically from a public page, pending human review." },
  { key: "unverified", body: "Listed from a public source with no confirmation yet." },
]

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-10 flex flex-col gap-4">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
          Every family should see the same information at the same time
        </h1>
        <p className="max-w-prose leading-relaxed text-muted-foreground">
          Youth sports information is scattered across school pages, league sites, Facebook groups, and
          word of mouth. Families who happen to know a coach hear about registration first. OpenPlay is a
          free, open directory that puts all of it in one place so that advantage disappears.
        </p>
      </header>

      <section className="mb-12 flex flex-col gap-4" aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="font-display text-xl font-extrabold tracking-tight">
          How to use it
        </h2>
        <ol className="flex flex-col gap-3">
          {steps.map((step, index) => (
            <li
              key={step.label}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:gap-5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm font-bold text-secondary-foreground">
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="font-semibold">{step.label}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
              <Button
                render={<Link href={step.href} />}
                nativeButton={false}
                variant="outline"
                size="sm"
                className="shrink-0 sm:ml-auto"
              >
                {step.action}
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-12 flex flex-col gap-4" aria-labelledby="principles">
        <h2 id="principles" className="font-display text-xl font-extrabold tracking-tight">
          What OpenPlay will and will not do
        </h2>
        <div className="flex flex-col gap-3">
          {principles.map((principle) => (
            <div
              key={principle.title}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <principle.icon className="size-4.5" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold">{principle.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{principle.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12 flex flex-col gap-4" aria-labelledby="verification">
        <h2 id="verification" className="font-display text-xl font-extrabold tracking-tight">
          What the verification labels mean
        </h2>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          Every listing carries one of these labels. A weaker label is not a warning about the program,
          only a statement about how confident we are in the details we are showing you.
        </p>
        <dl className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {statuses.map((status) => (
            <div key={status.key} className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-6">
              <dt className="w-full shrink-0 font-medium sm:w-52">{verificationLabels[status.key]}</dt>
              <dd className="text-sm leading-relaxed text-muted-foreground">{status.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        className="flex flex-col gap-4 rounded-2xl border border-border bg-secondary/60 p-6"
        aria-labelledby="help"
      >
        <h2 id="help" className="font-display text-xl font-extrabold tracking-tight">
          Help keep it accurate
        </h2>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          The directory is only as complete as the community makes it. If a program is missing, add it. If
          something looks wrong, say so on the listing and a reviewer will check the source.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link href="/submit" />} nativeButton={false} size="sm">
            <SquarePenIcon data-icon="inline-start" />
            Submit an activity
          </Button>
          <Button
            render={<Link href="/alerts" />}
            nativeButton={false}
            variant="outline"
            size="sm"
          >
            <BellIcon data-icon="inline-start" />
            Create an alert
          </Button>
        </div>
      </section>
    </div>
  )
}
