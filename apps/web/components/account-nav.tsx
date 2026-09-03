"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BellIcon, BookmarkIcon, UsersIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const links = [
  { href: "/account", label: "Saved", icon: BookmarkIcon },
  { href: "/account/alerts", label: "Alerts", icon: BellIcon },
  { href: "/account/children", label: "Child profiles", icon: UsersIcon },
]

export function AccountNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Account sections">
      <ul className="flex gap-1 border-b border-border">
        {links.map((link) => {
          const active = pathname === link.href
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <link.icon className="size-4" aria-hidden="true" />
                {link.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
