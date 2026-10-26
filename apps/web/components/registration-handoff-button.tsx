"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { recordRegistrationHandoff } from "@/lib/actions/handoff-events"
import { getHandoffSessionFields, trackEvent, type RegistrationHandoffProps } from "@/lib/analytics"

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
  registerClickout = false,
  children,
}: {
  href: string
  handoff: RegistrationHandoffProps
  size?: React.ComponentProps<typeof Button>["size"]
  variant?: React.ComponentProps<typeof Button>["variant"]
  className?: string
  /** Also fire `register_clickout` (the listing-level registration event). */
  registerClickout?: boolean
  children: ReactNode
}) {
  function handleClick() {
    const payload = { ...handoff, destination_url: href }
    trackEvent("registration_handoff_clicked", payload)
    if (registerClickout && handoff.offering_id) {
      trackEvent("register_clickout", {
        listing_id: handoff.offering_id,
        cta_location: handoff.cta_location,
        destination_url: href,
        placement: handoff.placement ?? null,
      })
    }
    void recordRegistrationHandoff({ ...payload, ...getHandoffSessionFields() }).catch(() => {})
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
