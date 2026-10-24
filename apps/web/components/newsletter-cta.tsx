import type { ReactNode } from "react"
import { NewsletterForm, type NewsletterSource } from "@/components/newsletter-form"

/**
 * The newsletter opt-in card. A themed card rather than a
 * bg-foreground/text-background band: those tokens invert between light/dark
 * mode, which previously left the input styled for a dark band that had turned light.
 */
export function NewsletterCta({
  source,
  eyebrow,
  title,
  description,
  headingId,
}: {
  source: NewsletterSource
  eyebrow: string
  title: ReactNode
  description: ReactNode
  headingId?: string
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-secondary/60 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-8">
      <div className="flex max-w-xl flex-col gap-1.5">
        <p className="inline-flex w-fit items-center gap-2 rounded-full bg-highlight px-3 py-1 text-xs font-semibold text-highlight-foreground">
          {eyebrow}
        </p>
        <h2 id={headingId} className="font-display text-xl font-extrabold tracking-tight text-balance sm:text-2xl">
          {title}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>
      </div>
      <div className="w-full max-w-md sm:shrink-0">
        <NewsletterForm source={source} />
      </div>
    </div>
  )
}
