import Link from "next/link"

export const metadata = {
  title: "Terms of use",
  description: "The terms for using the Sign Up Vermont directory.",
}

const lastUpdated = "September 2026"

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Terms of use</h1>
        <p className="text-sm text-muted-foreground">Last updated {lastUpdated}</p>
        <p className="text-sm text-muted-foreground">
          Sign Up Vermont is operated by Sign Up Vermont, LLC.
        </p>
      </header>

      <div className="flex flex-col gap-8 text-sm leading-relaxed text-muted-foreground">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">What Sign Up Vermont is</h2>
          <p>
            Sign Up Vermont is a service of Sign Up Vermont, LLC, offered as a directory of youth sports,
            camps, arts, and recreation programs. It is provided to help families find and track
            registration information. By using Sign Up Vermont, you agree to these terms.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">What Sign Up Vermont is not</h2>
          <p>
            Sign Up Vermont, LLC never processes registrations, payments, or rosters. Every
            &quot;Register&quot; link sends you directly to the organization running the program, and any
            registration, payment, or enrollment happens entirely on that organization&apos;s own site,
            under that organization&apos;s own terms. Sign Up Vermont, LLC is not a party to that
            transaction and is not responsible for it.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">Accuracy of listings</h2>
          <p>
            Listings are gathered from public sources, community submissions, and, where available, direct
            confirmation from the organization. Each listing shows a verification label and a
            &quot;last checked&quot; date so you can judge how current the information is. We work to keep
            listings accurate, but registration dates, costs, and eligibility can change on short notice.
            Always confirm important details, especially registration deadlines, directly on the
            organization&apos;s own site before relying on them.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">Alerts</h2>
          <p>
            Alert emails are a convenience, not a guarantee. We aim to notify you promptly when registration
            opens or a deadline approaches, but delivery delays, spam filtering, or an error on our end could
            cause a notification to arrive late or not at all. Do not rely on an alert as your only way of
            tracking a registration deadline that matters to you.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">Community submissions</h2>
          <p>
            Anyone can submit a program to the directory. Submissions are reviewed before they appear
            publicly, but a review confirms the source looks credible, not that every detail is guaranteed
            correct. If you find an error, use the{" "}
            <Link href="/contact" className="font-medium text-foreground underline underline-offset-2">
              contact form
            </Link>{" "}
            to let us know.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">Acceptable use</h2>
          <p>
            Sign Up Vermont is meant to be used by families and organizations looking for or listing youth
            activities. Please do not scrape, mirror, or resell the directory&apos;s data, and do not use the
            contact or submission forms to send spam or unrelated advertising.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">No warranty</h2>
          <p>
            Sign Up Vermont is provided as-is, without warranties of any kind, express or implied. We do
            not guarantee that the directory is complete, uninterrupted, or error-free.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">Changes to these terms</h2>
          <p>
            We may update these terms as the product changes. If we do, we will update the date at the top
            of this page. Continued use of Sign Up Vermont after a change means you accept the updated
            terms.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">Questions</h2>
          <p>
            Reach out through the{" "}
            <Link href="/contact" className="font-medium text-foreground underline underline-offset-2">
              contact form
            </Link>{" "}
            with any questions about these terms.
          </p>
        </section>
      </div>
    </div>
  )
}
