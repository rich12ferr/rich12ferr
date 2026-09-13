/**
 * myrec.com program-detail expansion.
 *
 * myrec.com is a hosted platform used by many Vermont rec departments
 * (Norwich, Waterbury, and others). Its activities *listing* page
 * (`/info/activities/default.aspx`) names every program but carries none of
 * the fields a parent actually needs: the season dates, fees, and
 * registration window all live one click away on each program's detail page
 * (`/info/activities/program_details.aspx?ProgramID=N`).
 *
 * The base pipeline only ever extracts the single page it fetched, so a myrec
 * listing on its own produces programs with null dates and fees — this is
 * exactly the gap seen on Norwich, where the listing was the registered
 * source and every offering came back date-less.
 *
 * This module folds each program's detail page into the listing's fetch
 * result *before* extraction, so the model reads one self-contained,
 * fully-populated section per program. The pure helpers (detection, link
 * parsing, content merging) have no network dependency and are unit-testable;
 * `expandMyrecListing` is the thin orchestrator that fetches the detail pages
 * politely and reuses the same `fetchPage` (so each detail URL is itself
 * robots-checked, size-capped, and reduced to text the same way).
 */

import { hashContent } from "./change-detection"
import { fetchPage, type FetchPageOptions, type FetchPageResult } from "./fetch"

/**
 * Hard ceiling on detail pages folded into one listing extraction. A myrec
 * activities page rarely lists more than a couple dozen programs; the cap
 * exists so a pathological or paginated listing cannot fan out into hundreds
 * of fetches (and blow the extractor's output budget) in a single crawl.
 */
export const MAX_MYREC_DETAIL_PAGES = 40

/** Politeness bounds for the gap between successive detail-page fetches. */
const MYREC_MIN_DELAY_MS = 250
const MYREC_MAX_DELAY_MS = 5_000

/** True for any host under myrec.com (e.g. `norwichvt.myrec.com`). */
export function isMyrecUrl(url: string): boolean {
  try {
    return /(^|\.)myrec\.com$/i.test(new URL(url).hostname)
  } catch {
    return false
  }
}

/**
 * True for a myrec *activities listing* page — the one that links out to
 * program detail pages. Detail pages themselves (`program_details.aspx`) are
 * deliberately excluded: expanding one would recurse, and it is already a
 * fully-populated single program the base pipeline handles correctly.
 */
export function isMyrecListingUrl(url: string): boolean {
  if (!isMyrecUrl(url)) return false
  try {
    const path = new URL(url).pathname.toLowerCase()
    return path.endsWith("/activities/default.aspx") || path.endsWith("/activities/")
  } catch {
    return false
  }
}

const DETAIL_LINK_PATTERN = /program_details\.aspx\?[^"'\s<>]*ProgramID=\d+/gi

/**
 * Absolute, de-duplicated program-detail URLs referenced by a listing page,
 * in first-seen order.
 *
 * Each URL is canonicalized to a bare `?ProgramID=N` so that two links to the
 * same program that differ only by extra tracking/query params collapse to a
 * single fetch. Same-origin only, matching the trust boundary the rest of the
 * crawler enforces.
 */
export function findMyrecDetailUrls(
  rawHtml: string,
  baseUrl: string,
  limit = MAX_MYREC_DETAIL_PAGES,
): string[] {
  let origin: string
  try {
    origin = new URL(baseUrl).origin
  } catch {
    return []
  }

  const seen = new Set<string>()
  const urls: string[] = []

  for (const match of rawHtml.matchAll(DETAIL_LINK_PATTERN)) {
    let resolved: URL
    try {
      resolved = new URL(match[0], baseUrl)
    } catch {
      continue
    }
    if (resolved.origin !== origin) continue

    const programId = resolved.searchParams.get("ProgramID")
    if (!programId) continue

    // Canonical form: keep the path, drop everything from the query but the id.
    resolved.search = `?ProgramID=${programId}`
    resolved.hash = ""
    const url = resolved.toString()

    if (seen.has(url)) continue
    seen.add(url)
    urls.push(url)
    if (urls.length >= limit) break
  }

  return urls
}

/**
 * Builds the extraction input for an expanded myrec listing: one clearly
 * delimited section per detail page, each headed by its own source URL so the
 * extractor can attribute the right registration link to the right program.
 *
 * The listing's own text is intentionally omitted. It repeats every program
 * name with no dates or fees, and including it alongside the detail sections
 * only invites the model to emit duplicate, date-less entries (violating
 * extraction rule 7 — "do not merge, do not split"). Each detail page already
 * carries its program's name as a heading, so nothing is lost.
 */
export function mergeMyrecDetailContent(details: { url: string; text: string }[]): string {
  return details
    .map((detail) => `=== PROGRAM DETAIL PAGE ===\nDETAIL URL: ${detail.url}\n\n${detail.text}`)
    .join("\n\n\n")
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** One fetched program-detail page: its final URL, readable text, and markup. */
export type MyrecDetail = { url: string; text: string; rawHtml: string | null }

export type MyrecExpansion = {
  /**
   * The listing fetch result with `content`/`contentHash`/`rawHtml` replaced
   * by the merged version. This is what the pipeline hashes, stores as the raw
   * document, and scans for links — so the hash gate tracks detail-page changes
   * and storage reflects the data actually extracted.
   */
  fetched: FetchPageResult
  /**
   * Per-detail-page sections, for extracting one program page at a time. Empty
   * when the page is not a myrec listing or no detail page could be fetched, in
   * which case the caller falls back to a normal single-page extraction.
   */
  details: MyrecDetail[]
}

/**
 * Folds a myrec listing's program-detail pages into its fetch result.
 *
 * Fetches each `program_details.aspx?ProgramID=N` page the listing links to
 * and replaces the listing's `content`, `contentHash`, and `rawHtml` with the
 * merged version, so everything downstream in the pipeline transparently sees
 * fully-populated programs:
 *
 *   - the **content hash** now covers the detail pages, so a date first posted
 *     on a detail page (while the listing itself is unchanged) still trips the
 *     hash gate and triggers re-extraction — the whole point of this feature;
 *   - **extraction** reads one program section per detail page, each with its
 *     dates, fees, and registration link;
 *   - the merged **rawHtml** carries each detail page's `<a href>`s, so the
 *     `LINKS ON THIS PAGE` list handed to the model contains the real
 *     "Register" targets to copy verbatim.
 *
 * Returns the input `fetched` unchanged with an empty `details` list (a no-op)
 * when the page is not a myrec listing, has no usable body, or links to no
 * detail pages — so the caller can apply it unconditionally and fall back to a
 * normal single-page extraction. Detail pages are fetched sequentially with the
 * listing's robots-declared crawl delay (bounded), and each is robots-checked
 * by `fetchPage`; any that is disallowed or empty is skipped rather than
 * failing the crawl.
 */
export async function expandMyrecListing(
  listingUrl: string,
  fetched: FetchPageResult,
  options: FetchPageOptions = {},
): Promise<MyrecExpansion> {
  if (!isMyrecListingUrl(listingUrl) || !fetched.rawHtml || !fetched.content) {
    return { fetched, details: [] }
  }

  const detailUrls = findMyrecDetailUrls(fetched.rawHtml, fetched.finalUrl)
  if (detailUrls.length === 0) return { fetched, details: [] }

  const delayMs = Math.min(
    Math.max((fetched.crawlDelaySeconds ?? 0) * 1_000, MYREC_MIN_DELAY_MS),
    MYREC_MAX_DELAY_MS,
  )

  const details: MyrecDetail[] = []

  for (const [i, detailUrl] of detailUrls.entries()) {
    if (i > 0) await sleep(delayMs)

    const page = await fetchPage(detailUrl, options)

    if (!page.robotsAllowed) {
      console.log(`[v0] [myrec] detail page disallowed by robots, skipping: ${detailUrl}`)
      continue
    }
    if (!page.content) {
      console.log(
        `[v0] [myrec] detail page had no readable content (${page.fetchError ?? "unknown"}): ${detailUrl}`,
      )
      continue
    }

    details.push({ url: page.finalUrl, text: page.content, rawHtml: page.rawHtml })
  }

  if (details.length === 0) return { fetched, details: [] }

  // The merged text backs the hash gate and the stored raw document: it must
  // cover every detail page so a date first posted on any one of them trips the
  // gate even while the listing page itself is byte-for-byte unchanged.
  const mergedContent = mergeMyrecDetailContent(details)
  const mergedRawHtml = [fetched.rawHtml, ...details.map((d) => d.rawHtml ?? "")].join("\n")

  console.log(
    `[v0] [myrec] expanded ${listingUrl}: folded in ${details.length}/${detailUrls.length} detail page(s)`,
  )

  return {
    fetched: {
      ...fetched,
      content: mergedContent,
      contentHash: hashContent(mergedContent),
      rawHtml: mergedRawHtml,
    },
    details,
  }
}
