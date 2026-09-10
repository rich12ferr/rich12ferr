"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangleIcon, ArrowLeftIcon, ExternalLinkIcon, SaveIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { FilterSelect } from "@/components/filter-select"
import { StatusPill } from "@/components/status-pill"
import { gradeOptions, seasonLabel } from "@/lib/format"
import { programTypeLabels, verificationLabels } from "@/lib/labels"
import { registrationStatus, statusShortLabels } from "@/lib/registration-status"
import type { ActivityWithRelations, RegistrationStatus } from "@/lib/types"
import { saveActivity, type SaveActivityInput } from "@/app/admin/activities/[id]/actions"

const statusOverrideOptions = [
  { value: "auto", label: "Computed from dates" },
  ...(Object.keys(statusShortLabels) as RegistrationStatus[]).map((s) => ({
    value: s,
    label: `Force: ${statusShortLabels[s]}`,
  })),
]

/**
 * PRD 22. The editor exists so a human can always overrule computed status and
 * extracted data, and so verification state is an explicit, deliberate choice.
 */
export function ActivityEditor({ activity }: { activity: ActivityWithRelations }) {
  const now = new Date()
  const searchParams = useSearchParams()
  const reportId = searchParams.get("reportId")
  const [isPending, startTransition] = useTransition()
  const initial = {
    title: activity.title,
    description: activity.description,
    minGrade: activity.min_grade === null ? "" : String(activity.min_grade),
    maxGrade: activity.max_grade === null ? "" : String(activity.max_grade),
    openDate: activity.registration_open_date ?? "",
    closeDate: activity.registration_close_date ?? "",
    fee: activity.registration_fee === null ? "" : String(activity.registration_fee),
    registrationUrl: activity.registration_url ?? "",
    statusOverride: activity.status_override ?? "auto",
    verification: activity.verification_status,
    published: activity.published,
    beginnerFriendly: activity.beginner_friendly,
  }
  const [form, setForm] = useState(initial)

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const computed = registrationStatus(activity, now)
  const effective = form.statusOverride === "auto" ? computed : (form.statusOverride as RegistrationStatus)

  function handleSave() {
    const patch: SaveActivityInput["patch"] = {
      program: {
        title: form.title,
        description: form.description,
        minGrade: form.minGrade === "" ? null : Number(form.minGrade),
        maxGrade: form.maxGrade === "" ? null : Number(form.maxGrade),
        beginnerFriendly: form.beginnerFriendly,
      },
      offering: {
        registrationOpenDate: form.openDate === "" ? null : form.openDate,
        registrationCloseDate: form.closeDate === "" ? null : form.closeDate,
        registrationFee: form.fee === "" ? null : Number(form.fee),
        registrationUrl: form.registrationUrl === "" ? null : form.registrationUrl,
        statusOverride: form.statusOverride === "auto" ? null : form.statusOverride,
        verificationStatus: form.verification,
        published: form.published,
      },
    }

    startTransition(async () => {
      const result = await saveActivity({
        offeringId: activity.id,
        programId: activity.program_id,
        patch,
        reportId,
      })
      if (result.ok) {
        toast.success("Changes saved", {
          description: reportId
            ? "The activity was updated and the linked report was marked resolved."
            : "The listing now reflects these changes.",
        })
      } else {
        toast.error("Couldn't save changes", { description: result.error })
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button
          render={<Link href="/admin/activities" />}
          nativeButton={false}
          variant="link"
          size="sm"
          className="h-auto w-fit p-0"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          All activities
        </Button>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-bold tracking-tight text-balance">
            {activity.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {activity.organization.name} &middot; {activity.sport.name} &middot;{" "}
            {seasonLabel(activity)}
          </p>
        </div>
      </div>

      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault()
          handleSave()
        }}
      >
        {reportId && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
            <p>
              Editing to resolve a suggested edit. Saving will apply these changes to the listing and
              mark that report resolved.
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Listing</CardTitle>
            <CardDescription>What a parent reads first.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="e-title">Title</FieldLabel>
                <Input id="e-title" value={form.title} onChange={(e) => set("title", e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="e-description">Description</FieldLabel>
                <Textarea
                  id="e-description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="e-min-grade">Lowest grade</FieldLabel>
                  <FilterSelect
                    id="e-min-grade"
                    value={form.minGrade}
                    onValueChange={(v) => set("minGrade", v)}
                    options={gradeOptions}
                    placeholder="Not set"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="e-max-grade">Highest grade</FieldLabel>
                  <FilterSelect
                    id="e-max-grade"
                    value={form.maxGrade}
                    onValueChange={(v) => set("maxGrade", v)}
                    options={gradeOptions}
                    placeholder="Not set"
                  />
                </Field>
              </div>
              <Field orientation="horizontal">
                <Switch
                  id="e-beginner"
                  checked={form.beginnerFriendly}
                  onCheckedChange={(checked) => set("beginnerFriendly", Boolean(checked))}
                />
                <FieldLabel htmlFor="e-beginner">Beginner friendly</FieldLabel>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registration</CardTitle>
            <CardDescription>
              The highest-stakes fields on the record. A wrong date here costs a family a season.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="e-open">Registration opens</FieldLabel>
                  <Input
                    id="e-open"
                    type="date"
                    value={form.openDate}
                    onChange={(e) => set("openDate", e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="e-close">Registration closes</FieldLabel>
                  <Input
                    id="e-close"
                    type="date"
                    value={form.closeDate}
                    onChange={(e) => set("closeDate", e.target.value)}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="e-url">Registration link</FieldLabel>
                <Input
                  id="e-url"
                  type="url"
                  value={form.registrationUrl}
                  onChange={(e) => set("registrationUrl", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="e-fee">Fee in dollars</FieldLabel>
                <Input
                  id="e-fee"
                  type="number"
                  min={0}
                  value={form.fee}
                  onChange={(e) => set("fee", e.target.value)}
                />
              </Field>

              <FieldSet>
                <FieldLegend>Status override</FieldLegend>
                <Field>
                  <FilterSelect
                    id="e-status"
                    value={form.statusOverride}
                    onValueChange={(v) => set("statusOverride", v)}
                    options={statusOverrideOptions}
                  />
                </Field>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  Computed from dates:
                  <StatusPill status={computed} size="sm" />
                  Shown to parents:
                  <StatusPill status={effective} size="sm" />
                </div>
              </FieldSet>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provenance and trust</CardTitle>
            <CardDescription>
              Where this came from, and how confident we are telling parents about it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="flex flex-col gap-2 rounded-lg bg-muted p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Source:</span>
                  <a
                    href={activity.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {activity.source_type.replace(/_/g, " ")}
                    <ExternalLinkIcon className="size-3" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  Discovered {activity.date_discovered} &middot; last checked{" "}
                  {activity.date_last_checked} &middot; method{" "}
                  {activity.verification_method.replace(/_/g, " ")}
                </p>
              </div>

              <Field>
                <FieldLabel htmlFor="e-verification">Verification state</FieldLabel>
                <FilterSelect
                  id="e-verification"
                  value={form.verification}
                  onValueChange={(v) => set("verification", v as typeof form.verification)}
                  options={Object.entries(verificationLabels).map(([value, label]) => ({
                    value,
                    label: String(label),
                  }))}
                />
              </Field>

              <Field orientation="horizontal">
                <Switch
                  id="e-published"
                  checked={form.published}
                  onCheckedChange={(checked) => set("published", Boolean(checked))}
                />
                <FieldLabel htmlFor="e-published">
                  Published
                  {!form.published && (
                    <Badge variant="outline" className="ml-2">
                      hidden from parents
                    </Badge>
                  )}
                </FieldLabel>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isPending}>
            <SaveIcon data-icon="inline-start" />
            {isPending ? "Saving..." : "Save changes"}
          </Button>
          <Button
            render={<Link href={`/activities/${activity.slug}`} />}
            nativeButton={false}
            variant="outline"
          >
            View public listing
          </Button>
          <span className="text-xs text-muted-foreground">
            Program type: {programTypeLabels[activity.program_type]}
          </span>
        </div>
      </form>
    </div>
  )
}
