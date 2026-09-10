import { HistoryIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import type { AdminAuditLogRow } from "@openplay/db"

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  minGrade: "Lowest grade",
  maxGrade: "Highest grade",
  beginnerFriendly: "Beginner friendly",
  registrationOpenDate: "Registration opens",
  registrationCloseDate: "Registration closes",
  registrationFee: "Fee",
  registrationUrl: "Registration link",
  statusOverride: "Status override",
  verificationStatus: "Verification state",
  published: "Published",
}

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "(empty)"
  if (typeof value === "boolean") return value ? "yes" : "no"
  return String(value)
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/**
 * The audit trail for one activity, most recent edit first. Every entry is a
 * real write recorded by `saveActivity` — this panel exists so an admin
 * changing a listing can answer "who changed what, and when" without that
 * history living only in memory of having done it.
 */
export function ActivityAuditLog({ entries }: { entries: AdminAuditLogRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent changes</CardTitle>
        <CardDescription>Every edit made to this activity through the admin console.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HistoryIcon />
              </EmptyMedia>
              <EmptyTitle>No changes yet</EmptyTitle>
              <EmptyDescription>Edits made and saved here will show up in this list.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-4">
            {entries.map((entry) => {
              const changes = entry.changes as Record<string, { before: unknown; after: unknown }>
              const fields = Object.keys(changes)
              return (
                <li key={entry.id} className="flex flex-col gap-1.5 border-b pb-4 last:border-b-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{entry.actor}</span>
                    <span>{formatTimestamp(entry.createdAt)}</span>
                  </div>
                  <ul className="flex flex-col gap-1 text-sm">
                    {fields.map((field) => (
                      <li key={field} className="leading-relaxed">
                        <span className="font-medium">{fieldLabel(field)}:</span>{" "}
                        <span className="text-muted-foreground">
                          {formatValue(changes[field].before)} &rarr; {formatValue(changes[field].after)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {entry.reportId && (
                    <span className="text-xs text-muted-foreground">Resolved report {entry.reportId}</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
