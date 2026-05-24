"use client";

/**
 * PunctualityStats — visual breakdown of on-time performance.
 *
 * Shows three KPI tiles + a bar chart via Recharts. Shared by train and
 * bus surfaces; adapts copy based on `mode` prop.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CheckCircle2, Clock, Activity } from "lucide-react";

export interface PunctualityStatsData {
  onTimePercent: number;
  avgDelayMin: number;
  stdDevMin: number;
  sampleCount: number;
  periodDays: number;
}

interface PunctualityStatsProps {
  stats: PunctualityStatsData;
  mode?: "train" | "bus";
  /** Bar chart data — array of { label: string; value: number } */
  chartData?: Array<{ label: string; value: number }>;
}

function KpiTile({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <p className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100">
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500">{sub}</p>
      )}
    </div>
  );
}

// Custom tooltip for recharts
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-900 dark:text-gray-100">{label}</p>
      <p className="text-gray-600 dark:text-gray-300">
        {payload[0].value.toFixed(1)} min retraso medio
      </p>
    </div>
  );
}

export default function PunctualityStats({
  stats,
  mode = "train",
  chartData,
}: PunctualityStatsProps) {
  const onTimeColor =
    stats.onTimePercent >= 80
      ? "var(--tl-success, #059669)"
      : stats.onTimePercent >= 60
      ? "var(--tl-warning, #d48139)"
      : "var(--tl-danger, #dc2626)";

  const delayColor =
    stats.avgDelayMin <= 2
      ? "var(--tl-success, #059669)"
      : stats.avgDelayMin <= 8
      ? "var(--tl-warning, #d48139)"
      : "var(--tl-danger, #dc2626)";

  const serviceName = mode === "train" ? "trenes" : "buses";

  return (
    <div className="space-y-4">
      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiTile
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          label="Puntualidad"
          value={`${stats.onTimePercent.toFixed(1)}%`}
          sub={`${serviceName} a tiempo (≤5 min)`}
          color={onTimeColor}
        />
        <KpiTile
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Retraso medio"
          value={`${stats.avgDelayMin.toFixed(1)} min`}
          sub={`Desv. típica ±${stats.stdDevMin.toFixed(1)} min`}
          color={delayColor}
        />
        <KpiTile
          icon={<Activity className="w-3.5 h-3.5" />}
          label="Muestras"
          value={stats.sampleCount.toLocaleString("es-ES")}
          sub={`Últimos ${stats.periodDays} días`}
          color="var(--tl-info, #366cf8)"
        />
      </div>

      {/* Bar chart — daily avg delay */}
      {chartData && chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Retraso medio por día (min)
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-tl-200, #c0d5ff)"
                opacity={0.4}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--color-tl-700, #092ea8)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-tl-700, #092ea8)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={24}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.value <= 2
                        ? "var(--tl-success, #059669)"
                        : entry.value <= 8
                        ? "var(--tl-warning, #d48139)"
                        : "var(--tl-danger, #dc2626)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
