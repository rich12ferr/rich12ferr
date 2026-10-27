import Link from "next/link"
import { featuredOfferings, featuredPlacementReport, recentFeaturedClicks } from "@openplay/db"

export const dynamic = "force-dynamic"

const windows = [7, 30, 90] as const

export default async function AdminFeaturedPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const { days: daysParam } = await searchParams
  const days = windows.find((d) => String(d) === daysParam) ?? 30
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [listings, report, recent] = await Promise.all([
    featuredOfferings({ limit: 50 }),
    featuredPlacementReport({ since }),
    recentFeaturedClicks(20),
  ])

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="featured-listings-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="featured-listings-heading" className="font-display text-xl font-bold">
            Featured listings
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            Turn Featured on or off from a listing&apos;s edit page. Featured listings appear only in the labeled rail
            and never change search ordering.
          </p>
        </div>
        {listings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            No listings are featured right now.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
            {listings.map((l) => (
              <li key={l.offeringId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold">{l.organizationName}</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {l.sportName} · {l.season} {l.seasonYear}
                  </span>
                </div>
                <Link
                  href={`/admin/activities/${l.offeringId}`}
                  className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="featured-report-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="featured-report-heading" className="font-display text-xl font-bold">
              Performance by organization
            </h2>
            <p className="text-sm text-muted-foreground">Featured rail only. Organic clicks are excluded.</p>
          </div>
          <nav aria-label="Report window" className="flex gap-1 rounded-full border border-border p-1">
            {windows.map((d) => (
              <Link
                key={d}
                href={`/admin/featured?days=${d}`}
                aria-current={d === days ? "page" : undefined}
                className={
                  d === days
                    ? "inline-flex min-h-9 items-center rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground"
                    : "inline-flex min-h-9 items-center rounded-full px-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
                }
              >
                {d}d
              </Link>
            ))}
          </nav>
        </div>
        {report.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            No Featured impressions or clicks in the last {days} days.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-md text-sm">
              <thead className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr className="border-b border-border">
                  <th scope="col" className="px-4 py-3 font-semibold">Organization</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Impressions</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Clicks</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Register clicks</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">CTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.map((r) => (
                  <tr key={r.organizationId}>
                    <th scope="row" className="px-4 py-3 text-left font-semibold">{r.organizationName}</th>
                    <td className="px-4 py-3 text-right tabular-nums">{r.impressions}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.clicks}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.registerClicks}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.impressions > 0 ? `${((r.clicks / r.impressions) * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="featured-recent-heading" className="flex flex-col gap-3">
        <h2 id="featured-recent-heading" className="font-display text-xl font-bold">
          Recent Featured clicks
        </h2>
        {recent.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            No Featured clicks recorded yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
            {recent.map((c) => (
              <li key={c.id} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
                <span className="font-semibold">
                  {c.organizationName ?? "Unknown organization"} · {c.ctaLabel}
                </span>
                <span className="text-muted-foreground">
                  {c.occurredAt.toLocaleString("en-US", { timeZone: "America/New_York" })} · {c.ctaLocation}
                  {c.discoveryOrigin ? ` · from ${c.discoveryOrigin}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
