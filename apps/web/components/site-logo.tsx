import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * Sign Up Vermont's logo is a single lockup — the checkmark/arrow mark and
 * the "Sign Up Vermont" wordmark are baked into one image, unlike the old
 * OpenPlay brand which paired a separate icon component with a text
 * wordmark. Render this alone; do not add another icon beside it.
 */
export function SiteLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/images/signup-vermont-logo.png"
      alt="Sign Up Vermont"
      width={1970}
      height={819}
      priority
      className={cn("h-8 w-auto object-contain", className)}
    />
  )
}
