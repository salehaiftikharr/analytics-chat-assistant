import ChartRenderer from "@/components/charts/ChartRenderer";

/**
 * TEMPORARY step-9 demo (removed in step 10). Renders each chart type from
 * sample tool output. Numeric values are strings on purpose — that's how pg
 * returns numeric/bigint columns, so this exercises ChartRenderer's coercion.
 */
const REVENUE_BY_CATEGORY = [
  { category: "Home & Kitchen", total_revenue: "29997.37" },
  { category: "Electronics", total_revenue: "21326.95" },
  { category: "Clothing", total_revenue: "16518.66" },
  { category: "Sports", total_revenue: "9418.08" },
  { category: "Books", total_revenue: "6414.57" },
];

const MONTHLY_REVENUE = [
  { month: "2024-01", revenue: "4127.96" },
  { month: "2024-02", revenue: "8432.91" },
  { month: "2024-03", revenue: "7770.12" },
  { month: "2024-04", revenue: "8313.91" },
  { month: "2024-05", revenue: "3331.21" },
  { month: "2024-06", revenue: "4230.93" },
];

export default function ChartDemo() {
  return (
    <main
      style={{
        maxWidth: 820,
        margin: "0 auto",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "2.5rem",
      }}
    >
      <h1>Chart demo (step 9)</h1>

      <section>
        <h2>bar</h2>
        <ChartRenderer
          chartSpec={{ type: "bar", x: "category", y: ["total_revenue"], title: "Revenue by Category" }}
          rows={REVENUE_BY_CATEGORY}
        />
      </section>

      <section>
        <h2>line</h2>
        <ChartRenderer
          chartSpec={{ type: "line", x: "month", y: ["revenue"], title: "Monthly Revenue" }}
          rows={MONTHLY_REVENUE}
        />
      </section>

      <section>
        <h2>pie</h2>
        <ChartRenderer
          chartSpec={{ type: "pie", x: "category", y: ["total_revenue"], title: "Category Share" }}
          rows={REVENUE_BY_CATEGORY}
        />
      </section>

      <section>
        <h2>none → stat card (single value)</h2>
        <ChartRenderer
          chartSpec={{ type: "none", x: "", y: ["total_revenue"], title: "Total Revenue" }}
          rows={[{ total_revenue: "83675.63" }]}
        />
      </section>

      <section>
        <h2>none → table (multi-row)</h2>
        <ChartRenderer
          chartSpec={{ type: "none", x: "", y: [], title: "Recent Customers" }}
          rows={[
            { name: "Alice Johnson", country: "United States" },
            { name: "Lukas Mueller", country: "Germany" },
          ]}
        />
      </section>
    </main>
  );
}
