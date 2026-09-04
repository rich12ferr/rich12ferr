import Link from "next/link"

export const metadata = {
  title: "Privacy policy",
  description: "What Sign Up Vermont collects, why, and how you can remove it.",
}

const lastUpdated = "September 2026"

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Privacy policy</h1>
        <p className="text-sm text-muted-foreground">Last updated {lastUpdated}</p>
      </header>

      <div className="flex flex-col gap-8 text-sm leading-relaxed text-muted-foreground">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">The short version</h2>
          <p>
            Sign Up Vermont is a directory. You can search it, browse it, and set up alerts without
            creating an account. We collect the minimum information needed to send you an alert email or
            respond to a message you send us, and nothing else. We do not sell your information, and we
            do not share it with the organizations running the activities you look up.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">What we collect</h2>
          <p>
            When you create an alert, we store your email address along with the alert preferences you
            choose &mdash; for example a sport, a location, or a child&apos;s grade range. When you submit an
            activity or send us a message, we store what you enter, including your email address if you
            provide one, so we can review it or follow up. We do not require an account, a name, or any
            other identifying information to use Sign Up Vermont.
          </p>
          <p>
            Like most websites, our hosting and analytics infrastructure automatically logs basic technical
            information, such as approximate location and browser type, for security and reliability
            purposes. We do not use this information to identify individual visitors.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">Why we collect it</h2>
          <p>
            We use your email address for one purpose: to send you the alert emails you asked for, or to
            reply to a message you sent us. We use alert preferences (sport, location, grade) only to
            decide which alert emails apply to you. We do not use any of this information for advertising,
            and we do not build profiles of individual users.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">Who can see it</h2>
          <p>
            Your alert preferences and email address are visible only to you and to the small team running
            Sign Up Vermont. They are never displayed publicly, never shown to the organizations whose
            programs are listed in the directory, and never sold or shared with third parties for
            marketing purposes. We rely on standard third-party infrastructure providers (for example,
            database hosting and email delivery) to operate the service, and they process data only on
            our behalf.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">How to remove your information</h2>
          <p>
            Every alert email includes a one-click unsubscribe link that immediately deletes that alert. You
            can also manage or delete any alert tied to your email address at any time from the{" "}
            <Link href="/alerts/manage" className="font-medium text-foreground underline underline-offset-2">
              manage alerts
            </Link>{" "}
            page &mdash; no account or password required, since none exists. If you would like anything else
            removed, or have a question about what we hold, use the{" "}
            <Link href="/contact" className="font-medium text-foreground underline underline-offset-2">
              contact form
            </Link>{" "}
            and we will handle it directly.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">Changes to this policy</h2>
          <p>
            If this policy changes in a way that affects how your information is used, we will update this
            page and change the date at the top. Continued use of Sign Up Vermont after a change means you
            accept the updated policy.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">Questions</h2>
          <p>
            Sign Up Vermont is operated by Sign Up Vermont, LLC. If you have a question about this policy
            or your data, reach out through the{" "}
            <Link href="/contact" className="font-medium text-foreground underline underline-offset-2">
              contact form
            </Link>{" "}
            and a real person will respond.
          </p>
        </section>
      </div>
    </div>
  )
}
