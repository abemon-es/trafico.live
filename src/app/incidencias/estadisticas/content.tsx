"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  TrendingUp,
  MapPin,
  Calendar,
  BarChart3,
  Activity,
  Route,
  PieChart,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { BreakdownChart, type ChartDataItem } from "@/components/stats/BreakdownCharts";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Types
interface IncidentStatsResponse {
  success: boolean;
  data: {
    totals: {
      totalIncidents: number;
      avgDurationMins: number | null;
      incidentsLast24h: number;
      incidentsLast7d: number;
      activeNow: number;
    };
    byType: Array<{ type: string; label: string; count: number; percentage: number }>;
    byCause: Array<{ cause: string | null; label: string; count: number }>;
    bySource: Array<{ source: string | null; count: number }>;
    bySeverity: Array<{ severity: string; label: string; count: number }>;
    hourlyPattern: Array<{ hour: number; avgCount: number; totalCount: number }>;
    weeklyPattern: Array<{ day: number; dayName: string; avgCount: number; totalCount: number }>;
    heatmapData: Array<{ hour: number; day: number; value: number }>;
    peaks: {
      hour: { hour: number; avgCount: number };
      day: { dayName: string; avgCount: number };
    };
    dailyTrend: Array<{ date: string; count: number }>;
    topRoads: Array<{ road: string; count: number }>;
    provinceRanking: Array<{ province: string; count: number }>;
    periodDays: number;
  };
}

// Period options
const PERIOD_OPTIONS = [
  { value: 7, label: "7 días" },
  { value: 14, label: "14 días" },
  { value: 30, label: "30 días" },
  { value: 90, label: "90 días" },
  { value: 180, label: "6 meses" },
  { value: 365, label: "1 año" },
];

function StatCard({
  icon: Icon,
  iconBgColor,
  iconColor,
  value,
  label,
  subLabel,
  isLoading,
}: {
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
  value: number | string;
  label: string;
  subLabel?: string;
  isLoading?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-2 ${iconBgColor} rounded-lg`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      {isLoading ? (
        <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
      ) : (
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
          {typeof value === "number" ? value.toLocaleString("es-ES") : value}
        </p>
      )}
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      {subLabel && <p className="text-xs text-gray-400 mt-1">{subLabel}</p>}
    </div>
  );
}

function DailyTrendChart({
  data,
  isLoading,
}: {
  data?: Array<{ date: string; count: number }>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="h-6 w-48 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-64 bg-gray-100 dark:bg-gray-900 animate-pulse rounded" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-tl-600 dark:text-tl-400" />
          Tendencia Diaria
        </h2>
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No hay datos disponibles</p>
          </div>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-tl-600 dark:text-tl-400" />
        Tendencia Diaria de Incidencias
      </h2>
      <div className="h-64 flex items-end gap-1">
        {data.map((day, idx) => {
          const height = (day.count / maxCount) * 100;
          const date = new Date(day.date);
          const dayLabel = date.toLocaleDateString("es-ES", { weekday: "short" });
          return (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-red-50 dark:bg-red-900/200 rounded-t hover:bg-red-600 transition-colors"
                style={{ height: `${height}%`, minHeight: day.count > 0 ? "4px" : "0" }}
                title={`${day.date}: ${day.count} incidencias`}
              />
              {data.length <= 31 && (
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate w-full text-center">
                  {dayLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HourlyHeatmap({
  data,
  peaks,
  isLoading,
}: {
  data?: Array<{ hour: number; day: number; value: number }>;
  peaks?: { hour: { hour: number; avgCount: number }; day: { dayName: string; avgCount: number } };
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="h-6 w-48 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-48 bg-gray-100 dark:bg-gray-900 animate-pulse rounded" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Patrón Horario
        </h2>
        <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Sin datos de patrones horarios</p>
          </div>
        </div>
      </div>
    );
  }

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const getColor = (value: number) => {
    const intensity = value / maxValue;
    if (intensity === 0) return "bg-gray-100 dark:bg-gray-900";
    if (intensity < 0.25) return "bg-red-100 dark:bg-red-900/30";
    if (intensity < 0.5) return "bg-red-200";
    if (intensity < 0.75) return "bg-red-400";
    return "bg-red-600";
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        Patrón Hora × Día de la Semana
      </h2>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex mb-1">
            <div className="w-12" />
            {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
              <div key={h} className="flex-1 text-xs text-gray-500 dark:text-gray-400 text-center">
                {h}:00
              </div>
            ))}
          </div>
          {/* Grid - Monday to Sunday */}
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <div key={day} className="flex items-center mb-1">
              <div className="w-12 text-xs text-gray-500 dark:text-gray-400">{dayNames[day]}</div>
              <div className="flex-1 flex gap-0.5">
                {Array.from({ length: 24 }, (_, hour) => {
                  const cell = data.find((d) => d.hour === hour && d.day === day);
                  const value = cell?.value || 0;
                  return (
                    <div
                      key={hour}
                      className={`flex-1 h-4 rounded-sm ${getColor(value)}`}
                      title={`${dayNames[day]} ${hour}:00 - Promedio: ${value}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {peaks && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <span className="font-medium">Hora pico:</span> <span className="font-data">{peaks.hour.hour}:00</span> (promedio{" "}
            <span className="font-data">{peaks.hour.avgCount}</span> incidencias)
          </p>
          <p>
            <span className="font-medium">Día con más incidencias:</span> {peaks.day.dayName}{" "}
            (promedio <span className="font-data">{peaks.day.avgCount}</span> incidencias/hora)
          </p>
        </div>
      )}
    </div>
  );
}

function IncidentTypeChart({
  data,
  isLoading,
}: {
  data?: Array<{ type: string; label: string; count: number; percentage: number }>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="h-6 w-48 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-64 bg-gray-100 dark:bg-gray-900 animate-pulse rounded" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          Por Tipo de Incidencia
        </h2>
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <Layers className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No hay datos disponibles</p>
          </div>
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);

  // Colors for different incident types
  const typeColors: Record<string, string> = {
    ACCIDENT: "bg-red-50 dark:bg-red-900/200",
    ROADWORK: "bg-orange-50 dark:bg-orange-900/200",
    CONGESTION: "bg-yellow-50 dark:bg-yellow-900/200",
    HAZARD: "bg-purple-50 dark:bg-purple-900/200",
    VEHICLE_BREAKDOWN: "bg-tl-50 dark:bg-tl-900/200",
    WEATHER: "bg-cyan-50 dark:bg-cyan-900/200",
    EVENT: "bg-pink-500",
    CLOSURE: "bg-gray-700",
    OTHER: "bg-gray-400",
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Layers className="w-5 h-5 text-orange-600 dark:text-orange-400" />
        Por Tipo de Incidencia
      </h2>
      <div className="space-y-3">
        {data.map((item, idx) => {
          const bgColor = typeColors[item.type] || "bg-gray-50 dark:bg-gray-9500";
          return (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-28 text-sm text-gray-600 dark:text-gray-400 truncate" title={item.label}>
                {item.label}
              </div>
              <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
                <div
                  className={`h-full ${bgColor} rounded`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <div className="w-20 text-sm text-gray-600 dark:text-gray-400 text-right font-data">
                {item.count.toLocaleString("es-ES")} ({item.percentage}%)
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
        Total: <span className="font-data">{total.toLocaleString("es-ES")}</span> incidencias
      </p>
    </div>
  );
}

function SeverityChart({
  data,
  isLoading,
}: {
  data?: Array<{ severity: string; label: string; count: number }>;
  isLoading: boolean;
}) {
  if (isLoading || !data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-red-600 dark:text-red-400" />
          Por Severidad
        </h2>
        <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
          {isLoading ? (
            <div className="animate-pulse">Cargando...</div>
          ) : (
            <div className="text-center">
              <PieChart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay datos disponibles</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);

  const severityColors: Record<string, string> = {
    LOW: "bg-green-50 dark:bg-green-900/200",
    MEDIUM: "bg-yellow-50 dark:bg-yellow-900/200",
    HIGH: "bg-orange-50 dark:bg-orange-900/200",
    VERY_HIGH: "bg-red-600",
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <PieChart className="w-5 h-5 text-red-600 dark:text-red-400" />
        Por Severidad
      </h2>
      <div className="space-y-3">
        {data.map((item, idx) => {
          const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
          const bgColor = severityColors[item.severity] || "bg-gray-50 dark:bg-gray-9500";
          return (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-20 text-sm text-gray-600 dark:text-gray-400">{item.label}</div>
              <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
                <div className={`h-full ${bgColor} rounded`} style={{ width: `${percentage}%` }} />
              </div>
              <div className="w-20 text-sm text-gray-600 dark:text-gray-400 text-right font-data">
                {item.count.toLocaleString("es-ES")} ({percentage}%)
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SourceChart({
  data,
  isLoading,
}: {
  data?: Array<{ source: string | null; count: number }>;
  isLoading: boolean;
}) {
  if (isLoading || !data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-tl-600 dark:text-tl-400" />
          Por Fuente de Datos
        </h2>
        <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
          {isLoading ? (
            <div className="animate-pulse">Cargando...</div>
          ) : (
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay datos disponibles</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Source descriptions
  const sourceDescriptions: Record<string, string> = {
    DGT: "Dirección General de Tráfico",
    SCT: "Servei Català de Trànsit",
    EUSKADI: "Tráfico País Vasco",
    MADRID: "DGT Madrid",
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-tl-600 dark:text-tl-400" />
        Por Fuente de Datos
      </h2>
      <div className="space-y-3">
        {data.map((item, idx) => {
          const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
          const barWidth = (item.count / maxCount) * 100;
          const source = item.source || "Desconocido";
          return (
            <div key={idx}>
              <div className="flex items-center gap-3">
                <div className="w-20 text-sm font-medium text-gray-900 dark:text-gray-100">{source}</div>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
                  <div
                    className="h-full bg-tl-50 dark:bg-tl-900/200 rounded"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="w-24 text-sm text-gray-600 dark:text-gray-400 text-right font-data">
                  {item.count.toLocaleString("es-ES")} ({percentage}%)
                </div>
              </div>
              {sourceDescriptions[source] && (
                <p className="text-xs text-gray-400 ml-0 mt-0.5">
                  {sourceDescriptions[source]}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function IncidentStatsContent() {
  const [period, setPeriod] = useState(30);

  const { data, isLoading } = useSWR<IncidentStatsResponse>(
    `/api/incidents/stats?days=${period}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const hasData = data?.success && data.data.totals.totalIncidents > 0;

  // Convert to chart format
  const provinceChartData: ChartDataItem[] =
    data?.data?.provinceRanking?.map((p) => ({
      name: p.province,
      value: p.count,
    })) || [];

  const roadChartData: ChartDataItem[] =
    data?.data?.topRoads?.map((r) => ({
      name: r.road,
      value: r.count,
    })) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/incidencias"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Estadísticas de Incidencias</h1>
            </div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Análisis de incidencias de tráfico registradas en carreteras españolas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="period" className="text-sm text-gray-600 dark:text-gray-400">
              Período:
            </label>
            <select
              id="period"
              value={period}
              onChange={(e) => setPeriod(parseInt(e.target.value, 10))}
              className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard
            icon={AlertTriangle}
            iconBgColor="bg-red-50 dark:bg-red-900/20"
            iconColor="text-red-600 dark:text-red-400"
            value={hasData ? data.data.totals.totalIncidents : "-"}
            label="Total Período"
            subLabel={hasData ? `${data.data.periodDays} días de datos` : undefined}
            isLoading={isLoading}
          />
          <StatCard
            icon={Activity}
            iconBgColor="bg-green-50 dark:bg-green-900/20"
            iconColor="text-green-600 dark:text-green-400"
            value={hasData ? data.data.totals.activeNow : "-"}
            label="Activas Ahora"
            isLoading={isLoading}
          />
          <StatCard
            icon={Clock}
            iconBgColor="bg-tl-50 dark:bg-tl-900/20"
            iconColor="text-tl-600 dark:text-tl-400"
            value={hasData ? data.data.totals.incidentsLast24h : "-"}
            label="Últimas 24h"
            isLoading={isLoading}
          />
          <StatCard
            icon={Calendar}
            iconBgColor="bg-purple-50 dark:bg-purple-900/20"
            iconColor="text-purple-600 dark:text-purple-400"
            value={hasData ? data.data.totals.incidentsLast7d : "-"}
            label="Últimos 7 días"
            isLoading={isLoading}
          />
          <StatCard
            icon={Clock}
            iconBgColor="bg-orange-50 dark:bg-orange-900/20"
            iconColor="text-orange-600 dark:text-orange-400"
            value={
              hasData && data.data.totals.avgDurationMins
                ? `${data.data.totals.avgDurationMins} min`
                : "-"
            }
            label="Duración Media"
            isLoading={isLoading}
          />
        </div>

        {/* Charts */}
        <div className="space-y-8">
          {/* Daily Trend - Full Width */}
          <DailyTrendChart data={data?.data?.dailyTrend} isLoading={isLoading} />

          {/* Two Column: Incident Type & Severity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <IncidentTypeChart data={data?.data?.byType} isLoading={isLoading} />
            <SeverityChart data={data?.data?.bySeverity} isLoading={isLoading} />
          </div>

          {/* Two Column: Heatmap & Source */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <HourlyHeatmap
              data={data?.data?.heatmapData}
              peaks={data?.data?.peaks}
              isLoading={isLoading}
            />
            <SourceChart data={data?.data?.bySource} isLoading={isLoading} />
          </div>

          {/* Two Column: Province & Road Rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {provinceChartData.length > 0 ? (
              <BreakdownChart
                title="Top Provincias"
                data={provinceChartData}
                note="Incidencias registradas por provincia"
                labelWidth={120}
              />
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  Ranking por Provincia
                </h2>
                <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  {isLoading ? (
                    <div className="animate-pulse">Cargando...</div>
                  ) : (
                    <div className="text-center">
                      <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No hay datos disponibles</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {roadChartData.length > 0 ? (
              <BreakdownChart
                title="Top Carreteras"
                data={roadChartData}
                note="Carreteras con más incidencias"
                labelWidth={80}
              />
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Route className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  Top Carreteras
                </h2>
                <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  {isLoading ? (
                    <div className="animate-pulse">Cargando...</div>
                  ) : (
                    <div className="text-center">
                      <Route className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No hay datos disponibles</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data Source Note */}
        <div className="mt-8 bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-lg p-4">
          <h3 className="font-semibold text-tl-900 mb-2">Sobre estos datos</h3>
          <p className="text-sm text-tl-800 dark:text-tl-200">
            Los datos de incidencias se obtienen en tiempo real de múltiples fuentes oficiales: DGT
            (Dirección General de Tráfico), SCT (Servei Català de Trànsit), Tráfico País Vasco, y
            DGT Madrid. Las incidencias incluyen accidentes, obras, congestiones, cortes de
            carretera y condiciones meteorológicas adversas.
          </p>
        </div>

        {/* Link back to live map */}
        <div className="mt-4">
          <Link
            href="/incidencias"
            className="inline-flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:text-red-400 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Ver mapa de incidencias en tiempo real
          </Link>
        </div>
      </main>
    </div>
  );
}
