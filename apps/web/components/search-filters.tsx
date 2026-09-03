"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
import { FilterIcon, RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { FilterSelect } from "@/components/filter-select"
import { sports } from "@/lib/data/sports"
import { gradeOptions } from "@/lib/format"
import { DEFAULT_RADIUS, towns } from "@/lib/labels"

const sportOptions = [
  { value: "any", label: "Any sport" },
  ...sports.map((s) => ({ value: s.slug, label: s.name })),
]
const ageOptions = [
  { value: "any", label: "Any age" },
  ...Array.from({ length: 15 }, (_, i) => i + 4).map((a) => ({ value: String(a), label: `${a} years old` })),
]
const gradeFilterOptions = [{ value: "any", label: "Any grade" }, ...gradeOptions]
const seasonOptions = [
  { value: "any", label: "Any season" },
  { value: "fall", label: "Fall" },
  { value: "winter", label: "Winter" },
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
]
const townOptions = [{ value: "any", label: "Any town" }, ...towns.map((t) => ({ value: t, label: t }))]
const genderOptions = [
  { value: "any", label: "Any" },
  { value: "girls", label: "Girls" },
  { value: "boys", label: "Boys" },
  { value: "coed", label: "Coed only" },
]
const levelOptions = [
  { value: "any", label: "Any level" },
  { value: "recreational", label: "Recreational / school" },
  { value: "competitive", label: "Competitive / club" },
]
const statusOptions = [
  { value: "any", label: "Any status" },
  { value: "open", label: "Open now" },
  { value: "closing_soon", label: "Closing soon" },
  { value: "upcoming", label: "Opening later" },
  { value: "not_closed", label: "Hide closed" },
]
const tryoutOptions = [
  { value: "any", label: "Either" },
  { value: "no", label: "No tryouts" },
  { value: "yes", label: "Tryouts required" },
]
const costOptions = [
  { value: "any", label: "Any cost" },
  { value: "free", label: "Free only" },
  { value: "paid", label: "Has a fee" },
]

function RadiusField({ value, onCommit }: { value: number; onCommit: (value: number) => void }) {
  const [local, setLocal] = useState(value)
  return (
    <Field>
      <FieldLabel htmlFor="f-radius">Within {local} miles</FieldLabel>
      <Slider
        id="f-radius"
        min={5}
        max={40}
        step={5}
        value={[local]}
        onValueChange={(next) => setLocal(Array.isArray(next) ? next[0] : next)}
        onValueCommitted={(next) => onCommit(Array.isArray(next) ? next[0] : next)}
        className="py-2"
      />
    </Field>
  )
}

/** PRD 10 filter set. Every change writes to the URL so results stay shareable. */
export function SearchFilters({ variant = "sidebar" }: { variant?: "sidebar" | "sheet" }) {
  const router = useRouter()
  const params = useSearchParams()
  const [open, setOpen] = useState(false)

  const get = (key: string, fallback = "any") => params.get(key) ?? fallback

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString())
      if (!value || value === "any") next.delete(key)
      else next.set(key, value)
      const query = next.toString()
      router.replace(`/search${query ? `?${query}` : ""}`, { scroll: false })
    },
    [params, router],
  )

  const radius = Number(params.get("radius") ?? DEFAULT_RADIUS)

  const body = (
    <div className="flex flex-col gap-6">
      <FieldSet>
        <FieldLegend variant="label">Who is playing</FieldLegend>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel htmlFor="f-sport">Sport</FieldLabel>
            <FilterSelect
              id="f-sport"
              value={get("sport")}
              onValueChange={(v) => update("sport", v)}
              options={sportOptions}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="f-age">Age</FieldLabel>
              <FilterSelect
                id="f-age"
                value={get("age")}
                onValueChange={(v) => update("age", v)}
                options={ageOptions}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="f-grade">Grade</FieldLabel>
              <FilterSelect
                id="f-grade"
                value={get("grade")}
                onValueChange={(v) => update("grade", v)}
                options={gradeFilterOptions}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="f-gender">Gender</FieldLabel>
            <FilterSelect
              id="f-gender"
              value={get("gender")}
              onValueChange={(v) => update("gender", v)}
              options={genderOptions}
            />
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="label">Where</FieldLegend>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel htmlFor="f-town">Town</FieldLabel>
            <FilterSelect
              id="f-town"
              value={get("town")}
              onValueChange={(v) => update("town", v)}
              options={townOptions}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="f-zip">ZIP code</FieldLabel>
            <Input
              id="f-zip"
              inputMode="numeric"
              maxLength={5}
              placeholder="05602"
              defaultValue={params.get("zip") ?? ""}
              onBlur={(e) => update("zip", e.target.value.replace(/\D/g, ""))}
              className="h-9"
            />
          </Field>
          <RadiusField value={radius} onCommit={(v) => update("radius", String(v))} />
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="label">Program details</FieldLegend>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel htmlFor="f-season">Season</FieldLabel>
            <FilterSelect
              id="f-season"
              value={get("season")}
              onValueChange={(v) => update("season", v)}
              options={seasonOptions}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="f-level">Level</FieldLabel>
            <FilterSelect
              id="f-level"
              value={get("level")}
              onValueChange={(v) => update("level", v)}
              options={levelOptions}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="f-status">Registration status</FieldLabel>
            <FilterSelect
              id="f-status"
              value={get("status")}
              onValueChange={(v) => update("status", v)}
              options={statusOptions}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="f-tryouts">Tryouts</FieldLabel>
              <FilterSelect
                id="f-tryouts"
                value={get("tryouts")}
                onValueChange={(v) => update("tryouts", v)}
                options={tryoutOptions}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="f-cost">Cost</FieldLabel>
              <FilterSelect
                id="f-cost"
                value={get("cost")}
                onValueChange={(v) => update("cost", v)}
                options={costOptions}
              />
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>

      <Button variant="outline" size="sm" onClick={() => router.replace("/search", { scroll: false })}>
        <RotateCcwIcon data-icon="inline-start" />
        Clear all filters
      </Button>
    </div>
  )

  if (variant === "sheet") {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="outline" className="lg:hidden" />}>
          <FilterIcon data-icon="inline-start" />
          Filters
        </SheetTrigger>
        <SheetContent side="left" className="w-[20rem] overflow-y-auto">
          <SheetTitle className="mb-4 font-display text-lg font-bold">Filters</SheetTitle>
          {body}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div className="hidden lg:block">
      <div className="sticky top-20 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 font-display text-base font-bold">Filters</h2>
        {body}
      </div>
    </div>
  )
}
