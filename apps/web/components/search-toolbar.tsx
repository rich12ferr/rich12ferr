"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { SearchIcon, XIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { FilterSelect } from "@/components/filter-select"
import { Input } from "@/components/ui/input"
import { gradeLabel } from "@/lib/format"
import { seasonLabels } from "@/lib/labels"

const sortOptions = [
  { value: "relevance", label: "Best match" },
  { value: "deadline", label: "Deadline soonest" },
  { value: "distance", label: "Closest first" },
  { value: "cost", label: "Lowest cost" },
]

const labelFor: Record<string, (value: string) => string> = {
  q: (v) => `"${v}"`,
  sport: (v) => v.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  age: (v) => `Age ${v}`,
  grade: (v) => gradeLabel(Number(v)),
  season: (v) => seasonLabels[v as keyof typeof seasonLabels] ?? v,
  town: (v) => v,
  zip: (v) => `ZIP ${v}`,
  radius: (v) => `Within ${v} mi`,
  gender: (v) => ({ girls: "Girls", boys: "Boys", coed: "Coed only" })[v] ?? v,
  level: (v) => (v === "recreational" ? "Recreational / school" : "Competitive / club"),
  status: (v) =>
    ({ open: "Open now", closing_soon: "Closing soon", upcoming: "Opening later", not_closed: "Hide closed" })[
      v
    ] ?? v,
  tryouts: (v) => (v === "no" ? "No tryouts" : "Tryouts required"),
  cost: (v) => (v === "free" ? "Free only" : "Has a fee"),
}

/** Result count, neutral sort control, and removable chips for each filter. */
export function SearchToolbar({ count }: { count: number }) {
  const router = useRouter()
  const params = useSearchParams()

  const chips = Array.from(params.entries()).filter(([key]) => key !== "sort" && key !== "q" && key in labelFor)

  // Local state so typing doesn't fight the URL on every keystroke; committed
  // to the URL (and therefore the server search) after a short pause.
  const [q, setQ] = useState(params.get("q") ?? "")
  useEffect(() => {
    setQ(params.get("q") ?? "")
  }, [params])

  useEffect(() => {
    const current = params.get("q") ?? ""
    if (q === current) return
    const timeout = setTimeout(() => {
      const next = new URLSearchParams(params.toString())
      if (q.trim()) next.set("q", q.trim())
      else next.delete("q")
      const query = next.toString()
      router.replace(`/search${query ? `?${query}` : ""}`, { scroll: false })
    }, 400)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  function remove(key: string) {
    const next = new URLSearchParams(params.toString())
    next.delete(key)
    const query = next.toString()
    router.replace(`/search${query ? `?${query}` : ""}`, { scroll: false })
  }

  function setSort(value: string) {
    const next = new URLSearchParams(params.toString())
    if (value === "relevance") next.delete("sort")
    else next.set("sort", value)
    const query = next.toString()
    router.replace(`/search${query ? `?${query}` : ""}`, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by activity, organization, or sport"
          aria-label="Search by keyword"
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" role="status">
          <span className="font-display text-base font-bold text-foreground">{count}</span>{" "}
          {count === 1 ? "activity" : "activities"} found
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm text-muted-foreground">
            Sort
          </label>
          <FilterSelect
            id="sort"
            value={params.get("sort") ?? "relevance"}
            onValueChange={setSort}
            options={sortOptions}
            className="w-[11rem]"
          />
        </div>
      </div>

      {chips.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {chips.map(([key, value]) => (
            <li key={`${key}-${value}`}>
              <button
                type="button"
                onClick={() => remove(key)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium hover:border-ring hover:bg-accent"
              >
                {labelFor[key]?.(value) ?? `${key}: ${value}`}
                <XIcon className="size-3" aria-hidden="true" />
                <span className="sr-only">Remove filter</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
