"use client";

/**
 * Moto-specific chart components for the motociclistas page.
 * Re-exports shared charts for convenience and adds moto-specific visualizations.
 */

export {
  YearTrendChart,
  HourDistributionChart,
  RoadTypeChart,
  DayOfWeekChart,
  type YearTrendItem,
  type HourDistributionItem,
  type RoadTypeBreakdownItem,
  type DayOfWeekItem,
} from "@/components/inteligencia/AccidentTrendChart";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ---------------------------------------------------------------------------
// Fatality Rate Comparison Chart (moto vs car)
// ---------------------------------------------------------------------------

interface FatalityComparisonItem {
  vehicle: string;
  rate: number;
  color: string;
}

function ComparisonTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: FatalityComparisonItem;
    value: number;
    color: string;
  }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {d.vehicle}
      </p>
      <p className="text-gray-600 dark:text-gray-400">
        Tasa de mortalidad:{" "}
        <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
          {d.rate.toFixed(2)}%
        </span>
      </p>
    </div>
  );
}

export function FatalityRateComparisonChart({
  motoRate,
  carRate,
}: {
  motoRate: number;
  carRate: number;
}) {
  const data: FatalityComparisonItem[] = [
    { vehicle: "Motocicleta", rate: motoRate, color: "#f59e0b" },
    { vehicle: "Turismo", rate: carRate, color: "#9ca3af" },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <h3 className="font-heading font-bold text-gray-900 dark:text-gray-100 mb-1">
        Tasa de mortalidad por accidente
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Porcentaje de accidentes que resultan en al menos un fallecido. Moto vs.
        turismo.
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="var(--color-tl-100, #dde8ff)"
            strokeOpacity={0.5}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
          />
          <YAxis
            type="category"
            dataKey="vehicle"
            tick={{ fontSize: 13, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            content={<ComparisonTooltip />}
            cursor={{ fill: "rgba(27, 75, 213, 0.04)" }}
          />
          <Bar dataKey="rate" radius={[0, 8, 8, 0]} maxBarSize={36}>
            {data.map((entry, index) => (
              <rect key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
