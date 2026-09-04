import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // 1. Identify the fabricated demo offerings (example.org placeholder source).
    const demoOfferings = await client.query(
      "select id, program_id from program_offerings where source_url ilike '%example.org%'",
    )
    const offeringIds = demoOfferings.rows.map((r) => r.id)
    const touchedProgramIds = [...new Set(demoOfferings.rows.map((r) => r.program_id))]
    console.log(`Demo offerings to delete: ${offeringIds.length}`)

    if (offeringIds.length === 0) {
      await client.query("ROLLBACK")
      console.log("Nothing to delete.")
      return
    }

    // 2. Clean up rows that point at these offerings (no DB-level FKs, so do it explicitly).
    const prov = await client.query(
      "delete from field_provenance where entity_id = any($1)",
      [offeringIds],
    )
    console.log(`field_provenance rows deleted: ${prov.rowCount}`)

    const reports = await client.query("delete from reports where offering_id = any($1)", [
      offeringIds,
    ])
    console.log(`reports rows deleted: ${reports.rowCount}`)

    const reviews = await client.query(
      "delete from review_candidates where target_offering_id = any($1)",
      [offeringIds],
    )
    console.log(`review_candidates rows deleted: ${reviews.rowCount}`)

    // 3. Delete the demo offerings themselves.
    const delOfferings = await client.query(
      "delete from program_offerings where id = any($1)",
      [offeringIds],
    )
    console.log(`program_offerings rows deleted: ${delOfferings.rowCount}`)

    // 4. Delete any parent programs that are now left with zero offerings.
    const orphanPrograms = await client.query(
      `select p.id, p.title from programs p
       where p.id = any($1)
         and not exists (select 1 from program_offerings po where po.program_id = p.id)`,
      [touchedProgramIds],
    )
    const orphanProgramIds = orphanPrograms.rows.map((r) => r.id)
    console.log(`Orphaned programs to delete: ${orphanProgramIds.length}`)
    if (orphanProgramIds.length) {
      await client.query("delete from reports where program_id = any($1)", [orphanProgramIds])
      await client.query("delete from review_candidates where target_program_id = any($1)", [
        orphanProgramIds,
      ])
      const delPrograms = await client.query("delete from programs where id = any($1)", [
        orphanProgramIds,
      ])
      console.log(`programs rows deleted: ${delPrograms.rowCount}`)
    }

    // 5. Delete organizations that are now fully empty (no programs at all).
    //    Only Winooski Valley Union Middle School is expected here — all others
    //    have real crawled offerings that we are keeping.
    const emptyOrgs = await client.query(
      `select o.id, o.name from organizations o
       where not exists (select 1 from programs p where p.organization_id = o.id)`,
    )
    console.log("Organizations now empty (candidates for deletion):")
    console.table(emptyOrgs.rows)
    const emptyOrgIds = emptyOrgs.rows.map((r) => r.id)
    if (emptyOrgIds.length) {
      // Detach/clean up their sources and provenance first.
      const orgSources = await client.query(
        "select id from sources where organization_id = any($1)",
        [emptyOrgIds],
      )
      const orgSourceIds = orgSources.rows.map((r) => r.id)
      if (orgSourceIds.length) {
        await client.query("delete from review_candidates where source_id = any($1)", [
          orgSourceIds,
        ])
        await client.query("delete from sources where id = any($1)", [orgSourceIds])
      }
      await client.query("delete from field_provenance where entity_id = any($1)", [emptyOrgIds])
      const delOrgs = await client.query("delete from organizations where id = any($1)", [
        emptyOrgIds,
      ])
      console.log(`organizations rows deleted: ${delOrgs.rowCount}`)
    }

    await client.query("COMMIT")
    console.log("\nDone. Committed.")
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("Rolled back:", err.message)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(() => process.exit(1))
