/**
 * One-off: sync just the `sports` table from the `SPORTS` array in
 * @openplay/core, without touching organizations/programs/offerings.
 *
 * Needed because scripts/seed.ts's `main()` also seeds fixture demo
 * organizations and programs from apps/web/lib/data, which we don't want
 * running against a database being populated from the real v3 crawl seed.
 *
 * Run: pnpm --filter @openplay/db exec tsx scripts/seed-sports-only.ts
 */

import { SPORTS } from "@openplay/core"
import { db, pool } from "../src/client"
import { sports } from "../src/schema"

async function main() {
  console.log("[seed-sports-only] starting", { count: SPORTS.length })
  for (const sport of SPORTS) {
    await db
      .insert(sports)
      .values({
        id: sport.id,
        slug: sport.slug,
        name: sport.name,
        monogram: sport.monogram,
        iconKey: sport.icon_key,
        tone: sport.tone,
        primarySeasons: sport.primary_seasons,
        synonyms: sport.synonyms,
        blurb: sport.blurb,
      })
      .onConflictDoUpdate({
        target: sports.id,
        set: {
          name: sport.name,
          monogram: sport.monogram,
          iconKey: sport.icon_key,
          tone: sport.tone,
          primarySeasons: sport.primary_seasons,
          synonyms: sport.synonyms,
          blurb: sport.blurb,
          updatedAt: new Date(),
        },
      })
  }
  console.log("[seed-sports-only] done")
  await pool.end()
}

main().catch((err) => {
  console.error("[seed-sports-only] failed", err)
  process.exit(1)
})
