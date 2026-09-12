/**
 * Applies a human reviewer's approve/reject decision to pending
 * `review_candidates` from the command line.
 *
 * The actual write logic lives in `../src/review-actions.ts`, shared with
 * the admin dashboard's `/admin/review` server actions — see that module's
 * header comment for why there is exactly one code path here.
 *
 * Usage:
 *   pnpm --filter @openplay/ingest approve-candidates <candidate-id> [<candidate-id> ...]
 *   pnpm --filter @openplay/ingest approve-candidates --all-pending
 */
import { pool } from "@openplay/db"
import { approveReviewCandidate, pendingReviewCandidateRows } from "../src/review-actions"

async function main() {
  const args = process.argv.slice(2)
  const all = args.includes("--all-pending")
  const ids = args.filter((a) => a !== "--all-pending")

  const candidates = await pendingReviewCandidateRows(all ? undefined : ids)

  if (candidates.length === 0) {
    console.log("No matching pending candidates.")
    await pool.end()
    return
  }

  for (const candidate of candidates) {
    console.log(`${candidate.id} [${candidate.kind}] "${candidate.proposedTitle}"`)

    // Dispatches on kind itself: new_program/new_offering publish, a
    // field_update that looks like an extraction failure auto-rejects,
    // anything else returns a clear error instead of applying blindly.
    const result = await approveReviewCandidate(candidate.id, "v0-agent")
    console.log(
      result.ok
        ? result.programId
          ? `  approved -> program=${result.programId} offering=${result.offeringId}`
          : "  rejected: looks like an extraction failure, not a real update"
        : `  skip: ${result.error}`,
    )
  }

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
