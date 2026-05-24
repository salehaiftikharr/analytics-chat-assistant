"use client";

import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
import {
  AXIS_TICK,
  CHART_COLORS,
  ChartFrame,
  GRID_STROKE,
  TOOLTIP_STYLE,
  type Row,
} from "./chart-common";

interface Props {
  data: Row[];
  x: string;
  y: string[];
  title: string;
}

export default function BarChartView({ data, x, y, title }: Props) {
  return (
    <ChartFrame title={title}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey={x} tick={AXIS_TICK} />
        <YAxis tick={AXIS_TICK} />
        <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
        {y.length > 1 ? <Legend /> : null}
        {y.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartFrame>
  );
}
