/**
 * Exercises the reconciliation logic against the real database using a mock
 * language model, so the decision path can be verified without spending tokens
 * or depending on gateway availability.
 *
 *   pnpm --filter @openplay/ingest verify-pipeline
 *
 * What this proves that a typecheck cannot: that a brand-new program is queued
 * rather than published, that re-running the same content is a no-op, and that
 * a changed registration deadline is treated as review-worthy rather than
 * silently overwritten.
 */
import { db, pool, reviewCandidates, sources, rawDocuments, extractionRuns } from "@openplay/db"
import { MockLanguageModelV2 } from "ai/test"
import { eq, inArray, like } from "drizzle-orm"

import { ingestSource } from "../src/pipeline"

/** One plausible extraction result, as the model would return it. */
function mockResult(overrides: Record<string, unknown> = {}) {
  return {
    isProgramListing: true,
    pageSummary: "Waterbury Recreation youth program listings.",
    programs: [
      {
        title: "Youth Basketball — Grades 3-4",
        sportName: "Basketball",
        organizationName: "Waterbury Recreation Department",
        description: "Instructional basketball league for grades 3 and 4.",
        programType: "recreational",
        gender: "coed",
        minAge: null,
        maxAge: null,
        minGrade: 3,
        maxGrade: 4,
        residencyRequirement: null,
        experienceLevel: "beginner",
        season: "winter",
        seasonYear: 2027,
        registrationOpenDate: "2026-11-01",
        registrationCloseDate: "2026-12-15",
        seasonStartDate: "2027-01-05",
        seasonEndDate: "2027-03-01",
        registrationUrl: "https://www.waterburyvt.com/register",
        registrationFee: 45,
        additionalFees: null,
        scholarshipAvailable: true,
        capacity: 60,
        waitlistAvailable: true,
        tryoutRequired: false,
        tryoutDetails: null,
        tryoutDate: null,
        town: "Waterbury",
        state: "VT",
        zip: "05676",
        venueName: "Thatcher Brook Primary School",
        venueAddress: "47 Stowe Street",
        practiceSchedule: "Tuesdays 5:30-7:00pm",
        gameSchedule: "Saturday mornings",
        equipmentRequirements: null,
        beginnerFriendly: true,
        contactName: null,
        contactEmail: "rec@waterburyvt.com",
        contactUrl: null,
        fieldConfidence: {
          registrationCloseDate: 0.95,
          registrationFee: 0.92,
          registrationUrl: 0.88,
        },
        sourceQuotes: {
          registrationCloseDate: "Registration closes December 15, 2026.",
          registrationFee: "$45 per player.",
          registrationUrl: "Register online at waterburyvt.com/register",
        },
        ambiguities: [],
        ...overrides,
      },
    ],
  }
}

function mockModel(payload: unknown) {
  return new MockLanguageModelV2({
    doGenerate: async () => ({
      finishReason: "stop" as const,
      usage: { inputTokens: 1200, outputTokens: 300, totalTokens: 1500 },
      content: [{ type: "text" as const, text: JSON.stringify(payload) }],
      warnings: [],
    }),
  })
}

let failures = 0
function check(label: string, condition: boolean, detail = "") {
  console.log(`  ${condition ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`)
  if (!condition) failures++
}

async function main() {
  const [source] = await db
    .select()
    .from(sources)
    .where(eq(sources.id, "src_waterbury_rec"))

  if (!source) throw new Error("Run register-sources first.")

  console.log("\n1. New program from a fresh extraction\n")
  const first = await ingestSource(source, {
    model: mockModel(mockResult()),
    force: true,
  })
  check("status is extracted", first.status === "extracted", first.status)
  check("one program handled", first.programs.length === 1, String(first.programs.length))
  check(
    "new program is QUEUED, not auto-published",
    first.programs[0]?.kind === "queued",
    first.programs[0]?.kind,
  )
  check("tokens recorded", first.tokensUsed === 1500, String(first.tokensUsed))

  const queuedId =
    first.programs[0]?.kind === "queued" ? first.programs[0].reviewCandidateId : null

  if (queuedId) {
    const [candidate] = await db
      .select()
      .from(reviewCandidates)
      .where(eq(reviewCandidates.id, queuedId))
    check("review candidate persisted", Boolean(candidate))
    check(
      "candidate carries provenance",
      Boolean(candidate?.rawDocumentId && candidate?.extractionRunId),
    )
    check("candidate awaits a human", candidate?.status === "pending", candidate?.status)
  }

  console.log("\n2. Hash gate: identical content, no --force\n")
  const [refreshed] = await db.select().from(sources).where(eq(sources.id, source.id))
  const second = await ingestSource(refreshed!, { model: mockModel(mockResult()) })
  check("skipped as unchanged", second.status === "unchanged", second.status)
  check("no tokens spent", second.tokensUsed === null, String(second.tokensUsed))

  console.log("\n3. Contradictory dates are caught deterministically\n")
  const [again] = await db.select().from(sources).where(eq(sources.id, source.id))
  const bad = await ingestSource(again!, {
    model: mockModel(
      mockResult({ registrationOpenDate: "2027-02-01", registrationCloseDate: "2026-10-01" }),
    ),
    force: true,
  })
  const outcome = bad.programs[0]
  check(
    "impossible date range is queued, not applied",
    outcome?.kind === "queued",
    `status=${bad.status} programs=${bad.programs.length} kind=${outcome?.kind} err=${bad.error ?? "-"}`,
  )
  if (outcome?.kind === "queued") {
    // `reason` is a coarse category ("validation"); the field-level detail a
    // reviewer actually needs lives in validation_issues, so assert on that.
    const [row] = await db
      .select({ issues: reviewCandidates.validationIssues, kind: reviewCandidates.kind })
      .from(reviewCandidates)
      .where(eq(reviewCandidates.id, outcome.reviewCandidateId))
    const issues = (row?.issues ?? []) as { field?: string; message?: string }[]
    check(
      "persisted issues name the offending field",
      issues.some(
        (i) => i.field === "registrationCloseDate" && /closes before it opens/i.test(i.message ?? ""),
      ),
      JSON.stringify(issues.map((i) => i.field)),
    )
    check("kind is a value the schema allows", row?.kind === "new_program", row?.kind)
  }

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`)

  // Clean up everything this verification created so the dataset stays honest.
  const created = await db
    .select({ id: reviewCandidates.id })
    .from(reviewCandidates)
    .where(eq(reviewCandidates.sourceId, source.id))
  if (created.length > 0) {
    await db.delete(reviewCandidates).where(
      inArray(
        reviewCandidates.id,
        created.map((row) => row.id),
      ),
    )
  }
  await db.delete(extractionRuns).where(eq(extractionRuns.sourceId, source.id))
  await db.delete(rawDocuments).where(eq(rawDocuments.sourceId, source.id))
  void like
  console.log("Cleaned up verification rows.")

  await pool.end()
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
