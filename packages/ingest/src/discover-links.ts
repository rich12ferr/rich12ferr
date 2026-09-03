/**
 * Subpage link discovery.
 *
 * Many organization sites are not themselves a program listing — they are a
 * landing page that points at the real "Youth Programs" or "Available
 * Programs" page one click away (this is exactly what happened with
 * cvtll.org and eastmontpelierrecreation.org/home: both crawled clean but
 * produced zero programs, because the structured data lives on a subpage).
 *
 * This module is pure and has no database or network dependency on purpose,
 * matching `extract.ts` and `entity-resolution.ts`: it takes HTML already in
 * hand and returns candidate links, so it can be unit tested without a
 * fetch and reused by any orchestrator that has raw HTML available.
 */

export type DiscoveredLink = {
  url: string
  linkText: string
  matchedKeywords: string[]
}

/**
 * Keywords checked against both the link text and the URL path. Deliberately
 * broad — a false positive costs one extra crawl of a page that turns out to
 * be irrelevant (queued `pending_review`, never auto-activated); a false
 * negative silently loses an organization's real program page forever.
 */
const PROGRAM_KEYWORDS = [
  "program",
  "programs",
  "youth",
  "registration",
  "register",
  "sport",
  "sports",
  "league",
  "leagues",
  "camp",
  "camps",
  "activities",
  "activity",
  "schedule",
  "season",
  "recreation",
  "rec department",
  "sign up",
  "signup",
  "baseball",
  "softball",
  "soccer",
  "basketball",
  "hockey",
  "lacrosse",
  "swim",
  "tennis",
  "martial arts",
  "gymnastics",
]

/** Paths that are never program content, regardless of keyword matches. */
const EXCLUDED_PATH_PATTERNS = [
  /\/(privacy|terms|tos|accessibility|sitemap|login|signin|logout)(\/|$|\.)/i,
  /\.(pdf|jpg|jpeg|png|gif|svg|css|js|ico|zip|docx?|xlsx?)$/i,
  /^mailto:/i,
  /^tel:/i,
  /^javascript:/i,
  /#/, // in-page anchors carry no new content
]

/**
 * Extracts every `<a href>` on the page with its visible text, resolved to
 * an absolute URL.
 *
 * Uses a regex pass rather than a DOM parser, matching the tradeoff already
 * made in `fetch.ts`'s `htmlToText`: the caller only needs `href` + text,
 * not a correct tree, and this keeps the crawler dependency-free.
 */
export function extractLinks(html: string, baseUrl: string): DiscoveredLink[] {
  const anchorPattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  const seen = new Map<string, DiscoveredLink>()

  let match: RegExpExecArray | null
  while ((match = anchorPattern.exec(html)) !== null) {
    const rawHref = match[1]?.trim()
    const rawText = match[2] ?? ""
    if (!rawHref) continue

    let resolved: URL
    try {
      resolved = new URL(rawHref, baseUrl)
    } catch {
      continue
    }

    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") continue

    // Normalize away the fragment and trailing slash so the homepage link
    // to itself, or two links differing only by `#section`, collapse to one
    // candidate instead of being registered as separate sources.
    resolved.hash = ""
    const url = resolved.toString().replace(/\/$/, "")

    const linkText = stripTags(rawText).trim()
    if (seen.has(url)) continue
    seen.set(url, { url, linkText, matchedKeywords: [] })
  }

  return [...seen.values()]
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Scores one link against the program-page keyword list. Matching is
 * case-insensitive and checks both the visible text and the URL path, since
 * some sites use descriptive link text ("Youth Programs") and others use
 * only a descriptive slug (`/youth-programs`).
 */
export function scoreLink(link: DiscoveredLink): DiscoveredLink {
  const haystack = `${link.linkText} ${link.url}`.toLowerCase()
  const matchedKeywords = PROGRAM_KEYWORDS.filter((keyword) => haystack.includes(keyword))
  return { ...link, matchedKeywords }
}

/**
 * Filters a page's links down to same-origin candidates worth registering
 * as their own crawl source.
 *
 * Same-origin only: a link to an outside registration platform (TeamSnap,
 * SportsEngine) is exactly the case `extract.ts` already asks the model to
 * capture as `registrationUrl` on an existing program, not a new source to
 * independently crawl — following it here would duplicate that data path
 * and start crawling a domain nobody has reviewed permission for.
 */
export function findProgramLinks(
  html: string,
  baseUrl: string,
  options: { limit?: number } = {},
): DiscoveredLink[] {
  const limit = options.limit ?? 10
  const origin = new URL(baseUrl).origin

  return extractLinks(html, baseUrl)
    .filter((link) => {
      try {
        return new URL(link.url).origin === origin
      } catch {
        return false
      }
    })
    .filter((link) => !EXCLUDED_PATH_PATTERNS.some((pattern) => pattern.test(link.url)))
    .map(scoreLink)
    .filter((link) => link.matchedKeywords.length > 0)
    .sort((a, b) => b.matchedKeywords.length - a.matchedKeywords.length)
    .slice(0, limit)
}
