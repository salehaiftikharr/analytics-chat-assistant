import { readOnlyQuery } from "@/lib/db";
import { validateSelect } from "./validate";
import type { QueryResultRow } from "pg";

export interface ExecuteResult {
  rows: QueryResultRow[];
  rowCount: number;
}

/**
 * Validate then run a model-generated query. Throws if validation fails — the
 * caller (the queryDatabase tool) surfaces that error back to the model so it
 * can fix the SQL and retry. A passing query runs through the read-only pool.
 */
export async function executeReadOnly(rawSql: string): Promise<ExecuteResult> {
  const result = validateSelect(rawSql);
  if (!result.ok || !result.sql) {
    throw new Error(result.error ?? "Invalid SQL.");
  }
  const rows = await readOnlyQuery(result.sql);
  return { rows, rowCount: rows.length };
}
