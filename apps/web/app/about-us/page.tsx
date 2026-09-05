import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

export const metadata = {
  title: "About us",
  description: "Helping every Vermonter find a place to play, participate, and belong.",
}

export default function AboutUsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4">
        <p className="font-display text-2xl font-bold tracking-tight text-primary">About us</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
          Helping every Vermonter find a place to play, participate, and belong.
        </h1>
        <p className="max-w-prose leading-relaxed text-muted-foreground">
          Sign Up Vermont exists to make play, sport, and community activities easier for everyone to
          discover and join. We believe every child and family should have an equitable opportunity to
          participate. By bringing local opportunities into one accessible place, we help remove the
          information barriers that too often keep kids on the sidelines.
        </p>
        <p className="max-w-prose leading-relaxed text-muted-foreground">
          We work across recreation departments, schools, clubs, coaches, community organizations, and
          families to create a more connected and welcoming Vermont &mdash; one where participation is
          easier, opportunities are more visible, and everyone can find a place to belong.
        </p>
        <p className="max-w-prose leading-relaxed text-muted-foreground">
          Because sport and play are about more than competition. They build confidence, friendships,
          acceptance, community, and a sense that we are all part of something together.
        </p>
        <p className="max-w-prose leading-relaxed text-muted-foreground">
          Read more about{" "}
          <Link href="/about" className="font-medium text-foreground underline underline-offset-4">
            how Sign Up Vermont works
          </Link>
          , or jump straight into{" "}
          <Link href="/search" className="font-medium text-foreground underline underline-offset-4">
            finding an activity
          </Link>
          .
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
