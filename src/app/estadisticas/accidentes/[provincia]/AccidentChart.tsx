"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface YearlyRow {
  year: number;
  accidents: number;
  fatalities: number;
  hospitalized: number;
}

function formatNumber(n: number): string {
  return n.toLocaleString("es-ES");
}

export function AccidentChart({ yearly }: { yearly: YearlyRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={yearly}
        margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
        barGap={2}
        barCategoryGap="25%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(156,163,175,0.2)"
          vertical={false}
        />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11, fill: "currentColor" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11, fill: "currentColor" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
          }
          width={44}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11, fill: "currentColor" }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            fontSize: "12px",
            border: "1px solid rgba(156,163,175,0.3)",
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name: any) =>
            typeof value === "number" ? [formatNumber(value), String(name ?? "")] : [String(value ?? ""), String(name ?? "")]
          }
        />
        <Legend
          iconType="square"
          iconSize={8}
          wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
        />
        <Bar
          yAxisId="left"
          dataKey="accidents"
          name="Accidentes"
          fill="#366cf8"
          radius={[3, 3, 0, 0]}
          maxBarSize={40}
        />
        <Bar
          yAxisId="right"
          dataKey="fatalities"
          name="Víctimas mortales"
          fill="#dc2626"
          radius={[3, 3, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
