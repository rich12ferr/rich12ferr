import { Award } from 'lucide-react'
import { profile, metrics, philosophy, experience, credentials } from '@/lib/content'

export function About() {
  return (
    <section id="about" className="scroll-mt-20 border-b border-border bg-background">
      {/* Philosophy + narrative */}
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              About &amp; Impact
            </p>
            <h2 className="mt-4 text-balance font-serif text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
              {philosophy.tagline}
            </h2>
            <p className="mt-6 text-pretty leading-relaxed text-muted-foreground">
              {profile.summary}
            </p>
          </div>

          <div className="flex flex-col gap-5">
            {philosophy.narrative.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="text-pretty leading-relaxed text-foreground/85">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* Pillars */}
        <div className="mt-16 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
          {philosophy.pillars.map((pillar) => (
            <div key={pillar.title} className="flex flex-col gap-2 bg-card p-7">
              <h3 className="font-serif text-lg font-semibold text-foreground">{pillar.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics band on charcoal for visual contrast */}
      <div className="bg-charcoal">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Impact by the numbers
          </p>
          <h3 className="mt-4 max-w-2xl text-balance font-serif text-2xl font-semibold tracking-tight text-charcoal-foreground md:text-3xl">
            Measurable outcomes across regulated, enterprise-scale environments
          </h3>

          <dl className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="flex flex-col gap-1.5 border-t border-charcoal-foreground/20 pt-5"
              >
                <dd className="font-serif text-4xl font-semibold tracking-tight text-primary">
                  {metric.value}
                </dd>
                <dt className="text-base font-semibold text-charcoal-foreground">{metric.label}</dt>
                <p className="text-sm leading-relaxed text-charcoal-foreground/65">
                  {metric.detail}
                </p>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Experience timeline + patent */}
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Experience
            </p>
            <ol className="mt-8 border-l border-border">
              {experience.map((role) => (
                <li key={role.company} className="relative pb-8 pl-8 last:pb-0">
                  <span className="absolute -left-[7px] top-1.5 size-3.5 rounded-full border-2 border-background bg-primary" />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <h3 className="font-serif text-lg font-semibold text-foreground">
                      {role.company}
                    </h3>
                    <span className="text-sm font-medium text-muted-foreground">
                      {role.timeframe}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-primary">{role.role}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {role.summary}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-6">
              <Award className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold text-foreground">{credentials.patent.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {credentials.patent.description}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Current focus
              </p>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
                {profile.summaryExtended}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
