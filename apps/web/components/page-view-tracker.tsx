"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { recordPageView } from "@/lib/actions/page-views"
import { ensureSessionId, pathToPage } from "@/lib/analytics"

/** Records one `page_views` row per client navigation to a public page type. */
export function PageViewTracker() {
  const pathname = usePathname()
  const last = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || last.current === pathname) return
    last.current = pathname
    if (!pathToPage(pathname)) return
    void recordPageView({ pathname, sessionId: ensureSessionId() }).catch(() => {})
  }, [pathname])

  return null
}
