# Discovery: precise date matching for camps

Status: discovery only (PRD §8). No matching engine ships in this release.
Data profile: `packages/ingest/scripts/camp-discovery-stats.ts` (read-only), run 2026-11-04 against production.

## Current behavior

- The "When" control filters by **camp period** (summer, fall, winter, February, April break). `campPeriodOf()` in `apps/web/lib/camp-format.ts` uses the stored `camp_period` and falls back to the start month.
- Parents cannot choose a specific week or date range. A camp counts as "summer" whether it runs one week in June or eight weeks in total.
- Sessions with no dates show under "Dates not posted yet" and are never hidden by a period filter based on dates they don't have.
- Ages are checked against `programs.min_age/max_age` only. Grade bounds show on cards but aren't converted to ages. Age is never checked against a session's actual dates.

### What the data supports today (55 active camp offerings)

| Field | Populated | Notes |
| --- | --- | --- |
| Start and end date | 25 (45%) | 30 have no start date; none have a start without an end |
| Session of 7 days or fewer | 18 | Usually Mon–Fri weeks |
| Session longer than 7 days | 7 | e.g. Camp Billings 2-week sessions; Manchester "Summer Camp 2026" stores Jun 22–Aug 14 as one offering, though it's enrolled by the week |
| `sessions` jsonb (sub-weeks) | 0 | The column exists but is unused |
| Daily start and end times | 10 | `day_length` on 14 |
| Before/after care | 2 | Free text in `extended_care_details` |
| Age bounds | 25 | Grade bounds on 10; some have neither |
| `eligibility_rules` jsonb | 0 | Unused |
| Offering `timezone` | 0 | All Vermont, so the effect is low today |
| Overnight (`camp_stay`) | 5 | Hours don't apply |

Examples from actual records:
- *Battenkill Adventurers Summer Camp 2026* (Manchester): one offering, Jun 22–Aug 14, ages 5–8, no hours. Strict "covers my week" matching would say yes for every summer week, even though parents enroll week by week and some weeks may be closed or have holidays.
- *VINS February Vacation Camps*: Feb 16–25, grades 1–4, 9:00–15:30. The range spans two school weeks and probably excludes the weekend between them; we can't tell which days actually run.
- *Redhawk Soccer Camp* (Shelburne): Jul 6–10, "up to grade 8", no lower bound, no hours.
- *Norwich Recreation Soccer Camp*: summer, no dates at all.

## Options

### Minimal: "Runs during these dates" (overlap)

- Add an optional date range (from–to, or a "week of" picker) next to the period control, stored in the URL as `from`/`to`.
- **Semantics:** a dated session matches if `start <= to && end >= from`. Undated sessions stay in the existing "Dates not posted yet" section and are never claimed as matches.
- **Parent-facing wording:** "Camps running during Jul 6–10". Card hint: "Runs Jun 22–Aug 14. Check which weeks are offered."
- **Data:** none required. Optional: backfill dates on the 30 undated offerings as part of the cleanup backlog.
- **Tests:** overlap boundaries (same-day start/end, inclusive end), undated sessions excluded from matches but still listed, combined with the period and age filters, grouping counts after filtering.

### Complete: "Covers all my dates" plus weekly enrollment

- Represent enrollable units explicitly: use `program_offerings.sessions` as `[{start, end, days: ["mon".."fri"], excluded: ["2027-07-05"], start_time, end_time, price, status}]`, or promote each week to its own offering (the Camp Billings pattern).
- **Semantics:** two modes.
  - *Overlaps*: any enrollable unit intersects the range.
  - *Covers*: every requested weekday in the range is a run day of some unit, minus excluded days.
  - For multiple selected weeks, each week must be covered (or "covers at least N of M weeks").
- **Age on date:** eligible if the child's age on the session start (optionally a provider cutoff date) is within bounds. This needs a birth month/year input. Grades need a school-year mapping (grade = school year - birth year - 5, adjusted by cutoff).
- **Hours:** an optional "needs care from 8:00 to 17:30" filter, matched against daily times plus extended care. Unknown hours give "Hours not posted", never a match.
- **Wording:** "Covers all of Jul 6–10", "Covers 3 of 4 selected weeks", "Closed Jul 4", "Hours not posted".
- **Data changes:** a structured schema for `sessions`, an `excluded_dates` field, structured extended-care times (replacing free text), and an optional `age_cutoff_date`. Backfill from provider pages for the roughly 25 dated offerings; the extraction pipeline must emit the new shape.
- **Provider maintenance:** weekly openings and closures change mid-season, so status per unit is needed (otherwise "covers" can be wrong when a week fills up).

### Edge cases

Holiday weeks (Jul 4, Thanksgiving), half-days, camps running across a weekend, overnight sessions (hours don't apply), multi-location camps whose weeks differ by site, sessions that start before and end after the range, a child's birthday falling mid-session, and records with dates but no status.

## Effort (relative, assumes the current team and stack)

| Area | Minimal | Complete |
| --- | --- | --- |
| Frontend | 1–2 days (date picker, URL state, chip, wording) | 4–6 days (modes, multi-week, age-on-date input, hours) |
| Backend | 0.5–1 day (overlap filter in `camp-results.ts`) | 3–5 days (schema, matcher, eligibility calc) |
| Data cleanup | Optional, 1–2 days of date backfill | 4–8 days (structured weeks and excluded days for every dated camp, plus extractor changes) |
| QA | 1 day | 3–4 days |

Confidence: high for the minimal option, medium-low for the complete option, because it depends on how many providers publish week-level detail. Risks: false "covers" claims (a trust issue), and parents entering a birth date counts as collecting personal data, so keep it month and year, client-side only.

## Recommendation

Ship the **minimal overlap filter** next, labeled "runs during", together with backfilling the 30 undated offerings. Revisit "covers" once at least half of dated camps carry week-level structure.

Acceptance criteria for the follow-up:
- A date range in the URL filters dated sessions by inclusive overlap. Counts, sort and grouping reflect the filtered set.
- Undated sessions are never presented as matching. They stay in "Dates not posted yet".
- Long single-range offerings show a "Check which weeks are offered" hint.
- Back, reload and shared links keep the range.

Product decisions needed first:
1. Should multi-week ranges stored as one offering (Manchester) be split into weekly offerings?
2. Is a child's birth month/year acceptable as a client-side-only input?
3. Should hours and extended care be part of date matching, or a separate filter?
