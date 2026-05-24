"use client";

import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

/** Row shape coming from a query result. */
export type Row = Record<string, unknown>;

/** Series colors, reused across chart types. */
export const CHART_COLORS = [
  "#4f8cff",
  "#34d399",
  "#f59e0b",
  "#f472b6",
  "#a78bfa",
  "#22d3ee",
];

export const AXIS_TICK = { fill: "#9aa3ad", fontSize: 12 } as const;
export const GRID_STROKE = "#2a2f3a";

/** Dark-theme tooltip props, spread onto <Tooltip />. */
export const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#1f242d",
    border: "1px solid #2a2f3a",
    borderRadius: 8,
    color: "#e6e8eb",
  },
  labelStyle: { color: "#9aa3ad" },
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
