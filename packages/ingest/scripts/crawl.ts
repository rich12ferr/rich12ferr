/**
 * Runs the ingestion pipeline over sources that are due for a re-crawl.
 *
 *   pnpm --filter @openplay/ingest crawl                    # all due sources
 *   pnpm --filter @openplay/ingest crawl -- --source src_x  # one source
 *   pnpm --filter @openplay/ingest crawl -- --force         # ignore hash gate
 *
 * There is deliberately no --dry-run. The pipeline's safety property is that
 * nothing it extracts becomes publicly visible on its own: new and materially
 * changed offerings land in `review_candidates` as unpublished rows awaiting a
 * human. A flag that skipped only *some* writes would produce a misleading
 * picture of what a real crawl does, so the honest options are a real crawl or
 * none.
 *
 * Note that --force bypasses the content-hash gate and therefore spends model
 * tokens on unchanged pages. Use it when the prompt or model changed.
 */
import { db, pool, sources } from "@openplay/db"
import { eq } from "drizzle-orm"

import { ingestSource, runDueSources, dueSources } from "../src/pipeline"

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main() {
  const force = flag("force")
  const sourceId = option("source")

  console.log(
    `\nCrawl starting${force ? " (forced — bypassing the content-hash gate)" : ""}\n`,
  )

  let results
  if (sourceId) {
    // ingestSource takes the full row, not just an id: the back-off logic needs
    // the source's current failure count and crawl interval.
    const [row] = await db.select().from(sources).where(eq(sources.id, sourceId))
    if (!row) {
      console.error(`No source with id "${sourceId}".`)
      await pool.end()
      process.exit(1)
    }
    results = [await ingestSource(row, { force })]
  } else {
    results = await runDueSources({ force })
  }

  if (results.length === 0) {
    const due = await dueSources()
    console.log(
      `No sources were due. ${due.length} source(s) are eligible; ` +
        `use --force to crawl anyway.`,
    )
  }

  for (const result of results) {
    console.log(`── ${result.sourceId} ${"─".repeat(Math.max(0, 44 - result.sourceId.length))}`)
    console.log(`   url          ${result.url}`)
    console.log(`   status       ${result.status}`)
    if (result.error) console.log(`   error        ${result.error}`)
    if (result.tokensUsed !== null) console.log(`   tokens       ${result.tokensUsed}`)

    const counts = { queued: 0, applied: 0, unchanged: 0, rejected: 0 }
    for (const outcome of result.programs) counts[outcome.kind]++
    console.log(
      `   programs     ${result.programs.length}` +
        ` (queued ${counts.queued}, applied ${counts.applied},` +
        ` unchanged ${counts.unchanged}, rejected ${counts.rejected})`,
    )

    for (const outcome of result.programs) {
      const detail =
        outcome.kind === "queued"
          ? `queued for review — ${outcome.reason}`
          : outcome.kind === "applied"
            ? `applied [${outcome.changes.map((c) => c.field).join(", ")}]`
            : outcome.kind === "rejected"
              ? `rejected — ${outcome.reason}`
              : "unchanged"
      console.log(`   • ${outcome.title}: ${detail}`)
    }
    console.log()
  }

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
