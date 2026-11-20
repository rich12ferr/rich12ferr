import Link from "next/link"
import Image from "next/image"
import { ArrowUpRight, Check, Compass } from "lucide-react"
import type { ReactNode } from "react"

type Collection = { title: string; image: string; href: string; active: boolean }

export function ActivityDiscovery({
  eyebrow,
  title,
  description,
  collections,
  filters,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  collections: Collection[]
  filters: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
      <header className="pt-8 pb-6 sm:pt-12 sm:pb-8">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-widest text-primary uppercase">
          <Compass aria-hidden="true" size={17} />
          {eyebrow}
        </p>
        <h1 className="font-display text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl">
          {title}
        </h1>
        <p className="mt-2 text-base text-muted-foreground sm:text-lg">{description}</p>
      </header>
      <nav aria-label="Browse collections" className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {collections.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            scroll={false}
            aria-current={c.active ? "true" : undefined}
            className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground transition-shadow hover:shadow-md aria-current:ring-2 aria-current:ring-primary"
          >
            <div className="relative aspect-[1.9] overflow-hidden">
              <Image
                fill
                sizes="(max-width:640px) 48vw, 275px"
                src={c.image}
                alt=""
                className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
              />
            </div>
            <div className="flex min-h-12 items-center justify-between gap-1 px-3 py-2 font-display text-sm font-bold sm:px-4 sm:text-base">
              {c.title}
              {c.active ? <Check size={16} aria-hidden="true" /> : <ArrowUpRight size={16} aria-hidden="true" />}
            </div>
          </Link>
        ))}
      </nav>
      <div className="sticky top-20 z-20 mt-5 border-b border-border bg-background py-3">{filters}</div>
      <div className="flex flex-col gap-6 pt-5">{children}</div>
    </div>
  )
}
