"use client";

import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

/** Row shape coming from a query result. */
export type Row = Record<string, unknown>;

/** Series colors, reused across chart types (matches the app accent palette). */
export const CHART_COLORS = [
  "#5b8cff",
  "#34d399",
  "#f59e0b",
  "#f472b6",
  "#a78bfa",
  "#22d3ee",
];

// Kept in sync with the theme tokens in globals.css (--muted / --border / --fg).
export const AXIS_TICK = { fill: "#8b93a1", fontSize: 12 } as const;
export const GRID_STROKE = "#232834";

/** Dark-theme tooltip props, spread onto <Tooltip />. */
export const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#181c25",
    border: "1px solid #232834",
    borderRadius: 8,
    color: "#e8eaed",
  },
  labelStyle: { color: "#8b93a1" },
} as const;

/** Title + responsive, fixed-height canvas wrapper for any chart. */
export function ChartFrame({
  title,
  children,
}: {
  title?: string;
  children: ReactElement;
}) {
  return (
    <figure className="chart">
      {title ? <figcaption className="chart-title">{title}</figcaption> : null}
      <div className="chart-canvas">
        <ResponsiveContainer width="100%" height={300}>
          {children}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
