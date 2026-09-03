# OpenPlay Canonical Activity Model — Design & Migration Blueprint

> **Status: design only.** This document defines the target data model and a phased,
> non-breaking path to reach it. It authorizes **no** changes to the live schema
> (`packages/db/src/schema.ts`) or ingestion pipeline before the beta ships. It is the
> executable reference for Phase 1+ work *after* the beta.

## Decisions locked in

- **Design only, no code yet.** Zero live schema or pipeline changes before the Sept 8 beta.
- **API layer deferred.** No `packages/schemas` Zod-DTO layer and no `/api/v1/*` routes until a
  real external consumer (e.g. a mobile client) exists. Server components keep querying the DB
  directly through `packages/core` helpers.
- **Dual-write is the eventual ingestion strategy.** When implementation is approved, extraction
  populates both the existing flat fields *and* the new relational tables, so nothing regresses
  and the canonical model gets real data to validate against.

---

## 1. Current state — grounded in the code

The PRD assumes a legacy flat `Activity` model that needs migrating. **This codebase is not that.**

- `packages/db/src/schema.ts` is already **offering-centric**: `organizations → programs →
  program_offerings`. The PRD's core hierarchy already exists in spirit.
- Deterministic domain logic already lives in **`packages/core/src/domain/`**
  (`eligibility.ts`, `registration.ts`, `program.ts`, `enums.ts`). No new "core" package needed.
- The ingestion contract (`packages/ingest/src/extraction-schema.ts`) is already an all-nullable,
  per-field-confidence Zod schema carrying source quotes — close to the PRD's source-traceability goal.
- **No REST API exists.** Pages are server components that query the DB directly.
- **No `bookmarks` / `alerts` tables exist.** Alert UI is frontend-only today, so the PRD's
  migration / bookmark / alert back-compat sections are **moot — nothing to migrate.**

### Gap analysis vs. the PRD

| Capability | Today | PRD target |
|---|---|---|
| Taxonomy | Flat `sports` table + hardcoded `sport_id` | Hierarchical `activity_types` + `activity_type_synonyms` |
| Eligibility | Hardcoded `min_age`/`max_age`/`min_grade`/`gender` columns | Flexible `eligibility_rules` (criterion/operator/value) + denormalized search cache |
| Audience | Implicit (youth only) | Explicit `audience` (youth/adult/all-ages/family) |
| Registration | Single open/close window per offering | Multiple `registration_periods` per offering |
| Pricing | Single `registration_fee` + free-text `additional_fees` | Multi-row `offering_prices` with `price_type` tiers |
| Sessions | Free-text `practice_schedule`/`game_schedule` | Structured `sessions` with recurrence |
| Facilities | Free-text `venue_name`/`venue_address` | Normalized `facilities` + `locations` |
| Source evidence | `source_url` + per-field quotes inside extraction JSON | First-class, queryable `source_evidence` |

---

## 2. Governing principle: additive, non-breaking

Every new table is **additive and nullable-joined**. Existing flat columns stay and keep working.
Search, listing pages, and the Register CTA keep reading flat fields until each surface is
explicitly cut over. New tables reference existing PKs (`program_offerings.id`, `programs.id`,
`organizations.id`) as FKs. **Nothing drops.**

Flat columns are reframed as **derived search caches**: a background/reconciliation step recomputes
them from the canonical child rows so the two can never silently drift.

---

## 3. Target schema additions (reference DDL sketch)

Illustrative Drizzle definitions for Phase 1. Names/columns are the proposed baseline, not applied.

```ts
// Hierarchical taxonomy — replaces the flat `sports` table over time.
export const activityTypes = pgTable("activity_types", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  parentId: text("parent_id"),              // self-FK; null = top level
  audienceDefault: text("audience_default"), // youth | adult | all_ages | family
  active: boolean("active").notNull().default(true),
})

// Ingestion resolution: "footy" -> soccer, "tae kwon do" -> martial-arts.
export const activityTypeSynonyms = pgTable("activity_type_synonyms", {
  id: text("id").primaryKey(),
  activityTypeId: text("activity_type_id").notNull(),
  term: text("term").notNull(),
  locale: text("locale").default("en"),
})

// Flexible eligibility. Flat min_age/max_age/gender on the offering remain as a
// DERIVED SEARCH CACHE regenerated from these rows.
export const eligibilityRules = pgTable("eligibility_rules", {
  id: text("id").primaryKey(),
  offeringId: text("offering_id").notNull(),
  criterionType: text("criterion_type").notNull(), // age | grade | gender | residency | skill | tryout
  operator: text("operator").notNull(),            // gte | lte | eq | in | between | boolean
  valueNumeric: integer("value_numeric"),
  valueText: text("value_text"),
  valueJson: jsonb("value_json"),
  sourceEvidenceId: text("source_evidence_id"),
})

// Multiple windows per offering; flat registration_open_date/close_date become
// the "soonest/primary period" cache.
export const registrationPeriods = pgTable("registration_periods", {
  id: text("id").primaryKey(),
  offeringId: text("offering_id").notNull(),
  registrationType: text("registration_type").notNull(), // standard | early_bird | late | rolling | in_person
  opensAt: timestamp("opens_at", { withTimezone: true }),
  closesAt: timestamp("closes_at", { withTimezone: true }),
  notes: text("notes"),
  sourceEvidenceId: text("source_evidence_id"),
})

// Tiered pricing; flat registration_fee becomes the "base price" cache.
export const offeringPrices = pgTable("offering_prices", {
  id: text("id").primaryKey(),
  offeringId: text("offering_id").notNull(),
  priceType: text("price_type").notNull(), // base | member | non_resident | sibling | scholarship | dropin
  amount: numeric("amount"),
  currency: text("currency").notNull().default("USD"),
  notes: text("notes"),
  sourceEvidenceId: text("source_evidence_id"),
})

// Structured schedule; free-text practice_schedule/game_schedule kept as fallback.
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  offeringId: text("offering_id").notNull(),
  sessionType: text("session_type").notNull(), // practice | game | class | meet
  dayOfWeek: integer("day_of_week"),            // 0-6, null = irregular
  startTime: text("start_time"),                // "17:30"
  endTime: text("end_time"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  facilityId: text("facility_id"),
})

export const facilities = pgTable("facilities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  locationId: text("location_id"),
})

export const locations = pgTable("locations", {
  id: text("id").primaryKey(),
  address: text("address"),
  town: text("town"),
  state: text("state"),
  zip: text("zip"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  geocodePrecision: text("geocode_precision"),
})

// Promotes extraction JSON quotes/confidence into queryable rows so any canonical
// value can be traced back to the exact source text.
export const sourceEvidence = pgTable("source_evidence", {
  id: text("id").primaryKey(),
  rawDocumentId: text("raw_document_id").notNull(),
  extractionRunId: text("extraction_run_id"),
  fieldName: text("field_name").notNull(),
  quote: text("quote"),
  confidence: doublePrecision("confidence"),
})
```

Plus an additive **`audience`** column on `programs` (`youth | adult | all_ages | family`),
defaulting existing rows to `youth`.

---

## 4. Ingestion dual-write design (later execution)

1. **Extend `extraction-schema.ts` additively**: add optional `registrationPeriods[]`, `prices[]`,
   `eligibilityRules[]`, `sessions[]`, `audience`, `activityTypeSlug`. Keep every current flat field.
2. **Two-phase `reconcileProgram`** (`pipeline.ts`): after upserting the flat offering (unchanged),
   upsert child rows keyed by `offering_id`, then **recompute the flat caches** (`min_age`,
   `registration_open_date`, `registration_fee`) from the canonical children so they never drift.
3. **Evidence mapping**: extraction `sourceQuotes` / `fieldConfidence` map 1:1 into `source_evidence`
   rows — same never-fabricate discipline, no new trust surface.
4. **Taxonomy resolution**: new `resolveActivityType(name)` in entity-resolution, backed by
   `activity_type_synonyms`, superseding `resolveSportSlug` (kept as a thin alias during transition).

---

## 5. Consumer cutover (deferred, post-beta, per surface)

Each read path migrates independently, always behind the derived caches so nothing breaks mid-flight:

1. Detail page (`/activities/[slug]`) reads canonical periods/prices when present, else flat.
2. `registration-status.ts` evaluates multiple `registration_periods` (soonest-open wins).
3. Search filters read the denormalized eligibility cache (no query rewrite initially).
4. Admin editors for the new child tables — last, and only if admin workflow is in scope.

---

## 6. Phasing relative to the Sept 8 beta

| Phase | Scope | Consumer impact |
|---|---|---|
| **Before beta** | **Nothing from this plan.** Beta ships on the current flat model + in-flight data-trust/subpage-discovery work. | none |
| Phase 1 | Additive tables §3 (taxonomy, eligibility, periods, prices, source_evidence); backfill existing rows into canonical children; caches derived. | none |
| Phase 2 | Ingestion dual-write; taxonomy resolution; `audience`. | none |
| Phase 3 | `sessions` + `facilities`/`locations`. | none |
| Phase 4 | Per-surface read cutover + admin editors. | incremental |
| Phase 5 | Deferred `packages/schemas` + `/api/v1/*` — **only if/when** a mobile or partner consumer exists. | new surface |

---

## 7. Out of scope

Confirmed against the PRD's own "Out of Scope" and the beta non-goals: payments / registration
processing, chat / team comms, coach tools, player profiles, social feeds, autonomous AI
publication, multi-adapter scrapers, statewide expansion, native / Expo. None are entangled with
the additive schema, so none create pressure to build early.

---

## 8. Open questions to resolve before Phase 1

1. **Backfill fidelity.** Best-effort parse of existing free-text `additional_fees` /
   `practice_schedule` into structured rows, or leave legacy rows on flat fields only and let
   re-crawls populate canonical children going forward? *Recommendation: the latter — never
   synthesize structure from free text.*
2. **Taxonomy seed ownership.** Adopt the PRD taxonomy verbatim, or curate a Vermont-pilot-sized
   subset first and grow it from real discovered activities?
3. **Retroactive evidence.** Backfill `source_evidence` from stored extraction JSON, or populate
   forward-only from the next crawl?
