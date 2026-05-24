import { tool } from "ai";
import { z } from "zod";
import { executeReadOnly } from "@/lib/query/execute";

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
 * `executeReadOnly` validates the SQL (single read-only SELECT, no comments or
 * extra statements, LIMIT enforced) before running it through the read-only
 * pool. A rejected query throws, and the AI SDK hands that error back to the
 * model so it can fix the SQL and try again.
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
    const { rows, rowCount } = await executeReadOnly(sql);
    return { rowCount, rows, chartSpec };
  },
});
