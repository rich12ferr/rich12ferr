"use client"

import { useState } from "react"
import Link from "next/link"
import { BellIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { alertTriggerLabels } from "@/lib/labels"
import type { ParentAlert } from "@/lib/types"

const typeLabels: Record<ParentAlert["type"], string> = {
  activity: "Activity",
  sport: "Sport",
  child_match: "Child match",
}

export function ManageAlerts({ alerts: initial }: { alerts: ParentAlert[] }) {
  const [alerts, setAlerts] = useState(initial)

  function toggle(id: string) {
    setAlerts((prev) =>
      prev.map((alert) => (alert.id === id ? { ...alert, active: !alert.active } : alert)),
    )
  }

  function remove(id: string) {
    const removed = alerts.find((a) => a.id === id)
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    toast.success(`Deleted "${removed?.label ?? "alert"}"`)
  }

  const activeCount = alerts.filter((a) => a.active).length

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-extrabold tracking-tight">
          {activeCount} active {activeCount === 1 ? "alert" : "alerts"}
        </h2>
        <Button render={<Link href="/alerts" />} nativeButton={false} size="sm">
          <PlusIcon data-icon="inline-start" />
          New alert
        </Button>
      </div>

      <ul className="flex flex-col gap-3">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <BellIcon className="size-4" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{alert.label}</h3>
                  <Badge variant="secondary">{typeLabels[alert.type]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{alert.criteria}</p>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <Switch
                  checked={alert.active}
                  onCheckedChange={() => toggle(alert.id)}
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
                  {alertTriggerLabels[trigger]}
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
