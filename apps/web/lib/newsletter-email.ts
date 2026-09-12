import type { NewsletterIssueRow, WeeklyEditionRow, WeeklyStoryRow } from "@openplay/db"

/**
 * Renders a newsletter issue to the `{ html, text }` an email needs.
 *
 * Pure and deterministic (no DB, no env reads) so it can back both the live
 * send and the admin preview from the exact same output — a preview that
 * diverges from what ships is worse than no preview. All URLs are passed in
 * fully-resolved; the caller owns base-URL and per-recipient token logic.
 *
 * Styling is inline on purpose: email clients strip <style> blocks and have no
 * class system, so every rule lives on the element. Layout leans on tables
 * where alignment matters because Outlook ignores much of fl/grid CSS.
 */

export type RenderableIssue = {
  issue: NewsletterIssueRow
  edition: WeeklyEditionRow | null
  stories: WeeklyStoryRow[]
}

export type RenderInput = RenderableIssue & {
  /** Fully-qualified site origin, e.g. https://signupvt.com — no trailing slash. */
  appUrl: string
  /** Per-recipient one-click unsubscribe URL (already carries the token). */
  unsubscribeUrl: string
}

const BRAND = "Sign Up Vermont"

/** Escape user/DB-authored text before it lands in an HTML string. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Resolve a possibly-relative CTA href (e.g. "/activities/x") to absolute. */
function absolute(href: string, appUrl: string): string {
  if (/^https?:\/\//i.test(href)) return href
  return `${appUrl}${href.startsWith("/") ? "" : "/"}${href}`
}

export function renderNewsletterEmail(input: RenderInput): { html: string; text: string } {
  const { issue, stories, appUrl, unsubscribeUrl } = input

  const preheader = issue.intro?.trim() || `${stories.length} things worth knowing this week.`

  /* ----------------------------- story blocks ---------------------------- */

  const storyHtml = stories
    .map((s) => {
      const href = absolute(s.ctaHref, appUrl)
      const meta = [s.categoryLabel, s.locationLabel].filter(Boolean).join(" · ")
      return `
      <tr>
        <td style="padding:0 0 28px 0;">
          ${
            meta
              ? `<div style="font:600 12px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#15803d;margin:0 0 6px 0;">${esc(meta)}</div>`
              : ""
          }
          <a href="${esc(href)}" style="text-decoration:none;color:#111111;">
            <div style="font:800 19px/1.3 Georgia,'Times New Roman',serif;color:#111111;margin:0 0 6px 0;">${esc(s.headline)}</div>
          </a>
          <div style="font:400 15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#3f3f46;margin:0 0 10px 0;">${esc(s.teaser)}</div>
          <a href="${esc(href)}" style="font:700 14px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#15803d;text-decoration:none;">${esc(s.ctaLabel)} &rarr;</a>
        </td>
      </tr>`
    })
    .join("")

  /* --------------------------- sponsorship block ------------------------- */

  const hasSponsor = Boolean(issue.sponsorName && issue.sponsorBlurb)
  const sponsorHtml = hasSponsor
    ? `
      <tr>
        <td style="padding:8px 0 28px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:12px;background:#fafafa;">
            <tr>
              <td style="padding:20px 22px;">
                <div style="font:700 11px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#a1a1aa;margin:0 0 10px 0;">Sponsored</div>
                ${
                  issue.sponsorImageUrl
                    ? `<img src="${esc(issue.sponsorImageUrl)}" alt="${esc(issue.sponsorName ?? "")}" width="120" style="display:block;max-width:120px;height:auto;margin:0 0 12px 0;" />`
                    : ""
                }
                <div style="font:800 17px/1.3 Georgia,'Times New Roman',serif;color:#111111;margin:0 0 6px 0;">${esc(issue.sponsorName ?? "")}</div>
                <div style="font:400 15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#3f3f46;margin:0 0 10px 0;">${esc(issue.sponsorBlurb ?? "")}</div>
                ${
                  issue.sponsorUrl
                    ? `<a href="${esc(issue.sponsorUrl)}" style="font:700 14px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#15803d;text-decoration:none;">Learn more &rarr;</a>`
                    : ""
                }
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : ""

  /* -------------------------------- shell -------------------------------- */

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <title>${esc(issue.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
          <!-- header -->
          <tr>
            <td style="background:#111111;padding:22px 28px;">
              <div style="font:800 18px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#ffffff;">${esc(BRAND)}</div>
              <div style="font:600 12px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#F5B642;margin-top:4px;letter-spacing:.03em;text-transform:uppercase;">The Weekly Digest</div>
            </td>
          </tr>
          <!-- intro -->
          <tr>
            <td style="padding:28px 28px 8px 28px;">
              <h1 style="font:800 24px/1.25 Georgia,'Times New Roman',serif;color:#111111;margin:0 0 12px 0;">${esc(issue.subject)}</h1>
              ${
                issue.intro
                  ? `<p style="font:400 15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#3f3f46;margin:0;">${esc(issue.intro)}</p>`
                  : ""
              }
            </td>
          </tr>
          <!-- body -->
          <tr>
            <td style="padding:24px 28px 0 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${storyHtml || `<tr><td style="font:400 15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#3f3f46;padding-bottom:24px;">More next week.</td></tr>`}
                ${sponsorHtml}
              </table>
            </td>
          </tr>
          <!-- browse CTA -->
          <tr>
            <td style="padding:8px 28px 28px 28px;">
              <a href="${esc(appUrl)}" style="display:inline-block;background:#15803d;color:#ffffff;font:700 15px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;text-decoration:none;padding:13px 22px;border-radius:10px;">Browse all Vermont activities</a>
            </td>
          </tr>
          <!-- footer -->
          <tr>
            <td style="background:#fafafa;border-top:1px solid #e4e4e7;padding:22px 28px;">
              <p style="font:400 12px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#71717a;margin:0 0 8px 0;">
                ${esc(BRAND)} keeps track of Vermont youth sports, camps, arts, and recreation programs so your family doesn&#39;t have to. We never handle registration or payment.
              </p>
              <p style="font:400 12px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#71717a;margin:0;">
                <a href="${esc(unsubscribeUrl)}" style="color:#71717a;text-decoration:underline;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="${esc(appUrl)}/alerts" style="color:#71717a;text-decoration:underline;">Manage email preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  /* ------------------------------ plain text ----------------------------- */

  const textParts: string[] = [`${BRAND} — The Weekly Digest`, "", issue.subject]
  if (issue.intro) textParts.push("", issue.intro)
  textParts.push("")
  for (const s of stories) {
    const meta = [s.categoryLabel, s.locationLabel].filter(Boolean).join(" · ")
    if (meta) textParts.push(meta.toUpperCase())
    textParts.push(s.headline, s.teaser, `${s.ctaLabel}: ${absolute(s.ctaHref, appUrl)}`, "")
  }
  if (hasSponsor) {
    textParts.push(
      "— SPONSORED —",
      issue.sponsorName ?? "",
      issue.sponsorBlurb ?? "",
      ...(issue.sponsorUrl ? [`Learn more: ${issue.sponsorUrl}`] : []),
      "",
    )
  }
  textParts.push(
    `Browse all Vermont activities: ${appUrl}`,
    "",
    `Unsubscribe (one click, no login): ${unsubscribeUrl}`,
  )

  return { html, text: textParts.join("\n") }
}
