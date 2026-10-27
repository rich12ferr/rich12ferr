"use client"

import { useState, useTransition } from "react"
import { StarIcon } from "lucide-react"
import { setOfferingFeatured } from "@/app/admin/activities/[id]/actions"
import { Button } from "@/components/ui/button"

export function AdminFeaturedToggle({
  offeringId,
  featuredAt,
}: {
  offeringId: string
  featuredAt: string | null
}) {
  const [featured, setFeatured] = useState(Boolean(featuredAt))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const toggle = () => {
    const next = !featured
    setError(null)
    startTransition(async () => {
      const result = await setOfferingFeatured(offeringId, next)
      if (result.ok) setFeatured(next)
      else setError(result.error)
    })
  }

  return (
    <section
      aria-labelledby="featured-flag-heading"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-col gap-1">
        <h2 id="featured-flag-heading" className="inline-flex items-center gap-2 font-display text-base font-bold">
          <StarIcon className="size-4 text-highlight" aria-hidden="true" />
          Featured placement
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
            {featured ? "On" : "Off"}
          </span>
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          Shows this listing in the labeled Featured rail on the homepage and its sport page. Search results and
          their order are not affected.
        </p>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant={featured ? "outline" : "default"}
        onClick={toggle}
        disabled={pending}
        aria-pressed={featured}
        className="min-h-11 shrink-0"
      >
        {pending ? "Saving…" : featured ? "Remove from Featured" : "Feature this listing"}
      </Button>
    </section>
  )
}
