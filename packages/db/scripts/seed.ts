/**
 * Seed the OpenPlay database from the prototype's fixture data.
 *
 * Run: pnpm --filter @openplay/db seed
 *
 * This migrates the flat `Activity` fixtures into the normalized model, which
 * is where the program/offering split earns its keep: 28 flat activities become
 * distinct programs with dated offerings, and the same program appearing in two
 * season-years collapses into one program with two offerings.
 *
 * Idempotent — every insert is an upsert keyed on the natural key, so this can
 * be re-run safely against an existing database.
 */

import { randomUUID } from "node:crypto"
import { SPORTS } from "@openplay/core"
import { geocodeFromGazetteer } from "@openplay/ingest"
import { organizationMatchKey, programMatchKey } from "@openplay/ingest"
import { sql } from "drizzle-orm"
import { db, pool } from "../src/client"
import {
  fieldProvenance,
  organizations,
  programOfferings,
  programs,
  sports,
} from "../src/schema"

// Fixtures live in the web app; imported directly so there is one copy of the
// seed data rather than a duplicate that silently drifts.
import { activities } from "../../../apps/web/lib/data/activities"
import { organizations as fixtureOrganizations } from "../../../apps/web/lib/data/organizations"

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Fixture dates are plain YYYY-MM-DD strings; keep them as date strings. */
function asDate(value: string | null | undefined): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function asTimestamp(value: string | null | undefined): Date | null {
  const date = asDate(value)
  return date ? new Date(`${date}T12:00:00Z`) : null
}

/** WKT for PostGIS. Longitude first — reversing this puts Vermont in the ocean. */
function pointLiteral(lng: number, lat: number) {
  return sql`st_setsrid(st_makepoint(${lng}, ${lat}), 4326)::geography`
}

/* -------------------------------------------------------------------------- */
/*  Sports                                                                    */
/* -------------------------------------------------------------------------- */

async function seedSports() {
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
  console.log(`[seed] sports: ${SPORTS.length}`)
}

/* -------------------------------------------------------------------------- */
/*  Organizations                                                             */
/* -------------------------------------------------------------------------- */

async function seedOrganizations() {
  for (const org of fixtureOrganizations) {
    // Offline gazetteer rather than a network geocode: seeding must be
    // deterministic and must not depend on an external service being up.
    const geo = geocodeFromGazetteer(org.town, org.state)

    const values = {
      id: org.id,
      slug: slugify(org.name),
      name: org.name,
      organizationType: org.organization_type,
      websiteUrl: org.website_url,
      registrationPlatform: org.registration_platform,
      contactEmail: org.contact_email,
      phone: org.phone,
      town: org.town,
      state: org.state,
      zip: org.zip,
      about: org.about,
      verified: org.verified,
      lastVerifiedAt: asTimestamp(org.last_verified_at),
      geocodePrecision: geo ? geo.precision : ("none" as const),
      matchKey: organizationMatchKey(org.name, org.town, org.state),
    }

    await db
      .insert(organizations)
      .values(values)
      .onConflictDoUpdate({ target: organizations.id, set: { ...values, updatedAt: new Date() } })

    // Location is set separately so the PostGIS expression is applied by the
    // database rather than round-tripped through a WKT string in the driver.
    if (geo) {
      await db
        .update(organizations)
        .set({ location: sql`${pointLiteral(geo.point.lng, geo.point.lat)}` as never })
        .where(sql`${organizations.id} = ${org.id}`)
    }
  }
  console.log(`[seed] organizations: ${fixtureOrganizations.length}`)
}

/* -------------------------------------------------------------------------- */
/*  Programs and offerings                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Collapse flat activities into programs keyed by identity.
 *
 * Two fixtures that share org + sport + gender + age band are the same program
 * in two seasons, and must become one program row with two offerings.
 */
function groupIntoPrograms() {
  type Activity = (typeof activities)[number]
  const groups = new Map<string, { key: string; activities: Activity[] }>()

  for (const activity of activities) {
    const key = programMatchKey({
      organizationId: activity.organization_id,
      sportId: activity.sport_id,
      gender: activity.gender,
      minAge: activity.min_age,
      maxAge: activity.max_age,
      minGrade: activity.min_grade,
      maxGrade: activity.max_grade,
    })
    const existing = groups.get(key)
    if (existing) existing.activities.push(activity)
    else groups.set(key, { key, activities: [activity] })
  }

  return Array.from(groups.values())
}

async function seedProgramsAndOfferings() {
  const groups = groupIntoPrograms()
  let offeringCount = 0

  for (const group of groups) {
    // Represent the program with its earliest offering, so the durable record
    // reflects the original listing rather than whichever was inserted last.
    const sorted = [...group.activities].sort((a, b) => a.season_year - b.season_year)
    const primary = sorted[0]!

    const programValues = {
      id: primary.id.replace(/^act_/, "prog_"),
      slug: primary.slug,
      organizationId: primary.organization_id,
      sportId: primary.sport_id,
      title: primary.title,
      description: primary.description,
      programType: primary.program_type,
      gender: primary.gender,
      minAge: primary.min_age,
      maxAge: primary.max_age,
      minGrade: primary.min_grade,
      maxGrade: primary.max_grade,
      residencyRequirement: primary.residency_requirement,
      experienceLevel: primary.experience_level,
      beginnerFriendly: primary.beginner_friendly,
      typicalSeasons: Array.from(new Set(group.activities.map((a) => a.season))),
      equipmentRequirements: primary.equipment_requirements,
      practiceSchedule: primary.practice_schedule,
      gameSchedule: primary.game_schedule,
      verificationStatus: primary.verification_status,
      active: true,
      matchKey: group.key,
    }

    await db
      .insert(programs)
      .values(programValues)
      .onConflictDoUpdate({
        target: programs.id,
        set: { ...programValues, updatedAt: new Date() },
      })

    for (const activity of group.activities) {
      const geo = geocodeFromGazetteer(activity.town, activity.state)

      const offeringValues = {
        id: activity.id.replace(/^act_/, "off_"),
        programId: programValues.id,
        season: activity.season,
        seasonYear: activity.season_year,
        registrationOpenDate: asDate(activity.registration_open_date),
        registrationCloseDate: asDate(activity.registration_close_date),
        seasonStartDate: asDate(activity.season_start_date),
        seasonEndDate: asDate(activity.season_end_date),
        registrationUrl: activity.registration_url,
        registrationProvider: activity.registration_provider,
        capacity: activity.capacity,
        waitlistAvailable: activity.waitlist_available,
        statusOverride: activity.status_override,
        registrationFee: activity.registration_fee,
        currency: activity.currency,
        additionalFees: activity.additional_fees,
        tryoutRequired: activity.tryout_required,
        tryoutDetails: activity.tryout_details,
        tryoutDate: asDate(activity.tryout_date),
        town: activity.town,
        state: activity.state,
        zip: activity.zip,
        venueName: activity.venue_name,
        venueAddress: activity.venue_address,
        geocodePrecision: geo ? geo.precision : ("none" as const),
        contactName: activity.contact_name,
        contactEmail: activity.contact_email,
        contactUrl: activity.contact_url,
        // Every listing cites the page it came from — the trust note reads this.
        sourceUrl: activity.source_url,
        sourceType: activity.source_type,
        dateDiscovered: asTimestamp(activity.date_discovered),
        verificationMethod: activity.verification_method,
        dateLastChecked: asTimestamp(activity.date_last_checked),
        verificationStatus: activity.verification_status,
        published: activity.published,
      }

      await db
        .insert(programOfferings)
        .values(offeringValues)
        .onConflictDoUpdate({
          target: programOfferings.id,
          set: { ...offeringValues, updatedAt: new Date() },
        })

      if (geo) {
        await db
          .update(programOfferings)
          .set({ location: sql`${pointLiteral(geo.point.lng, geo.point.lat)}` as never })
          .where(sql`${programOfferings.id} = ${offeringValues.id}`)
      }

      await seedProvenance(activity, offeringValues.id)
      offeringCount += 1
    }
  }

  console.log(`[seed] programs: ${groups.length}, offerings: ${offeringCount}`)
}

/* -------------------------------------------------------------------------- */
/*  Provenance                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Record where each decision-driving field came from.
 *
 * Only fields that actually have a value get a row — provenance for a null is
 * meaningless, and would make the "unverified fields" count wrong. Confidence
 * is derived from the fixture's verification status rather than invented, so
 * admin-reviewed data outranks AI-extracted data in the trust UI immediately.
 */
async function seedProvenance(
  activity: (typeof activities)[number],
  offeringId: string,
) {
  const confidenceByStatus: Record<string, number> = {
    organization_verified: 1,
    admin_reviewed: 0.95,
    community_submitted: 0.7,
    ai_extracted: 0.65,
    unverified: 0.4,
  }

  // Maps verification status (who vouched for the value) to extraction method
  // (how the value was obtained). These are distinct enums — an
  // organization-verified field arrives via an organization_edit.
  const methodByStatus: Record<string, string> = {
    organization_verified: "organization_edit",
    admin_reviewed: "manual_entry",
    community_submitted: "community_submission",
    ai_extracted: "ai_extraction",
    unverified: "ai_extraction",
  }

  const tracked: Array<[string, unknown]> = [
    ["registrationOpenDate", activity.registration_open_date],
    ["registrationCloseDate", activity.registration_close_date],
    ["registrationFee", activity.registration_fee],
    ["registrationUrl", activity.registration_url],
    ["seasonStartDate", activity.season_start_date],
    ["tryoutDate", activity.tryout_date],
  ]

  for (const [field, value] of tracked) {
    if (value === null || value === undefined) continue

    await db
      .insert(fieldProvenance)
      .values({
        id: `prov_${randomUUID()}`,
        entityType: "program_offering",
        entityId: offeringId,
        field,
        value: String(value),
        sourceType: activity.source_type,
        extractionMethod: methodByStatus[activity.verification_status] ?? "ai_extraction",
        confidence: confidenceByStatus[activity.verification_status] ?? 0.5,
        extractionVersion: "seed",
        verificationStatus: activity.verification_status,
        verifiedAt: asTimestamp(activity.date_last_checked),
        verifiedBy:
          activity.verification_status === "admin_reviewed" ? "seed_admin" : null,
      })
      .onConflictDoNothing()
  }
}

/* -------------------------------------------------------------------------- */
/*  Entry point                                                               */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log("[seed] starting")
  await seedSports()
  await seedOrganizations()
  await seedProgramsAndOfferings()

  const [counts] = await db
    .select({
      offerings: sql<number>`count(*)::int`,
      geocoded: sql<number>`count(*) filter (where ${programOfferings.location} is not null)::int`,
      published: sql<number>`count(*) filter (where ${programOfferings.published})::int`,
    })
    .from(programOfferings)

  console.log("[seed] done", counts)
  await pool.end()
}

main().catch(async (error) => {
  console.error("[seed] failed:", error)
  await pool.end()
  process.exit(1)
})
