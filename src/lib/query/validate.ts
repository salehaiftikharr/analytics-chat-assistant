import { MAX_ROWS } from "@/lib/constants";

/**
 * Validates that a model-generated SQL string is a single, read-only query, and
 * returns a sanitized version (with a LIMIT appended if missing).
 *
 * This is defense in depth — the read-only DB role already makes writes
 * impossible. The validator's job is to reject obviously unsafe input *before*
 * it reaches Postgres, and to give the model a clear error it can recover from.
 */
export interface ValidationResult {
  ok: boolean;
  /** The SQL to execute (LIMIT-appended) — present only when `ok`. */
  sql?: string;
  /** Why it was rejected — present only when not `ok`. */
  error?: string;
}

// Keywords that must never appear in a read-only query. Most can't even parse
// inside a SELECT; the real targets are data-modifying CTEs (e.g.
// `WITH x AS (DELETE ... RETURNING *) SELECT ...`), which Postgres *does* allow.
const FORBIDDEN_KEYWORDS = [
  "insert",
  "update",
  "delete",
  "merge",
  "drop",
  "alter",
  "create",
  "truncate",
  "grant",
  "revoke",
  "copy",
  "vacuum",
];

export function validateSelect(rawSql: string): ValidationResult {
  const sql = rawSql.trim();
  if (!sql) return { ok: false, error: "Empty SQL." };

  // Scan a copy with string literals blanked out, so keywords, semicolons, or
  // comment markers *inside* quoted values (e.g. WHERE name = 'Insert Coin')
  // don't trip the checks below.
  const scan = sql.replace(/'(?:''|[^'])*'/g, "''");

  // No SQL comments — block -- and /* */ obfuscation / injection.
  if (scan.includes("--") || scan.includes("/*")) {
    return { ok: false, error: "SQL comments are not allowed." };
  }

  // A single statement only: allow at most one trailing semicolon.
  const withoutTrailingSemicolon = scan.replace(/;\s*$/, "");
  if (withoutTrailingSemicolon.includes(";")) {
    return { ok: false, error: "Only a single statement is allowed." };
  }

  // Must be a read-only query: SELECT, or a WITH ... SELECT.
  if (!/^\s*(select|with)\b/i.test(scan)) {
    return { ok: false, error: "Only SELECT queries are allowed." };
  }

  // Reject write / DDL keywords anywhere (word-boundary matched).
  for (const keyword of FORBIDDEN_KEYWORDS) {
    if (new RegExp(`\\b${keyword}\\b`, "i").test(scan)) {
      return {
        ok: false,
        error: `Disallowed keyword "${keyword.toUpperCase()}" — only read-only SELECT queries are allowed.`,
      };
    }
  }

  // Enforce a row cap: append a LIMIT when the query doesn't set its own.
  const cleaned = sql.replace(/;\s*$/, "").trim();
  const hasLimit = /\blimit\b/i.test(scan);
  const finalSql = hasLimit ? cleaned : `${cleaned} LIMIT ${MAX_ROWS}`;

  return { ok: true, sql: finalSql };
}
