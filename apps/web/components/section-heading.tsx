import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="flex flex-col gap-1">
        {eyebrow ? (
          <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">{eyebrow}</p>
        ) : null}
        <h2 className="font-display text-2xl leading-tight font-extrabold tracking-tight text-balance sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
