"use client";

/**
 * Client-side charts and interactive elements for the province pulse dashboard.
 * Uses SWR for auto-refresh and Recharts for visualization.
 */

import useSWR from "swr";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ---------------------------------------------------------------------------
// SWR fetcher
// ---------------------------------------------------------------------------

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SeverityData {
  name: string;
  value: number;
  color: string;
}

// ---------------------------------------------------------------------------
// Severity chart (incidents by severity)
// ---------------------------------------------------------------------------

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "var(--tl-info)",
  MEDIUM: "var(--tl-warning)",
  HIGH: "var(--tl-danger)",
  VERY_HIGH: "#7c2d12",
};

const SEVERITY_LABELS: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  VERY_HIGH: "Muy alta",
};

export function SeverityChart({
  bySeverity,
}: {
  bySeverity: Record<string, number>;
}) {
  const data: SeverityData[] = ["LOW", "MEDIUM", "HIGH", "VERY_HIGH"]
    .filter((s) => (bySeverity[s] ?? 0) > 0)
    .map((s) => ({
      name: SEVERITY_LABELS[s],
      value: bySeverity[s],
      color: SEVERITY_COLORS[s],
    }));

  if (data.length === 0) return null;

  return (
    <div className="h-36 w-full mt-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={70}
            tick={{ fontSize: 12, fill: "currentColor" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [`${value} incidencias`, ""]}
            contentStyle={{
              backgroundColor: "var(--color-gray-900)",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontSize: 13,
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live pulse indicator (pulsing dot + auto-refresh timestamp)
// ---------------------------------------------------------------------------

export function LivePulse({ slug }: { slug: string }) {
  const { data, isLoading } = useSWR(`/api/pulso/${slug}`, fetcher, {
    refreshInterval: 60_000, // auto-refresh every 60s
    revalidateOnFocus: true,
  });

  const updatedAt = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
      </span>
      <span>En directo</span>
      {isLoading && (
        <span className="text-xs text-gray-400">Actualizando...</span>
      )}
      {updatedAt && (
        <span className="text-xs text-gray-400 ml-1">
          Actualizado {updatedAt}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ICA gauge
// ---------------------------------------------------------------------------

const ICA_COLORS: Record<number, string> = {
  1: "#059669",
  2: "#84cc16",
  3: "#eab308",
  4: "#f97316",
  5: "#dc2626",
  6: "#7c2d12",
};

const ICA_LABELS: Record<number, string> = {
  1: "Buena",
  2: "Razonablemente buena",
  3: "Regular",
  4: "Desfavorable",
  5: "Muy desfavorable",
  6: "Extremadamente desfavorable",
};

export function IcaBadge({ ica }: { ica: number | null }) {
  if (ica == null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
        Sin datos
      </span>
    );
  }

  const clamped = Math.max(1, Math.min(6, ica));
  const color = ICA_COLORS[clamped];
  const label = ICA_LABELS[clamped];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        backgroundColor: `${color}18`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      ICA {clamped} — {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Fuel price trend arrow
// ---------------------------------------------------------------------------

export function FuelTrend({
  current,
  previous,
}: {
  current: number | null;
  previous: number | null;
}) {
  if (current == null || previous == null) return null;

  const diff = current - previous;
  const pct = ((diff / previous) * 100).toFixed(1);

  if (Math.abs(diff) < 0.001) {
    return (
      <span className="text-xs text-gray-400 font-mono">= 0,0%</span>
    );
  }

  const isUp = diff > 0;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-mono ${
        isUp
          ? "text-red-600 dark:text-red-400"
          : "text-emerald-600 dark:text-emerald-400"
      }`}
    >
      {isUp ? "\u25B2" : "\u25BC"} {isUp ? "+" : ""}
      {pct.replace(".", ",")}%
    </span>
  );
}
