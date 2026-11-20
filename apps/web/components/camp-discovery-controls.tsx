"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { CalendarDays, MapPin, Users, Clock3, ChevronDown } from "lucide-react"
import { CAMP_PERIOD_LABELS } from "@openplay/core"
import { towns } from "@/lib/labels"
import { CampFilters } from "@/components/camp-filters"
import type { OriginSummary } from "@/lib/location-preference"

export function CampFacetSelect({
  field,
  label,
  options,
  icon,
}: {
  field: string
  label: string
  options: [string, string][]
  icon?: React.ReactNode
}) {
  const router = useRouter(),
    params = useSearchParams()
  const value = params.get(field) ?? ""
  return (
    <label className="relative inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-sm font-medium text-card-foreground focus-within:outline-2 focus-within:outline-ring">
      {icon}
      <span>{options.find(([k]) => k === value)?.[1] ?? label}</span>
      <ChevronDown size={14} aria-hidden="true" />
      <select
        aria-label={label}
        value={value}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        onChange={(e) => {
          const q = new URLSearchParams(params.toString())
          if (e.target.value) q.set(field, e.target.value)
          else q.delete(field)
          router.replace(`/camps?${q}`, { scroll: false })
        }}
      >
        <option value="">{label}</option>
        {options.map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </label>
  )
}
export function CampDiscoveryControls({ origin, count }: { origin: OriginSummary; count: number }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto" aria-label="Camp filters">
      <CampFacetSelect field="town" label="Any town" options={towns.map((t) => [t, t])} icon={<MapPin size={16} />} />
      <CampFacetSelect
        field="age"
        label="Any age"
        options={Array.from({ length: 15 }, (_, i) => [String(i + 4), `Age ${i + 4}`])}
        icon={<Users size={16} />}
      />
      <CampFacetSelect
        field="period"
        label="Any break"
        options={Object.entries(CAMP_PERIOD_LABELS)}
        icon={<CalendarDays size={16} />}
      />
      <CampFacetSelect
        field="coverage"
        label="Care hours"
        options={[["workday", "Full workday"]]}
        icon={<Clock3 size={16} />}
      />
      <div className="shrink-0 sm:ml-auto">
        <CampFilters variant="sheet" origin={origin} resultCount={count} />
      </div>
    </div>
  )
}
