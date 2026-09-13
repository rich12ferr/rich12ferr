/**
 * CivicRec (rec1.com) catalog expansion.
 *
 * CivicRec is a hosted registration platform used by several Vermont rec
 * departments (Burlington, South Burlington, and others). Its public catalog
 * (`secure.rec1.com/{state}/{slug}/catalog`) is a client-rendered app: the
 * server response is an empty shell, and every program name, date, fee, and
 * age range is loaded afterward through a small JSON API. A plain HTML fetch
 * — what the rest of the crawler does — sees none of it, which is exactly why
 * Burlington and South Burlington's catalog sources have always come back
 * empty even though the data is public and unauthenticated.
 *
 * This module drives that JSON API directly: open a cart session, list every
 * catalog tab, walk each tab's registerable ("activity"-type — the other two
 * group types are facility and equipment rentals, which are not programs)
 * groups deduplicated by id (the same group is often listed under several
 * tabs — e.g. both "All Activities" and "Youth Programs"), and fetch each
 * group's session-level detail (exact dates, ages, price, location, times).
 *
 * Unlike myrec's detail pages (`myrec.ts`), none of this has its own stable
 * URL a browser could load, so there is nothing here for `fetchPage` to
 * retrieve. Every field this module can read outright (dates, price, ages,
 * location, times) is resolved deterministically from the JSON — no model
 * call, no guessing. The one thing the API does not state anywhere is the
 * sport: "Fall Soccer-Calahan" and "Wheel Throwing" are both `type: "activity"`
 * groups with identical shape, and the existing sport matcher (`matchSports`,
 * built for expanding an already-known sport term into synonyms) is unreliable
 * as a classifier over raw catalog titles. So the deterministic facts are
 * written into a short, unambiguous text block per group and handed to the
 * same LLM extractor every other source uses, whose only real job here is
 * naming the sport (or leaving it null for "Wheel Throwing") — see
 * `extractCivicRecPrograms` in pipeline.ts, which drops any program the model
 * did not recognize as a sport before it reaches the review queue.
 */

import { hashContent } from "./change-detection"
import { checkRobots, USER_AGENT, type FetchPageResult } from "./fetch"

/** Hard ceiling on catalog tabs walked in one crawl. */
export const MAX_CIVICREC_TABS = 40

/** Hard ceiling on distinct activity groups expanded in one crawl. */
export const MAX_CIVICREC_GROUPS = 200

/** Politeness bounds between successive `getActivitySessions` calls. */
const CIVICREC_MIN_DELAY_MS = 200
const CIVICREC_MAX_DELAY_MS = 2_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/* -------------------------------------------------------------------------- */
/*  URL detection                                                             */
/* -------------------------------------------------------------------------- */

/** True for any CivicRec-hosted catalog URL (e.g. secure.rec1.com/VT/burlington-vt/catalog). */
export function isCivicRecCatalogUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      /(^|\.)rec1\.com$/i.test(parsed.hostname) && /\/catalog\/?($|[?#])/i.test(parsed.pathname)
    )
  } catch {
    return false
  }
}

/* -------------------------------------------------------------------------- */
/*  Minimal cookie jar                                                        */
/* -------------------------------------------------------------------------- */

/**
 * CivicRec's catalog identifies a cart by session cookie, and Node's `fetch`
 * does not carry cookies across requests on its own. This is a deliberately
 * minimal jar — no path/domain/expiry scoping — because every request in a
 * session targets the same origin and path, so that machinery would be dead
 * weight here.
 */
class CookieJar {
  private readonly cookies = new Map<string, string>()

  store(response: Response): void {
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0] ?? ""
      const separator = pair.indexOf("=")
      if (separator === -1) continue
      this.cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim())
    }
  }

  header(): string {
    return [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ")
  }
}

async function civicRecFetch(
  jar: CookieJar,
  url: string,
  options: { json?: boolean; timeoutMs?: number } = {},
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        cookie: jar.header(),
        ...(options.json ? { "x-requested-with": "XMLHttpRequest" } : {}),
      },
    })
    jar.store(response)
    return response
  } finally {
    clearTimeout(timer)
  }
}

async function civicRecGetJson(jar: CookieJar, url: string): Promise<any | null> {
  try {
    const response = await civicRecFetch(jar, url, { json: true })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

/* -------------------------------------------------------------------------- */
/*  Catalog API shapes (only the fields this module reads)                    */
/* -------------------------------------------------------------------------- */

type CatalogTab = { id: number | string; label: string }
type CatalogGroup = { id: number | string; name: string; type: string }
type CatalogSection = { groups?: CatalogGroup[] }
type CatalogItemsResponse = { sections?: CatalogSection[] }
type CatalogTabsResponse = { tabs?: CatalogTab[] }

type SessionFeature = { name: string; value: string }
type SessionItem = {
  text: string
  regStart: string | null
  price: number | null
  canceled?: boolean
  basicInfo?: string[]
  features?: SessionFeature[]
}
type SessionsResponse = { items?: SessionItem[] }

function getFeature(item: SessionItem, name: string): string | null {
  return item.features?.find((feature) => feature.name === name)?.value ?? null
}

/* -------------------------------------------------------------------------- */
/*  Deterministic formatting of API fields                                    */
/* -------------------------------------------------------------------------- */

/** "5-7" -> "Ages 5-7", "18/up" -> "Ages 18 and up", "All Ages" -> "All ages". */
function formatAges(ageGender: string | null): string | null {
  if (!ageGender) return null
  const range = ageGender.match(/^(\d+)\s*-\s*(\d+)$/)
  if (range) return `Ages ${range[1]}-${range[2]}`
  const upFrom = ageGender.match(/^(\d+)\s*\/?\s*up$/i)
  if (upFrom) return `Ages ${upFrom[1]} and up`
  if (/^all ages$/i.test(ageGender)) return "All ages"
  return `Ages: ${ageGender}`
}

/**
 * Resolves a bare "MM/DD-MM/DD" range (no year, as CivicRec's `dates` feature
 * states it) into full dates, anchored to a reliable year we already have —
 * `regStart`, a fully-qualified MM/DD/YYYY the API states outright.
 *
 * A season almost always runs within the same year registration opened. The
 * one exception (registration opens in the fall for a season starting the
 * following winter/spring) is caught by the >6-month-earlier heuristic below;
 * anything genuinely ambiguous is deliberately left alone by returning null
 * rather than risk asserting a wrong year to the model as if it were fact.
 */
function resolveDatesWithYear(
  datesFeature: string | null,
  anchorDate: string | null,
): { start: string; end: string } | null {
  if (!datesFeature || !anchorDate) return null
  const range = datesFeature.match(/^(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})$/)
  const anchor = anchorDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!range || !anchor) return null

  const [, startMonth = "", startDay = "", endMonth = "", endDay = ""] = range
  const anchorMonth = Number(anchor[1])
  const anchorYear = Number(anchor[3])

  // Anchor the start month to registration's year, allowing for the one case
  // registration typically precedes the season across a calendar year (e.g.
  // opens in the fall for a season starting the following winter).
  const startDiff = anchorMonth - Number(startMonth)
  const startYear = startDiff > 6 ? anchorYear + 1 : startDiff < -6 ? anchorYear - 1 : anchorYear

  // The end month is resolved relative to the *start* month, not the
  // registration anchor: a season's end can never be numerically earlier than
  // its start unless the range itself crosses a calendar year (e.g.
  // "12/12-01/30" for a Dec-to-Jan season) — a season year-boundary is a
  // separate fact from when registration opened.
  const endYear = Number(endMonth) < Number(startMonth) ? startYear + 1 : startYear

  const pad = (value: string) => value.padStart(2, "0")
  return {
    start: `${pad(startMonth)}/${pad(startDay)}/${startYear}`,
    end: `${pad(endMonth)}/${pad(endDay)}/${endYear}`,
  }
}

function formatPrice(price: number | null): string | null {
  if (price === null || price === undefined) return null
  return `$${price.toFixed(2)}`
}

/**
 * Renders one session (a group's age bracket, day/time slot, etc.) as
 * labeled plain-text lines. Every line here is either a verbatim API value
 * or a deterministic transformation of one — nothing is inferred.
 */
function renderSession(item: SessionItem): string {
  const lines = [`SESSION: ${item.text}`]

  const location = getFeature(item, "location")
  if (location && !/tbd/i.test(location)) lines.push(`Location: ${location}`)

  const ages = formatAges(getFeature(item, "ageGender"))
  if (ages) lines.push(ages)

  const days = getFeature(item, "days")
  if (days && !/^tbd$/i.test(days)) lines.push(`Days: ${days}`)

  const resolvedDates = resolveDatesWithYear(getFeature(item, "dates"), item.regStart)
  if (resolvedDates) lines.push(`Season dates: ${resolvedDates.start} to ${resolvedDates.end}`)

  const times = getFeature(item, "times")
  if (times && !/time tbd/i.test(times)) lines.push(`Times: ${times}`)

  if (item.regStart) lines.push(`Registration opens: ${item.regStart}`)
  // The close date only ever appears embedded in this free-text sentence
  // (formats vary: "Jul 16 10a-Aug 27 11:59p", "Opened Feb 10 - 10:00 AM",
  // "Dec 1 10a-Nov 30 11:59p"). Rather than regex-guess a close date out of
  // it, the verbatim sentence is handed to the extractor, anchored by the
  // exact opening year right above it — the same task it already does for
  // ordinary municipal pages, and it already returns null per its own rules
  // when a close date genuinely is not stated.
  const registrationText = item.basicInfo?.find((line) => /^registration:/i.test(line))
  if (registrationText) lines.push(`Registration info (as listed on the catalog): ${registrationText}`)

  const price = formatPrice(item.price)
  if (price) lines.push(`Price: ${price}`)
  else if (item.price === 0) lines.push("Price: Free")

  return lines.join("\n")
}

/* -------------------------------------------------------------------------- */
/*  Session orchestration                                                    */
/* -------------------------------------------------------------------------- */

export type CivicRecDetail = {
  /** Synthetic per-group identifier, for prompt context only — not a real page. */
  url: string
  text: string
  /** The one real, working link: the catalog's own base URL. */
  registrationUrl: string
}

async function createCheckoutKey(jar: CookieJar, catalogUrl: string): Promise<string | null> {
  await civicRecFetch(jar, catalogUrl)
  const cart = await civicRecGetJson(jar, `${catalogUrl}/createCart/0`)
  return cart?.checkoutData?.key ?? null
}

async function fetchTabs(
  jar: CookieJar,
  catalogUrl: string,
  checkoutKey: string,
): Promise<CatalogTab[]> {
  const response: CatalogTabsResponse | null = await civicRecGetJson(
    jar,
    `${catalogUrl}/getTabsFiltersItemsCounts/${checkoutKey}`,
  )
  return (response?.tabs ?? []).slice(0, MAX_CIVICREC_TABS)
}

/** Every `type: "activity"` group across all tabs, deduplicated by group id. */
async function collectActivityGroups(
  jar: CookieJar,
  catalogUrl: string,
  checkoutKey: string,
  tabs: CatalogTab[],
): Promise<{ tabId: CatalogTab["id"]; groupId: CatalogGroup["id"]; name: string }[]> {
  const byId = new Map<string, { tabId: CatalogTab["id"]; groupId: CatalogGroup["id"]; name: string }>()

  for (const tab of tabs) {
    const response: CatalogItemsResponse | null = await civicRecGetJson(
      jar,
      `${catalogUrl}/getItems/${checkoutKey}/${tab.id}`,
    )
    for (const section of response?.sections ?? []) {
      for (const group of section.groups ?? []) {
        if (group.type !== "activity") continue
        const key = String(group.id)
        if (!byId.has(key)) byId.set(key, { tabId: tab.id, groupId: group.id, name: group.name })
      }
    }
    if (byId.size >= MAX_CIVICREC_GROUPS) break
  }

  return [...byId.values()].slice(0, MAX_CIVICREC_GROUPS)
}

/**
 * Runs the full CivicRec catalog session and returns one text block per
 * registerable program group.
 *
 * A no-op (empty array) for anything other than a CivicRec catalog URL, or
 * when the session cannot be established (cart creation failed, no tabs) —
 * the caller falls back to treating the source as a normal single-page fetch.
 */
export async function fetchCivicRecCatalog(catalogUrl: string): Promise<CivicRecDetail[]> {
  if (!isCivicRecCatalogUrl(catalogUrl)) return []

  const jar = new CookieJar()
  const checkoutKey = await createCheckoutKey(jar, catalogUrl)
  if (!checkoutKey) return []

  const tabs = await fetchTabs(jar, catalogUrl, checkoutKey)
  if (tabs.length === 0) return []

  const groups = await collectActivityGroups(jar, catalogUrl, checkoutKey, tabs)
  if (groups.length === 0) return []

  const details: CivicRecDetail[] = []

  for (const [index, group] of groups.entries()) {
    if (index > 0) await sleep(Math.min(CIVICREC_MAX_DELAY_MS, Math.max(CIVICREC_MIN_DELAY_MS, 300)))

    const sessions: SessionsResponse | null = await civicRecGetJson(
      jar,
      `${catalogUrl}/getActivitySessions/${checkoutKey}/${group.tabId}/${group.groupId}`,
    )
    const items = (sessions?.items ?? []).filter((item) => !item.canceled)
    if (items.length === 0) continue

    const text = [
      `PROGRAM NAME: ${group.name}`,
      "REGISTRATION PLATFORM: CivicRec (secure.rec1.com)",
      "",
      items.map(renderSession).join("\n\n"),
    ].join("\n")

    details.push({
      url: `${catalogUrl}#group-${group.groupId}`,
      text,
      registrationUrl: catalogUrl,
    })
  }

  return details
}

/**
 * Folds a CivicRec catalog's programs into a fetch result, mirroring
 * `expandMyrecListing`'s contract so the pipeline can treat both platform
 * expansions the same way: the merged content backs the hash gate and the
 * stored raw document, and `details` drives one-extraction-per-program.
 *
 * The initial `fetchPage(source.url, ...)` call the pipeline already made
 * only sees the empty SPA shell, so `fetched.content` here is replaced
 * outright rather than appended to.
 */
export async function expandCivicRecCatalog(
  catalogUrl: string,
  fetched: FetchPageResult,
  options: { respectRobots?: boolean; timeoutMs?: number } = {},
): Promise<{ fetched: FetchPageResult; details: CivicRecDetail[] }> {
  if (!isCivicRecCatalogUrl(catalogUrl)) return { fetched, details: [] }

  if (options.respectRobots ?? true) {
    const decision = await checkRobots(`${catalogUrl}/getItems/0/0`, {
      timeoutMs: options.timeoutMs,
    })
    if (!decision.allowed) {
      console.log(`[v0] [civicrec] catalog API disallowed by robots, skipping: ${catalogUrl}`)
      return { fetched, details: [] }
    }
  }

  const details = await fetchCivicRecCatalog(catalogUrl)
  if (details.length === 0) return { fetched, details: [] }

  const mergedContent = details.map((detail) => `=== PROGRAM ===\n${detail.text}`).join("\n\n\n")

  console.log(`[v0] [civicrec] expanded ${catalogUrl}: ${details.length} program(s) with sessions`)

  return {
    fetched: {
      ...fetched,
      content: mergedContent,
      contentHash: hashContent(mergedContent),
    },
    details,
  }
}
