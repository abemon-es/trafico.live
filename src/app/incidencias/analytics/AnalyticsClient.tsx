"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart2,
  Loader2,
  TrendingUp,
  MapPin,
  Clock,
  Calendar,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HourEntry {
  hour: number;
  count: number;
}

interface DayEntry {
  day: string;
  count: number;
}

interface RoadEntry {
  road: string;
  count: number;
}

interface ProvinceEntry {
  province: string;
  count: number;
}

interface TypeEntry {
  type: string;
  label: string;
  count: number;
  [key: string]: string | number; // required by Recharts ChartDataInput
}

interface AnalyticsData {
  incidentsByHour: HourEntry[];
  incidentsByDay: DayEntry[];
  topRoads: RoadEntry[];
  topProvinces: ProvinceEntry[];
  byType: TypeEntry[];
  totalActive: number;
  totalHistoric: number;
  periodDays: number;
  generatedAt: string;
}

type Period = 7 | 30 | 90;

// ─── Constants ───────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<Period, string> = {
  7: "Últimos 7 días",
  30: "Últimos 30 días",
  90: "Últimos 90 días",
};

const TYPE_COLORS: Record<string, string> = {
  ACCIDENT: "#dc2626",
  ROADWORK: "#f59e0b",
  CONGESTION: "#f97316",
  HAZARD: "#7c3aed",
  VEHICLE_BREAKDOWN: "#0891b2",
  WEATHER: "#2563eb",
  EVENT: "#16a34a",
  CLOSURE: "#be123c",
  OTHER: "#6b7280",
};

const CHART_BLUE = "#2563eb";
const CHART_ORANGE = "#f97316";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}h`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("es-ES");
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color = "blue",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: "blue" | "red" | "green" | "orange";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">
          {typeof value === "number" ? formatNumber(value) : value}
        </p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-gray-800 mb-4">{children}</h2>
  );
}

function ChartCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      {children}
    </div>
  );
}

// Custom tooltip for Recharts
function CustomTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueLabel = "Incidencias",
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string | number;
  labelFormatter?: (l: string | number) => string;
  valueLabel?: string;
}) {
  if (!active || !payload?.length) return null;
  const displayLabel = labelFormatter ? labelFormatter(label ?? "") : label;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-gray-700">{displayLabel}</p>
      <p className="text-blue-600 font-semibold">
        {formatNumber(payload[0].value)} {valueLabel}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function IncidenciasAnalyticsClient() {
  const [period, setPeriod] = useState<Period>(30);

  const { data, error, isLoading } = useSWR<AnalyticsData>(
    `/api/incidents/analytics?days=${period}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    }
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/incidencias"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a incidencias
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart2 className="w-8 h-8 text-blue-600" />
                Análisis de Incidencias de Tráfico
              </h1>
              <p className="mt-1 text-gray-600">
                Patrones históricos basados en{" "}
                {data ? formatNumber(data.totalHistoric) : "..."} incidencias
                registradas.
              </p>
            </div>

            {/* Period selector */}
            <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
              {([7, 30, 90] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    period === p
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p}d
                </button>
              ))}
            </div>
          </div>
          {data && (
            <p className="text-xs text-gray-400 mt-2">
              Período: {PERIOD_LABELS[period]} · Datos actualizados cada 5 min
            </p>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
            <p>Cargando análisis...</p>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-24 text-red-500">
            <AlertTriangle className="w-10 h-10 mb-4" />
            <p className="font-medium">Error al cargar los datos</p>
            <p className="text-sm text-gray-500 mt-1">
              Por favor, inténtalo de nuevo más tarde.
            </p>
          </div>
        )}

        {/* Content */}
        {data && !isLoading && (
          <div className="space-y-8">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={AlertTriangle}
                label="Incidencias activas ahora"
                value={data.totalActive}
                color="red"
              />
              <StatCard
                icon={TrendingUp}
                label={`Total en ${PERIOD_LABELS[period].toLowerCase()}`}
                value={data.totalHistoric}
                color="blue"
              />
              <StatCard
                icon={Clock}
                label="Hora punta (más incidencias)"
                value={
                  data.incidentsByHour.length
                    ? formatHour(
                        data.incidentsByHour.reduce((max, h) =>
                          h.count > max.count ? h : max
                        ).hour
                      )
                    : "--"
                }
                color="orange"
              />
              <StatCard
                icon={Calendar}
                label="Día más conflictivo"
                value={
                  data.incidentsByDay.length
                    ? data.incidentsByDay.reduce((max, d) =>
                        d.count > max.count ? d : max
                      ).day
                    : "--"
                }
                color="green"
              />
            </div>

            {/* Hourly chart */}
            <ChartCard>
              <SectionTitle>Incidencias por hora del día</SectionTitle>
              <p className="text-sm text-gray-500 mb-4">
                Distribución de incidencias según la hora en que comenzaron
                durante los {PERIOD_LABELS[period].toLowerCase()}.
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={data.incidentsByHour}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={formatHour}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    interval={1}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} width={45} />
                  <Tooltip
                    content={
                      <CustomTooltip
                        labelFormatter={(l) => `Hora: ${formatHour(Number(l))}`}
                      />
                    }
                  />
                  <Bar
                    dataKey="count"
                    fill={CHART_BLUE}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Day of week chart */}
            <ChartCard>
              <SectionTitle>Incidencias por día de la semana</SectionTitle>
              <p className="text-sm text-gray-500 mb-4">
                Días con mayor concentración de incidencias de tráfico.
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={data.incidentsByDay}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} width={45} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="count"
                    fill={CHART_ORANGE}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Top roads + type breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top roads horizontal bar */}
              <ChartCard>
                <SectionTitle>Top 15 carreteras con más incidencias</SectionTitle>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart
                    data={data.topRoads}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f0f0f0"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                    />
                    <YAxis
                      dataKey="road"
                      type="category"
                      tick={{ fontSize: 12, fill: "#374151", fontWeight: 500 }}
                      width={60}
                    />
                    <Tooltip
                      content={
                        <CustomTooltip
                          labelFormatter={(l) => `Carretera ${l}`}
                        />
                      }
                    />
                    <Bar
                      dataKey="count"
                      fill={CHART_BLUE}
                      radius={[0, 3, 3, 0]}
                      maxBarSize={22}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Type breakdown pie */}
              <ChartCard>
                <SectionTitle>Tipos de incidencia</SectionTitle>
                <ResponsiveContainer width="100%" height={360}>
                  <PieChart>
                    <Pie
                      data={data.byType}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="45%"
                      outerRadius={110}
                      innerRadius={55}
                      paddingAngle={2}
                      label={({ label: entryLabel, percent }: { label?: string; percent?: number }) =>
                        (percent ?? 0) > 0.04
                          ? `${entryLabel} (${((percent ?? 0) * 100).toFixed(0)}%)`
                          : ""
                      }
                      labelLine={false}
                    >
                      {data.byType.map((entry) => (
                        <Cell
                          key={entry.type}
                          fill={TYPE_COLORS[entry.type] ?? "#6b7280"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number | undefined, name: string | undefined) => [
                        formatNumber(value ?? 0),
                        name ?? "",
                      ]}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={10}
                      formatter={(value) => (
                        <span className="text-sm text-gray-600">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Top provinces table */}
            <ChartCard>
              <SectionTitle>
                <span className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  Top 15 provincias con más incidencias
                </span>
              </SectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 font-semibold text-gray-600 w-10">
                        #
                      </th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-600">
                        Provincia
                      </th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-600">
                        Incidencias
                      </th>
                      <th className="py-2 px-3 w-36">
                        <span className="sr-only">Barra</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProvinces.map((p, idx) => {
                      const max = data.topProvinces[0]?.count ?? 1;
                      const pct = Math.round((p.count / max) * 100);
                      return (
                        <tr
                          key={p.province}
                          className={`border-b border-gray-50 ${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                          }`}
                        >
                          <td className="py-2.5 px-3 text-gray-400 font-mono text-xs">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-gray-800">
                            {p.province}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-blue-700">
                            {formatNumber(p.count)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            {/* Footer note */}
            <p className="text-xs text-gray-400 text-center pb-4">
              Datos obtenidos de DGT, SCT, Euskadi y Madrid.{" "}
              {data.generatedAt
                ? `Última actualización: ${new Date(data.generatedAt).toLocaleString("es-ES")}`
                : ""}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
