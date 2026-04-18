"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface ChartDataPoint {
  date: string;
  clicks: number;
  conversions: number;
}

interface ClickChartProps {
  data: ChartDataPoint[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function ClickChart({ data }: ClickChartProps) {
  const formatted = data.map((d) => ({ ...d, label: formatDate(d.date) }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-tl-500)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--color-tl-500)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-tl-amber-400)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--color-tl-amber-400)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "currentColor" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "currentColor" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              background: "var(--background)",
              border: "1px solid rgba(148,163,184,0.3)",
              borderRadius: 8,
            }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="clicks"
            name="Clicks"
            stroke="var(--color-tl-500)"
            strokeWidth={2}
            fill="url(#clickGrad)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="conversions"
            name="Conversiones"
            stroke="var(--color-tl-amber-400)"
            strokeWidth={2}
            fill="url(#convGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
