"use client";

import type { ChartSpec } from "@/lib/llm/tools";
import StatCard from "@/components/StatCard";
import AreaChartView from "./AreaChartView";
import BarChartView from "./BarChartView";
import LineChartView from "./LineChartView";
import PieChartView from "./PieChartView";
import DataTable from "./DataTable";
import type { Row } from "./chart-common";

interface ChartRendererProps {
  chartSpec: ChartSpec;
  rows: Row[];
}

/**
 * Turns a (chartSpec, rows) pair from the queryDatabase tool result into an
 * inline visualization. Coerces the numeric series (pg returns numeric/bigint
 * as strings) and falls back to a stat card or table when a chart doesn't fit.
 */
export default function ChartRenderer({ chartSpec, rows }: ChartRendererProps) {
  if (!rows || rows.length === 0) {
    return <p className="chart-empty">No rows returned.</p>;
  }

  const { type, x, y, title } = chartSpec;

  // A cartesian/pie chart needs an x and at least one y series.
  const chartable = Boolean(x) && y.length > 0;
  if (type !== "none" && !chartable) {
    return <DataTable rows={rows} title={title} />;
  }

  // Coerce the plotted series to numbers so Recharts treats them numerically.
  const data: Row[] = rows.map((row) => {
    const next: Row = { ...row };
    for (const key of y) next[key] = toNumber(row[key]);
    return next;
  });

  switch (type) {
    case "bar":
      return <BarChartView data={data} x={x} y={y} title={title} />;
    case "line":
      return <LineChartView data={data} x={x} y={y} title={title} />;
    case "area":
      return <AreaChartView data={data} x={x} y={y} title={title} />;
    case "pie":
      return <PieChartView data={data} nameKey={x} valueKey={y[0]} title={title} />;
    case "none":
    default:
      // Single value → headline stat; otherwise a compact table.
      if (rows.length === 1 && y.length === 1) {
        return <StatCard label={title || y[0]} value={rows[0][y[0]]} />;
      }
      return <DataTable rows={rows} title={title} />;
  }
}

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}
