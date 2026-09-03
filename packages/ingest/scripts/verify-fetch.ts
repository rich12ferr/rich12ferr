/**
 * Behavioral checks for the fetch layer's pure functions.
 *
 * These run without a database or network so they can be executed anywhere.
 * Run with: pnpm --filter @openplay/ingest exec tsx scripts/verify-fetch.ts
 */

import { hashContent } from "../src/change-detection"
import { htmlToText, isPathAllowed, parseRobots } from "../src/fetch"

let failures = 0

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    console.log(`  ok   ${label}`)
  } else {
    failures++
    console.log(`  FAIL ${label}\n       expected ${e}\n       actual   ${a}`)
  }
}

console.log("\nhtmlToText")

check(
  "strips script and style content",
  htmlToText("<p>Register now</p><script>var fee = 45;</script><style>p{color:red}</style>"),
  "Register now",
)

check(
  "keeps list items on separate lines",
  htmlToText("<ul><li>Grades 5-6</li><li>Grades 7-8</li></ul>"),
  "Grades 5-6\nGrades 7-8",
)

check(
  "separates table cells so dates do not merge",
  htmlToText("<tr><td>Opens</td><td>March 1</td></tr>"),
  "Opens\tMarch 1",
)

check("decodes entities", htmlToText("<p>Ages&nbsp;8&ndash;12 &amp; up</p>"), "Ages 8-12 & up")

check("decodes numeric entities", htmlToText("<p>&#36;45 &#x26; free</p>"), "$45 & free")

check("drops html comments", htmlToText("<p>Fee<!-- was $30 --> is $45</p>"), "Fee is $45")

console.log("\nhash stability")

// The hash must be stable across irrelevant markup churn, or every crawl
// reports a false change and floods the review queue.
const withWrapper = htmlToText(
  '<div class="a1"><p>Soccer registration opens March 1</p></div>',
)
const withDifferentWrapper = htmlToText(
  '<section id="x92" data-build="8f3a"><p>Soccer registration opens March 1</p></section>',
)
check("same text through different markup", withWrapper, withDifferentWrapper)
check(
  "same hash through different markup",
  hashContent(withWrapper) === hashContent(withDifferentWrapper),
  true,
)

const changed = htmlToText("<p>Soccer registration opens March 8</p>")
check(
  "different hash when a date changes",
  hashContent(withWrapper) !== hashContent(changed),
  true,
)

console.log("\nrobots.txt")

const basic = parseRobots("User-agent: *\nDisallow: /admin\nCrawl-delay: 2")
check("parses wildcard disallow", basic.disallow, ["/admin"])
check("parses crawl delay", basic.crawlDelaySeconds, 2)
check("blocks disallowed path", isPathAllowed(basic, "/admin/users"), false)
check("allows other paths", isPathAllowed(basic, "/recreation/soccer"), true)

// A group naming our bot must win over the wildcard group.
const specific = parseRobots(
  "User-agent: *\nDisallow: /\n\nUser-agent: OpenPlayBot\nDisallow: /private",
)
check("specific group overrides wildcard", specific.disallow, ["/private"])
check("specific group allows public path", isPathAllowed(specific, "/programs"), true)
check("specific group blocks its own rule", isPathAllowed(specific, "/private/x"), false)

// Longest-match: a more specific Allow must beat a broader Disallow.
const nested = parseRobots("User-agent: *\nDisallow: /docs\nAllow: /docs/public")
check("longer allow beats shorter disallow", isPathAllowed(nested, "/docs/public/a"), true)
check("disallow still applies elsewhere", isPathAllowed(nested, "/docs/private"), false)

check("comments ignored", parseRobots("# hello\nUser-agent: *\nDisallow: /x").disallow, ["/x"])
check("empty robots allows everything", isPathAllowed(parseRobots(""), "/anything"), true)

// "Disallow:" with an empty value means "allow all" per the convention.
check(
  "empty disallow value permits crawling",
  isPathAllowed(parseRobots("User-agent: *\nDisallow:"), "/anything"),
  true,
)

console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`)
process.exit(failures === 0 ? 0 : 1)
