"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ---------------------------------------------------------------------------
// Shared tooltip styles
// ---------------------------------------------------------------------------

const tooltipStyle =
  "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg px-4 py-3 text-sm";

// ---------------------------------------------------------------------------
// Accidents by Year (LineChart)
// ---------------------------------------------------------------------------

interface AccidentYearPoint {
  year: number;
  count: number;
  fatalities: number;
}

interface AccidentYearChartProps {
  data: AccidentYearPoint[];
}

function AccidentYearTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className={tooltipStyle}>
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
        {String(label)}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} className="font-mono" style={{ color: entry.color }}>
          {entry.value.toLocaleString("es-ES")}{" "}
          {entry.name === "count" ? "accidentes" : "fallecidos"}
        </p>
      ))}
    </div>
  );
}

export function AccidentYearChart({ data }: AccidentYearChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#f3f4f6"
        />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 12, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip content={<AccidentYearTooltip />} />
        <Line
          type="monotone"
          dataKey="count"
          stroke="var(--color-tl-500, #3b82f6)"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "var(--color-tl-500, #3b82f6)" }}
          activeDot={{ r: 6 }}
          name="count"
        />
        <Line
          type="monotone"
          dataKey="fatalities"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ r: 3, fill: "#ef4444" }}
          strokeDasharray="5 5"
          name="fatalities"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Traffic Volume by Province (BarChart)
// ---------------------------------------------------------------------------

interface IMDProvincePoint {
  province: string;
  provinceName: string | null;
  imd: number;
}

interface IMDProvinceChartProps {
  data: IMDProvincePoint[];
}

function IMDTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className={tooltipStyle}>
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </p>
      <p className="font-mono text-tl-600 dark:text-tl-400 font-bold">
        {payload[0].value.toLocaleString("es-ES")} veh/dia
      </p>
    </div>
  );
}

export function IMDProvinceChart({ data }: IMDProvinceChartProps) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    name: d.provinceName ?? d.province,
    imd: d.imd,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 40)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
          stroke="#f3f4f6"
        />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
          }
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          width={100}
        />
        <Tooltip
          content={<IMDTooltip />}
          cursor={{ fill: "rgba(59, 130, 246, 0.05)" }}
        />
        <Bar
          dataKey="imd"
          fill="var(--color-tl-500, #3b82f6)"
          radius={[0, 6, 6, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
