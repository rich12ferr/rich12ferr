"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { FilterSelect } from "@/components/filter-select"
import { sports } from "@/lib/data/sports"
import { gradeLabel } from "@/lib/format"

const sportOptions = [
  { value: "any", label: "Any sport" },
  ...sports.map((s) => ({ value: s.slug, label: s.name })),
]

const gradeOptions = [
  { value: "any", label: "Any grade" },
  ...Array.from({ length: 13 }, (_, i) => ({ value: String(i), label: gradeLabel(i) })),
]

/**
 * PRD 8: the home page leads with the three inputs a parent already knows —
 * sport, their child's grade, and where they live.
 */
export function QuickSearch() {
  const router = useRouter()
  const [sport, setSport] = useState("any")
  const [grade, setGrade] = useState("any")
  const [zip, setZip] = useState("")

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (sport !== "any") params.set("sport", sport)
    if (grade !== "any") params.set("grade", grade)
    if (zip.trim()) params.set("zip", zip.trim())
    const query = params.toString()
    router.push(`/search${query ? `?${query}` : ""}`)
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
      aria-label="Find youth sports activities"
    >
      <FieldGroup className="gap-4 sm:grid sm:grid-cols-2 sm:items-end sm:gap-3 lg:grid-cols-[1.2fr_1fr_0.8fr_auto]">
        <Field>
          <FieldLabel htmlFor="qs-sport">Sport</FieldLabel>
          <FilterSelect id="qs-sport" value={sport} onValueChange={setSport} options={sportOptions} />
        </Field>

        <Field>
          <FieldLabel htmlFor="qs-grade">Child&apos;s grade</FieldLabel>
          <FilterSelect id="qs-grade" value={grade} onValueChange={setGrade} options={gradeOptions} />
        </Field>

        <Field>
          <FieldLabel htmlFor="qs-zip">ZIP code</FieldLabel>
          <Input
            id="qs-zip"
            name="zip"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="05602"
            maxLength={5}
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
            className="h-9"
          />
        </Field>

        <Button type="submit" className="h-9 w-full lg:w-auto">
          <SearchIcon data-icon="inline-start" />
          Search
        </Button>
      </FieldGroup>
    </form>
  )
}
