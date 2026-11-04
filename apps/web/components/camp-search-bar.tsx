"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { CAMP_PERIODS, CAMP_PERIOD_LABELS } from "@openplay/core"
import { FilterSelect } from "@/components/filter-select"
import { LocationPicker } from "@/components/location-picker"
import { Field, FieldLabel } from "@/components/ui/field"
import { trackEvent } from "@/lib/analytics"
import { CAMP_SORTS, CAMP_SORT_LABELS } from "@/lib/camp-results"
import type { OriginSummary } from "@/lib/location-preference"

const periodOptions = [
  { value: "any", label: "Any time" },
  ...CAMP_PERIODS.map((p) => ({ value: p, label: CAMP_PERIOD_LABELS[p] })),
]
const ageOptions = [
  { value: "any", label: "Any age" },
  ...Array.from({ length: 15 }, (_, i) => i + 4).map((a) => ({ value: String(a), label: `${a} years old` })),
]
const sortOptions = CAMP_SORTS.map((s) => ({ value: s, label: CAMP_SORT_LABELS[s] }))

function useCampParam(surface: "search_bar" | "sort") {
  const router = useRouter()
  const params = useSearchParams()
  const update = useCallback(
    (key: string, value: string, fallback = "any") => {
      const next = new URLSearchParams(params.toString())
      if (!value || value === fallback) next.delete(key)
      else next.set(key, value)
      trackEvent("camp_search_changed", { field: key, value: value === fallback ? null : value, surface })
      const query = next.toString()
      router.replace(`/camps${query ? `?${query}` : ""}`, { scroll: false })
    },
    [params, router, surface],
  )
  return { params, update }
}

/** The three questions every camp search starts with, always visible above the results (PRD R2). */
export function CampSearchBar({ origin }: { origin: OriginSummary }) {
  const { params, update } = useCampParam("search_bar")
  return (
    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <div className="flex min-w-0 flex-col gap-2 sm:col-span-2 lg:col-span-1">
        <span className="text-sm font-semibold">Where</span>
        <LocationPicker basePath="/camps" idPrefix="csb" origin={origin} inputClassName="h-11 text-base" />
      </div>
      <Field>
        <FieldLabel htmlFor="csb-period">When</FieldLabel>
        <FilterSelect
          id="csb-period"
          value={params.get("period") ?? "any"}
          onValueChange={(v) => update("period", v)}
          options={periodOptions}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="csb-age">{"Child's age"}</FieldLabel>
        <FilterSelect id="csb-age" value={params.get("age") ?? "any"} onValueChange={(v) => update("age", v)} options={ageOptions} />
      </Field>
    </div>
  )
}

export function CampSortSelect() {
  const { params, update } = useCampParam("sort")
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="camp-sort" className="shrink-0 text-sm text-muted-foreground">
        Sort by
      </label>
      <FilterSelect
        id="camp-sort"
        value={params.get("sort") ?? "best"}
        onValueChange={(v) => update("sort", v, "best")}
        options={sortOptions}
        className="w-40"
      />
    </div>
  )
}
