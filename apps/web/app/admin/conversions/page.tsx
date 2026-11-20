import Link from "next/link"
import { conversionReport, type ConversionRow } from "@openplay/db"

export const dynamic = "force-dynamic"

const windows = [7, 30, 90] as const

const pageLabels: Record<string, string> = {
  homepage: "Homepage",
  search: "Search results",
  camps: "Camps",
  calendar: "Calendar",
  activity_detail: "Activity detail",
  organization_page: "Organization page",
  organizations: "Organizations directory",
  sport_page: "Sport page",
  sports: "Sports directory",
  weekly_update: "Weekly stories",
  unknown: "Unknown page",
}

const dateFormat: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/New_York",
}

function ctr(clicks: number, views: number) {
  return views > 0 ? `${((clicks / views) * 100).toFixed(1)}%` : "—"
}

function ConversionTable({
  id,
  title,
  description,
  nameHeader,
  rows,
  labelFor,
  emptyText,
}: {
  id: string
  title: string
  description: string
  nameHeader: string
  rows: ConversionRow[]
  labelFor?: (row: ConversionRow) => string
  emptyText: string
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="font-display text-xl font-bold">
          {title}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-xs tracking-wide text-muted-foreground uppercase">
              <tr className="border-b border-border">
                <th scope="col" className="px-3 py-3 font-semibold sm:px-4">
                  {nameHeader}
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold sm:px-4">
                  Views
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold sm:px-4">
                  Clicks
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold sm:px-4">
                  CTR
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row" className="px-3 py-3 text-left align-top font-semibold sm:px-4">
                    <span className="block text-pretty">{labelFor ? labelFor(r) : r.label}</span>
                    {r.otherClicks > 0 && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        +{r.otherClicks} from result cards
                      </span>
                    )}
                  </th>
                  <td className="px-3 py-3 text-right align-top tabular-nums sm:px-4">{r.views}</td>
                  <td className="px-3 py-3 text-right align-top tabular-nums sm:px-4">{r.clicks}</td>
                  <td className="px-3 py-3 text-right align-top font-semibold tabular-nums sm:px-4">
                    {ctr(r.clicks, r.views)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default async function AdminConversionsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const { days: daysParam } = await searchParams
  const days = windows.find((d) => String(d) === daysParam) ?? 30
  const report = await conversionReport({ since: new Date(Date.now() - days * 24 * 60 * 60 * 1000) })
  const clamped = report.trackingSince !== null && report.since.getTime() === report.trackingSince.getTime()

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="conversions-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="conversions-heading" className="font-display text-xl font-bold">
              Registration conversions
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              CTR is registration and website clicks on a page divided by views of that page. Admin visits are not
              counted.
            </p>
          </div>
          <nav aria-label="Report window" className="flex gap-1 rounded-full border border-border p-1">
            {windows.map((d) => (
              <Link
                key={d}
                href={`/admin/conversions?days=${d}`}
                aria-current={d === days ? "page" : undefined}
                className={
                  d === days
                    ? "inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
                    : "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-muted-foreground hover:text-foreground"
                }
              >
                {d}d
              </Link>
            ))}
          </nav>
        </div>

        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border">
          <div className="flex flex-col gap-1 bg-card p-4">
            <dt className="text-xs tracking-wide text-muted-foreground uppercase">Views</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{report.totals.views}</dd>
          </div>
          <div className="flex flex-col gap-1 bg-card p-4">
            <dt className="text-xs tracking-wide text-muted-foreground uppercase">Clicks</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{report.totals.clicks}</dd>
          </div>
          <div className="flex flex-col gap-1 bg-card p-4">
            <dt className="text-xs tracking-wide text-muted-foreground uppercase">CTR</dt>
            <dd className="font-display text-2xl font-bold tabular-nums text-primary">
              {ctr(report.totals.clicks, report.totals.views)}
            </dd>
          </div>
        </dl>

        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          {report.trackingSince === null
            ? "View tracking is live but no views have been recorded yet. Rates appear after the first public page visits."
            : clamped
              ? `View tracking started ${report.trackingSince.toLocaleDateString("en-US", dateFormat)}, so this report covers from then rather than the full ${days} days. Earlier clicks are left out so rates are not inflated.`
              : `Covers ${report.since.toLocaleDateString("en-US", dateFormat)} to today.`}
        </p>
      </section>

      <ConversionTable
        id="conversions-page-heading"
        title="By page"
        description="Where visitors were when they clicked through to register."
        nameHeader="Page"
        rows={report.byPage}
        labelFor={(r) => pageLabels[r.key] ?? r.key}
        emptyText="No page views or clicks in this window."
      />

      <ConversionTable
        id="conversions-org-heading"
        title="By organization"
        description="Views of an organization's activity and organization pages, and clicks made there. Clicks from search and camp result cards are shown separately."
        nameHeader="Organization"
        rows={report.byOrganization}
        emptyText="No organization views or clicks in this window."
      />

      <ConversionTable
        id="conversions-sport-heading"
        title="By sport"
        description="Views of activity and sport pages for each sport, and clicks made there. Clicks from result cards are shown separately."
        nameHeader="Sport"
        rows={report.bySport}
        emptyText="No sport views or clicks in this window."
      />
    </div>
  )
}
