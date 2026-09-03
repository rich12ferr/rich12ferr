import { CircleAlertIcon, CircleCheckIcon, CircleHelpIcon, ClockIcon, HourglassIcon, XCircleIcon } from "lucide-react"
import type { RegistrationStatus } from "@/lib/types"
import { statusShortLabels } from "@/lib/registration-status"
import { cn } from "@/lib/utils"

/**
 * Registration status is the single most important signal on every listing, so
 * it always pairs color with an icon and a text label — never color alone.
 */
const styles: Record<RegistrationStatus, { className: string; Icon: typeof ClockIcon }> = {
  open: { className: "bg-open text-open-foreground", Icon: CircleCheckIcon },
  closing_soon: { className: "bg-soon text-soon-foreground", Icon: CircleAlertIcon },
  upcoming: { className: "bg-upcoming text-upcoming-foreground", Icon: ClockIcon },
  waitlist: { className: "bg-highlight text-highlight-foreground", Icon: HourglassIcon },
  closed: { className: "bg-shut text-shut-foreground", Icon: XCircleIcon },
  unknown: { className: "bg-muted text-muted-foreground", Icon: CircleHelpIcon },
}

export function StatusPill({
  status,
  size = "default",
  className,
}: {
  status: RegistrationStatus
  size?: "default" | "sm"
  className?: string
}) {
  const { className: tone, Icon } = styles[status]
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[0.6875rem]" : "px-2.5 py-1 text-xs",
        tone,
        className,
      )}
    >
      <Icon className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden="true" />
      {statusShortLabels[status]}
    </span>
  )
}

/** Left edge accent used on cards to make status scannable in a list. */
export const statusAccent: Record<RegistrationStatus, string> = {
  open: "bg-open",
  closing_soon: "bg-soon",
  upcoming: "bg-upcoming",
  waitlist: "bg-highlight",
  closed: "bg-shut/50",
  unknown: "bg-border",
}
