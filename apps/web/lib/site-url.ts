import "server-only"

/**
 * The public origin used to build absolute links inside emails (story CTAs,
 * unsubscribe, "browse all"). Emails render on the server and are read far from
 * any request context, so this can't rely on request headers — it resolves
 * from env, preferring an explicit override, then the Vercel production URL,
 * then localhost for preview/log-mode sends.
 *
 * No trailing slash so callers can safely concatenate `${siteUrl()}/path`.
 */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000")
  return raw.replace(/\/$/, "")
}
