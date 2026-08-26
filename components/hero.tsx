import { ArrowRight } from 'lucide-react'
import { profile, competencies } from '@/lib/content'

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-charcoal text-charcoal-foreground">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <span className="inline-block size-2 rounded-full bg-primary" />
          Open to Director &amp; VP-level product leadership roles
        </div>

        <h1 className="mt-6 max-w-4xl text-balance font-serif text-4xl font-semibold leading-[1.08] tracking-tight md:text-6xl">
          {profile.positioning}
        </h1>

        <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-charcoal-foreground/70">
          {profile.summary}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <a
            href="#work"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            View selected work
            <ArrowRight className="size-4" />
          </a>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 rounded-md border border-charcoal-foreground/25 px-5 py-3 text-sm font-semibold text-charcoal-foreground transition-colors hover:bg-charcoal-foreground/10"
          >
            Get in touch
          </a>
        </div>

        <div className="mt-14 border-t border-charcoal-foreground/15 pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-charcoal-foreground/50">
            Core competencies
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {competencies.map((item) => (
              <span
                key={item}
                className="rounded-full border border-charcoal-foreground/15 bg-charcoal-foreground/5 px-3 py-1.5 text-sm text-charcoal-foreground/80"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
