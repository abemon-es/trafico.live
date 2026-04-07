"use client";

/**
 * Climate chart — 12-month temperature range + precipitation bars.
 * Client component using Recharts.
 */

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export interface MonthlyDataPoint {
  month: string;
  avgMin: number | null;
  avgMax: number | null;
  totalPrecip: number | null;
  avgWind: number | null;
  avgSun: number | null;
}

interface ClimateChartProps {
  data: MonthlyDataPoint[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-lg p-3 text-xs">
      <div className="font-mono text-gray-500 dark:text-gray-400 mb-2 font-semibold">
        {label}
      </div>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-400">
              {entry.name}:
            </span>
            <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
              {entry.value != null
                ? entry.name === "Precipitacion"
                  ? `${entry.value.toFixed(1)} mm`
                  : `${entry.value.toFixed(1)} °C`
                : "\u2014"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export function ClimateChart({ data }: ClimateChartProps) {
  if (data.length === 0) return null;

  // Format month labels
  const chartData = data.map((d) => {
    const date = new Date(d.month);
    const monthLabel = MONTH_NAMES[date.getMonth()] ?? d.month;
    return {
      ...d,
      label: monthLabel,
    };
  });

  return (
    <div className="rounded-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 p-4">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-gray-200 dark:stroke-gray-700"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              className="fill-gray-500 dark:fill-gray-400"
            />
            <YAxis
              yAxisId="temp"
              tick={{ fontSize: 10 }}
              className="fill-gray-500 dark:fill-gray-400"
              width={35}
              tickFormatter={(v) => `${v}°`}
            />
            <YAxis
              yAxisId="precip"
              orientation="right"
              tick={{ fontSize: 10 }}
              className="fill-gray-500 dark:fill-gray-400"
              width={40}
              tickFormatter={(v) => `${v} mm`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "11px" }}
              iconType="circle"
              iconSize={8}
            />
            <Area
              yAxisId="temp"
              type="monotone"
              dataKey="avgMax"
              name="Temp. maxima"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#tempGradient)"
              dot={false}
              activeDot={{
                r: 4,
                stroke: "#f59e0b",
                strokeWidth: 2,
                fill: "white",
              }}
            />
            <Area
              yAxisId="temp"
              type="monotone"
              dataKey="avgMin"
              name="Temp. minima"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="transparent"
              dot={false}
              activeDot={{
                r: 4,
                stroke: "#3b82f6",
                strokeWidth: 2,
                fill: "white",
              }}
            />
            <Bar
              yAxisId="precip"
              dataKey="totalPrecip"
              name="Precipitacion"
              fill="#06b6d4"
              fillOpacity={0.6}
              radius={[3, 3, 0, 0]}
              barSize={16}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-[#f59e0b] rounded-full" />
          Temperatura maxima media
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-[#3b82f6] rounded-full" />
          Temperatura minima media
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-[#06b6d4] rounded-sm opacity-60" />
          Precipitacion total (mm)
        </div>
      </div>
    </div>
  );
}
