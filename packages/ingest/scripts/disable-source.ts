/**
 * Turns a source off so scheduled crawls skip it.
 *
 *   pnpm --filter @openplay/ingest disable-source <source-id> [status] [note]
 *
 * `status` is one of "paused" (default), "disabled", or "retired" — see the
 * `sourceStatus` docs in the schema. `note` is stored in `permissionNote` so
 * the reason is visible to whoever revisits the source. Reverse with
 * `reenable-source`.
 */
import { db, pool, sources } from "@openplay/db"
import { eq } from "drizzle-orm"

const ALLOWED_STATUSES = ["paused", "disabled", "retired"] as const
type DisableStatus = (typeof ALLOWED_STATUSES)[number]

async function main() {
  const [sourceId, statusArg = "paused", note] = process.argv.slice(2)
  if (!sourceId) {
    console.error("Usage: pnpm --filter @openplay/ingest disable-source <source-id> [status] [note]")
    process.exit(1)
  }
  if (!ALLOWED_STATUSES.includes(statusArg as DisableStatus)) {
    console.error(`Status must be one of: ${ALLOWED_STATUSES.join(", ")}`)
    process.exit(1)
  }

  const [row] = await db.select().from(sources).where(eq(sources.id, sourceId)).limit(1)
  if (!row) {
    console.error(`No source with id "${sourceId}".`)
    await pool.end()
    process.exit(1)
  }

  const show = (label: string, s: typeof row) =>
    console.log(
      `${label}: active=${s.active} status=${s.sourceStatus} terms=${s.termsStatus} ` +
        `failures=${s.consecutiveFailures} note=${JSON.stringify(s.permissionNote)}`,
    )

  console.log(`${row.id}  ${row.url}`)
  show("before", row)

  await db
    .update(sources)
    .set({
      active: false,
      sourceStatus: statusArg,
      ...(note ? { permissionNote: note } : {}),
      updatedAt: new Date(),
    })
    .where(eq(sources.id, sourceId))

  const [after] = await db.select().from(sources).where(eq(sources.id, sourceId)).limit(1)
  show("after ", after)

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
