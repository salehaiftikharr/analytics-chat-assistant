import { tool } from "ai";
import { z } from "zod";
import { readOnlyQuery } from "@/lib/db";

/** How to visualize a result. `x`/`y` reference the SQL's SELECT aliases. */
export const chartSpecSchema = z.object({
  type: z.enum(["bar", "line", "pie", "area", "none"]),
  x: z
    .string()
    .describe(
      "Result column alias for the category / x-axis. Empty string if not applicable.",
    ),
  y: z
    .array(z.string())
    .describe(
      "Result column alias(es) to plot as numeric series. Empty array if not applicable.",
    ),
  title: z.string().describe("Short, human-readable chart title."),
});

export type ChartSpec = z.infer<typeof chartSpecSchema>;

/**
 * The single tool the model uses to answer questions. The model supplies a SQL
 * SELECT and a chartSpec; `execute` runs the query through the read-only pool
 * and returns the rows + chartSpec for the model to summarize and for the UI to
 * render.
 *
 * NOTE: step 7 inserts SQL validation (validate.ts) before the query runs. For
 * now the read-only DB role is the guard — it can only SELECT the analytics
 * tables, so it cannot write, drop, or read chat history even if asked.
 */
export const queryDatabase = tool({
  description:
    "Run a single read-only SQL SELECT against the analytics database and return the rows plus how to chart them. Use this to answer any question about the data.",
  inputSchema: z.object({
    sql: z
      .string()
      .describe(
        "A single read-only PostgreSQL SELECT statement. No INSERT/UPDATE/DELETE/DDL, no multiple statements.",
      ),
    chartSpec: chartSpecSchema,
  }),
  execute: async ({ sql, chartSpec }) => {
    const rows = await readOnlyQuery(sql);
    return { rowCount: rows.length, rows, chartSpec };
  },
});
