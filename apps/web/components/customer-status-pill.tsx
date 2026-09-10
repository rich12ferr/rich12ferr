import { CalendarClockIcon, CircleCheckIcon, CircleHelpIcon, XCircleIcon } from "lucide-react"
import type { CustomerFacingState } from "@/lib/types"
import { customerStateLabels } from "@/lib/registration-status"
import { cn } from "@/lib/utils"

/**
 * The 4 parent-facing states (never the finer-grained admin `StatusPill`
 * values, and never a raw "not published" per field) — see
 * `customerFacingState()` for how these are derived.
 */
const styles: Record<CustomerFacingState, { className: string; Icon: typeof CircleCheckIcon }> = {
  open: { className: "bg-open text-open-foreground", Icon: CircleCheckIcon },
  coming_up: { className: "bg-upcoming text-upcoming-foreground", Icon: CalendarClockIcon },
  check_with_org: { className: "bg-muted text-muted-foreground", Icon: CircleHelpIcon },
  closed: { className: "bg-shut text-shut-foreground", Icon: XCircleIcon },
}

export function CustomerStatusPill({
  state,
  size = "default",
  className,
}: {
  state: CustomerFacingState
  size?: "default" | "sm"
  className?: string
}) {
  const { className: tone, Icon } = styles[state]
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
      {customerStateLabels[state]}
    </span>
  )
}

/** Left edge accent used on cards to make the state scannable in a list. */
export const customerStateAccent: Record<CustomerFacingState, string> = {
  open: "bg-open",
  coming_up: "bg-upcoming",
  check_with_org: "bg-border",
  closed: "bg-shut/50",
}
