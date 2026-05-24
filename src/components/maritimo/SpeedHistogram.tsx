"use client";

/**
 * SpeedHistogram — Recharts BarChart of speed distribution
 *
 * Shows how many voyages (last 30d) fell into each speed bucket.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { SpeedBucket } from "@/lib/maritimo/punctuality";

interface SpeedHistogramProps {
  buckets: SpeedBucket[];
}

const BUCKET_COLORS = [
  "#94a3b8", // Parado — slate
  "#67e8f9", // Maniobra — cyan
  "#38bdf8", // Lento — sky
  "#0ea5e9", // Crucero — sky-600
  "#0369a1", // Rapido — sky-800
  "#1e3a5f", // Muy rapido — navy
];

export function SpeedHistogram({ buckets }: SpeedHistogramProps) {
  const hasData = buckets.some((b) => b.count > 0);

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Sin datos de velocidad disponibles para los ultimos 30 dias.
        </p>
      </div>
    );
  }

  const data = buckets.map((b) => ({
    label: b.label,
    count: b.count,
  }));

  return (
    <div className="rounded-2xl border border-tl-sea-100 dark:border-tl-sea-900/40 bg-white dark:bg-gray-900 p-6">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 4 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--color-gray-500, #6b7280)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--color-gray-500, #6b7280)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-gray-900, #111827)",
              border: "1px solid var(--color-gray-700, #374151)",
              borderRadius: "8px",
              color: "#f9fafb",
              fontSize: "12px",
            }}
            formatter={(value) => [`${value} viaje${Number(value) !== 1 ? "s" : ""}`, "Frecuencia"] as [string, string]}
            cursor={{ fill: "rgba(14,165,233,0.05)" }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={BUCKET_COLORS[i % BUCKET_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
        Distribucion de velocidad media por viaje — ultimos 30 dias
      </p>
    </div>
  );
}
