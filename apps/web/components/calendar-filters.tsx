"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { FilterSelect } from "@/components/filter-select"
import { calendarEventKindStyles } from "@/components/calendar-event-row"
import { calendarEventLabels, DEFAULT_CALENDAR_KINDS, type CalendarEventKind } from "@/lib/labels"

const audienceOptions = [
  { value: "youth", label: "Youth programs" },
  { value: "adult", label: "Adult programs" },
  { value: "family", label: "Family & all-ages" },
  { value: "all", label: "All audiences" },
]

const allKinds = Object.keys(calendarEventKindStyles) as CalendarEventKind[]

/**
 * Registration dates are the default view (PRD priority); tryouts and season
 * starts are opt-in toggles rather than being shown alongside them by default.
 */
export function CalendarFilters() {
  const router = useRouter()
  const params = useSearchParams()

  const activeKinds = params.get("kinds")
    ? (params.get("kinds")!.split(",") as CalendarEventKind[])
    : DEFAULT_CALENDAR_KINDS

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString())
      if (!value || value === "any") next.delete(key)
      else next.set(key, value)
      router.replace(`/calendar${next.toString() ? `?${next.toString()}` : ""}`, { scroll: false })
    },
    [params, router],
  )

  function toggleKind(kind: CalendarEventKind) {
    const isActive = activeKinds.includes(kind)
    const next = isActive ? activeKinds.filter((k) => k !== kind) : [...activeKinds, kind]
    // Never allow an empty selection — that would silently render nothing.
    if (next.length === 0) return
    update("kinds", next.sort().join(","))
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {allKinds.map((kind) => {
          const { icon: Icon, className } = calendarEventKindStyles[kind]
          const isActive = activeKinds.includes(kind)
          return (
            <button
              key={kind}
              type="button"
              onClick={() => toggleKind(kind)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity ${className} ${
                isActive ? "" : "opacity-40 hover:opacity-70"
              }`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {calendarEventLabels[kind]}
            </button>
          )
        })}
      </div>

      <div className="w-full sm:w-48">
        <FilterSelect
          id="calendar-audience"
          value={params.get("audience") ?? "youth"}
          onValueChange={(v) => update("audience", v)}
          options={audienceOptions}
        />
      </div>
    </div>
  )
}
