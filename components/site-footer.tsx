import { profile } from '@/lib/content'

export function SiteFooter() {
  return (
    <footer className="border-t border-charcoal-foreground/10 bg-charcoal text-charcoal-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <p className="font-serif text-sm font-semibold">{profile.name}</p>
        <p className="text-xs text-charcoal-foreground/50">
          &copy; {new Date().getFullYear()} {profile.name}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
