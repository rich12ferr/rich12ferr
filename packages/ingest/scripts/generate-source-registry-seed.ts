/**
 * Generates the JSON application seed from the CSV source registry.
 *
 * `data/vt-source-registry.csv` is the operational registry — the file an
 * operator actually edits when adding, retiring, or re-tuning a source.
 * `data/vt-source-registry.seed.json` is a derived, generated artifact: it
 * exists so the importer has a stable, typed shape to read without re-parsing
 * CSV, and so a `git diff` on the JSON shows exactly what changed. Never hand-
 * edit the JSON file — edit the CSV and re-run this script.
 *
 * Run: pnpm --filter @openplay/ingest generate-source-registry-seed
 */
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { parse } from "csv-parse/sync"

const CSV_PATH = join(__dirname, "../data/vt-source-registry.csv")
const JSON_PATH = join(__dirname, "../data/vt-source-registry.seed.json")

type CsvRow = {
  source_id: string
  organization: string
  organization_type: string
  town: string
  state: string
  coverage: string
  source_url: string
  platform: string
  source_type: string
  ingestion_priority: string
  crawler_adapter: string
  data_structure: string
  sports_scope: string
  crawl_frequency: string
  human_review_required: string
  notes: string
}

export type SourceRegistryEntry = {
  sourceId: string
  organization: string
  organizationType: string
  town: string
  state: string
  coverage: string
  sourceUrl: string
  platform: string
  sourceType: string
  ingestionPriority: string
  crawlerAdapter: string
  dataStructure: string
  sportsScope: string
  crawlFrequency: string
  humanReviewRequired: boolean
  notes: string | null
}

function main() {
  const csv = readFileSync(CSV_PATH, "utf8")
  const rows: CsvRow[] = parse(csv, { columns: true, skip_empty_lines: true, trim: true })

  const entries: SourceRegistryEntry[] = rows.map((row) => ({
    sourceId: row.source_id,
    organization: row.organization,
    organizationType: row.organization_type,
    town: row.town,
    state: row.state,
    coverage: row.coverage,
    sourceUrl: row.source_url,
    platform: row.platform,
    sourceType: row.source_type,
    ingestionPriority: row.ingestion_priority,
    crawlerAdapter: row.crawler_adapter,
    dataStructure: row.data_structure,
    sportsScope: row.sports_scope,
    crawlFrequency: row.crawl_frequency,
    humanReviewRequired: row.human_review_required.trim().toLowerCase() === "true",
    notes: row.notes.trim() || null,
  }))

  const seen = new Set<string>()
  for (const entry of entries) {
    if (seen.has(entry.sourceId)) {
      throw new Error(`Duplicate source_id in CSV: ${entry.sourceId}`)
    }
    seen.add(entry.sourceId)
  }

  // Plain JSON has no comment syntax, so provenance travels as a real field
  // rather than a header comment — a header comment would make this invalid
  // JSON and break every consumer's JSON.parse.
  const output = {
    _generated: {
      warning: "GENERATED FILE — do not edit by hand.",
      sourceOfTruth: "packages/ingest/data/vt-source-registry.csv",
      regenerateWith: "pnpm --filter @openplay/ingest generate-source-registry-seed",
      generatedAt: new Date().toISOString(),
    },
    entries,
  }

  writeFileSync(JSON_PATH, JSON.stringify(output, null, 2) + "\n")
  console.log(`Wrote ${entries.length} entries to ${JSON_PATH}`)
}

main()
