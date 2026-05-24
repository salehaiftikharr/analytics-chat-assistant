import { validateSelect } from "@/lib/query/validate";

/**
 * TEMPORARY verification route for step 7 — runs a battery of good/bad SQL
 * through validateSelect and reports pass/fail per case. Remove with the other
 * temp routes when /api/chat lands (step 8).
 */
const CASES: Array<{ sql: string; expectOk: boolean; note: string }> = [
  // --- should PASS ---
  { sql: "SELECT * FROM orders", expectOk: true, note: "plain select (LIMIT appended)" },
  {
    sql: "SELECT category, sum(price) AS total FROM products GROUP BY category",
    expectOk: true,
    note: "aggregate",
  },
  { sql: "WITH t AS (SELECT 1 AS x) SELECT * FROM t", expectOk: true, note: "CTE" },
  { sql: "SELECT * FROM orders LIMIT 5", expectOk: true, note: "existing LIMIT kept" },
  { sql: "SELECT * FROM orders;", expectOk: true, note: "single trailing semicolon ok" },
  {
    sql: "SELECT name FROM customers WHERE name = 'Insert Coin'",
    expectOk: true,
    note: "keyword inside a string literal must not trip",
  },
  // --- should be REJECTED ---
  { sql: "DELETE FROM orders", expectOk: false, note: "not a SELECT" },
  { sql: "UPDATE products SET price = 0", expectOk: false, note: "write" },
  { sql: "INSERT INTO orders VALUES (1)", expectOk: false, note: "write" },
  { sql: "SELECT 1; DROP TABLE orders", expectOk: false, note: "multiple statements" },
  { sql: "SELECT * FROM orders -- hi", expectOk: false, note: "line comment" },
  { sql: "SELECT * FROM orders /* hi */", expectOk: false, note: "block comment" },
  {
    sql: "WITH x AS (DELETE FROM orders RETURNING *) SELECT * FROM x",
    expectOk: false,
    note: "data-modifying CTE",
  },
  { sql: "", expectOk: false, note: "empty" },
];

export function GET() {
  const results = CASES.map(({ sql, expectOk, note }) => {
    const result = validateSelect(sql);
    return {
      note,
      sql,
      expectOk,
      actualOk: result.ok,
      pass: result.ok === expectOk,
      detail: result.ok ? result.sql : result.error,
    };
  });
  const allPassed = results.every((r) => r.pass);
  return Response.json(
    { ok: allPassed, passed: results.filter((r) => r.pass).length, total: results.length, results },
    { status: allPassed ? 200 : 500 },
  );
}
