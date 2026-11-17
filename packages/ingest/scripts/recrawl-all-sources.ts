/**
 * Recrawls every crawlable source regardless of its schedule: active parent
 * pages first, then pending child pages found by link discovery. Results go
 * through the normal pipeline, so new or changed offerings still land in
 * `review_candidates` unpublished.
 *
 *   node --env-file-if-exists=/vercel/share/.env.project --import tsx \
 *     scripts/recrawl-all-sources.ts [--out /tmp/recrawl-results.jsonl] [--timeout 5] \
 *     [--concurrency 6] [--resume]
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs"

import { db, pool, sources } from "@openplay/db"
import { and, eq, inArray, sql } from "drizzle-orm"

import { ingestSourceWithTimeout } from "../src/pipeline"

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main() {
  const out = option("out") ?? "/tmp/recrawl-results.jsonl"
  const timeoutMinutes = Number(option("timeout") ?? 5)
  const concurrency = Math.max(1, Number(option("concurrency") ?? 1))
  const resume = process.argv.includes("--resume")
  const done = new Set<string>()
  if (resume && existsSync(out)) {
    for (const line of readFileSync(out, "utf8").split("\n")) {
      if (line.trim()) done.add(JSON.parse(line).sourceId)
    }
  } else {
    writeFileSync(out, "")
  }

  const rows = await db
    .select()
    .from(sources)
    .where(
      and(
        eq(sources.robotsAllowed, true),
        inArray(sources.sourceStatus, ["active", "pending_review"]),
      ),
    )
    .orderBy(
      sql`${sources.active} desc`,
      sql`${sources.discoveredFromSourceId} is not null`,
      sources.organizationId,
    )

  const pending = rows.filter((row) => !done.has(row.id))
  // Politeness is per site: one site's pages stay sequential, different sites run in parallel.
  const byHost = new Map<string, typeof pending>()
  for (const row of pending) {
    const host = new URL(row.url).hostname
    byHost.set(host, [...(byHost.get(host) ?? []), row])
  }
  const queue = [...byHost.values()]
  let finished = done.size

  console.log(
    `Recrawling ${pending.length} of ${rows.length} sources across ${queue.length} sites ` +
      `(concurrency ${concurrency}) -> ${out}`,
  )

  async function crawlSite(siteRows: typeof pending) {
    for (const source of siteRows) {
      await crawlOne(source)
      await new Promise((resolve) => setTimeout(resolve, 1_000))
    }
  }

  async function crawlOne(source: (typeof pending)[number]) {
    const result = await ingestSourceWithTimeout(source, {
      sourceTimeoutMs: timeoutMinutes * 60_000,
    })
    appendFileSync(
      out,
      JSON.stringify({
        sourceId: source.id,
        url: source.url,
        child: source.discoveredFromSourceId !== null,
        active: source.active,
        status: result.status,
        error: result.error ?? null,
        discovered: result.discoveredSourceIds?.length ?? 0,
      }) + "\n",
    )
    finished += 1
    console.log(`[${finished}/${rows.length}] ${result.status} ${source.url}`)
  }

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let site = queue.shift(); site; site = queue.shift()) await crawlSite(site)
    }),
  )

  await pool.end()
}

main().catch(async (error) => {
  console.error(error)
  await pool.end()
  process.exit(1)
})
