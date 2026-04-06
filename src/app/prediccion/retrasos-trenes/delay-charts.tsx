"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DistributionData {
  onTimeCount: number;
  slightCount: number;
  moderateCount: number;
  severeCount: number;
}

interface TrendDay {
  date: string;
  punctualityRate: number;
  avgDelay: number;
  avgTrains: number;
  maxDelay: number;
  totalAlerts: number;
  totalCancellations: number;
}

interface HourlyData {
  hour: number;
  avgPunctuality: number;
  avgDelay: number;
}

// ── Colors ─────────────────────────────────────────────────────────────────────

const DISTRIBUTION_COLORS = [
  { key: "onTime", label: "Puntual", color: "#059669" },
  { key: "slight", label: "1-5 min", color: "#ca8a04" },
  { key: "moderate", label: "6-15 min", color: "#ea580c" },
  { key: "severe", label: ">15 min", color: "#dc2626" },
];

// ── Punctuality Donut Chart ────────────────────────────────────────────────────

export function PunctualityDonut({ data }: { data: DistributionData }) {
  const chartData = [
    { name: "Puntual", value: data.onTimeCount },
    { name: "1-5 min", value: data.slightCount },
    { name: "6-15 min", value: data.moderateCount },
    { name: ">15 min", value: data.severeCount },
  ];

  const total = chartData.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
      <h3 className="text-sm font-heading font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Distribucion actual de retrasos
      </h3>
      <div className="h-56 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={DISTRIBUTION_COLORS[i].color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                backgroundColor: "white",
              }}
              formatter={(value, name) => [
                `${Number(value ?? 0)} trenes (${total > 0 ? ((Number(value ?? 0) / total) * 100).toFixed(1) : 0}%)`,
                String(name),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <span className="text-2xl font-heading font-bold font-mono text-gray-900 dark:text-gray-100">
              {total}
            </span>
            <br />
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              trenes
            </span>
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
        {DISTRIBUTION_COLORS.map((c, i) => (
          <span
            key={c.key}
            className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: c.color }}
            />
            {c.label}:{" "}
            <span className="font-mono font-semibold">
              {chartData[i].value}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── 30-Day Trend Chart ─────────────────────────────────────────────────────────

export function TrendChart({ data }: { data: TrendDay[] }) {
  if (data.length < 2) return null;

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    }),
    punctuality: d.punctualityRate,
    delay: d.avgDelay,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
      <h3 className="text-sm font-heading font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Tendencia de puntualidad — ultimos {data.length} dias
      </h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10 }}
              tickFormatter={(v: number) => `${v}m`}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                backgroundColor: "white",
              }}
              formatter={(value, name) => [
                name === "punctuality"
                  ? `${Number(value ?? 0).toFixed(1)}%`
                  : `${Number(value ?? 0).toFixed(1)} min`,
                name === "punctuality" ? "Puntualidad" : "Retraso medio",
              ]}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="punctuality"
              stroke="#059669"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="delay"
              stroke="#dc2626"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-2 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 rounded bg-[#059669]" />
          Puntualidad (%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 rounded bg-[#dc2626]" />
          Retraso medio (min)
        </span>
      </div>
    </div>
  );
}

// ── Hourly Punctuality Bar Chart ───────────────────────────────────────────────

function getHourColor(punctuality: number): string {
  if (punctuality >= 95) return "#059669";
  if (punctuality >= 90) return "#16a34a";
  if (punctuality >= 85) return "#ca8a04";
  if (punctuality >= 80) return "#ea580c";
  return "#dc2626";
}

export function HourlyChart({ data }: { data: HourlyData[] }) {
  if (data.length < 3) return null;

  // Fill missing hours
  const hourMap = new Map(data.map((d) => [d.hour, d]));
  const fullData = Array.from({ length: 24 }, (_, h) => {
    const entry = hourMap.get(h);
    return {
      hour: `${String(h).padStart(2, "0")}:00`,
      hourNum: h,
      avgPunctuality: entry?.avgPunctuality ?? 0,
      avgDelay: entry?.avgDelay ?? 0,
    };
  });

  // Find best and worst hours (only among hours with data)
  const withData = fullData.filter((d) => d.avgPunctuality > 0);
  const best = withData.reduce(
    (b, d) => (d.avgPunctuality > b.avgPunctuality ? d : b),
    withData[0]
  );
  const worst = withData.reduce(
    (w, d) => (d.avgPunctuality < w.avgPunctuality ? d : w),
    withData[0]
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
      <h3 className="text-sm font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Mejor hora para viajar
      </h3>
      {best && worst && best.hourNum !== worst.hourNum && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Los trenes de las{" "}
          <span className="font-mono font-semibold text-[var(--tl-success)]">
            {best.hour}
          </span>{" "}
          son los mas puntuales ({best.avgPunctuality.toFixed(1)}%). Evita las{" "}
          <span className="font-mono font-semibold text-[var(--tl-danger)]">
            {worst.hour}
          </span>{" "}
          ({worst.avgPunctuality.toFixed(1)}%).
        </p>
      )}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={fullData} barCategoryGap="15%">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              vertical={false}
            />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 9 }}
              interval={2}
              tickFormatter={(v: string) => v.replace(":00", "h")}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                backgroundColor: "white",
              }}
              formatter={(value) => [
                `${Number(value ?? 0).toFixed(1)}%`,
                "Puntualidad",
              ]}
              labelFormatter={(label: string) => `Hora: ${label}`}
            />
            <Bar dataKey="avgPunctuality" radius={[4, 4, 0, 0]}>
              {fullData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={getHourColor(entry.avgPunctuality)}
                  opacity={entry.avgPunctuality > 0 ? 1 : 0.2}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-4 mt-2 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#059669]" />
          {"\u2265"}95%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#ca8a04]" />
          85-95%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#dc2626]" />
          {"<"}85%
        </span>
      </div>
    </div>
  );
}
