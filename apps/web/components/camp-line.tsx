import { TentIcon } from "lucide-react"
import type { Activity } from "@/lib/types"
import { campLineParts, isCamp } from "@/lib/camp-format"
import { cn } from "@/lib/utils"

/** Compact camp summary for result cards, e.g. "Day camp · Full day 8:30am–3:30pm · Jul 6–10". */
export function CampLine({ activity, className }: { activity: Activity; className?: string }) {
  if (!isCamp(activity)) return null
  const parts = campLineParts(activity)
  if (parts.length === 0) return null
  return (
    <p className={cn("flex items-start gap-1.5 text-sm text-foreground", className)}>
      <TentIcon className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
      <span className="sr-only">Camp details: </span>
      <span className="text-pretty">{parts.join(" \u00b7 ")}</span>
    </p>
  )
}
