"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CheckIcon, ExternalLinkIcon, PencilIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { dateGaps } from "@/lib/date-gaps"
import type { ActivityWithRelations } from "@/lib/types"
import { saveActivity, type SaveActivityInput } from "@/app/admin/activities/[id]/actions"

type DateForm = {
  seasonStart: string
  seasonEnd: string
  openDate: string
  closeDate: string
}

const dateFields: { key: keyof DateForm; label: string }[] = [
  { key: "seasonStart", label: "Season starts" },
  { key: "seasonEnd", label: "Season ends" },
  { key: "openDate", label: "Reg. opens" },
  { key: "closeDate", label: "Reg. closes" },
]

/**
 * One listing in the date-cleanup queue: the four dates editable in place,
 * with the source page one click away so the admin can check before typing.
 */
export function DateCleanupRow({ activity }: { activity: ActivityWithRelations }) {
  const [isPending, startTransition] = useTransition()
  const initial: DateForm = {
    seasonStart: activity.season_start_date ?? "",
    seasonEnd: activity.season_end_date ?? "",
    openDate: activity.registration_open_date ?? "",
    closeDate: activity.registration_close_date ?? "",
  }
  const [form, setForm] = useState(initial)
  const gaps = dateGaps(activity)

  const dirty = (Object.keys(initial) as (keyof DateForm)[]).some((key) => form[key] !== initial[key])
  const seasonInvalid =
    form.seasonStart !== "" && form.seasonEnd !== "" && form.seasonEnd < form.seasonStart
  const registrationInvalid =
    form.openDate !== "" && form.closeDate !== "" && form.closeDate < form.openDate
  const invalid = seasonInvalid || registrationInvalid

  function save(confirmDates: boolean) {
    if (invalid) {
      toast.error("A date range ends before it starts", { description: activity.title })
      return
    }

    const offering: SaveActivityInput["patch"]["offering"] = {
      seasonStartDate: form.seasonStart === "" ? null : form.seasonStart,
      seasonEndDate: form.seasonEnd === "" ? null : form.seasonEnd,
      registrationOpenDate: form.openDate === "" ? null : form.openDate,
      registrationCloseDate: form.closeDate === "" ? null : form.closeDate,
      ...(confirmDates && { datesReviewedAt: new Date() }),
    }

    startTransition(async () => {
      const result = await saveActivity({
        offeringId: activity.id,
        programId: activity.program_id,
        patch: { offering },
      })
      if (result.ok) {
        toast.success(confirmDates ? "Dates confirmed" : "Dates saved", {
          description: activity.title,
        })
      } else {
        toast.error("Couldn't save dates", { description: result.error })
      }
    })
  }

  return (
    <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:gap-6">
      <div className="flex min-w-0 flex-col gap-1.5 lg:w-72 lg:shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-pretty">{activity.title}</span>
          {!activity.published && <Badge variant="outline">draft</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {activity.organization.name} &middot; {activity.sport.name} &middot; {activity.town}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {activity.source_url && (
            <a
              href={activity.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Source page
              <ExternalLinkIcon className="size-3" />
            </a>
          )}
          <Link
            href={`/admin/activities/${activity.id}`}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
          >
            <PencilIcon className="size-3" />
            Full editor
          </Link>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {dateFields.map(({ key, label }) => {
            const missing =
              (key === "seasonStart" && gaps.seasonStart) ||
              (key === "seasonEnd" && gaps.seasonEnd) ||
              ((key === "openDate" || key === "closeDate") && gaps.registration)
            const invalidField =
              (seasonInvalid && key === "seasonEnd") || (registrationInvalid && key === "closeDate")
            return (
              <label key={key} className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  {label}
                  {missing && form[key] === "" && (
                    <span className="size-1.5 rounded-full bg-amber-400" aria-label="missing" />
                  )}
                </span>
                <Input
                  type="date"
                  value={form[key]}
                  aria-invalid={invalidField}
                  onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                />
              </label>
            )
          })}
        </div>
        {invalid && (
          <p role="alert" className="text-xs text-destructive">
            An end date is before its start date.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={isPending || !dirty} onClick={() => save(false)}>
            {isPending ? "Saving..." : "Save dates"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => save(true)}
            title="Mark as checked against the source, including when the program has no fixed dates"
          >
            <CheckIcon data-icon="inline-start" />
            Confirm and clear from queue
          </Button>
        </div>
      </div>
    </div>
  )
}
