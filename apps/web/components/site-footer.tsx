import Link from "next/link"
import { OpenPlayMark, OpenPlayWordmark } from "@/components/openplay-mark"

const columns = [
  {
    heading: "Discover",
    links: [
      { href: "/search", label: "Find activities" },
      { href: "/sports", label: "Browse sports" },
      { href: "/organizations", label: "Organizations" },
      { href: "/calendar", label: "Registration calendar" },
    ],
  },
  {
    heading: "Contribute",
    links: [
      { href: "/submit", label: "Submit an activity" },
      { href: "/alerts", label: "Create an alert" },
      { href: "/about", label: "How OpenPlay works" },
      { href: "/about-us", label: "About us" },
    ],
  },
  {
    heading: "Support",
    links: [
      { href: "/alerts/manage", label: "Manage your alerts" },
      { href: "/contact", label: "Contact us" },
      { href: "/admin", label: "Admin console" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of use" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 lg:flex-row lg:gap-16">
        <div className="flex max-w-sm flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <OpenPlayMark className="size-8" />
            <OpenPlayWordmark className="text-lg" />
          </div>
          <p className="font-display text-sm font-bold tracking-tight text-primary">
            Stronger together &mdash; building healthy kids and connected communities.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            A free, open directory of youth sports in central Vermont. Every family sees the same
            information at the same time.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            OpenPlay never processes registrations or payments. Registration always happens on the
            organization&apos;s own site.
          </p>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-4">
          {columns.map((column) => (
            <div key={column.heading} className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {column.heading}
              </h2>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Prototype build. All organizations and programs shown are fictitious sample data.</p>
          <p>Serving Montpelier, Berlin, Barre, Northfield, and Waterbury, VT.</p>
        </div>
      </div>
    </footer>
  )
}
