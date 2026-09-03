import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * The OpenPlay mark: four figures circling a play button.
 * Cropped out of the supplied lockup with the white knocked out, so it sits
 * on any surface. Decorative here because it always appears beside the
 * "OpenPlay" wordmark.
 */
export function OpenPlayMark({ className }: { className?: string }) {
  return (
    <Image
      src="/images/openplay-icon.png"
      alt=""
      aria-hidden="true"
      width={512}
      height={512}
      priority
      className={cn("object-contain", className)}
    />
  )
}

/** Two-tone wordmark matching the logo, where "Play" picks up the brand color. */
export function OpenPlayWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-bold tracking-tight", className)}>
      Open<span className="text-primary">Play</span>
    </span>
  )
}
