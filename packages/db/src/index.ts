/**
 * @openplay/db — server-only.
 *
 * Never import this from a Client Component. It opens Postgres connections and
 * reads DATABASE_URL; bundling it into the browser would fail at build time and
 * leak the connection string if it did not.
 */

export { db, pool, type Database } from "./client"
export * from "./schema"
export * from "./queries"
export * from "./notify"
