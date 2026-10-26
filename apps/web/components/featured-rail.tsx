import Link from "next/link"
import { StarIcon } from "lucide-react"
import { ActivityCard } from "@/components/activity-card"
import { FeaturedImpression } from "@/components/featured-impression"
import type { FeaturedSurface } from "@/lib/analytics"
import type { ActivityWithRelations } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * The labeled Featured surface. Kept visually and structurally apart from
 * organic results: its own boxed band, a "Featured" label on the section and
 * every card, and a plain-language note that it doesn't affect search order.
 * Renders nothing when no listing is flagged.
 */
export function FeaturedRail({
  activities,
  surface,
  now,
  title = "Featured programs",
  className,
}: {
  activities: ActivityWithRelations[]
  surface: FeaturedSurface
  now: Date
  title?: string
  className?: string
}) {
  if (activities.length === 0) return null

  return (
    <section
      aria-labelledby={`featured-${surface}-heading`}
      data-home-section={surface === "homepage" ? "featured" : undefined}
      className={cn("flex flex-col gap-4 rounded-3xl border border-highlight/60 bg-highlight/10 p-4 sm:p-6", className)}
    >
      <div className="flex flex-col gap-1">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-foreground uppercase">
          <StarIcon className="size-3.5 text-highlight" aria-hidden="true" />
          Featured
        </p>
        <h2
          id={`featured-${surface}-heading`}
          className="font-display text-xl font-extrabold tracking-tight text-balance"
        >
          {title}
        </h2>
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
          {"Picked by Sign Up Vermont. Featured spots don't change the order of search results. "}
          <Link href="/about#principles" className="font-medium text-foreground underline underline-offset-2">
            How results are ordered
          </Link>
        </p>
      </div>

      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3">
        {activities.map((activity) => (
          <li
            key={activity.id}
            className={cn("shrink-0 snap-start md:w-auto", activities.length > 1 ? "w-[85%]" : "w-full")}
          >
            <FeaturedImpression
              offeringId={activity.id}
              organizationId={activity.organization_id}
              surface={surface}
              className="h-full"
            >
              <ActivityCard activity={activity} now={now} placement="featured" className="h-full" />
            </FeaturedImpression>
          </li>
        ))}
      </ul>
    </section>
  )
}
