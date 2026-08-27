import Image from 'next/image'
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
      <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="flex flex-col-reverse items-center gap-10 md:flex-row md:items-start md:justify-between md:gap-12">
          <div className="w-full md:max-w-2xl">
            <h1 className="text-balance font-serif text-3xl font-semibold leading-[1.12] tracking-tight md:text-4xl lg:text-5xl">
              {profile.positioning}
            </h1>

            <div className="mt-5 space-y-4 text-pretty text-base leading-relaxed text-charcoal-foreground/70">
              {profile.summary.split('\n\n').map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
            </div>

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
          </div>

          <div className="shrink-0">
            <div className="relative size-36 overflow-hidden rounded-full ring-1 ring-charcoal-foreground/15 ring-offset-4 ring-offset-charcoal md:size-44 lg:size-52">
              <Image
                src="/images/rich-ferrara-headshot.png"
                alt="Portrait of Rich Ferrara"
                fill
                sizes="(min-width: 1024px) 208px, (min-width: 768px) 176px, 144px"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-charcoal-foreground/15 pt-8">
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
