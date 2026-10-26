import { MapPinOffIcon } from "lucide-react"

export function OutOfAreaNotice({ place, radius, noun = "activities" }: { place: string; radius: number; noun?: string }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
      <MapPinOffIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-display text-base font-bold text-foreground text-balance">
          No {noun} found within {radius} miles of {place}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          Here are all matching {noun} across central Vermont instead. Enter a Vermont ZIP to measure distances from
          your town.
        </p>
      </div>
    </div>
  )
}
