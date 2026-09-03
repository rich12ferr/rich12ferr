import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

export const metadata = {
  title: "About us",
  description:
    "OpenPlay is building a free, open directory of youth sports and activities so every family has the same information at the same time.",
}

export default function AboutUsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4">
        <p className="font-display text-2xl font-bold tracking-tight text-primary">Stronger together</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
          Building healthy kids and connected communities.
        </h1>
        <p className="max-w-prose leading-relaxed text-muted-foreground">
          More of this story is on its way. In the meantime, read about{" "}
          <Link href="/about" className="font-medium text-foreground underline underline-offset-4">
            how OpenPlay works
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
