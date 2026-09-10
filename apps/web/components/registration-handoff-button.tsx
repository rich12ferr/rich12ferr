"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { trackEvent, type RegistrationHandoffProps } from "@/lib/analytics"

/**
 * The one outbound-CTA primitive for every registration/website handoff. It
 * renders the same themed anchor button the rest of the app uses, but fires
 * `registration_handoff_clicked` on click. Because the link opens in a new tab,
 * the beacon has time to send before focus leaves the page.
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
  return (
    <Button
      render={
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("registration_handoff_clicked", handoff)}
        />
      }
      nativeButton={false}
      size={size}
      variant={variant}
      className={className}
    >
      {children}
    </Button>
  )
}
