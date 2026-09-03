/**
 * Drizzle client over a shared `pg` Pool.
 *
 * A single Pool is reused across the process (and cached on `globalThis` in
 * development so hot reload does not leak connections). Better Auth will share
 * this same Pool when auth lands in the next phase — one connection, one
 * source of truth.
 *
 * The Pool is created lazily on first query rather than at import time. Next.js
 * imports route modules during the build to collect page data, which must not
 * require a reachable database or a populated DATABASE_URL — only actually
 * running a query does.
 */

// Note: the "server-only" guard lives in the web app's query module rather than
// here. This package is also imported by plain Node CLI scripts (seeding,
// source registration, the crawl runner), and `server-only` throws outside a
// bundler that understands the react-server condition.

import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

declare global {
  // eslint-disable-next-line no-var
  var __openplayPool: Pool | undefined
}

function createPool() {
  const connectionString = process.env.DATABASE_URL

  // Thrown on first query, not on import, so the message surfaces to whoever
  // is actually trying to read data.
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. The Neon integration provides it automatically; " +
        "check the Vars panel if this fires locally.",
    )
  }

  return new Pool({
    connectionString,
    // Neon pooled endpoints terminate idle connections; keep the pool small and
    // let it recycle rather than holding sockets open through a serverless
    // function's idle period.
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })
}

let productionPool: Pool | undefined

/** The process-wide Pool, created on first use. */
export function getPool(): Pool {
  if (process.env.NODE_ENV === "production") {
    return (productionPool ??= createPool())
  }
  return (globalThis.__openplayPool ??= createPool())
}

/**
 * A Pool-shaped handle that defers construction to first property access.
 *
 * This keeps `pool` importable (the seed script calls `pool.end()`) while
 * ensuring a module import alone never opens a connection or requires
 * DATABASE_URL to be present.
 */
export const pool = new Proxy({} as Pool, {
  get(_target, property, receiver) {
    return Reflect.get(getPool(), property, receiver)
  },
  set(_target, property, value) {
    return Reflect.set(getPool(), property, value)
  },
})

type DrizzleDb = ReturnType<typeof createDb>

function createDb() {
  return drizzle(getPool(), { schema })
}

let cachedDb: DrizzleDb | undefined

/**
 * Drizzle instance, also deferred. `drizzle()` inspects the client it is given,
 * so constructing it eagerly would instantiate the Pool and defeat the laziness
 * above.
 */
export const db = new Proxy({} as DrizzleDb, {
  get(_target, property, receiver) {
    return Reflect.get((cachedDb ??= createDb()), property, receiver)
  },
})

export type Database = DrizzleDb
