"use client";

import { Area, AreaChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
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

export default function AreaChartView({ data, x, y, title }: Props) {
  return (
    <ChartFrame title={title}>
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey={x} tick={AXIS_TICK} />
        <YAxis tick={AXIS_TICK} />
        <Tooltip {...TOOLTIP_STYLE} />
        {y.length > 1 ? <Legend /> : null}
        {y.map((key, i) => {
          const color = CHART_COLORS[i % CHART_COLORS.length];
          return (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              fill={color}
              fillOpacity={0.2}
            />
          );
        })}
      </AreaChart>
    </ChartFrame>
  );
}
