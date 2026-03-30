"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  Users,
  Car,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Activity,
  Clock,
  MapPin,
  Route,
  Layers,
  PieChart,
  Calendar,
  CloudRain,
  Shield,
  Zap,
  Link2,
} from "lucide-react";
import { BreakdownChart, type ChartDataItem } from "@/components/stats/BreakdownCharts";
import { TimeSeriesChart, type YearlyDataPoint } from "@/components/stats/TimeSeriesChart";
import { V16InfoSection } from "@/components/v16/V16InfoSection";

// Dynamic import for map to avoid SSR issues
const HistoricalMap = dynamic(
  () => import("@/components/map/HistoricalMap").then((mod) => mod.HistoricalMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="h-[400px] bg-gray-100 dark:bg-gray-900 animate-pulse" />
      </div>
    ),
  }
);

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// ============================================
// TYPES
// ============================================

interface HistoricalApiResponse {
  success: boolean;
  data: {
    totals: {
      accidents: number;
      fatalities: number;
      hospitalized: number;
      nonHospitalized: number;
    };
    provinceBreakdown: Array<{
      name: string;
      accidents: number;
      fatalities: number;
    }>;
    yearlyData: YearlyDataPoint[];
    yearOverYearChange: number | null;
  };
}

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

interface V16StatsResponse {
  success: boolean;
  data: {
    totals: {
      v16Total: number;
      incidentTotal: number;
      daysWithData: number;
      avgDurationSecs: number | null;
    };
    peak: { date: string; count: number; peakHour: number | null } | null;
    dailyData: Array<{ date: string; v16Count: number; incidentCount: number }>;
    dataStartDate: string | null;
  };
}

interface V16ProvincesResponse {
  success: boolean;
  data: {
    provinceRanking: Array<{ code: string; name: string; count: number; avgDurationSecs: number | null }>;
    communityRanking: Array<{ code: string; name: string; count: number }>;
    roadTypeBreakdown: Array<{ type: string; count: number }>;
    totals: { totalBeacons: number; provinces: number; communities: number };
  };
}

// V16 Realtime API response (from /api/v16)
interface V16RealtimeResponse {
  count: number;
  lastUpdated: string;
  beacons: Array<{
    id: string;
    lat: number;
    lng: number;
    road: string | null;
    km: number | null;
    severity: string;
    activatedAt: string;
    description: string | null;
    province: string | null;
  }>;
}

// V16 Hourly API response
interface V16HourlyApiResponse {
  success: boolean;
  data: {
    hourlyAverages: Array<{ hour: number; avgCount: number }>;
    weeklyPattern: Array<{ day: number; dayName: string; avgCount: number }>;
    heatmapData: Array<{ hour: number; day: number; value: number }>;
    peaks: {
      hour: { hour: number; avgCount: number };
      day: { dayName: string; avgCount: number };
    };
  };
}

// V16 Duration API response
interface V16DurationApiResponse {
  success: boolean;
  data: {
    stats: {
      count: number;
      avgMinutes: number;
      medianMinutes: number;
      p90Secs: number;
      p95Secs: number;
    } | null;
    distribution: Array<{ label: string; count: number; percentage: number }>;
    byProvince: Array<{
      code: string;
      name: string;
      avgDurationSecs: number;
      count: number;
    }>;
    message?: string;
  };
}

// V16 Map API response
interface V16MapApiResponse {
  success: boolean;
  data: {
    beacons: Array<{
      id: string;
      lat: number;
      lng: number;
      activatedAt: string;
      road: string | null;
      province: string | null;
      severity: string;
      durationSecs: number | null;
      severityWeight: number;
    }>;
    clusters: Array<{
      province: string;
      lat: number;
      lng: number;
      count: number;
    }>;
    count: number;
  };
}

// V16 Roads API response
interface V16RoadsApiResponse {
  success: boolean;
  data: {
    roads: Array<{
      road: string;
      count: number;
      avgDurationMins: number | null;
      topKmPoints: Array<{ km: string; count: number }>;
      severityBreakdown: {
        LOW: number;
        MEDIUM: number;
        HIGH: number;
        VERY_HIGH: number;
      };
    }>;
    totals: {
      uniqueRoads: number;
      totalBeacons: number;
    };
  };
}

// Period configuration for V16 Section
type V16PeriodValue = "ahora" | "hoy" | "7d" | "mes" | "trimestre" | "semestre" | "ano" | "todo";

interface V16PeriodOption {
  value: V16PeriodValue;
  label: string;
  days: number | null;
}

const V16_PERIOD_OPTIONS: V16PeriodOption[] = [
  { value: "ahora", label: "Ahora (Tiempo real)", days: null },
  { value: "hoy", label: "Hoy", days: 1 },
  { value: "7d", label: "7 días", days: 7 },
  { value: "mes", label: "Este mes", days: null },
  { value: "trimestre", label: "Este trimestre", days: null },
  { value: "semestre", label: "Este semestre", days: null },
  { value: "ano", label: "Este año", days: null },
  { value: "todo", label: "Todo", days: null },
];

function getV16PeriodDays(period: V16PeriodValue): number {
  const now = new Date();

  switch (period) {
    case "ahora":
      return 0;
    case "hoy":
      return 1;
    case "7d":
      return 7;
    case "mes": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return Math.ceil((now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    case "trimestre": {
      const quarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
      return Math.ceil((now.getTime() - startOfQuarter.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    case "semestre": {
      const semester = now.getMonth() < 6 ? 0 : 6;
      const startOfSemester = new Date(now.getFullYear(), semester, 1);
      return Math.ceil((now.getTime() - startOfSemester.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    case "ano": {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    case "todo":
      return 3650;
    default:
      return 30;
  }
}

interface WeatherImpactResponse {
  success: boolean;
  data: {
    correlation: {
      withAlerts: { avgIncidents: number; avgV16: number; days: number };
      withoutAlerts: { avgIncidents: number; avgV16: number; days: number };
      impactMultiplier: number;
    };
    byAlertType: Array<{ type: string; label: string; avgIncidents: number; avgV16: number; days: number }>;
    recentAlerts: Array<{ date: string; type: string; province: string; severity: string }>;
  };
}

interface RoadRiskResponse {
  success: boolean;
  data: {
    roads: Array<{
      road: string;
      incidentCount: number;
      v16Count: number;
      avgDurationMins: number | null;
      severityScore: number;
      riskScore: number;
      riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      hotspots: Array<{ km: number; count: number }>;
    }>;
    summary: {
      totalRoads: number;
      criticalRoads: number;
      highRiskRoads: number;
    };
  };
}

interface CorrelationResponse {
  success: boolean;
  data: {
    summary: {
      totalV16: number;
      totalIncidents: number;
      totalCorrelations: number;
      v16Correlated: number;
      incidentsCorrelated: number;
      v16CorrelationRate: number;
      incidentCorrelationRate: number;
    };
    byDistance: {
      under500m: number;
      under1km: number;
      under2km: number;
      over2km: number;
    };
    byTimeDiff: {
      during: number;
      within15min: number;
      within30min: number;
      within60min: number;
    };
    topProvinces: Array<{ province: string; count: number }>;
    topRoads: Array<{ road: string; count: number }>;
    sampleCorrelations: Array<{
      distanceKm: number;
      timeDiffMinutes: number;
      v16Time: string;
      incidentTime: string;
      province: string | null;
      road: string | null;
    }>;
    parameters: {
      days: number;
      maxDistanceKm: number;
      maxTimeDiffMinutes: number;
    };
  };
}

interface RankingsResponse {
  success: boolean;
  provinces: {
    byIncidentsTotal: Array<{ province: string; totalIncidents: number }>;
    byIncidentsPer100k: Array<{ province: string; incidentsPer100k: number; population: number }>;
    byV16Total: Array<{ province: string; totalV16: number }>;
    byV16Per100k: Array<{ province: string; v16Per100k: number; population: number }>;
    byAccidentsPer100k: Array<{ province: string; accidentsPer100k: number }>;
    mostImproved: Array<{ province: string; changePercent: number }>;
    mostWorsened: Array<{ province: string; changePercent: number }>;
  };
  roads: {
    byIncidentsTotal: Array<{ roadName: string; totalIncidents: number }>;
    byRiskScore: Array<{ roadName: string; riskScore: number }>;
    byIMD: Array<{ roadName: string; avgIMD: number }>;
    mostDangerous: Array<{ roadName: string; riskScore: number; incidentsPerKm: number }>;
  };
}

// Tab configuration
type TabId = "resumen" | "incidencias" | "v16" | "correlacion" | "historico" | "carreteras" | "clima" | "rankings";

const TABS: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
  { id: "resumen", label: "Resumen", icon: Activity },
  { id: "incidencias", label: "Incidencias", icon: AlertTriangle },
  { id: "v16", label: "Balizas V16", icon: Zap },
  { id: "correlacion", label: "Correlación", icon: Link2 },
  { id: "historico", label: "Histórico", icon: Calendar },
  { id: "carreteras", label: "Carreteras", icon: Route },
  { id: "clima", label: "Clima", icon: CloudRain },
  { id: "rankings", label: "Rankings", icon: BarChart3 },
];

// ============================================
// SHARED COMPONENTS
// ============================================

function StatCard({
  icon: Icon,
  iconBgColor,
  iconColor,
  value,
  label,
  subLabel,
  trend,
  isLoading,
}: {
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
  value: number | string;
  label: string;
  subLabel?: string;
  trend?: { value: number; isPositive: boolean } | null;
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
      {trend && !isLoading && (
        <div
          className={`flex items-center gap-1 mt-1 text-sm ${
            trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {trend.isPositive ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
          <span className="font-data">{Math.abs(trend.value).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
      {description && <p className="mt-1 text-gray-600 dark:text-gray-400">{description}</p>}
    </div>
  );
}

function HourlyHeatmap({
  data,
  peaks,
  isLoading,
  color = "red",
}: {
  data?: Array<{ hour: number; day: number; value: number }>;
  peaks?: { hour: { hour: number; avgCount: number }; day: { dayName: string; avgCount: number } };
  isLoading: boolean;
  color?: "red" | "orange" | "blue";
}) {
  if (isLoading || !data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Patrón Hora × Día
        </h3>
        <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
          {isLoading ? <div className="animate-pulse">Cargando...</div> : <p>Sin datos</p>}
        </div>
      </div>
    );
  }

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const colorClasses = {
    red: ["bg-gray-100 dark:bg-gray-900", "bg-red-100 dark:bg-red-900/30", "bg-red-200", "bg-red-400", "bg-red-600"],
    orange: ["bg-gray-100 dark:bg-gray-900", "bg-orange-100 dark:bg-orange-900/30", "bg-orange-200", "bg-orange-400", "bg-orange-600"],
    blue: ["bg-gray-100 dark:bg-gray-900", "bg-tl-100 dark:bg-tl-900/30", "bg-tl-200", "bg-tl-400", "bg-tl-600"],
  };

  const getColor = (value: number) => {
    const intensity = value / maxValue;
    const classes = colorClasses[color];
    if (intensity === 0) return classes[0];
    if (intensity < 0.25) return classes[1];
    if (intensity < 0.5) return classes[2];
    if (intensity < 0.75) return classes[3];
    return classes[4];
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        Patrón Hora × Día
      </h3>
      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          <div className="flex mb-1">
            <div className="w-10" />
            {[0, 6, 12, 18].map((h) => (
              <div key={h} className="flex-1 text-xs text-gray-500 dark:text-gray-400 text-center">
                {h}h
              </div>
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <div key={day} className="flex items-center mb-0.5">
              <div className="w-10 text-xs text-gray-500 dark:text-gray-400">{dayNames[day]}</div>
              <div className="flex-1 flex gap-0.5">
                {Array.from({ length: 24 }, (_, hour) => {
                  const cell = data.find((d) => d.hour === hour && d.day === day);
                  return (
                    <div
                      key={hour}
                      className={`flex-1 h-3 rounded-sm ${getColor(cell?.value || 0)}`}
                      title={`${dayNames[day]} ${hour}:00 - ${cell?.value || 0}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {peaks && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Pico: <span className="font-medium font-data">{peaks.hour.hour}:00</span> ({peaks.day.dayName})
        </p>
      )}
    </div>
  );
}

function DailyTrendMini({
  data,
  isLoading,
  color = "red",
  title,
}: {
  data?: Array<{ date: string; count: number }>;
  isLoading: boolean;
  color?: string;
  title: string;
}) {
  if (isLoading || !data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
        <div className="h-32 flex items-center justify-center text-gray-500 dark:text-gray-400">
          {isLoading ? <div className="animate-pulse">Cargando...</div> : <p>Sin datos</p>}
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const bgColor = color === "orange" ? "bg-orange-50 dark:bg-orange-900/200" : color === "blue" ? "bg-tl-50 dark:bg-tl-900/200" : "bg-red-50 dark:bg-red-900/200";

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
      <div className="h-32 flex items-end gap-0.5">
        {data.slice(-30).map((day, idx) => {
          const height = (day.count / maxCount) * 100;
          return (
            <div
              key={idx}
              className={`flex-1 ${bgColor} rounded-t hover:opacity-80`}
              style={{ height: `${height}%`, minHeight: day.count > 0 ? "2px" : "0" }}
              title={`${day.date}: ${day.count}`}
            />
          );
        })}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Últimos 30 días</p>
    </div>
  );
}

// V16-specific full-width daily trend chart
function V16DailyTrendChart({
  data,
  isLoading,
}: {
  data?: Array<{ date: string; v16Count: number; incidentCount: number }>;
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
            <p>No hay datos disponibles aún</p>
            <p className="text-sm mt-2">Los datos se recopilarán cada 5 minutos</p>
          </div>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.v16Count));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-tl-600 dark:text-tl-400" />
        Tendencia Diaria de Balizas V16
      </h2>
      <div className="h-64 flex items-end gap-1">
        {data.map((day, idx) => {
          const height = maxCount > 0 ? (day.v16Count / maxCount) * 100 : 0;
          const date = new Date(day.date);
          const dayLabel = date.toLocaleDateString("es-ES", { weekday: "short" });
          return (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-orange-50 dark:bg-orange-900/200 rounded-t hover:bg-orange-600 transition-colors"
                style={{ height: `${height}%`, minHeight: day.v16Count > 0 ? "4px" : "0" }}
                title={`${day.date}: ${day.v16Count} balizas`}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate w-full text-center">
                {dayLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// V16-specific hourly heatmap (24x7 grid)
function V16HourlyHeatmap({
  data,
  isLoading,
}: {
  data?: V16HourlyApiResponse["data"];
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

  if (!data || !data.heatmapData || data.heatmapData.length === 0) {
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
  const maxValue = Math.max(...data.heatmapData.map((d) => d.value), 1);

  const getColor = (value: number) => {
    const intensity = value / maxValue;
    if (intensity === 0) return "bg-gray-100 dark:bg-gray-900";
    if (intensity < 0.25) return "bg-orange-100 dark:bg-orange-900/30";
    if (intensity < 0.5) return "bg-orange-200";
    if (intensity < 0.75) return "bg-orange-400";
    return "bg-orange-600";
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        Patrón Hora × Día de la Semana
      </h2>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="flex mb-1">
            <div className="w-12" />
            {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
              <div key={h} className="flex-1 text-xs text-gray-500 dark:text-gray-400 text-center">
                {h}:00
              </div>
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <div key={day} className="flex items-center mb-1">
              <div className="w-12 text-xs text-gray-500 dark:text-gray-400">{dayNames[day]}</div>
              <div className="flex-1 flex gap-0.5">
                {Array.from({ length: 24 }, (_, hour) => {
                  const cell = data.heatmapData.find((d) => d.hour === hour && d.day === day);
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
      {data.peaks && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <span className="font-medium">Hora pico:</span> <span className="font-data">{data.peaks.hour.hour}:00</span> (promedio{" "}
            <span className="font-data">{data.peaks.hour.avgCount}</span> balizas)
          </p>
          <p>
            <span className="font-medium">Día con más actividad:</span> {data.peaks.day.dayName}{" "}
            (promedio <span className="font-data">{data.peaks.day.avgCount}</span> balizas/hora)
          </p>
        </div>
      )}
    </div>
  );
}

// V16 Duration Distribution chart
function V16DurationDistribution({
  data,
  isLoading,
}: {
  data?: V16DurationApiResponse["data"];
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

  if (!data || !data.stats || data.distribution.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
          Duración de Balizas
        </h2>
        <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>{data?.message || "Sin datos de duración disponibles"}</p>
          </div>
        </div>
      </div>
    );
  }

  const maxPercentage = Math.max(...data.distribution.map((d) => d.percentage), 1);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
        Distribución de Duración
      </h2>
      <div className="space-y-3">
        {data.distribution.map((bucket, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-24 text-sm text-gray-600 dark:text-gray-400">{bucket.label}</div>
            <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
              <div
                className="h-full bg-green-50 dark:bg-green-900/200 rounded"
                style={{ width: `${(bucket.percentage / maxPercentage) * 100}%` }}
              />
            </div>
            <div className="w-16 text-sm text-gray-600 dark:text-gray-400 text-right font-data">{bucket.percentage}%</div>
          </div>
        ))}
      </div>
      {data.stats && (
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Media:</span>{" "}
            <span className="font-medium font-data">{data.stats.avgMinutes} min</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Mediana:</span>{" "}
            <span className="font-medium font-data">{data.stats.medianMinutes} min</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// TAB SECTIONS
// ============================================

function ResumenSection({
  incidentStats,
  v16Stats,
  incidentLoading,
  v16Loading,
}: {
  incidentStats?: IncidentStatsResponse;
  v16Stats?: V16StatsResponse;
  incidentLoading: boolean;
  v16Loading: boolean;
}) {
  const hasIncidents = incidentStats?.success;
  const hasV16 = v16Stats?.success;

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Resumen en Tiempo Real"
        description="Vista general del estado actual del tráfico en España"
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          icon={AlertTriangle}
          iconBgColor="bg-red-50 dark:bg-red-900/20"
          iconColor="text-red-600 dark:text-red-400"
          value={hasIncidents ? incidentStats.data.totals.activeNow : "-"}
          label="Incidencias Activas"
          isLoading={incidentLoading}
        />
        <StatCard
          icon={Zap}
          iconBgColor="bg-orange-50 dark:bg-orange-900/20"
          iconColor="text-orange-600 dark:text-orange-400"
          value={hasV16 ? v16Stats.data.totals.v16Total : "-"}
          label="Balizas V16 (30d)"
          isLoading={v16Loading}
        />
        <StatCard
          icon={Clock}
          iconBgColor="bg-tl-50 dark:bg-tl-900/20"
          iconColor="text-tl-600 dark:text-tl-400"
          value={hasIncidents ? incidentStats.data.totals.incidentsLast24h : "-"}
          label="Incidencias 24h"
          isLoading={incidentLoading}
        />
        <StatCard
          icon={Calendar}
          iconBgColor="bg-purple-50 dark:bg-purple-900/20"
          iconColor="text-purple-600 dark:text-purple-400"
          value={hasIncidents ? incidentStats.data.totals.incidentsLast7d : "-"}
          label="Incidencias 7d"
          isLoading={incidentLoading}
        />
        <StatCard
          icon={Clock}
          iconBgColor="bg-green-50 dark:bg-green-900/20"
          iconColor="text-green-600 dark:text-green-400"
          value={
            hasIncidents && incidentStats.data.totals.avgDurationMins
              ? `${incidentStats.data.totals.avgDurationMins}m`
              : "-"
          }
          label="Duración Media"
          isLoading={incidentLoading}
        />
        <StatCard
          icon={MapPin}
          iconBgColor="bg-indigo-50"
          iconColor="text-indigo-600"
          value={hasV16 ? v16Stats.data.totals.daysWithData : "-"}
          label="Días con Datos"
          isLoading={v16Loading}
        />
      </div>

      {/* Trends Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DailyTrendMini
          data={incidentStats?.data?.dailyTrend}
          isLoading={incidentLoading}
          color="red"
          title="Tendencia Incidencias"
        />
        <DailyTrendMini
          data={v16Stats?.data?.dailyData?.map((d) => ({ date: d.date, count: d.v16Count }))}
          isLoading={v16Loading}
          color="orange"
          title="Tendencia Balizas V16"
        />
      </div>

      {/* Type Breakdown */}
      {incidentStats?.data?.byType && incidentStats.data.byType.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <BreakdownChart
            title="Incidencias por Tipo"
            data={incidentStats.data.byType.map((t) => ({ name: t.label, value: t.count }))}
            note="Últimos 30 días"
            labelWidth={100}
          />
          <BreakdownChart
            title="Top Provincias (Incidencias)"
            data={incidentStats.data.provinceRanking.slice(0, 10).map((p) => ({
              name: p.province,
              value: p.count,
            }))}
            note="Últimos 30 días"
            labelWidth={110}
          />
        </div>
      )}
    </div>
  );
}

function IncidenciasSection({
  data,
  isLoading,
  period,
  setPeriod,
}: {
  data?: IncidentStatsResponse;
  isLoading: boolean;
  period: number;
  setPeriod: (p: number) => void;
}) {
  const hasData = data?.success;
  const stats = data?.data;

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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SectionHeader
          title="Estadísticas de Incidencias"
          description="Análisis detallado de incidencias de tráfico"
        />
        <select
          value={period}
          onChange={(e) => setPeriod(parseInt(e.target.value, 10))}
          className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm"
        >
          <option value={7}>7 días</option>
          <option value={14}>14 días</option>
          <option value={30}>30 días</option>
          <option value={90}>90 días</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={AlertTriangle}
          iconBgColor="bg-red-50 dark:bg-red-900/20"
          iconColor="text-red-600 dark:text-red-400"
          value={hasData ? stats!.totals.totalIncidents : "-"}
          label="Total Período"
          isLoading={isLoading}
        />
        <StatCard
          icon={Activity}
          iconBgColor="bg-green-50 dark:bg-green-900/20"
          iconColor="text-green-600 dark:text-green-400"
          value={hasData ? stats!.totals.activeNow : "-"}
          label="Activas Ahora"
          isLoading={isLoading}
        />
        <StatCard
          icon={Clock}
          iconBgColor="bg-tl-50 dark:bg-tl-900/20"
          iconColor="text-tl-600 dark:text-tl-400"
          value={hasData ? stats!.totals.incidentsLast24h : "-"}
          label="Últimas 24h"
          isLoading={isLoading}
        />
        <StatCard
          icon={Calendar}
          iconBgColor="bg-purple-50 dark:bg-purple-900/20"
          iconColor="text-purple-600 dark:text-purple-400"
          value={hasData ? stats!.totals.incidentsLast7d : "-"}
          label="Últimos 7 días"
          isLoading={isLoading}
        />
        <StatCard
          icon={Clock}
          iconBgColor="bg-orange-50 dark:bg-orange-900/20"
          iconColor="text-orange-600 dark:text-orange-400"
          value={hasData && stats!.totals.avgDurationMins ? `${stats!.totals.avgDurationMins}m` : "-"}
          label="Duración Media"
          isLoading={isLoading}
        />
      </div>

      {/* Daily Trend */}
      <DailyTrendMini
        data={stats?.dailyTrend}
        isLoading={isLoading}
        color="red"
        title="Tendencia Diaria"
      />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* By Type */}
        {stats?.byType && stats.byType.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              Por Tipo
            </h3>
            <div className="space-y-2">
              {stats.byType.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-24 text-sm text-gray-600 dark:text-gray-400 truncate">{item.label}</div>
                  <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
                    <div
                      className={`h-full ${typeColors[item.type] || "bg-gray-50 dark:bg-gray-9500"} rounded`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <div className="w-16 text-sm text-gray-600 dark:text-gray-400 text-right font-data">{item.percentage}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Heatmap */}
        <HourlyHeatmap data={stats?.heatmapData} peaks={stats?.peaks} isLoading={isLoading} color="red" />

        {/* By Source */}
        {stats?.bySource && stats.bySource.length > 0 && (
          <BreakdownChart
            title="Por Fuente de Datos"
            data={stats.bySource.map((s) => ({ name: s.source || "Desconocido", value: s.count }))}
            note="DGT, SCT, Euskadi, Madrid"
            labelWidth={80}
          />
        )}

        {/* Top Roads */}
        {stats?.topRoads && stats.topRoads.length > 0 && (
          <BreakdownChart
            title="Top Carreteras"
            data={stats.topRoads.map((r) => ({ name: r.road, value: r.count }))}
            labelWidth={70}
          />
        )}
      </div>
    </div>
  );
}

function V16Section() {
  const [period, setPeriod] = useState<V16PeriodValue>("7d");

  const isRealtime = period === "ahora";
  const periodDays = getV16PeriodDays(period);

  // Realtime data - only fetch when in realtime mode
  const { data: realtimeData, isLoading: realtimeLoading } = useSWR<V16RealtimeResponse>(
    isRealtime ? "/api/v16" : null,
    fetcher,
    { refreshInterval: isRealtime ? 30000 : 0, revalidateOnFocus: isRealtime }
  );

  // Historical data - only fetch when NOT in realtime mode
  const { data: dailyData, isLoading: dailyLoading } = useSWR<V16StatsResponse>(
    !isRealtime ? `/api/historico/daily?days=${periodDays}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: hourlyData, isLoading: hourlyLoading } = useSWR<V16HourlyApiResponse>(
    !isRealtime ? `/api/historico/hourly?days=${Math.min(periodDays, 14)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: provincesData, isLoading: provincesLoading } = useSWR<V16ProvincesResponse>(
    !isRealtime ? `/api/historico/provinces?days=${periodDays}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: durationData, isLoading: durationLoading } = useSWR<V16DurationApiResponse>(
    !isRealtime ? `/api/historico/duration?days=${periodDays}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: mapData, isLoading: mapLoading } = useSWR<V16MapApiResponse>(
    !isRealtime ? `/api/historico/map?days=${periodDays}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: roadsData, isLoading: roadsLoading } = useSWR<V16RoadsApiResponse>(
    !isRealtime ? `/api/historico/roads?days=${periodDays}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const hasData = isRealtime
    ? (realtimeData?.count || 0) > 0
    : dailyData?.success && dailyData.data.totals.daysWithData > 0;

  // Transform realtime data to map format
  const mapBeacons = isRealtime
    ? (realtimeData?.beacons || []).map((b) => ({
        id: b.id,
        lat: b.lat,
        lng: b.lng,
        activatedAt: b.activatedAt,
        road: b.road,
        province: b.province,
        severity: b.severity,
        durationSecs: null,
        severityWeight: { LOW: 1, MEDIUM: 2, HIGH: 3, VERY_HIGH: 4 }[b.severity] || 1,
      }))
    : mapData?.data?.beacons || [];

  const dataStartDate = dailyData?.data?.dataStartDate || null;

  // Province chart data
  const provinceChartData: ChartDataItem[] =
    provincesData?.data?.provinceRanking?.map((p) => ({
      name: p.name,
      value: p.count,
    })) || [];

  const roadTypeLabels: Record<string, string> = {
    AUTOPISTA: "Autopista",
    AUTOVIA: "Autovía",
    NACIONAL: "Nacional",
    COMARCAL: "Comarcal",
    PROVINCIAL: "Provincial",
    URBANA: "Urbana",
    OTHER: "Otra",
  };

  const roadTypeChartData: ChartDataItem[] =
    provincesData?.data?.roadTypeBreakdown?.map((r) => ({
      name: roadTypeLabels[r.type] || r.type,
      value: r.count,
    })) || [];

  // Severity breakdown from map data
  const severityChartData: ChartDataItem[] = (() => {
    if (!mapData?.data?.beacons) return [];
    const counts: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, VERY_HIGH: 0 };
    for (const beacon of mapData.data.beacons) {
      if (beacon.severity in counts) {
        counts[beacon.severity]++;
      }
    }
    const labels: Record<string, string> = {
      LOW: "Baja",
      MEDIUM: "Media",
      HIGH: "Alta",
      VERY_HIGH: "Muy Alta",
    };
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => ({
        name: labels[key] || key,
        value: count,
      }));
  })();

  // Top roads chart data
  const topRoadsChartData: ChartDataItem[] =
    roadsData?.data?.roads?.map((r) => ({
      name: r.road,
      value: r.count,
    })) || [];

  return (
    <div className="space-y-8">
      {/* Header with period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SectionHeader
          title="Balizas V16"
          description={
            isRealtime
              ? "Balizas V16 activas en tiempo real en carreteras españolas."
              : "Análisis histórico de emergencias señalizadas con baliza V16."
          }
        />
        <div className="flex items-center gap-2">
          <label htmlFor="v16-period" className="text-sm text-gray-600 dark:text-gray-400">
            Período:
          </label>
          <select
            id="v16-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as V16PeriodValue)}
            className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {V16_PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data start date indicator */}
      {period === "todo" && dataStartDate && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Mostrando datos desde:{" "}
          <span className="font-medium">
            {new Date(dataStartDate).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      )}

      {/* Realtime indicator */}
      {isRealtime && (
        <div className="flex items-center gap-2 text-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-50 dark:bg-green-900/200"></span>
          </span>
          <span className="text-green-700 dark:text-green-400 font-medium">
            Tiempo real - <span className="font-data">{realtimeData?.count || 0}</span> balizas activas
          </span>
          {realtimeData?.lastUpdated && (
            <span className="text-gray-400">
              (actualizado:{" "}
              <span className="font-data">{new Date(realtimeData.lastUpdated).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}</span>
              )
            </span>
          )}
        </div>
      )}

      {/* Historical Map */}
      <HistoricalMap
        beacons={mapBeacons}
        clusters={isRealtime ? undefined : mapData?.data?.clusters}
        isLoading={isRealtime ? realtimeLoading : mapLoading}
        height="400px"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={AlertTriangle}
          iconBgColor="bg-orange-50 dark:bg-orange-900/20"
          iconColor="text-orange-600 dark:text-orange-400"
          value={
            isRealtime
              ? realtimeData?.count || 0
              : hasData && dailyData?.data
                ? dailyData.data.totals.v16Total
                : "-"
          }
          label={isRealtime ? "Balizas Activas" : "Balizas V16 Totales"}
          subLabel={
            isRealtime
              ? "En tiempo real"
              : hasData && dailyData?.data
                ? `${dailyData.data.totals.daysWithData} días de datos`
                : undefined
          }
          isLoading={isRealtime ? realtimeLoading : dailyLoading}
        />
        <StatCard
          icon={Clock}
          iconBgColor="bg-green-50 dark:bg-green-900/20"
          iconColor="text-green-600 dark:text-green-400"
          value={
            durationData?.data?.stats?.avgMinutes
              ? `${durationData.data.stats.avgMinutes} min`
              : "-"
          }
          label="Duración Media"
          subLabel={
            durationData?.data?.stats?.medianMinutes
              ? `Mediana: ${durationData.data.stats.medianMinutes} min`
              : undefined
          }
          isLoading={durationLoading}
        />
        <StatCard
          icon={MapPin}
          iconBgColor="bg-tl-50 dark:bg-tl-900/20"
          iconColor="text-tl-600 dark:text-tl-400"
          value={provincesData?.data?.totals?.totalBeacons || "-"}
          label="Por Ubicación"
          subLabel={
            provincesData?.data?.totals
              ? `${provincesData.data.totals.provinces} provincias`
              : undefined
          }
          isLoading={provincesLoading}
        />
        <StatCard
          icon={Calendar}
          iconBgColor="bg-purple-50 dark:bg-purple-900/20"
          iconColor="text-purple-600 dark:text-purple-400"
          value={
            dailyData?.data?.peak
              ? new Date(dailyData.data.peak.date).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                })
              : "-"
          }
          label="Día Pico"
          subLabel={
            dailyData?.data?.peak ? `${dailyData.data.peak.count} balizas` : undefined
          }
          isLoading={dailyLoading}
        />
      </div>

      {/* Charts - only show for historical data */}
      {isRealtime ? (
        <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-lg p-6">
          <p className="text-tl-800 dark:text-tl-200 text-center">
            <span className="font-medium">Modo tiempo real activo.</span> Selecciona un período
            histórico para ver estadísticas y análisis detallados.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Daily Trend - Full Width */}
          <V16DailyTrendChart data={dailyData?.data?.dailyData} isLoading={dailyLoading} />

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Hourly Heatmap */}
            <V16HourlyHeatmap data={hourlyData?.data} isLoading={hourlyLoading} />

            {/* Duration Distribution */}
            <V16DurationDistribution data={durationData?.data} isLoading={durationLoading} />
          </div>

          {/* Province Rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {provinceChartData.length > 0 ? (
              <BreakdownChart
                title="Top 15 Provincias"
                data={provinceChartData}
                note="Balizas V16 activadas por provincia"
                labelWidth={110}
              />
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  Ranking por Provincia
                </h2>
                <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  {provincesLoading ? (
                    <div className="animate-pulse">Cargando datos...</div>
                  ) : (
                    <div className="text-center">
                      <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No hay datos disponibles</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {roadTypeChartData.length > 0 ? (
              <BreakdownChart
                title="Por Tipo de Vía"
                data={roadTypeChartData}
                note="Distribución por tipo de carretera"
                labelWidth={90}
              />
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  Por Tipo de Vía
                </h2>
                <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  {provincesLoading ? (
                    <div className="animate-pulse">Cargando datos...</div>
                  ) : (
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No hay datos disponibles</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Severity & Top Roads */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Severity Distribution */}
            {severityChartData.length > 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-red-600 dark:text-red-400" />
                  Distribución por Severidad
                </h2>
                <div className="space-y-3">
                  {severityChartData.map((item, idx) => {
                    const total = severityChartData.reduce((sum, i) => sum + i.value, 0);
                    const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    const colors: Record<string, string> = {
                      Baja: "bg-green-50 dark:bg-green-900/200",
                      Media: "bg-orange-50 dark:bg-orange-900/200",
                      Alta: "bg-red-50 dark:bg-red-900/200",
                      "Muy Alta": "bg-red-900",
                    };
                    const bgColor = colors[item.name] || "bg-gray-50 dark:bg-gray-9500";
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-20 text-sm text-gray-600 dark:text-gray-400">{item.name}</div>
                        <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
                          <div
                            className={`h-full ${bgColor} rounded`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-16 text-sm text-gray-600 dark:text-gray-400 text-right font-data">
                          {item.value} ({percentage}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                  Clasificación según nivel de urgencia de la emergencia
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-red-600 dark:text-red-400" />
                  Distribución por Severidad
                </h2>
                <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  {mapLoading ? (
                    <div className="animate-pulse">Cargando datos...</div>
                  ) : (
                    <div className="text-center">
                      <PieChart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No hay datos de severidad</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Top Roads */}
            {topRoadsChartData.length > 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Route className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                  Top {topRoadsChartData.length} Carreteras
                </h2>
                <div className="space-y-3">
                  {topRoadsChartData.map((road, idx) => {
                    const maxValue = Math.max(...topRoadsChartData.map((r) => r.value));
                    const percentage = maxValue > 0 ? Math.round((road.value / maxValue) * 100) : 0;
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-16 text-sm font-medium text-gray-900 dark:text-gray-100">{road.name}</div>
                        <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
                          <div
                            className="h-full bg-tl-50 dark:bg-tl-900/200 rounded"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-10 text-sm text-gray-600 dark:text-gray-400 text-right font-data">{road.value}</div>
                      </div>
                    );
                  })}
                </div>
                {roadsData?.data?.totals && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                    <span className="font-data">{roadsData.data.totals.totalBeacons}</span> balizas en{" "}
                    <span className="font-data">{roadsData.data.totals.uniqueRoads}</span> carreteras diferentes
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Route className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                  Carreteras con más balizas
                </h2>
                <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  {roadsLoading ? (
                    <div className="animate-pulse">Cargando datos...</div>
                  ) : (
                    <div className="text-center">
                      <Route className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No hay datos de carreteras</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* V16 Info Section */}
      <V16InfoSection dataStartDate={dataStartDate || undefined} />
    </div>
  );
}

function HistoricoSection({
  data,
  isLoading,
}: {
  data?: HistoricalApiResponse;
  isLoading: boolean;
}) {
  const hasData = data?.success && data.data;
  const historicalData = data?.data;

  const latestYear = historicalData?.yearlyData?.[historicalData.yearlyData.length - 1]?.year || 2023;

  const yoyTrend = historicalData?.yearOverYearChange
    ? { value: historicalData.yearOverYearChange, isPositive: historicalData.yearOverYearChange < 0 }
    : null;

  const provinceChartData: ChartDataItem[] =
    historicalData?.provinceBreakdown?.map((p) => ({ name: p.name, value: p.accidents })) || [];

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Datos Históricos de Accidentes"
        description="Estadísticas oficiales de siniestralidad vial (DGT en Cifras)"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={AlertTriangle}
          iconBgColor="bg-red-50 dark:bg-red-900/20"
          iconColor="text-red-600 dark:text-red-400"
          value={hasData ? historicalData!.totals.accidents : "-"}
          label={`Accidentes (${latestYear})`}
          isLoading={isLoading}
        />
        <StatCard
          icon={Users}
          iconBgColor="bg-gray-100 dark:bg-gray-900"
          iconColor="text-gray-600 dark:text-gray-400"
          value={hasData ? historicalData!.totals.fatalities : "-"}
          label={`Fallecidos (${latestYear})`}
          isLoading={isLoading}
        />
        <StatCard
          icon={Car}
          iconBgColor="bg-orange-50 dark:bg-orange-900/20"
          iconColor="text-orange-600 dark:text-orange-400"
          value={hasData ? historicalData!.totals.hospitalized : "-"}
          label="Heridos graves"
          isLoading={isLoading}
        />
        <StatCard
          icon={yoyTrend?.isPositive ? TrendingDown : TrendingUp}
          iconBgColor={yoyTrend?.isPositive ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}
          iconColor={yoyTrend?.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
          value={yoyTrend ? `${yoyTrend.isPositive ? "-" : "+"}${Math.abs(yoyTrend.value).toFixed(1)}%` : "-"}
          label="Variación anual"
          isLoading={isLoading}
        />
      </div>

      {/* Yearly Trend Chart */}
      <TimeSeriesChart
        yearlyData={historicalData?.yearlyData}
        mode="yearly"
        title={`Evolución anual (${historicalData?.yearlyData?.[0]?.year || 2021}-${latestYear})`}
        isLoading={isLoading}
      />

      {/* Province Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {provinceChartData.length > 0 && (
          <BreakdownChart
            title="Top Provincias por Accidentes"
            data={provinceChartData}
            note="Datos históricos de DGT en Cifras"
            labelWidth={100}
          />
        )}

        {historicalData?.provinceBreakdown && historicalData.provinceBreakdown.length > 0 && (
          <BreakdownChart
            title="Fallecidos por Provincia"
            data={historicalData.provinceBreakdown.map((p) => ({ name: p.name, value: p.fatalities }))}
            note="Datos históricos de DGT en Cifras"
            labelWidth={100}
          />
        )}
      </div>
    </div>
  );
}

function CarreterasSection({
  data,
  isLoading,
}: {
  data?: RoadRiskResponse;
  isLoading: boolean;
}) {
  const hasData = data?.success;

  const riskColors: Record<string, { bg: string; text: string; label: string }> = {
    CRITICAL: { bg: "bg-red-600", text: "text-red-600 dark:text-red-400", label: "Crítico" },
    HIGH: { bg: "bg-orange-50 dark:bg-orange-900/200", text: "text-orange-600 dark:text-orange-400", label: "Alto" },
    MEDIUM: { bg: "bg-yellow-50 dark:bg-yellow-900/200", text: "text-yellow-600 dark:text-yellow-400", label: "Medio" },
    LOW: { bg: "bg-green-50 dark:bg-green-900/200", text: "text-green-600 dark:text-green-400", label: "Bajo" },
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Análisis de Riesgo por Carretera"
        description="Clasificación de carreteras según frecuencia y gravedad de incidencias"
      />

      {/* Summary */}
      {hasData && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            icon={Route}
            iconBgColor="bg-tl-50 dark:bg-tl-900/20"
            iconColor="text-tl-600 dark:text-tl-400"
            value={data.data.summary.totalRoads}
            label="Carreteras Analizadas"
            isLoading={isLoading}
          />
          <StatCard
            icon={Shield}
            iconBgColor="bg-red-50 dark:bg-red-900/20"
            iconColor="text-red-600 dark:text-red-400"
            value={data.data.summary.criticalRoads}
            label="Riesgo Crítico"
            isLoading={isLoading}
          />
          <StatCard
            icon={AlertTriangle}
            iconBgColor="bg-orange-50 dark:bg-orange-900/20"
            iconColor="text-orange-600 dark:text-orange-400"
            value={data.data.summary.highRiskRoads}
            label="Riesgo Alto"
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Road List */}
      {hasData && data.data.roads.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ranking de Carreteras por Riesgo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-950">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Carretera</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Incidencias</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Balizas V16</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Duración Med.</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nivel Riesgo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {data.data.roads.slice(0, 20).map((road, idx) => {
                  const risk = riskColors[road.riskLevel] || riskColors.LOW;
                  return (
                    <tr key={idx} className="hover:bg-gray-50 dark:bg-gray-950">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{road.road}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-center font-data">{road.incidentCount}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-center font-data">{road.v16Count}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-center font-data">
                        {road.avgDurationMins ? `${road.avgDurationMins}m` : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${risk.bg} text-white`}>
                          {risk.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
          {isLoading ? (
            <div className="animate-pulse">Cargando datos de carreteras...</div>
          ) : (
            <>
              <Route className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay suficientes datos para el análisis de riesgo</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ClimaSection({
  data,
  isLoading,
}: {
  data?: WeatherImpactResponse;
  isLoading: boolean;
}) {
  const hasData = data?.success;

  const alertTypeLabels: Record<string, string> = {
    RAIN: "Lluvia",
    SNOW: "Nieve",
    ICE: "Hielo",
    FOG: "Niebla",
    WIND: "Viento",
    STORM: "Tormenta",
    TEMPERATURE: "Temperatura",
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Impacto Meteorológico"
        description="Análisis de la correlación entre alertas meteorológicas e incidencias"
      />

      {/* Impact Summary */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-tl-50 dark:bg-tl-900/20 rounded-lg">
                <CloudRain className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Con Alertas</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
              {data.data.correlation.withAlerts.avgIncidents.toFixed(1)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">incidencias/día promedio</p>
            <p className="text-xs text-gray-400 mt-1"><span className="font-data">{data.data.correlation.withAlerts.days}</span> días</p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Sin Alertas</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
              {data.data.correlation.withoutAlerts.avgIncidents.toFixed(1)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">incidencias/día promedio</p>
            <p className="text-xs text-gray-400 mt-1"><span className="font-data">{data.data.correlation.withoutAlerts.days}</span> días</p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Multiplicador</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">×{data.data.correlation.impactMultiplier.toFixed(2)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">más incidencias con alertas</p>
          </div>
        </div>
      )}

      {/* By Alert Type */}
      {hasData && data.data.byAlertType.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Impacto por Tipo de Alerta</h3>
          <div className="space-y-3">
            {data.data.byAlertType.map((alert, idx) => {
              const maxAvg = Math.max(...data.data.byAlertType.map((a) => a.avgIncidents), 1);
              const width = (alert.avgIncidents / maxAvg) * 100;
              return (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-20 text-sm text-gray-600 dark:text-gray-400">
                    {alertTypeLabels[alert.type] || alert.type}
                  </div>
                  <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
                    <div className="h-full bg-tl-50 dark:bg-tl-900/200 rounded" style={{ width: `${width}%` }} />
                  </div>
                  <div className="w-24 text-sm text-gray-600 dark:text-gray-400 text-right font-data">
                    {alert.avgIncidents.toFixed(1)} inc/día
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!hasData && !isLoading && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
          <CloudRain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No hay suficientes datos meteorológicos para el análisis</p>
        </div>
      )}
    </div>
  );
}

function CorrelacionSection({
  data,
  isLoading,
}: {
  data?: CorrelationResponse;
  isLoading: boolean;
}) {
  const hasData = data?.success;

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Correlación V16 - Incidencias"
        description="Análisis de proximidad espacio-temporal entre balizas V16 e incidencias reportadas"
      />

      {/* Summary Stats */}
      {hasData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Zap}
            iconBgColor="bg-orange-50 dark:bg-orange-900/20"
            iconColor="text-orange-600 dark:text-orange-400"
            value={data.data.summary.totalV16}
            label="Balizas V16"
            subLabel="analizadas"
            isLoading={isLoading}
          />
          <StatCard
            icon={AlertTriangle}
            iconBgColor="bg-red-50 dark:bg-red-900/20"
            iconColor="text-red-600 dark:text-red-400"
            value={data.data.summary.totalIncidents}
            label="Incidencias"
            subLabel="analizadas"
            isLoading={isLoading}
          />
          <StatCard
            icon={Link2}
            iconBgColor="bg-tl-50 dark:bg-tl-900/20"
            iconColor="text-tl-600 dark:text-tl-400"
            value={data.data.summary.totalCorrelations}
            label="Correlaciones"
            subLabel="encontradas"
            isLoading={isLoading}
          />
          <StatCard
            icon={Activity}
            iconBgColor="bg-green-50 dark:bg-green-900/20"
            iconColor="text-green-600 dark:text-green-400"
            value={`${data.data.summary.v16CorrelationRate}%`}
            label="Tasa V16"
            subLabel="con incidencia cercana"
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Correlation Analysis */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* By Distance */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              Por Distancia
            </h3>
            <div className="space-y-3">
              {[
                { label: "< 500m", value: data.data.byDistance.under500m, color: "bg-red-50 dark:bg-red-900/200" },
                { label: "500m - 1km", value: data.data.byDistance.under1km, color: "bg-orange-50 dark:bg-orange-900/200" },
                { label: "1km - 2km", value: data.data.byDistance.under2km, color: "bg-yellow-50 dark:bg-yellow-900/200" },
                { label: "> 2km", value: data.data.byDistance.over2km, color: "bg-green-50 dark:bg-green-900/200" },
              ].map((item) => {
                const total = data.data.summary.totalCorrelations || 1;
                const percentage = Math.round((item.value / total) * 100);
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-20 text-sm text-gray-600 dark:text-gray-400">{item.label}</div>
                    <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
                      <div className={`h-full ${item.color} rounded`} style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="w-16 text-sm text-gray-600 dark:text-gray-400 text-right font-data">{item.value}</div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Distancia entre baliza V16 e incidencia más cercana
            </p>
          </div>

          {/* By Time Difference */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Por Proximidad Temporal
            </h3>
            <div className="space-y-3">
              {[
                { label: "Durante", value: data.data.byTimeDiff.during, color: "bg-red-50 dark:bg-red-900/200" },
                { label: "< 15 min", value: data.data.byTimeDiff.within15min, color: "bg-orange-50 dark:bg-orange-900/200" },
                { label: "15-30 min", value: data.data.byTimeDiff.within30min, color: "bg-yellow-50 dark:bg-yellow-900/200" },
                { label: "30-60 min", value: data.data.byTimeDiff.within60min, color: "bg-green-50 dark:bg-green-900/200" },
              ].map((item) => {
                const total = data.data.summary.totalCorrelations || 1;
                const percentage = Math.round((item.value / total) * 100);
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-20 text-sm text-gray-600 dark:text-gray-400">{item.label}</div>
                    <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
                      <div className={`h-full ${item.color} rounded`} style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="w-16 text-sm text-gray-600 dark:text-gray-400 text-right font-data">{item.value}</div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Diferencia de tiempo entre activación V16 e inicio de incidencia
            </p>
          </div>
        </div>
      )}

      {/* Top Locations */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {data.data.topProvinces.length > 0 && (
            <BreakdownChart
              title="Top Provincias (Correlaciones)"
              data={data.data.topProvinces.map((p) => ({ name: p.province, value: p.count }))}
              labelWidth={110}
            />
          )}
          {data.data.topRoads.length > 0 && (
            <BreakdownChart
              title="Top Carreteras (Correlaciones)"
              data={data.data.topRoads.map((r) => ({ name: r.road, value: r.count }))}
              labelWidth={70}
            />
          )}
        </div>
      )}

      {/* Interpretation */}
      {hasData && (
        <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-lg p-4">
          <h3 className="font-medium text-tl-900 mb-2">Interpretación</h3>
          <ul className="text-sm text-tl-800 dark:text-tl-200 space-y-1">
            <li>
              • <strong className="font-data">{data.data.summary.v16CorrelationRate}%</strong> de las balizas V16 se activaron cerca
              de una incidencia reportada (en espacio y tiempo)
            </li>
            <li>
              • <strong className="font-data">{data.data.summary.incidentCorrelationRate}%</strong> de las incidencias tuvieron una
              baliza V16 activada en sus inmediaciones
            </li>
            <li>
              • El análisis considera un radio máximo de <span className="font-data">{data.data.parameters.maxDistanceKm}</span>km y
              diferencia temporal de <span className="font-data">{data.data.parameters.maxTimeDiffMinutes}</span> minutos
            </li>
          </ul>
        </div>
      )}

      {/* Sample Correlations Table */}
      {hasData && data.data.sampleCorrelations.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ejemplos de Correlaciones</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-950">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Distancia</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Dif. Tiempo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hora V16</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hora Incid.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Provincia</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Carretera</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {data.data.sampleCorrelations.slice(0, 10).map((corr, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:bg-gray-950">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-data">{corr.distanceKm} km</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-data">
                      {corr.timeDiffMinutes === 0 ? "Durante" : `${corr.timeDiffMinutes} min`}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-data">
                      {new Date(corr.v16Time).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-data">
                      {new Date(corr.incidentTime).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{corr.province || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{corr.road || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasData && !isLoading && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
          <Link2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No hay suficientes datos para el análisis de correlación</p>
        </div>
      )}
    </div>
  );
}

function RankingsSection({
  data,
  isLoading,
}: {
  data?: RankingsResponse;
  isLoading: boolean;
}) {
  const hasData = data?.success;
  const [rankingType, setRankingType] = useState<"provinces" | "roads">("provinces");

  if (isLoading) {
    return (
      <div className="space-y-8">
        <SectionHeader
          title="Rankings"
          description="Clasificaciones de provincias y carreteras por diferentes métricas"
        />
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-gray-200 rounded-lg" />
          <div className="h-48 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="space-y-8">
        <SectionHeader
          title="Rankings"
          description="Clasificaciones de provincias y carreteras por diferentes métricas"
        />
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No hay suficientes datos para generar rankings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SectionHeader
          title="Rankings"
          description="Clasificaciones de provincias y carreteras por diferentes métricas"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setRankingType("provinces")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              rankingType === "provinces"
                ? "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 border border-tl-200 dark:border-tl-800"
                : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:bg-gray-950"
            }`}
          >
            Provincias
          </button>
          <button
            onClick={() => setRankingType("roads")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              rankingType === "roads"
                ? "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 border border-tl-200 dark:border-tl-800"
                : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:bg-gray-950"
            }`}
          >
            Carreteras
          </button>
        </div>
      </div>

      {/* Province Rankings */}
      {rankingType === "provinces" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Total Incidents */}
          {data.provinces.byIncidentsTotal.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Más Incidencias (Total)
              </h3>
              <div className="space-y-2">
                {data.provinces.byIncidentsTotal.slice(0, 10).map((p, idx) => {
                  const maxVal = data.provinces.byIncidentsTotal[0]?.totalIncidents || 1;
                  const width = (p.totalIncidents / maxVal) * 100;
                  return (
                    <div key={p.province} className="flex items-center gap-2">
                      <span className="w-6 text-sm text-gray-500 dark:text-gray-400">#{idx + 1}</span>
                      <span className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{p.province}</span>
                      <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
                        <div className="h-full bg-red-50 dark:bg-red-900/200 rounded" style={{ width: `${width}%` }} />
                      </div>
                      <span className="w-16 text-sm text-gray-600 dark:text-gray-400 text-right font-data">{p.totalIncidents}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* By Incidents per 100k */}
          {data.provinces.byIncidentsPer100k.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                Incidencias por 100k hab.
              </h3>
              <div className="space-y-2">
                {data.provinces.byIncidentsPer100k.slice(0, 10).map((p, idx) => {
                  const maxVal = data.provinces.byIncidentsPer100k[0]?.incidentsPer100k || 1;
                  const width = (p.incidentsPer100k / maxVal) * 100;
                  return (
                    <div key={p.province} className="flex items-center gap-2">
                      <span className="w-6 text-sm text-gray-500 dark:text-gray-400">#{idx + 1}</span>
                      <span className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{p.province}</span>
                      <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
                        <div className="h-full bg-purple-50 dark:bg-purple-900/200 rounded" style={{ width: `${width}%` }} />
                      </div>
                      <span className="w-16 text-sm text-gray-600 dark:text-gray-400 text-right font-data">{p.incidentsPer100k.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Normalizado por población provincial</p>
            </div>
          )}

          {/* By V16 Total */}
          {data.provinces.byV16Total.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                Más Balizas V16
              </h3>
              <div className="space-y-2">
                {data.provinces.byV16Total.slice(0, 10).map((p, idx) => {
                  const maxVal = data.provinces.byV16Total[0]?.totalV16 || 1;
                  const width = (p.totalV16 / maxVal) * 100;
                  return (
                    <div key={p.province} className="flex items-center gap-2">
                      <span className="w-6 text-sm text-gray-500 dark:text-gray-400">#{idx + 1}</span>
                      <span className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{p.province}</span>
                      <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
                        <div className="h-full bg-orange-50 dark:bg-orange-900/200 rounded" style={{ width: `${width}%` }} />
                      </div>
                      <span className="w-16 text-sm text-gray-600 dark:text-gray-400 text-right font-data">{p.totalV16}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* By Accidents per 100k */}
          {data.provinces.byAccidentsPer100k.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Car className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                Accidentes por 100k hab.
              </h3>
              <div className="space-y-2">
                {data.provinces.byAccidentsPer100k.slice(0, 10).map((p, idx) => {
                  const maxVal = data.provinces.byAccidentsPer100k[0]?.accidentsPer100k || 1;
                  const width = (p.accidentsPer100k / maxVal) * 100;
                  return (
                    <div key={p.province} className="flex items-center gap-2">
                      <span className="w-6 text-sm text-gray-500 dark:text-gray-400">#{idx + 1}</span>
                      <span className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{p.province}</span>
                      <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
                        <div className="h-full bg-gray-50 dark:bg-gray-9500 rounded" style={{ width: `${width}%` }} />
                      </div>
                      <span className="w-16 text-sm text-gray-600 dark:text-gray-400 text-right font-data">{p.accidentsPer100k.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Datos históricos DGT</p>
            </div>
          )}

          {/* Most Improved */}
          {data.provinces.mostImproved.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
                Mayor Mejora
              </h3>
              <div className="space-y-2">
                {data.provinces.mostImproved.slice(0, 5).map((p, idx) => (
                  <div key={p.province} className="flex items-center justify-between">
                    <span className="font-medium text-green-800">{p.province}</span>
                    <span className="text-green-600 dark:text-green-400 font-bold font-data">{p.changePercent.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-700 dark:text-green-400 mt-3">Variación respecto al año anterior</p>
            </div>
          )}

          {/* Most Worsened */}
          {data.provinces.mostWorsened.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
                Mayor Empeoramiento
              </h3>
              <div className="space-y-2">
                {data.provinces.mostWorsened.slice(0, 5).map((p, idx) => (
                  <div key={p.province} className="flex items-center justify-between">
                    <span className="font-medium text-red-800">{p.province}</span>
                    <span className="text-red-600 dark:text-red-400 font-bold font-data">+{p.changePercent.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-red-700 dark:text-red-400 mt-3">Variación respecto al año anterior</p>
            </div>
          )}
        </div>
      )}

      {/* Road Rankings */}
      {rankingType === "roads" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Total Incidents */}
          {data.roads.byIncidentsTotal.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Más Incidencias
              </h3>
              <div className="space-y-2">
                {data.roads.byIncidentsTotal.slice(0, 10).map((r, idx) => {
                  const maxVal = data.roads.byIncidentsTotal[0]?.totalIncidents || 1;
                  const width = (r.totalIncidents / maxVal) * 100;
                  return (
                    <div key={r.roadName} className="flex items-center gap-2">
                      <span className="w-6 text-sm text-gray-500 dark:text-gray-400">#{idx + 1}</span>
                      <span className="w-20 text-sm font-bold text-tl-600 dark:text-tl-400">{r.roadName}</span>
                      <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
                        <div className="h-full bg-red-50 dark:bg-red-900/200 rounded" style={{ width: `${width}%` }} />
                      </div>
                      <span className="w-12 text-sm text-gray-600 dark:text-gray-400 text-right font-data">{r.totalIncidents}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* By Risk Score */}
          {data.roads.byRiskScore.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                Mayor Riesgo
              </h3>
              <div className="space-y-2">
                {data.roads.byRiskScore.slice(0, 10).map((r, idx) => {
                  const maxVal = data.roads.byRiskScore[0]?.riskScore || 1;
                  const width = (r.riskScore / maxVal) * 100;
                  return (
                    <div key={r.roadName} className="flex items-center gap-2">
                      <span className="w-6 text-sm text-gray-500 dark:text-gray-400">#{idx + 1}</span>
                      <span className="w-20 text-sm font-bold text-tl-600 dark:text-tl-400">{r.roadName}</span>
                      <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
                        <div className="h-full bg-orange-50 dark:bg-orange-900/200 rounded" style={{ width: `${width}%` }} />
                      </div>
                      <span className="w-12 text-sm text-gray-600 dark:text-gray-400 text-right font-data">{r.riskScore.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* By IMD */}
          {data.roads.byIMD.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Car className="w-5 h-5 text-green-500" />
                Mayor Tráfico (IMD)
              </h3>
              <div className="space-y-2">
                {data.roads.byIMD.slice(0, 10).map((r, idx) => {
                  const maxVal = data.roads.byIMD[0]?.avgIMD || 1;
                  const width = (r.avgIMD / maxVal) * 100;
                  return (
                    <div key={r.roadName} className="flex items-center gap-2">
                      <span className="w-6 text-sm text-gray-500 dark:text-gray-400">#{idx + 1}</span>
                      <span className="w-20 text-sm font-bold text-tl-600 dark:text-tl-400">{r.roadName}</span>
                      <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
                        <div className="h-full bg-green-50 dark:bg-green-900/200 rounded" style={{ width: `${width}%` }} />
                      </div>
                      <span className="w-16 text-sm text-gray-600 dark:text-gray-400 text-right font-data">{(r.avgIMD / 1000).toFixed(0)}k</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Intensidad Media Diaria (veh/día)</p>
            </div>
          )}

          {/* Most Dangerous */}
          {data.roads.mostDangerous.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                Más Peligrosas
              </h3>
              <div className="space-y-3">
                {data.roads.mostDangerous.slice(0, 5).map((r, idx) => (
                  <div key={r.roadName} className="flex items-center justify-between bg-white dark:bg-gray-900 rounded px-3 py-2">
                    <div>
                      <span className="font-bold text-red-800">{r.roadName}</span>
                      <p className="text-xs text-red-600 dark:text-red-400 font-data">{r.incidentsPerKm.toFixed(2)} inc/km</p>
                    </div>
                    <span className="text-lg font-bold text-red-700 dark:text-red-400 font-data">{r.riskScore.toFixed(1)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-red-700 dark:text-red-400 mt-3">Combinación de riesgo e incidencias por km</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface EstadisticasContentProps {
  initialTab?: string;
}

export function EstadisticasContent({ initialTab }: EstadisticasContentProps) {
  const [activeTab, setActiveTab] = useState<TabId>(
    (initialTab as TabId) || "resumen"
  );
  const [incidentPeriod, setIncidentPeriod] = useState(30);

  // Update tab when URL param changes (for direct links)
  useEffect(() => {
    if (initialTab && TABS.some((t) => t.id === initialTab)) {
      setActiveTab(initialTab as TabId);
    }
  }, [initialTab]);

  // Eager fetches — needed for resumen + incidencias tabs (default view)
  const { data: incidentStats, isLoading: incidentLoading } = useSWR<IncidentStatsResponse>(
    `/api/incidents/stats?days=${incidentPeriod}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: v16Summary, isLoading: v16SummaryLoading } = useSWR<V16StatsResponse>(
    "/api/historico/daily?days=30",
    fetcher,
    { revalidateOnFocus: false }
  );

  // Lazy fetches — only fire when the corresponding tab is active
  const { data: historicalData, isLoading: historicalLoading } = useSWR<HistoricalApiResponse>(
    activeTab === "historico" ? "/api/historical" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: roadRisk, isLoading: roadRiskLoading } = useSWR<RoadRiskResponse>(
    activeTab === "carreteras" ? "/api/roads/risk" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: weatherImpact, isLoading: weatherLoading } = useSWR<WeatherImpactResponse>(
    activeTab === "clima" ? "/api/weather/impact" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: correlation, isLoading: correlationLoading } = useSWR<CorrelationResponse>(
    activeTab === "correlacion" ? "/api/historico/correlation?days=30" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: rankings, isLoading: rankingsLoading } = useSWR<RankingsResponse>(
    activeTab === "rankings" ? "/api/rankings" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Estadísticas de Tráfico</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Análisis completo del tráfico en España: incidencias, balizas V16, accidentes históricos y más.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200 dark:border-gray-800">
          <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium whitespace-nowrap transition-colors
                    ${
                      isActive
                        ? "border-red-600 text-red-600 dark:text-red-400"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:border-gray-700"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "resumen" && (
          <ResumenSection
            incidentStats={incidentStats}
            v16Stats={v16Summary}
            incidentLoading={incidentLoading}
            v16Loading={v16SummaryLoading}
          />
        )}

        {activeTab === "incidencias" && (
          <IncidenciasSection
            data={incidentStats}
            isLoading={incidentLoading}
            period={incidentPeriod}
            setPeriod={setIncidentPeriod}
          />
        )}

        {activeTab === "v16" && <V16Section />}

        {activeTab === "correlacion" && (
          <CorrelacionSection data={correlation} isLoading={correlationLoading} />
        )}

        {activeTab === "historico" && (
          <HistoricoSection data={historicalData} isLoading={historicalLoading} />
        )}

        {activeTab === "carreteras" && (
          <CarreterasSection data={roadRisk} isLoading={roadRiskLoading} />
        )}

        {activeTab === "clima" && (
          <ClimaSection data={weatherImpact} isLoading={weatherLoading} />
        )}

        {activeTab === "rankings" && (
          <RankingsSection data={rankings} isLoading={rankingsLoading} />
        )}

        {/* Data Sources */}
        <div className="mt-12 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Fuentes de datos</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">DGT en Cifras</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Estadísticas anuales oficiales de siniestralidad vial.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">NAP DATEX II</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Datos en tiempo real de incidencias y balizas V16.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">SCT / Euskadi / Madrid</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Fuentes regionales de tráfico complementarias.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">AEMET</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Alertas meteorológicas para análisis de impacto.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
