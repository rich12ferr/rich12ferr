# Camp finder PRD: completion report

Branch: `v0/camp-finder-prd`. Not deployed: deployment follows the normal PR and release process.

## Requirements

| Req | Status | Where |
| --- | --- | --- |
| R1 Consistent status and price | Done | `lib/camp-results.ts` is the single source for card, session rows and detail. The "email me when registration opens" form is hidden on the detail page when registration is confirmed open. Camp Billings data corrected (sessions 2–4 are $2,700). |
| R2 Past seasons separated | Done | Ended sessions are excluded by default and shown behind "Show past sessions", labeled as past. Detail URLs are unchanged. |
| R3 Search first | Done | `components/camp-search-bar.tsx`: location (with a labeled Montpelier default), "Use my location" on request only, period and age. The newsletter is below the results. The mobile sheet has a "Show results" confirm button. |
| R4 Counts and sorting | Done | "N camps · M sessions" summary, sort menu (`best`, `start`, `distance`, `price`) in the URL, and filtering done before grouping. |
| R5 Standard card | Done | `components/camp-result-card.tsx`: dates, ages, location, hours, price ("From $X per session"), status, and an "N of M sessions open" count. Incomplete records say "Not posted". |
| R6 Session grouping | Done | Sessions of the same camp (same org and location, title without the session marker) are grouped. "View N sessions" goes to the `#sessions` list. |
| R7 Detail actions and return | Done | Session rows with their own status and price. The primary action is per session and labeled as happening on the organizer's site. "Back to camp results" keeps the filters. "Updated" wording replaces "Last checked". |
| §8 Date matching discovery | Delivered | `docs/camp-finder/date-matching-discovery.md` |
| §9 Photos discovery | Delivered | `docs/camp-finder/camp-photos-discovery.md` |
| §12 Measurement | Partial | `lib/analytics.ts` adds `camp_search_changed`, which the search bar fires with no personal data. Sort change, chip removal and "show past" aren't instrumented yet. |

## Validation

- `tsc --noEmit` passes for `apps/web`.
- `packages/ingest` reports only pre-existing strict-index errors in `packages/core/src/domain/camp.ts`, which this branch didn't change. The new and edited ingest scripts have no type errors.
- Browser checks against production data:
  - Desktop 1184×656: `/camps?q=billings` shows 1 camp with 4 sessions, "From $2,400 per session" and "4 of 4 sessions open".
  - Detail page: the sessions list shows $2,400 and $2,700 rows, and "Back to camp results" keeps the query.
  - Phone 390×844: `/camps` and the Camp Billings detail page have no horizontal scroll, search comes before the newsletter, and the sticky register CTA doesn't cover the summary.
- Screenshots were taken during verification (camps-billings, billings-detail, camps-phone, billings-phone).
- No automated test suite covers these routes. Recommended next step: unit tests for `lib/camp-results.ts` grouping, past-session and price rules using the PRD §11 fixture list.

## Data changes (applied to production)

- `packages/ingest/scripts/fix-camp-data.ts`: by default it does a dry run that prints every planned change. It writes only with `--apply`. For the four Camp Billings 2027 sessions it set `registration_fee` from each session's own stored pricing ($2,400 for session 1, $2,700 for sessions 2–4), set `status_override` to `open`, and cleared `additional_fees`. It also promotes a lone structured price into an empty `registration_fee` on other offerings.
- **Rollback:** the previous `registration_fee` and `status_override` were null. Set them back to null on the affected offerings. The previous `additional_fees` text wasn't logged, so it can't be restored exactly. No schema migration was made.

## Open data exceptions

Run `packages/ingest/scripts/camp-data-audit.ts` for the current list. As of this report:
- 30 of 55 active camp offerings have no dates, so they show under "Dates not posted yet".
- 30 have no age bounds, and some only have grades.
- Hours are posted for only 10.
- Manchester summer camps are stored as single 8-week ranges, though they're enrolled week by week.
- Other descriptions state prices or open registration without structured fields. These are listed by the audit script for review, not auto-fixed.

## Remaining limitations

- Grouping is heuristic (title, org and location). Camps whose session titles don't follow a "Session N" or "Week N" pattern stay separate.
- There's no specific-week date filter; see the date matching discovery note.
- No photos; see the photos discovery note.
