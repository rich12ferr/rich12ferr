"use client"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type SelectOption = { value: string; label: string }

/**
 * Thin wrapper over the Base UI select that wires up the `items` label map so
 * the trigger shows human-readable text instead of the raw value.
 */
export function FilterSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  className,
}: {
  id?: string
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
}) {
  return (
    // Base UI reports (value | null) plus an event-details argument. Callers
    // only ever want the string, so the null is normalized here rather than in
    // every filter on the page.
    <Select value={value} onValueChange={(next) => onValueChange(next ?? "")}>
      <SelectTrigger id={id} className={cn("h-9 w-full", className)}>
        <SelectValue placeholder={placeholder}>
          {(selected: string) => options.find((o) => o.value === selected)?.label ?? placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
