import Link from "next/link"
import { BellIcon, PlusIcon, SearchXIcon } from "lucide-react"
import { ActivityCard } from "@/components/activity-card"
import { SearchFilters } from "@/components/search-filters"
import { SearchToolbar } from "@/components/search-toolbar"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { parseFilters, searchActivities, type SearchParamsShape } from "@/lib/queries"

export const metadata = {
  title: "Find activities",
  description: "Search youth sports programs by sport, age, grade, season, and town.",
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>
}) {
  const params = await searchParams
  const now = new Date()
  const filters = parseFilters(params)
  const results = await searchActivities(filters, now)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Find activities</h1>
        <p className="text-sm text-muted-foreground">
          Filters update the address bar, so you can bookmark or share any search.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[17.5rem_1fr]">
        <aside aria-label="Filters">
          <SearchFilters />
          <div className="lg:hidden">
            <SearchFilters variant="sheet" />
          </div>
        </aside>

        <div className="flex flex-col gap-5">
          <SearchToolbar count={results.length} />

          {results.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {results.map((result) => (
                <li key={result.id}>
                  <ActivityCard
                    activity={result}
                    status={result.status}
                    eligibilityNote={result.eligibilityNote}
                    now={now}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <Empty className="rounded-2xl border border-border bg-card">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchXIcon />
                </EmptyMedia>
                <EmptyTitle>No activities match these filters</EmptyTitle>
                <EmptyDescription>
                  Nothing here yet may mean the program exists but hasn&apos;t been added. Widen your
                  distance, clear a filter, or tell us what we&apos;re missing.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button render={<Link href="/search" />} nativeButton={false} variant="outline">
                    Clear all filters
                  </Button>
                  <Button render={<Link href="/alerts" />} nativeButton={false} variant="outline">
                    <BellIcon data-icon="inline-start" />
                    Alert me when something opens
                  </Button>
                  <Button render={<Link href="/submit" />} nativeButton={false}>
                    <PlusIcon data-icon="inline-start" />
                    Submit an activity
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          )}
        </div>
      </div>
    </div>
  )
}
