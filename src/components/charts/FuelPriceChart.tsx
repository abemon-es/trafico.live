"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import type { ValueType, NameType, Payload } from "recharts/types/component/DefaultTooltipContent";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

type Period = 7 | 30 | 90;

interface HistoryRecord {
  date: string;
  avgGasoleoA: number | null;
  avgGasolina95: number | null;
  avgGasolina98: number | null;
}

interface ApiResponse {
  success: boolean;
  history: HistoryRecord[];
}

interface ChartDataPoint {
  label: string;
  diesel: number | null;
  gasolina95: number | null;
  gasolina98: number | null;
}

// ------------------------------------------------------------------
// Props
// ------------------------------------------------------------------

interface FuelPriceChartProps {
  /** Pre-select the visible fuel lines. Defaults to all three. */
  initialLines?: {
    diesel?: boolean;
    gasolina95?: boolean;
    gasolina98?: boolean;
  };
  /** Initial period in days. Defaults to 30. */
  initialDays?: Period;
}

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

const PERIOD_LABELS: Record<Period, string> = {
  7: "7 días",
  30: "30 días",
  90: "90 días",
};

const COLORS = {
  diesel: "#d97706",    // tl-amber-600
  gasolina95: "#2563eb", // tl-600
  gasolina98: "#7c3aed", // violet-600
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const fetcher = (url: string): Promise<ApiResponse> =>
  fetch(url).then((res) => res.json());

function formatDateLabel(dateStr: string, days: Period): string {
  const d = new Date(dateStr + "T00:00:00Z");
  if (days === 7) {
    return d.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function transformData(records: HistoryRecord[], days: Period): ChartDataPoint[] {
  return records.map((r) => ({
    label: formatDateLabel(r.date, days),
    diesel: r.avgGasoleoA,
    gasolina95: r.avgGasolina95,
    gasolina98: r.avgGasolina98,
  }));
}

// ------------------------------------------------------------------
// Custom tooltip
// ------------------------------------------------------------------

function CustomTooltip(props: TooltipContentProps<ValueType, NameType>) {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{String(label)}</p>
      {payload.map((entry: Payload<ValueType, NameType>) => {
        if (entry.value == null) return null;
        return (
          <div key={String(entry.dataKey)} className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-bold text-gray-900">
              {Number(entry.value).toFixed(3)}&nbsp;€/L
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------
// Skeleton
// ------------------------------------------------------------------

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-5 w-48 bg-gray-200 rounded" />
        <div className="flex gap-2">
          <div className="h-8 w-16 bg-gray-200 rounded-lg" />
          <div className="h-8 w-16 bg-gray-200 rounded-lg" />
          <div className="h-8 w-16 bg-gray-200 rounded-lg" />
        </div>
      </div>
      <div className="h-[280px] bg-gray-100 rounded-xl" />
    </div>
  );
}

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------

export function FuelPriceChart({
  initialLines = { diesel: true, gasolina95: true, gasolina98: true },
  initialDays = 30,
}: FuelPriceChartProps) {
  const [days, setDays] = useState<Period>(initialDays);
  const [visibleLines, setVisibleLines] = useState(initialLines);

  const { data, isLoading, error } = useSWR<ApiResponse>(
    `/api/fuel-prices/history?days=${days}&scope=national`,
    fetcher,
    {
      refreshInterval: 3_600_000, // 1 h — historical data changes rarely
      revalidateOnFocus: false,
    }
  );

  if (isLoading) return <ChartSkeleton />;

  if (error || !data?.success || !data.history?.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <p className="text-gray-400 text-sm text-center py-16">
          No hay datos históricos disponibles en este momento.
        </p>
      </div>
    );
  }

  const chartData = transformData(data.history, days);

  // Tick interval: avoid label clutter on smaller periods
  const tickInterval = days === 7 ? 0 : days === 30 ? 4 : 13;

  const toggleLine = (key: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-lg font-bold text-gray-900">
          Evolución del Precio de Combustibles
        </h2>

        {/* Period selector */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          {(Object.entries(PERIOD_LABELS) as [string, string][]).map(([d, label]) => (
            <button
              key={d}
              onClick={() => setDays(Number(d) as Period)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                days === Number(d)
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Line toggles */}
      <div className="flex flex-wrap gap-3 mb-5">
        <button
          onClick={() => toggleLine("diesel")}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-opacity ${
            visibleLines.diesel
              ? "border-tl-amber-400 bg-tl-amber-50 text-tl-amber-700"
              : "border-gray-200 bg-gray-50 text-gray-400 opacity-50"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-tl-amber-500" />
          Gasóleo A
        </button>
        <button
          onClick={() => toggleLine("gasolina95")}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-opacity ${
            visibleLines.gasolina95
              ? "border-tl-400 bg-tl-50 text-tl-700"
              : "border-gray-200 bg-gray-50 text-gray-400 opacity-50"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-tl-600" />
          Gasolina 95
        </button>
        <button
          onClick={() => toggleLine("gasolina98")}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-opacity ${
            visibleLines.gasolina98
              ? "border-violet-400 bg-violet-50 text-violet-700"
              : "border-gray-200 bg-gray-50 text-gray-400 opacity-50"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-violet-600" />
          Gasolina 98
        </button>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
          />

          <YAxis
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `${v.toFixed(2)}€`}
            width={52}
          />

          <Tooltip
            content={(p) => <CustomTooltip {...(p as TooltipContentProps<ValueType, NameType>)} />}
            cursor={{ stroke: "#e5e7eb", strokeWidth: 1 }}
          />

          <Legend
            wrapperStyle={{ display: "none" }}
          />

          {visibleLines.diesel && (
            <Line
              type="monotone"
              dataKey="diesel"
              name="Gasóleo A"
              stroke={COLORS.diesel}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls
            />
          )}

          {visibleLines.gasolina95 && (
            <Line
              type="monotone"
              dataKey="gasolina95"
              name="Gasolina 95"
              stroke={COLORS.gasolina95}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls
            />
          )}

          {visibleLines.gasolina98 && (
            <Line
              type="monotone"
              dataKey="gasolina98"
              name="Gasolina 98"
              stroke={COLORS.gasolina98}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Footer note */}
      <p className="text-xs text-gray-400 mt-4 text-right">
        Media nacional · Península y Baleares · Datos oficiales MITERD
      </p>
    </div>
  );
}
