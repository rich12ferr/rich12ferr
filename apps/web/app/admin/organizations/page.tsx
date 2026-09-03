import Link from "next/link"
import { CheckCircle2Icon, ExternalLinkIcon, GlobeIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { organizationSummaries } from "@/lib/queries"

/**
 * Always server-rendered: an admin must see the effect of an edit immediately,
 * and stale verification state here would undermine the review workflow.
 */
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Organizations",
}

export default async function AdminOrganizationsPage() {
  const rows = await organizationSummaries()
  const verified = rows.filter((r) => r.organization.verified).length

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Organizations</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {rows.length} sources in the crawl set, {verified} verified. An unverified organization means
          every listing under it inherits that doubt.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-0 p-0">
          {rows.map(({ organization, total, openNow }, index) => (
            <div
              key={organization.id}
              className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 ${
                index > 0 ? "border-t" : ""
              }`}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/organizations/${organization.id}`}
                    className="truncate text-sm font-semibold hover:underline"
                  >
                    {organization.name}
                  </Link>
                  {organization.verified ? (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2Icon className="size-3" />
                      verified
                    </Badge>
                  ) : (
                    <Badge variant="outline">unverified</Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {organization.town}, {organization.state} &middot; {total} listing
                  {total === 1 ? "" : "s"} &middot; {openNow} open now &middot; last verified{" "}
                  {organization.last_verified_at}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {organization.registration_platform && (
                  <Badge variant="outline" className="text-xs">
                    {organization.registration_platform}
                  </Badge>
                )}
                {organization.website_url && (
                  <Button
                    render={
                      <a href={organization.website_url} target="_blank" rel="noopener noreferrer" />
                    }
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                  >
                    <GlobeIcon data-icon="inline-start" />
                    Source
                    <ExternalLinkIcon className="size-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
