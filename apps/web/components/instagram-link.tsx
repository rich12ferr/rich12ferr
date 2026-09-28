import { cn } from "@/lib/utils"

export const INSTAGRAM_URL = "https://www.instagram.com/signupvt"
export const INSTAGRAM_HANDLE = "@signupvt"

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-5 shrink-0", className)}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  )
}

export function InstagramLink({
  className,
  showHandle = true,
}: {
  className?: string
  showHandle?: boolean
}) {
  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Sign Up Vermont on Instagram, ${INSTAGRAM_HANDLE} (opens in new tab)`}
      className={cn(
        "inline-flex min-h-11 w-fit items-center gap-2 text-sm text-foreground/80 underline-offset-4 hover:text-foreground hover:underline",
        className,
      )}
    >
      <InstagramIcon />
      <span>{showHandle ? `Instagram ${INSTAGRAM_HANDLE}` : "Instagram"}</span>
    </a>
  )
}
