"use client"

import { useState } from "react"
import { FlagIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FilterSelect } from "@/components/filter-select"
import { reportCategories as categories } from "@/lib/report-categories"

/** PRD screen 8: report incorrect information, reachable from every listing. */
export function ReportDialog({ activityTitle }: { activityTitle: string }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<string>(categories[0].value)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOpen(false)
    toast.success("Thanks — report received", {
      description: "An OpenPlay reviewer will check this listing against its source.",
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        <FlagIcon data-icon="inline-start" />
        Report incorrect info
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Report incorrect information</DialogTitle>
            <DialogDescription className="text-pretty">
              You&apos;re reporting <span className="font-medium text-foreground">{activityTitle}</span>.
              Reports go to a human reviewer, never straight to the live listing.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="my-5 gap-4">
            <Field>
              <FieldLabel htmlFor="report-category">What&apos;s wrong?</FieldLabel>
              <FilterSelect
                id="report-category"
                value={category}
                onValueChange={setCategory}
                options={categories}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="report-details">What should it say?</FieldLabel>
              <Textarea
                id="report-details"
                name="details"
                required
                rows={4}
                placeholder="For example: registration actually closes on September 12, per the league newsletter."
              />
              <FieldDescription>A link to the correct source helps us verify fastest.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="report-email">Your email (optional)</FieldLabel>
              <Input id="report-email" name="email" type="email" placeholder="you@example.com" />
              <FieldDescription>Only used if a reviewer needs to follow up.</FieldDescription>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit">Send report</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
