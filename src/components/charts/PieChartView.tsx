"use client";

import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";
import { CHART_COLORS, ChartFrame, TOOLTIP_STYLE, type Row } from "./chart-common";

interface Props {
  data: Row[];
  nameKey: string;
  valueKey: string;
  title: string;
}

export default function PieChartView({ data, nameKey, valueKey, title }: Props) {
  return (
    <ChartFrame title={title}>
      <PieChart>
        <Pie
          data={data}
          dataKey={valueKey}
          nameKey={nameKey}
          outerRadius={100}
          label
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend />
      </PieChart>
    </ChartFrame>
  );
}
