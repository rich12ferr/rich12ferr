"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { BellIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { alertTriggerLabels } from "@/lib/labels"
import type { AlertTrigger } from "@/lib/types"
import {
  deleteAlertAction,
  toggleAlertActive,
  type AlertListItem,
} from "@/app/alerts/actions"

const kindLabels: Record<string, string> = {
  activity: "Activity",
  sport: "Sport",
  child_match: "Child match",
}

/**
 * Login-free alert management. The parent's email is proven by the lookup
 * step (they typed it and we found rows), and every mutating action re-sends
 * that email so the server can scope the change — there is no session here on
 * purpose (see the alerts-before-auth decision).
 */
export function ManageAlertsByEmail({
  email,
  alerts: initial,
}: {
  email: string
  alerts: AlertListItem[]
}) {
  const [alerts, setAlerts] = useState(initial)
  const [, startTransition] = useTransition()

  function toggle(id: string, next: boolean) {
    // Optimistic — revert on failure so the switch never lies about state.
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, active: next } : a)))
    startTransition(async () => {
      const result = await toggleAlertActive(id, email, next)
      if (!result.ok) {
        setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, active: !next } : a)))
        toast.error("Could not update that alert. Please try again.")
      }
    })
  }

  function remove(id: string) {
    const removed = alerts.find((a) => a.id === id)
    const prev = alerts
    setAlerts((current) => current.filter((a) => a.id !== id))
    startTransition(async () => {
      const result = await deleteAlertAction(id, email)
      if (result.ok) {
        toast.success(`Deleted "${removed?.label ?? "alert"}"`)
      } else {
        setAlerts(prev)
        toast.error("Could not delete that alert. Please try again.")
      }
    })
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-8">
        <p className="text-muted-foreground">
          No alerts found for <span className="font-medium text-foreground">{email}</span>.
        </p>
        <Button render={<Link href="/alerts" />} nativeButton={false} size="sm">
          <PlusIcon data-icon="inline-start" />
          Create an alert
        </Button>
      </div>
    )
  }

  const activeCount = alerts.filter((a) => a.active).length

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-extrabold tracking-tight">
          {activeCount} active {activeCount === 1 ? "alert" : "alerts"} for {email}
        </h2>
        <Button render={<Link href="/alerts" />} nativeButton={false} size="sm">
          <PlusIcon data-icon="inline-start" />
          New alert
        </Button>
      </div>

      <ul className="flex flex-col gap-3">
        {alerts.map((alert) => (
          <li key={alert.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <BellIcon className="size-4" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{alert.label}</h3>
                  <Badge variant="secondary">{kindLabels[alert.kind] ?? alert.kind}</Badge>
                </div>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <Switch
                  checked={alert.active}
                  onCheckedChange={(next) => toggle(alert.id, next)}
                  aria-label={`${alert.active ? "Pause" : "Resume"} ${alert.label}`}
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(alert.id)}
                  aria-label={`Delete ${alert.label}`}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
              {alert.triggers.map((trigger) => (
                <Badge key={trigger} variant="outline" className="font-normal">
                  {alertTriggerLabels[trigger as AlertTrigger] ?? trigger}
                </Badge>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        Paused alerts stay saved but stop sending email. Every alert email also includes a one-click
        unsubscribe link.
      </p>
    </div>
  )
}
