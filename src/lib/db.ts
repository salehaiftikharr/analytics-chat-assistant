import { Pool, type PoolConfig, type QueryResultRow } from "pg";
import { MAX_ROWS } from "@/lib/constants";

// The row cap lives in constants.ts (no DB imports) so the SQL validator can
// share it; re-export here for callers that already import it from db.
export { MAX_ROWS };

// Pools are created lazily on first use (not at import time) for two reasons:
//  - `next build` evaluates route modules to collect metadata, and the build
//    environment has no DATABASE_URL_*; eager creation would throw and fail the
//    build.
//  - In dev, Next.js hot-reloads modules; stashing the pools on the global keeps
//    a single pool across reloads instead of leaking connections.
const globalForDb = globalThis as unknown as {
  __readOnlyPool?: Pool;
  __appPool?: Pool;
};

function createPool(connectionString: string | undefined, label: string): Pool {
  if (!connectionString) {
    throw new Error(
      `Cannot create the ${label} database pool: its connection-string env var is not set.`,
    );
  }

  const config: PoolConfig = {
    connectionString,
    max: 10, // cap concurrent connections held by this pool
    idleTimeoutMillis: 30_000, // close idle clients after 30s
    connectionTimeoutMillis: 5_000, // fail fast if Postgres is unreachable
    statement_timeout: 10_000, // server-side: abort any statement after 10s
    query_timeout: 10_000, // client-side guard for the same
  };

  const pool = new Pool(config);
  // An idle pooled client can emit an error (e.g. DB restart); handle it so it
  // never bubbles up as an uncaught exception and crashes the server.
  pool.on("error", (err) => {
    console.error(`[db] idle client error in ${label} pool:`, err.message);
  });
  return pool;
}

/**
 * Pool for running LLM-generated SQL. Connects as the read-only role, which has
 * SELECT on the analytics tables only — no writes, and no access to `messages`
 * (enforced in db/init/04_roles.sql).
 */
export function getReadOnlyPool(): Pool {
  globalForDb.__readOnlyPool ??= createPool(
    process.env.DATABASE_URL_READONLY,
    "read-only",
  );
  return globalForDb.__readOnlyPool;
}

/**
 * Pool for chat persistence. Connects as the app role, which can read/write the
 * `messages` table only — no access to the analytics tables.
 */
export function getAppPool(): Pool {
  globalForDb.__appPool ??= createPool(process.env.DATABASE_URL_APP, "app");
  return globalForDb.__appPool;
}

/**
 * Run a read query via the read-only pool, returning at most {@link MAX_ROWS}
 * rows.
 */
export async function readOnlyQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getReadOnlyPool().query<T>(text, params as unknown[]);
  return result.rows.slice(0, MAX_ROWS);
}

/**
 * Run a query against the `messages` table via the app pool.
 */
export async function appQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getAppPool().query<T>(text, params as unknown[]);
  return result.rows;
}
