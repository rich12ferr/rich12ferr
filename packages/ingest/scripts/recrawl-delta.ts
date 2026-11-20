/**
 * Compares the database against a baseline snapshot taken before a recrawl and
 * prints the delta: new review candidates (new activities and date changes),
 * new child pages discovered, and offerings whose dates changed.
 *
 *   node --env-file-if-exists=/vercel/share/.env.project --import tsx \
 *     scripts/recrawl-delta.ts [--baseline /tmp/baseline.json] [--out /tmp/recrawl-delta.md]
 */
import { readFileSync, writeFileSync } from "node:fs"

import { pool } from "@openplay/db"

type BaselineOffering = {
  id: string
  season_start_date: string | null
  season_end_date: string | null
  registration_open_date: string | null
  registration_close_date: string | null
  registration_status: string | null
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const DATE_FIELDS = [
  "season_start_date",
  "season_end_date",
  "registration_open_date",
  "registration_close_date",
  "registration_status",
] as const

function day(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

async function main() {
  const baseline = JSON.parse(readFileSync(option("baseline") ?? "/tmp/baseline.json", "utf8")) as {
    at: string
    off: BaselineOffering[]
    cand: string[]
    src: string[]
  }
  const out = option("out") ?? "/tmp/recrawl-delta.md"
  const known = new Set(baseline.cand)
  const knownSources = new Set(baseline.src)
  const before = new Map(baseline.off.map((o) => [o.id, o]))

  const candidates = (
    await pool.query(
      `select rc.id, rc.kind, rc.status, rc.proposed_title, rc.review_reason, rc.changes, rc.payload,
              coalesce(o.name, rc.proposed_organization_name) org, s.url
         from review_candidates rc
         left join sources s on s.id = rc.source_id
         left join organizations o on o.id = coalesce(rc.target_organization_id, s.organization_id)
        where rc.discovered_at >= $1
        order by org, rc.kind, rc.proposed_title`,
      [baseline.at],
    )
  ).rows.filter((row) => !known.has(row.id))

  const newSources = (
    await pool.query(
      `select s.id, s.url, o.name org from sources s left join organizations o on o.id = s.organization_id order by o.name`,
    )
  ).rows.filter((row) => !knownSources.has(row.id))

  const offerings = (
    await pool.query(
      `select po.id, p.title, o.name org, ${DATE_FIELDS.map((f) => `po.${f}`).join(", ")}
         from program_offerings po
         join programs p on p.id = po.program_id
         join organizations o on o.id = p.organization_id`,
    )
  ).rows

  const dateChanges = offerings.flatMap((row) => {
    const prior = before.get(row.id)
    if (!prior) return []
    const diffs = DATE_FIELDS.filter((f) => day(prior[f]) !== day(row[f])).map(
      (f) => `${f}: ${day(prior[f])} → ${day(row[f])}`,
    )
    return diffs.length ? [{ org: row.org, title: row.title, diffs }] : []
  })

  const lines: string[] = [`# Recrawl delta since ${baseline.at}`, ""]
  const byKind = (kind: string) => candidates.filter((c) => c.kind === kind)
  lines.push(
    `- New review candidates: ${candidates.length} (${[...new Set(candidates.map((c) => c.kind))]
      .map((k) => `${k}: ${byKind(k).length}`)
      .join(", ")})`,
    `- New child pages discovered: ${newSources.length}`,
    `- Published offerings with changed dates/status: ${dateChanges.length}`,
    "",
    "## Review candidates",
  )
  for (const c of candidates) {
    const payload = c.payload ?? {}
    const dates = [payload.seasonStartDate, payload.seasonEndDate].filter(Boolean).join(" to ")
    const reg = payload.registrationCloseDate ? `; reg closes ${payload.registrationCloseDate}` : ""
    const changed = c.changes ? `; changes: ${Object.keys(c.changes).join(", ")}` : ""
    lines.push(
      `- **${c.org ?? "Unknown org"}** — ${c.proposed_title ?? "(untitled)"} [${c.kind}, ${c.status}]` +
        `${dates ? ` — ${dates}` : ""}${reg}${changed}`,
    )
  }
  lines.push("", "## Date changes on existing offerings")
  for (const d of dateChanges) lines.push(`- **${d.org}** — ${d.title}: ${d.diffs.join("; ")}`)
  lines.push("", "## New child pages")
  for (const s of newSources) lines.push(`- ${s.org ?? "?"} — ${s.url}`)

  writeFileSync(out, lines.join("\n") + "\n")
  console.log(lines.slice(0, 6).join("\n"))
  await pool.end()
}

main().catch(async (error) => {
  console.error(error)
  await pool.end()
  process.exit(1)
})
