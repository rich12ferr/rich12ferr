import { Mail, Phone, Link as LinkIcon, ArrowUpRight, Download } from 'lucide-react'
import { profile } from '@/lib/content'

export function Contact() {
  return (
    <section
      id="contact"
      className="scroll-mt-20 bg-charcoal py-20 text-charcoal-foreground md:py-28"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Let&apos;s talk
            </p>
            <h2 className="mt-4 text-balance font-serif text-3xl font-semibold tracking-tight md:text-4xl">
              Looking for a product leader to build durable platform foundations
            </h2>
            <p className="mt-6 max-w-xl text-pretty leading-relaxed text-charcoal-foreground/70">
              I&apos;m exploring Director and VP-level product leadership roles where identity, data,
              consent, interoperability, and developer platforms come together. If that sounds like
              your team, I&apos;d love to connect.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Mail className="size-4" />
                Email me
              </a>
              <a
                href="/rich-ferrera-resume.pdf"
                className="inline-flex items-center gap-2 rounded-md border border-charcoal-foreground/25 px-5 py-3 text-sm font-semibold text-charcoal-foreground transition-colors hover:bg-charcoal-foreground/10"
              >
                <Download className="size-4" />
                Download resume
              </a>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-1 rounded-2xl border border-charcoal-foreground/15 bg-charcoal-foreground/5 p-2">
            <ContactRow
              icon={<Mail className="size-5" />}
              label="Email"
              value={profile.email}
              href={`mailto:${profile.email}`}
            />
            <ContactRow
              icon={<Phone className="size-5" />}
              label="Phone"
              value={profile.phone}
              href={`tel:${profile.phone.replace(/[^\d]/g, '')}`}
            />
            <ContactRow
              icon={<LinkIcon className="size-5" />}
              label="LinkedIn"
              value={profile.linkedinLabel}
              href={profile.linkedin}
              external
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function ContactRow({
  icon,
  label,
  value,
  href,
  external,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href?: string
  external?: boolean
}) {
  const content = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium uppercase tracking-[0.14em] text-charcoal-foreground/50">
          {label}
        </span>
        <span className="block truncate font-medium text-charcoal-foreground">{value}</span>
      </span>
      {href && <ArrowUpRight className="size-4 shrink-0 text-charcoal-foreground/40" />}
    </>
  )

  if (!href) {
    return <div className="flex items-center gap-4 rounded-xl p-4">{content}</div>
  }

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="flex items-center gap-4 rounded-xl p-4 transition-colors hover:bg-charcoal-foreground/10"
    >
      {content}
    </a>
  )
}
