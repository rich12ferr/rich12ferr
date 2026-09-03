/**
 * Records a human's Terms of Service review decision for one source.
 *
 * robots.txt is checked automatically (see fetch.ts / checkRobots) and only
 * tells you whether a crawler is *technically* permitted to fetch a page.
 * Terms of Service is a separate, human judgment call — a page can allow
 * robots.txt access while its ToS still restricts automated scraping (common
 * on SportsEngine/MyRec-hosted pages). This script is where that judgment
 * gets recorded, one source at a time, after an operator has actually read
 * the site's terms.
 *
 * Usage:
 *   pnpm --filter @openplay/ingest approve-source <source-id> allowed
 *   pnpm --filter @openplay/ingest approve-source <source-id> disallowed "reason"
 *
 * Marking a source "disallowed" also deactivates it (active=false,
 * sourceStatus='disabled') — a ToS violation should stop crawling regardless
 * of what robots.txt says.
 */
import { db, pool, sources } from "@openplay/db"
import { eq } from "drizzle-orm"

async function main() {
  const [sourceId, decision, reason] = process.argv.slice(2)

  if (!sourceId || (decision !== "allowed" && decision !== "disallowed")) {
    console.error(
      "Usage: pnpm --filter @openplay/ingest approve-source <source-id> <allowed|disallowed> [reason]",
    )
    process.exit(1)
  }

  const [existing] = await db
    .select({ id: sources.id, label: sources.label, active: sources.active })
    .from(sources)
    .where(eq(sources.id, sourceId))
    .limit(1)

  if (!existing) {
    console.error(`No source with id "${sourceId}".`)
    process.exit(1)
  }

  await db
    .update(sources)
    .set({
      termsStatus: decision,
      ...(decision === "disallowed"
        ? {
            active: false,
            sourceStatus: "disabled" as const,
            permissionNote: reason
              ? `Terms of Service disallow crawling: ${reason}`
              : "Terms of Service disallow crawling.",
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(sources.id, sourceId))

  console.log(
    `${sourceId} (${existing.label}) → terms_status=${decision}` +
      (decision === "disallowed" ? ", deactivated" : ""),
  )

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
