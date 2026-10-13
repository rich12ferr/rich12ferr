"use client"

import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { verificationDefinitions, verificationLabels, type VerificationStatusKey } from "@/lib/labels"
import { cn } from "@/lib/utils"

type Tier = "trusted" | "community" | "automated"

const tierFor: Record<VerificationStatusKey, Tier> = {
  organization_verified: "trusted",
  admin_reviewed: "trusted",
  community_submitted: "community",
  ai_extracted: "automated",
  unverified: "automated",
}

const tierStyles: Record<Tier, { pill: string; dot: string }> = {
  trusted: { pill: "border-open/40 bg-open-soft text-foreground", dot: "bg-open" },
  community: { pill: "border-soon/50 bg-soon-soft text-foreground", dot: "bg-soon" },
  automated: { pill: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
}

/**
 * Hover on desktop, tap on touch: a native `title` tooltip never shows on
 * mobile, so the definition lives in a popover the trigger also opens on hover.
 */
export function VerificationBadge({
  status,
  className,
}: {
  status: VerificationStatusKey
  className?: string
}) {
  const label = verificationLabels[status]
  const styles = tierStyles[tierFor[status]]

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        aria-label={`${label}: what this means`}
        className={cn(
          "relative inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors",
          "after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          styles.pill,
          className,
        )}
      >
        <span aria-hidden="true" className={cn("size-1.5 rounded-full", styles.dot)} />
        {label}
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-64">
        <PopoverTitle>{label}</PopoverTitle>
        <PopoverDescription className="leading-relaxed">{verificationDefinitions[status]}</PopoverDescription>
      </PopoverContent>
    </Popover>
  )
}
