import Image from 'next/image'
import { caseStudies, type CaseStudy } from '@/lib/content'

function Phase({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{label}</p>
      <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">{children}</p>
    </div>
  )
}

function CaseStudyCard({ study }: { study: CaseStudy }) {
  return (
    <article
      id={study.id}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="border-b border-border bg-secondary/50 p-8 md:p-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="md:max-w-xl">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="font-serif text-2xl font-semibold text-primary">{study.index}</span>
              <span className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {study.company}
              </span>
            </div>
            <h3 className="mt-4 text-balance font-serif text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {study.headline}
            </h3>
            <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
              {study.descriptor}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-foreground">
                <span className="font-semibold">Role:</span> {study.role}
              </span>
              <span className="text-foreground">
                <span className="font-semibold">Timeframe:</span> {study.timeframe}
              </span>
            </div>
          </div>

          {study.screenshot ? (
            <div className="shrink-0 overflow-hidden rounded-xl border border-border shadow-sm md:w-80">
              <Image
                src={study.screenshot.src || '/placeholder.svg'}
                alt={study.screenshot.alt}
                width={640}
                height={400}
                className="h-auto w-full object-cover"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-8 p-8 md:grid-cols-3 md:p-10">
        <Phase label="The problem">{study.problem}</Phase>
        <Phase label="My approach">{study.approach}</Phase>
        <Phase label="The outcome">{study.outcome}</Phase>
      </div>

      <div className="grid gap-8 border-t border-border p-8 md:grid-cols-3 md:p-10">
        <div className="md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
            Why it matters
          </p>
          <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
            {study.whyItMatters}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
            Key skills
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {study.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

export function CaseStudies() {
  return (
    <section id="work" className="scroll-mt-20 border-b border-border bg-secondary/30 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Selected work
          </p>
          <h2 className="mt-4 text-balance font-serif text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Platform problems solved at the intersection of product, engineering &amp; policy
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            Each of these initiatives turned fragmented identity, data, consent, and developer
            capabilities into reusable, governed platform foundations built to scale for years.
          </p>
        </div>

        <div className="mt-12 flex flex-col gap-8">
          {caseStudies.map((study) => (
            <CaseStudyCard key={study.id} study={study} />
          ))}
        </div>
      </div>
    </section>
  )
}
