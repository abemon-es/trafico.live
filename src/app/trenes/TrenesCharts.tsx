"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { TrendingUp, Calendar } from "lucide-react";

interface TimelinePoint {
  recordedAt: string;
  avgDelay: number;
  punctualityRate: number;
  totalTrains: number;
}

interface DailyPoint {
  date: string;
  avgDelay: number;
  punctualityRate: number;
  maxDelay: number;
  avgTrains: number;
  totalAlerts: number;
  totalCancellations: number;
}

interface TrenesChartsProps {
  timeline: TimelinePoint[];
  dailyTrend: DailyPoint[];
}

export default function TrenesCharts({ timeline, dailyTrend }: TrenesChartsProps) {
  return (
    <>
      {/* ── Intraday timeline chart (from snapshots) ── */}
      {timeline.length > 3 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-heading font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[var(--tl-primary)]" />
            Evolución — puntualidad y retraso
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline.map((s) => ({
                time: new Date(s.recordedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
                punctuality: Number(s.punctualityRate),
                delay: Number(s.avgDelay),
                trains: s.totalTrains,
              }))}>
                <defs>
                  <linearGradient id="gradPunct" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDelay" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}m`} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  formatter={(value, name) => [
                    name === "punctuality" ? `${Number(value ?? 0).toFixed(1)}%` : `${Number(value ?? 0).toFixed(1)} min`,
                    name === "punctuality" ? "Puntualidad" : "Retraso medio",
                  ]}
                  labelFormatter={(label: string) => `Hora: ${label}`}
                />
                <Area yAxisId="left" type="monotone" dataKey="punctuality" stroke="#059669" fill="url(#gradPunct)" strokeWidth={2} dot={false} />
                <Area yAxisId="right" type="monotone" dataKey="delay" stroke="#dc2626" fill="url(#gradDelay)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2 text-xs text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-[#059669]" />Puntualidad (%)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-[#dc2626]" />Retraso medio (min)</span>
          </div>
        </div>
      )}

      {/* ── 30-day daily trend ── */}
      {dailyTrend.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-heading font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-[var(--tl-accent)]" />
            Tendencia diaria — últimos {dailyTrend.length} días
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend.map((d) => ({
                date: new Date(d.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
                punctuality: Number(d.punctualityRate),
                delay: Number(d.avgDelay),
                maxDelay: d.maxDelay,
                trains: d.avgTrains,
                alerts: d.totalAlerts,
                cancellations: d.totalCancellations,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}m`} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      punctuality: "Puntualidad",
                      delay: "Retraso medio",
                      maxDelay: "Max retraso",
                      trains: "Trenes (media)",
                      alerts: "Alertas",
                      cancellations: "Cancelaciones",
                    };
                    const suffix: Record<string, string> = {
                      punctuality: "%",
                      delay: " min",
                      maxDelay: " min",
                    };
                    return [`${value ?? 0}${suffix[String(name)] || ""}`, labels[String(name)] || String(name)];
                  }}
                />
                <Line yAxisId="left" type="monotone" dataKey="punctuality" stroke="#059669" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="delay" stroke="#dc2626" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="maxDelay" stroke="#ea580c" strokeWidth={1} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2 text-xs text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-[#059669]" />Puntualidad (%)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-[#dc2626]" />Retraso medio (min)</span>
            <span className="flex items-center gap-1"><span className="w-6 h-0 border-t border-dashed border-[#ea580c]" />Max retraso</span>
          </div>
        </div>
      )}
    </>
  );
}
