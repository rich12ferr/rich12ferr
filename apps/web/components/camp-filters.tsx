"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
import { FilterIcon, RotateCcwIcon } from "lucide-react"
import {
  CAMP_FOCUSES,
  CAMP_FOCUS_LABELS,
  CAMP_PERIODS,
  CAMP_PERIOD_LABELS,
  CAMP_STAYS,
  CAMP_STAY_LABELS,
  DAY_LENGTHS,
  DAY_LENGTH_LABELS,
  SESSION_LENGTHS,
  SESSION_LENGTH_LABELS,
} from "@openplay/core"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { FilterSelect } from "@/components/filter-select"
import { gradeOptions } from "@/lib/format"
import { towns } from "@/lib/labels"

const withAny = (label: string, entries: [string, string][]) => [
  { value: "any", label },
  ...entries.map(([value, text]) => ({ value, label: text })),
]

const periodOptions = withAny("Any time", CAMP_PERIODS.map((p) => [p, CAMP_PERIOD_LABELS[p]]))
const focusOptions = withAny("Any focus", CAMP_FOCUSES.map((f) => [f, CAMP_FOCUS_LABELS[f]]))
const stayOptions = withAny("Day or overnight", CAMP_STAYS.map((s) => [s, CAMP_STAY_LABELS[s]]))
const lengthOptions = withAny("Any length", [
  ...DAY_LENGTHS.map((d): [string, string] => [d, DAY_LENGTH_LABELS[d]]),
  ...SESSION_LENGTHS.map((s): [string, string] => [s, SESSION_LENGTH_LABELS[s]]),
])
const ageOptions = [
  { value: "any", label: "Any age" },
  ...Array.from({ length: 15 }, (_, i) => i + 4).map((a) => ({ value: String(a), label: `${a} years old` })),
]
const gradeFilterOptions = [{ value: "any", label: "Any grade" }, ...gradeOptions]
const townOptions = [{ value: "any", label: "Any town" }, ...towns.map((t) => ({ value: t, label: t }))]

/** Camp-specific filter set for /camps. Every change writes to the URL. */
export function CampFilters({ variant = "sidebar" }: { variant?: "sidebar" | "sheet" }) {
  const router = useRouter()
  const params = useSearchParams()
  const [open, setOpen] = useState(false)

  const get = (key: string) => params.get(key) ?? "any"

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString())
      if (!value || value === "any") next.delete(key)
      else next.set(key, value)
      const query = next.toString()
      router.replace(`/camps${query ? `?${query}` : ""}`, { scroll: false })
    },
    [params, router],
  )

  const idPrefix = variant === "sheet" ? "cs" : "cf"

  const body = (
    <div className="flex flex-col gap-6">
      <FieldSet>
        <FieldLegend variant="label">When</FieldLegend>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-period`}>Camp period</FieldLabel>
            <FilterSelect id={`${idPrefix}-period`} value={get("period")} onValueChange={(v) => update("period", v)} options={periodOptions} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor={`${idPrefix}-from`}>Runs from</FieldLabel>
              <Input
                id={`${idPrefix}-from`}
                type="date"
                defaultValue={params.get("from") ?? ""}
                onChange={(e) => update("from", e.target.value)}
                className="h-11 text-base"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${idPrefix}-to`}>to</FieldLabel>
              <Input
                id={`${idPrefix}-to`}
                type="date"
                defaultValue={params.get("to") ?? ""}
                onChange={(e) => update("to", e.target.value)}
                className="h-11 text-base"
              />
            </Field>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Camps without posted dates still show, listed last.
          </p>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="label">Who</FieldLegend>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-age`}>Age</FieldLabel>
            <FilterSelect id={`${idPrefix}-age`} value={get("age")} onValueChange={(v) => update("age", v)} options={ageOptions} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-grade`}>Grade</FieldLabel>
            <FilterSelect id={`${idPrefix}-grade`} value={get("grade")} onValueChange={(v) => update("grade", v)} options={gradeFilterOptions} />
          </Field>
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="label">Where</FieldLegend>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-town`}>Town</FieldLabel>
            <FilterSelect id={`${idPrefix}-town`} value={get("town")} onValueChange={(v) => update("town", v)} options={townOptions} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-zip`}>ZIP code</FieldLabel>
            <Input
              id={`${idPrefix}-zip`}
              inputMode="numeric"
              maxLength={5}
              placeholder="05602"
              defaultValue={params.get("zip") ?? ""}
              onBlur={(e) => update("zip", e.target.value.replace(/\D/g, ""))}
              className="h-11 text-base"
            />
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="label">What</FieldLegend>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-focus`}>Focus</FieldLabel>
            <FilterSelect id={`${idPrefix}-focus`} value={get("focus")} onValueChange={(v) => update("focus", v)} options={focusOptions} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-stay`}>Day or overnight</FieldLabel>
            <FilterSelect id={`${idPrefix}-stay`} value={get("stay")} onValueChange={(v) => update("stay", v)} options={stayOptions} />
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="label">Schedule</FieldLegend>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-length`}>Length</FieldLabel>
            <FilterSelect id={`${idPrefix}-length`} value={get("length")} onValueChange={(v) => update("length", v)} options={lengthOptions} />
          </Field>
          <Field orientation="horizontal" className="min-h-11 items-center">
            <Checkbox
              id={`${idPrefix}-coverage`}
              checked={params.get("coverage") === "workday"}
              onCheckedChange={(checked) => update("coverage", checked ? "workday" : "")}
            />
            <FieldLabel htmlFor={`${idPrefix}-coverage`} className="font-normal">
              Covers a full workday (with care)
            </FieldLabel>
          </Field>
        </FieldGroup>
      </FieldSet>

      <Button variant="outline" className="min-h-11" onClick={() => router.replace("/camps", { scroll: false })}>
        <RotateCcwIcon data-icon="inline-start" />
        Clear all filters
      </Button>
    </div>
  )

  if (variant === "sheet") {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="outline" className="min-h-11 lg:hidden" />}>
          <FilterIcon data-icon="inline-start" />
          Camp filters
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl px-5 pb-8 pt-5">
          <SheetTitle className="mb-4 font-display text-lg font-bold">Camp filters</SheetTitle>
          {body}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div className="hidden lg:block">
      <div className="sticky top-20 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 font-display text-base font-bold">Camp filters</h2>
        {body}
      </div>
    </div>
  )
}
