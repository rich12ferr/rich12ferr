/**
 * Polite fetching for the crawler.
 *
 * Two things here are deliberate rather than incidental:
 *
 * 1. robots.txt is consulted per origin and the answer is recorded on the
 *    source row, because a municipal rec department's goodwill is the real
 *    asset behind this directory. A crawler that ignores robots.txt gets
 *    blocked, and a blocked crawler makes the whole product worthless.
 *
 * 2. The content hash is taken over *extracted text*, never raw HTML. Most
 *    public sites embed a CSRF token, build ID, or ad slot that changes on
 *    every request, so hashing raw markup would report "changed" on every
 *    crawl and flood the review queue with noise. Hashing the readable text
 *    means "changed" corresponds to something a parent could actually see.
 */

import { hashContent } from "./change-detection"

/** Identifies the crawler so an operator can contact us or block us. */
export const USER_AGENT =
  "OpenPlayBot/0.1 (+https://openplay.example/about/crawler; youth sports directory)"

const DEFAULT_TIMEOUT_MS = 15_000

/** Hard cap on downloaded bytes; a rec department page is never this large. */
const MAX_BYTES = 5_000_000

/* -------------------------------------------------------------------------- */
/*  robots.txt                                                                */
/* -------------------------------------------------------------------------- */

export type RobotsRules = {
  /** Longest-match disallow prefixes that apply to us. */
  disallow: string[]
  allow: string[]
  crawlDelaySeconds: number | null
}

/**
 * Parses only the groups that apply to us: our own token and `*`.
 *
 * A specific `User-agent: OpenPlayBot` group takes precedence over `*` per the
 * robots convention, so we track them separately and prefer the specific one.
 */
export function parseRobots(text: string, userAgentToken = "openplaybot"): RobotsRules {
  const wildcard: RobotsRules = { disallow: [], allow: [], crawlDelaySeconds: null }
  const specific: RobotsRules = { disallow: [], allow: [], crawlDelaySeconds: null }

  // A blank User-agent line ends the current group.
  let active: RobotsRules[] = []

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim()
    if (!line) continue

    const separator = line.indexOf(":")
    if (separator === -1) continue

    const field = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()

    if (field === "user-agent") {
      const agent = value.toLowerCase()
      if (agent === "*") active = [wildcard]
      else if (agent.includes(userAgentToken)) active = [specific]
      else active = []
      continue
    }

    if (active.length === 0) continue

    for (const group of active) {
      if (field === "disallow" && value) group.disallow.push(value)
      else if (field === "allow" && value) group.allow.push(value)
      else if (field === "crawl-delay") {
        const parsed = Number.parseFloat(value)
        if (Number.isFinite(parsed)) group.crawlDelaySeconds = parsed
      }
    }
  }

  const hasSpecific =
    specific.disallow.length > 0 ||
    specific.allow.length > 0 ||
    specific.crawlDelaySeconds !== null

  return hasSpecific ? specific : wildcard
}

/**
 * Longest-match rule: the most specific matching directive wins, and an equally
 * specific Allow beats a Disallow.
 */
export function isPathAllowed(rules: RobotsRules, pathname: string): boolean {
  const matchLength = (patterns: string[]) =>
    patterns
      .filter((pattern) => pathname.startsWith(pattern))
      .reduce((longest, pattern) => Math.max(longest, pattern.length), -1)

  const disallowed = matchLength(rules.disallow)
  if (disallowed === -1) return true

  // "Disallow: /" blocks everything unless a longer Allow matches.
  return matchLength(rules.allow) >= disallowed
}

export type RobotsDecision = {
  allowed: boolean
  crawlDelaySeconds: number | null
  /** Why we concluded what we did — stored in `sources.permission_note`. */
  note: string
}

const robotsCache = new Map<string, Promise<RobotsRules | null>>()

async function loadRobots(origin: string, timeoutMs: number): Promise<RobotsRules | null> {
  const cached = robotsCache.get(origin)
  if (cached) return cached

  const pending = (async () => {
    try {
      const response = await fetchWithTimeout(`${origin}/robots.txt`, timeoutMs)
      // 4xx means no robots file, which per convention permits crawling.
      if (response.status >= 400) return null
      return parseRobots(await response.text())
    } catch {
      return null
    }
  })()

  robotsCache.set(origin, pending)
  return pending
}

/** Clears the per-origin robots cache. Exposed for tests and long-lived workers. */
export function clearRobotsCache(): void {
  robotsCache.clear()
}

/**
 * Decides whether we may fetch a URL.
 *
 * A robots.txt that cannot be retrieved is treated as permission granted, which
 * matches the convention every major crawler follows — but the note records the
 * uncertainty so a human can see it was an assumption, not a confirmation.
 */
export async function checkRobots(
  url: string,
  options: { timeoutMs?: number } = {},
): Promise<RobotsDecision> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { allowed: false, crawlDelaySeconds: null, note: "Malformed URL; not fetched." }
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      allowed: false,
      crawlDelaySeconds: null,
      note: `Unsupported protocol ${parsed.protocol}; only http and https are crawled.`,
    }
  }

  const rules = await loadRobots(parsed.origin, options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  if (!rules) {
    return {
      allowed: true,
      crawlDelaySeconds: null,
      note: "No reachable robots.txt; treated as allowed by convention.",
    }
  }

  const allowed = isPathAllowed(rules, parsed.pathname)
  return {
    allowed,
    crawlDelaySeconds: rules.crawlDelaySeconds,
    note: allowed
      ? "Allowed by robots.txt."
      : `Disallowed by robots.txt for ${parsed.pathname}.`,
  }
}

/* -------------------------------------------------------------------------- */
/*  HTML to text                                                              */
/* -------------------------------------------------------------------------- */

/** Elements whose contents are never useful to the extractor. */
const STRIPPED_ELEMENTS = ["script", "style", "noscript", "svg", "template", "iframe"]

/**
 * Reduces HTML to readable text.
 *
 * This is intentionally a regex pass rather than a DOM parse: the output feeds
 * an LLM and a hash, neither of which needs a correct tree, and avoiding a
 * parser dependency keeps the crawler cheap to run. Block-level tags become
 * newlines so that list items and table rows do not run together into one
 * unreadable line, which measurably degrades extraction quality.
 */
export function htmlToText(html: string): string {
  let text = html

  for (const element of STRIPPED_ELEMENTS) {
    text = text.replace(
      new RegExp(`<${element}\\b[^>]*>[\\s\\S]*?</${element}>`, "gi"),
      " ",
    )
    // Also drop self-closing or unclosed occurrences.
    text = text.replace(new RegExp(`<${element}\\b[^>]*/?>`, "gi"), " ")
  }

  text = text.replace(/<!--[\s\S]*?-->/g, " ")

  // Preserve document structure that carries meaning for dates and fees.
  text = text.replace(/<\/(p|div|section|article|header|footer|tr|li|h[1-6])>/gi, "\n")
  text = text.replace(/<br\b[^>]*>/gi, "\n")
  text = text.replace(/<\/(td|th)>/gi, "\t")

  text = text.replace(/<[^>]+>/g, " ")
  text = decodeEntities(text)

  // Collapse runs of spaces but keep the tabs inserted for table cells: a
  // schedule table rendered as "Opens March 1" loses the label/value boundary,
  // which is exactly the structure the extractor relies on for dates and fees.
  return text
    .split("\n")
    .map((line) =>
      line
        .replace(/[ \u00a0]+/g, " ")
        .replace(/ *\t+ */g, "\t")
        .replace(/\t+$/, "")
        .trim(),
    )
    .filter((line) => line.length > 0)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "-",
  mdash: "-",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  hellip: "...",
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_match, code) => safeCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => safeCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => {
      const replacement = NAMED_ENTITIES[name.toLowerCase()]
      return replacement ?? match
    })
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return ""
  try {
    return String.fromCodePoint(code)
  } catch {
    return ""
  }
}

/* -------------------------------------------------------------------------- */
/*  Fetching                                                                  */
/* -------------------------------------------------------------------------- */

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
        "accept-language": "en-US,en;q=0.9",
      },
    })
  } finally {
    clearTimeout(timer)
  }
}

export type FetchPageResult = {
  url: string
  /** Final URL after redirects; differs from `url` when a source has moved. */
  finalUrl: string
  httpStatus: number | null
  contentType: string | null
  /** Extracted text, or null when the fetch failed. */
  content: string | null
  /** Hash of `content`. Null when there is no content to hash. */
  contentHash: string | null
  bytes: number | null
  fetchError: string | null
  /** False when robots.txt forbade the fetch; no request was made. */
  robotsAllowed: boolean
  robotsNote: string
  crawlDelaySeconds: number | null
  /**
   * Untouched markup, kept only for HTML responses so link discovery
   * (`discover-links.ts`) can find `<a href>` targets that `content` no
   * longer has — `htmlToText` strips every tag by design. Never persisted or
   * hashed; it exists purely for same-request subpage discovery.
   */
  rawHtml: string | null
}

export type FetchPageOptions = {
  timeoutMs?: number
  /** Set false only for sources with written permission on record. */
  respectRobots?: boolean
  maxBytes?: number
}

/**
 * Fetches one page and reduces it to hashed text.
 *
 * Never throws for network or HTTP problems: a failed fetch is data the
 * pipeline records (and uses to back off), not an exception that aborts a
 * crawl of hundreds of other sources.
 */
export async function fetchPage(
  url: string,
  options: FetchPageOptions = {},
): Promise<FetchPageResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxBytes = options.maxBytes ?? MAX_BYTES
  const respectRobots = options.respectRobots ?? true

  const base: FetchPageResult = {
    url,
    finalUrl: url,
    httpStatus: null,
    contentType: null,
    content: null,
    contentHash: null,
    bytes: null,
    fetchError: null,
    robotsAllowed: true,
    robotsNote: respectRobots ? "" : "robots.txt bypassed by explicit configuration.",
    crawlDelaySeconds: null,
    rawHtml: null,
  }

  if (respectRobots) {
    const decision = await checkRobots(url, { timeoutMs })
    base.robotsAllowed = decision.allowed
    base.robotsNote = decision.note
    base.crawlDelaySeconds = decision.crawlDelaySeconds

    if (!decision.allowed) {
      return { ...base, fetchError: decision.note }
    }
  }

  try {
    const response = await fetchWithTimeout(url, timeoutMs)
    const contentType = response.headers.get("content-type")

    const result: FetchPageResult = {
      ...base,
      finalUrl: response.url || url,
      httpStatus: response.status,
      contentType,
    }

    if (!response.ok) {
      return { ...result, fetchError: `HTTP ${response.status} ${response.statusText}`.trim() }
    }

    // Reject non-textual payloads before reading a potentially huge body.
    if (contentType && !/text\/|json|xml/i.test(contentType)) {
      return { ...result, fetchError: `Unsupported content-type: ${contentType}` }
    }

    const declaredLength = Number.parseInt(response.headers.get("content-length") ?? "", 10)
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      return {
        ...result,
        bytes: declaredLength,
        fetchError: `Response too large: ${declaredLength} bytes`,
      }
    }

    const raw = await response.text()
    const bytes = Buffer.byteLength(raw, "utf8")
    if (bytes > maxBytes) {
      return { ...result, bytes, fetchError: `Response too large: ${bytes} bytes` }
    }

    const isHtml = !contentType || /html|xml/i.test(contentType)
    const content = isHtml ? htmlToText(raw) : raw.trim()

    if (!content) {
      return { ...result, bytes, fetchError: "Fetched page contained no readable text" }
    }

    return {
      ...result,
      bytes,
      content,
      contentHash: hashContent(content),
      rawHtml: isHtml ? raw : null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const timedOut = error instanceof Error && error.name === "AbortError"
    return {
      ...base,
      fetchError: timedOut ? `Timed out after ${timeoutMs}ms` : message,
    }
  }
}
