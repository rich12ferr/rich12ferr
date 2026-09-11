"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { recordRegistrationHandoff } from "@/lib/actions/handoff-events"
import { trackEvent, type RegistrationHandoffProps } from "@/lib/analytics"

/**
 * The one outbound-CTA primitive for every registration/website handoff. It
 * renders the same themed anchor button the rest of the app uses, but on
 * click both fires `registration_handoff_clicked` to Vercel Analytics and
 * persists the same payload to `handoff_events` via a server action — see
 * `recordRegistrationHandoff` for why. Because the link opens in a new tab,
 * both have time to send before focus leaves the page.
 */
export function RegistrationHandoffButton({
  href,
  handoff,
  size,
  variant,
  className,
  children,
}: {
  href: string
  handoff: RegistrationHandoffProps
  size?: React.ComponentProps<typeof Button>["size"]
  variant?: React.ComponentProps<typeof Button>["variant"]
  className?: string
  children: ReactNode
}) {
  function handleClick() {
    const payload = { ...handoff, destination_url: href }
    trackEvent("registration_handoff_clicked", payload)
    void recordRegistrationHandoff(payload).catch(() => {})
  }

  return (
    <Button
      render={<a href={href} target="_blank" rel="noopener noreferrer" onClick={handleClick} />}
      nativeButton={false}
      size={size}
      variant={variant}
      className={className}
    >
      {children}
    </Button>
  )
}
