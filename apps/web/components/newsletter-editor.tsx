"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { BarChart3Icon, EyeIcon, SaveIcon, SendIcon } from "lucide-react"
import { toast } from "sonner"
import type { NewsletterIssueRow, WeeklyEditionRow, WeeklyStoryRow } from "@openplay/db"
import { saveIssueAction, sendIssueAction } from "@/app/admin/newsletter/actions"
import { renderNewsletterEmail } from "@/lib/newsletter-email"
import { FilterSelect } from "@/components/filter-select"
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const NO_EDITION = "__none__"

export function NewsletterEditor({
  issue,
  stories,
  editions,
  appUrl,
}: {
  issue: NewsletterIssueRow
  stories: WeeklyStoryRow[]
  editions: { id: string; title: string; weekStart: string }[]
  appUrl: string
}) {
  const sent = issue.status === "sent"

  const [subject, setSubject] = useState(issue.subject)
  const [intro, setIntro] = useState(issue.intro ?? "")
  const [editionId, setEditionId] = useState(issue.editionId ?? NO_EDITION)
  const [sponsorName, setSponsorName] = useState(issue.sponsorName ?? "")
  const [sponsorBlurb, setSponsorBlurb] = useState(issue.sponsorBlurb ?? "")
  const [sponsorUrl, setSponsorUrl] = useState(issue.sponsorUrl ?? "")
  const [sponsorImageUrl, setSponsorImageUrl] = useState(issue.sponsorImageUrl ?? "")

  const [saving, startSaving] = useTransition()
  const [sending, startSending] = useTransition()

  // The linked edition changed since load means the preview's stories are
  // stale until saved (stories are fetched server-side for the saved edition).
  const editionChanged = (issue.editionId ?? NO_EDITION) !== editionId

  const previewHtml = useMemo(() => {
    const draft: NewsletterIssueRow = {
      ...issue,
      subject: subject || "Untitled digest",
      intro: intro || null,
      sponsorName: sponsorName || null,
      sponsorBlurb: sponsorBlurb || null,
      sponsorUrl: sponsorUrl || null,
      sponsorImageUrl: sponsorImageUrl || null,
    }
    const edition: WeeklyEditionRow | null =
      editions.length > 0 && editionId !== NO_EDITION
        ? ({ id: editionId } as WeeklyEditionRow)
        : null
    return renderNewsletterEmail({
      issue: draft,
      edition,
      stories: editionChanged ? [] : stories,
      appUrl,
      unsubscribeUrl: `${appUrl}/newsletter/unsubscribe?token=preview`,
    }).html
  }, [
    issue,
    subject,
    intro,
    sponsorName,
    sponsorBlurb,
    sponsorUrl,
    sponsorImageUrl,
    editionId,
    editionChanged,
    stories,
    editions.length,
    appUrl,
  ])

  function currentPatch() {
    return {
      subject: subject.trim(),
      intro: intro.trim() || null,
      editionId: editionId === NO_EDITION ? null : editionId,
      sponsorName: sponsorName.trim() || null,
      sponsorBlurb: sponsorBlurb.trim() || null,
      sponsorUrl: sponsorUrl.trim() || null,
      sponsorImageUrl: sponsorImageUrl.trim() || null,
    }
  }

  function handleSave() {
    if (!subject.trim()) {
      toast.error("A subject line is required.")
      return
    }
    startSaving(async () => {
      const result = await saveIssueAction(issue.id, currentPatch())
      if (result.ok) toast.success("Saved.")
      else toast.error(result.error)
    })
  }

  function handleSend() {
    startSending(async () => {
      // Persist the latest edits first so the send renders exactly what's on screen.
      const saveResult = await saveIssueAction(issue.id, currentPatch())
      if (!saveResult.ok) {
        toast.error(saveResult.error)
        return
      }
      const result = await sendIssueAction(issue.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      const modeNote = result.mode === "log" ? " (log mode — no email provider connected)" : ""
      toast.success(`Sent to ${result.sent} subscriber${result.sent === 1 ? "" : "s"}${modeNote}.`)
    })
  }

  const editionOptions = [
    { value: NO_EDITION, label: "No linked week (sponsor + intro only)" },
    ...editions.map((e) => ({ value: e.id, label: `${e.title} — ${e.weekStart}` })),
  ]

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Compose */}
      <div className="flex flex-col gap-6">
        {sent ? (
          <div className="rounded-xl border border-open/40 bg-open/10 p-4 text-sm leading-relaxed">
            This issue was sent{issue.sentAt ? ` on ${new Date(issue.sentAt).toLocaleString()}` : ""} to{" "}
            {issue.recipientCount} subscriber{issue.recipientCount === 1 ? "" : "s"}. It&apos;s locked to
            preserve what recipients received.
          </div>
        ) : null}

        <Field>
          <FieldLabel htmlFor="nl-subject">Subject line</FieldLabel>
          <Input
            id="nl-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="This week in Vermont youth activities"
            disabled={sent}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="nl-intro">Intro</FieldLabel>
          <Textarea
            id="nl-intro"
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            placeholder="A sentence or two setting up the week."
            rows={3}
            disabled={sent}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="nl-edition">Bite-sized summaries from</FieldLabel>
          <FilterSelect
            id="nl-edition"
            value={editionId}
            onValueChange={setEditionId}
            options={editionOptions}
          />
          <FieldDescription>
            Pulls the stories from a published &ldquo;This Week&rdquo; edition. {" "}
            {editionChanged
              ? "Save to refresh the preview with the new week's stories."
              : "Edit the stories themselves under This Week."}
          </FieldDescription>
        </Field>

        <fieldset className="flex flex-col gap-4 rounded-xl border border-border p-4" disabled={sent}>
          <legend className="px-1 text-sm font-semibold">Sponsorship (optional)</legend>
          <Field>
            <FieldLabel htmlFor="nl-sponsor-name">Sponsor name</FieldLabel>
            <Input
              id="nl-sponsor-name"
              value={sponsorName}
              onChange={(e) => setSponsorName(e.target.value)}
              placeholder="Green Mountain Soccer Club"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="nl-sponsor-blurb">Sponsor blurb</FieldLabel>
            <Textarea
              id="nl-sponsor-blurb"
              value={sponsorBlurb}
              onChange={(e) => setSponsorBlurb(e.target.value)}
              placeholder="One or two sentences from the sponsor."
              rows={2}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="nl-sponsor-url">Sponsor link</FieldLabel>
              <Input
                id="nl-sponsor-url"
                value={sponsorUrl}
                onChange={(e) => setSponsorUrl(e.target.value)}
                placeholder="https://…"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="nl-sponsor-image">Logo image URL</FieldLabel>
              <Input
                id="nl-sponsor-image"
                value={sponsorImageUrl}
                onChange={(e) => setSponsorImageUrl(e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </div>
        </fieldset>

        {!sent ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleSave} disabled={saving} variant="outline">
              <SaveIcon data-icon="inline-start" />
              {saving ? "Saving…" : "Save draft"}
            </Button>

            <Dialog>
              <DialogTrigger render={<Button disabled={sending} />}>
                <SendIcon data-icon="inline-start" />
                {sending ? "Sending…" : "Send to subscribers"}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send this issue now?</DialogTitle>
                  <DialogDescription>
                    This saves your latest edits and emails the current draft to every active
                    subscriber. There&apos;s no undo — an email can&apos;t be recalled once sent.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                  <DialogClose render={<Button type="button" onClick={handleSend} />}>
                    <SendIcon data-icon="inline-start" />
                    Send now
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div>
            <Button render={<Link href="/admin/newsletter/analytics" />} nativeButton={false} variant="outline">
              <BarChart3Icon data-icon="inline-start" />
              View performance
            </Button>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <EyeIcon className="size-4" aria-hidden="true" />
          Live preview
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
          <iframe
            title="Newsletter preview"
            srcDoc={previewHtml}
            className="h-[720px] w-full border-0 bg-white"
          />
        </div>
      </div>
    </div>
  )
}
