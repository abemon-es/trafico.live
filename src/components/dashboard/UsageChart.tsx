"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Activity, Download, TrendingUp } from "lucide-react";

type Range = "7d" | "30d" | "90d";

interface DailyPoint {
  date: string;
  requests: number;
}

interface EndpointRow {
  endpoint: string;
  calls: number;
}

interface UsageSummary {
  total: number;
  avgPerDay: number;
  topEndpoint: string | null;
}

interface UsageData {
  range: Range;
  daily: DailyPoint[];
  byEndpoint: EndpointRow[];
  summary: UsageSummary;
}

function formatDateLabel(dateStr: string, range: Range): string {
  const d = new Date(dateStr + "T12:00:00");
  if (range === "7d") return new Intl.DateTimeFormat("es-ES", { weekday: "short" }).format(d);
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(d);
}

function downloadCsv(data: UsageData) {
  const header = "fecha,peticiones\n";
  const rows = data.daily.map((d) => `${d.date},${d.requests}`).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `uso-api-${data.range}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function UsageChart() {
  const [range, setRange] = useState<Range>("7d");
  const [data, setData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const fetchData = useCallback(async (r: Range) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/usage?range=${r}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  const RANGES: { label: string; value: Range }[] = [
    { label: "7 días", value: "7d" },
    { label: "30 días", value: "30d" },
    { label: "90 días", value: "90d" },
  ];

  const lineData = data?.daily.map((d) => ({
    label: formatDateLabel(d.date, range),
    requests: d.requests,
  }));

  const barData = data?.byEndpoint.map((e) => ({
    endpoint: e.endpoint.replace("/api/", ""),
    calls: e.calls,
  }));

  return (
    <div className="space-y-6">
      {/* Header + controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-tl-500" />
          <h2 className="text-base font-heading font-600 text-foreground">Uso de la API</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-tl-200 dark:border-tl-700 overflow-hidden" role="group" aria-label="Rango de fechas">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                aria-pressed={range === r.value}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  range === r.value
                    ? "bg-tl-600 text-white"
                    : "text-tl-600 dark:text-tl-300 hover:bg-tl-50 dark:hover:bg-tl-900"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {data && (
            <button
              onClick={() => downloadCsv(data)}
              aria-label="Descargar CSV"
              title="Descargar CSV"
              className="p-1.5 rounded-lg border border-tl-200 dark:border-tl-700 text-tl-500 hover:text-tl-700 dark:hover:text-tl-300 hover:bg-tl-50 dark:hover:bg-tl-900 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-tl-100 dark:border-tl-800 bg-tl-50/50 dark:bg-tl-900/30 p-4">
            <p className="text-xs text-tl-500 font-body mb-1">Total ({range})</p>
            <p className="font-mono text-xl font-500 text-foreground">
              {new Intl.NumberFormat("es-ES").format(data.summary.total)}
            </p>
          </div>
          <div className="rounded-lg border border-tl-100 dark:border-tl-800 bg-tl-50/50 dark:bg-tl-900/30 p-4">
            <p className="text-xs text-tl-500 font-body mb-1">Media diaria</p>
            <p className="font-mono text-xl font-500 text-foreground">
              {new Intl.NumberFormat("es-ES").format(data.summary.avgPerDay)}
            </p>
          </div>
          <div className="rounded-lg border border-tl-100 dark:border-tl-800 bg-tl-50/50 dark:bg-tl-900/30 p-4">
            <p className="text-xs text-tl-500 font-body mb-1">Endpoint principal</p>
            <p className="font-mono text-sm font-500 text-foreground truncate">
              {data.summary.topEndpoint ? data.summary.topEndpoint.replace("/api/", "") : "—"}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-tl-500/30 border-t-tl-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Line chart — requests over time */}
          <div className="rounded-xl border border-tl-200 dark:border-tl-800 bg-white dark:bg-tl-950 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-tl-500" />
              <h3 className="text-sm font-medium text-foreground font-body">
                Peticiones por día
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-tl-100)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "var(--color-tl-400)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={range === "90d" ? 9 : range === "30d" ? 4 : 0}
                />
                <YAxis
                  tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "var(--color-tl-400)" }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(v) => new Intl.NumberFormat("es-ES", { notation: "compact" }).format(v)}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--background)",
                    border: "1px solid var(--color-tl-200)",
                    borderRadius: "8px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                  }}
                  formatter={(v: number) => [new Intl.NumberFormat("es-ES").format(v), "peticiones"]}
                />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="var(--color-tl-500)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={!reducedMotion}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart — top endpoints */}
          {barData && barData.length > 0 && (
            <div className="rounded-xl border border-tl-200 dark:border-tl-800 bg-white dark:bg-tl-950 p-5">
              <h3 className="text-sm font-medium text-foreground font-body mb-4">
                Top 10 endpoints
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ top: 0, right: 40, bottom: 0, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-tl-100)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "var(--color-tl-400)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => new Intl.NumberFormat("es-ES", { notation: "compact" }).format(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="endpoint"
                    width={120}
                    tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--color-tl-500)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--background)",
                      border: "1px solid var(--color-tl-200)",
                      borderRadius: "8px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                    }}
                    formatter={(v: number) => [new Intl.NumberFormat("es-ES").format(v), "peticiones"]}
                  />
                  <Bar
                    dataKey="calls"
                    fill="var(--color-tl-amber-400)"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={!reducedMotion}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
