import Link from "next/link"
import { MenuIcon } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { weekRangeLabel } from "@/lib/queries"
import type { WeeklyEditionSummary } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Wayfinding for the `/this-week` archive. The newest published edition is
 * always "This week"; everything else is labelled by its date range.
 *
 * This flat, recency-ordered list is the "This Week / Sep 7-13 / Aug 31-Sep 6
 * / Earlier" shape from the product spec. It already scales past a handful
 * of editions without changes; once there is enough history that a flat list
 * gets unwieldy, group `editions` by year/month before rendering the same
 * `<Link>` rows (the "2026 > September > Sep 7-13" hierarchy) — the data
 * shape here does not need to change, only how it's bucketed for display.
 */
function EditionList({ editions, currentSlug }: { editions: WeeklyEditionSummary[]; currentSlug: string }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {editions.map((edition, index) => {
        const isActive = edition.weekSlug === currentSlug
        const label = index === 0 ? "This week" : weekRangeLabel(edition.weekStart, edition.weekEnd)
        return (
          <li key={edition.weekSlug}>
            <Link
              href={`/this-week/${edition.weekSlug}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col gap-0.5 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              {label}
              {index === 0 ? (
                <span className="text-xs text-muted-foreground">
                  {weekRangeLabel(edition.weekStart, edition.weekEnd)}
                </span>
              ) : null}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function WeeklyArchiveNav({
  editions,
  currentSlug,
}: {
  editions: WeeklyEditionSummary[]
  currentSlug: string
}) {
  return (
    <>
      {/* Desktop sidebar */}
      <nav aria-label="Previous weeks" className="hidden lg:sticky lg:top-20 lg:block lg:h-fit lg:w-56 lg:shrink-0">
        <p className="mb-2 px-3 text-xs font-bold tracking-widest text-muted-foreground uppercase">This Week</p>
        <EditionList editions={editions} currentSlug={currentSlug} />
      </nav>

      {/* Mobile drawer */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="sm" />}>
            <MenuIcon data-icon="inline-start" />
            Browse previous weeks
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-4">
            <SheetHeader className="p-0">
              <SheetTitle>This Week</SheetTitle>
            </SheetHeader>
            <EditionList editions={editions} currentSlug={currentSlug} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
