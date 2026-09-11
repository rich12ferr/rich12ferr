import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { getPool } from "@openplay/db"

/**
 * Better Auth, backed by the same `pg` Pool Drizzle uses (see `@openplay/db`) —
 * one connection, one source of truth. This is the one login system for the
 * whole app: today it gates `/admin` (see `isAdminEmail` below and
 * `app/admin/layout.tsx`), and later it's the same sign-in/sign-up a parent
 * uses for their own account. There is no separate "admin auth" — admin is
 * just a normal session whose email happens to match `ADMIN_EMAIL`.
 *
 * `getPool()` rather than the `pool` proxy: Better Auth's adapter inspects
 * the object it's handed, and `pool` is a `Proxy` wrapping a plain object,
 * not a real `pg.Pool` — passing it fails with "Failed to initialize
 * database adapter". `getPool()` returns the actual, lazily-created Pool.
 */
export const auth = betterAuth({
  database: getPool(),
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  user: {
    // There is no public sign-up surface yet — this is the only account in
    // the system today, so account creation is restricted to ADMIN_EMAIL.
    // Remove this restriction once parent-facing sign-up ships; at that
    // point admin access should rely solely on the isAdminEmail() check
    // below rather than on gating who can create an account at all.
    validateUserInfo({ user, source }) {
      if (source.action !== "create-user") return
      if (!isAdminEmail(user.email as string | undefined)) {
        return { error: "signup_disabled", errorDescription: "Sign-up is not available." }
      }
    },
  },
  trustedOrigins: [
    ...(process.env.NODE_ENV === "development"
      ? [
          "http://localhost:3000",
          ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
          ...(process.env.V0_DEV_APP_URL ? [process.env.V0_DEV_APP_URL] : []),
          ...(process.env.V0_BUILD_URL ? [process.env.V0_BUILD_URL] : []),
          ...(process.env.V0_SANDBOX_URL ? [process.env.V0_SANDBOX_URL] : []),
        ]
      : []),
    ...(process.env.NODE_ENV === "production"
      ? [
          ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
          ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
            : []),
        ]
      : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  ...(process.env.NODE_ENV === "development"
    ? {
        advanced: {
          // Required by the cross-site v0 preview iframe. Without these
          // attributes, login succeeds but the next request appears signed out.
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        },
      }
    : {}),
  plugins: [nextCookies()],
})

/**
 * The single allowed admin account. Deliberately an env var, not a `role`
 * column — there is exactly one administrator by product decision, and an
 * env var makes that hard to accidentally expand (no admin-granting UI, no
 * "isAdmin" flag another code path could flip). Case-insensitive since email
 * capitalization isn't meaningful and Better Auth stores it as submitted.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || !email) return false
  return email.toLowerCase() === adminEmail.toLowerCase()
}
