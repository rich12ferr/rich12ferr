import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

export const metadata = {
  title: "About us",
  description:
    "Sign Up Vermont keeps track of Vermont activities and registration dates, so your family doesn't have to.",
}

export default function AboutUsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4">
        <p className="font-display text-2xl font-bold tracking-tight text-primary">About us</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
          We keep track of Vermont activities and registration dates, so your family doesn&apos;t have
          to.
        </h1>
        <p className="max-w-prose leading-relaxed text-muted-foreground">
          Sign Up Vermont is a Vermont-based directory covering youth sports, camps, arts, and community
          recreation programs. We built it because the information families need &mdash; what&apos;s
          available, who&apos;s eligible, and when registration opens or closes &mdash; is scattered
          across dozens of school pages, league sites, and Facebook groups. We bring it into one place so
          every family sees the same information at the same time.
        </p>
        <p className="max-w-prose leading-relaxed text-muted-foreground">
          Sign Up Vermont is operated by Sign Up Vermont, LLC. Read more about{" "}
          <Link href="/about" className="font-medium text-foreground underline underline-offset-4">
            how Sign Up Vermont works
          </Link>
          , or jump straight into finding an activity.
        </p>
        <Link
          href="/search"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium underline underline-offset-4"
        >
          Find activities
          <ArrowRightIcon className="size-3.5" aria-hidden="true" />
        </Link>
      </header>
    </div>
  )
}
