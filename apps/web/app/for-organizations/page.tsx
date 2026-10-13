import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "For organizations",
  description:
    "List your Vermont youth programs on Sign Up Vermont for free and reach parents while they are deciding.",
}

export default function ForOrganizationsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <section className="flex flex-col gap-6" aria-labelledby="for-orgs-heading">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          For organizations
        </p>
        <h1
          id="for-orgs-heading"
          className="font-display text-3xl font-extrabold tracking-tight text-balance sm:text-5xl"
        >
          Reach Vermont parents when they&apos;re deciding. Free.
        </h1>
        <div className="flex max-w-prose flex-col gap-4 leading-relaxed text-muted-foreground">
          <p className="text-pretty">
            Sign Up Vermont is the directory where Vermont parents search for youth activities by sport,
            grade, and ZIP — and where they find out before registration closes. Listing your programs is
            free and takes about two minutes.
          </p>
          <p className="text-pretty">
            What you get: your programs in front of parents searching right now, an &apos;Organization
            verified&apos; badge once you confirm your details, and listing views you can actually see.
            Claim your listing any time to update details yourself.
          </p>
        </div>
        <Button
          render={<Link href="/submit" />}
          nativeButton={false}
          size="lg"
          className="h-12 w-full text-base sm:w-fit"
        >
          List your program
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </section>
    </div>
  )
}
