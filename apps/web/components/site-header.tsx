"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { MenuIcon, SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SiteLogo } from "@/components/site-logo"
import { cn } from "@/lib/utils"

const navLinks = [
  { href: "/search", label: "Find activities" },
  { href: "/sports", label: "Sports" },
  { href: "/organizations", label: "Organizations" },
  { href: "/calendar", label: "Calendar" },
  { href: "/alerts", label: "Alerts" },
  { href: "/submit", label: "Submit an activity" },
  { href: "/about", label: "About" },
]

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center rounded-md focus-visible:outline-2 focus-visible:outline-ring">
          <SiteLogo className="h-8" />
        </Link>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
          {navLinks.slice(0, 5).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(link.href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button render={<Link href="/search" />} nativeButton={false} variant="ghost" size="sm" className="hidden sm:inline-flex">
            <SearchIcon data-icon="inline-start" />
            Search
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={<Button variant="outline" size="icon" className="lg:hidden" />}
              aria-label="Open menu"
            >
              <MenuIcon />
            </SheetTrigger>
            <SheetContent side="right" className="w-[19rem] gap-0 p-0">
              <div className="flex items-center border-b border-border px-5 py-4">
                <SheetTitle render={<SiteLogo className="h-7" />} />
              </div>
              <nav aria-label="Mobile" className="flex flex-col gap-1 p-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(link.href) ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-sm font-medium",
                      isActive(link.href)
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="flex flex-col gap-2 border-t border-border p-4">
                <Button
                  render={<Link href="/admin" />}
                  nativeButton={false}
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Admin console
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
