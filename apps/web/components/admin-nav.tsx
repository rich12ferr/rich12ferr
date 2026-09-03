"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BuildingIcon,
  FlagIcon,
  GaugeIcon,
  InboxIcon,
  ListIcon,
  SparklesIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

const links = [
  { href: "/admin", label: "Dashboard", icon: GaugeIcon },
  { href: "/admin/activities", label: "Activities", icon: ListIcon },
  { href: "/admin/organizations", label: "Organizations", icon: BuildingIcon },
  { href: "/admin/review", label: "AI review", icon: SparklesIcon },
  { href: "/admin/submissions", label: "Submissions", icon: InboxIcon },
  { href: "/admin/reports", label: "Reports", icon: FlagIcon },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Admin sections">
      <ul className="flex gap-1 overflow-x-auto border-b border-border">
        {links.map((link) => {
          const active = pathname === link.href
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
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
