"use client";

import { useState } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
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
} from "lucide-react";
import { BreakdownChart, type ChartDataItem } from "@/components/stats/BreakdownCharts";
import { V16InfoSection } from "@/components/v16/V16InfoSection";

// Dynamic import for map to avoid SSR issues
const HistoricalMap = dynamic(
  () => import("@/components/map/HistoricalMap").then((mod) => mod.HistoricalMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="h-[400px] bg-gray-100 animate-pulse" />
      </div>
    ),
  }
);

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Types
interface DailyApiResponse {
  success: boolean;
  data: {
    totals: {
      v16Total: number;
      incidentTotal: number;
      daysWithData: number;
      avgDurationSecs: number | null;
    };
    peak: {
      date: string;
      count: number;
      peakHour: number | null;
    } | null;
    dailyData: Array<{
      date: string;
      v16Count: number;
      incidentCount: number;
      avgDuration: number | null;
    }>;
    dataStartDate: string | null;
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

// Period configuration
type PeriodValue = "ahora" | "hoy" | "7d" | "mes" | "trimestre" | "semestre" | "ano" | "todo";

interface PeriodOption {
  value: PeriodValue;
  label: string;
  days: number | null; // null means realtime or all data
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: "ahora", label: "Ahora (Tiempo real)", days: null },
  { value: "hoy", label: "Hoy", days: 1 },
  { value: "7d", label: "7 días", days: 7 },
  { value: "mes", label: "Este mes", days: null },
  { value: "trimestre", label: "Este trimestre", days: null },
  { value: "semestre", label: "Este semestre", days: null },
  { value: "ano", label: "Este año", days: null },
  { value: "todo", label: "Todo", days: null },
];

function getPeriodDays(period: PeriodValue): number {
  const now = new Date();

  switch (period) {
    case "ahora":
      return 0; // Realtime mode
    case "hoy":
      return 1;
    case "7d":
      return 7;
    case "mes": {
      // Days since start of current month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return Math.ceil((now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    case "trimestre": {
      // Days since start of current quarter
      const quarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
      return Math.ceil((now.getTime() - startOfQuarter.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    case "semestre": {
      // Days since start of current semester (Jan or Jul)
      const semester = now.getMonth() < 6 ? 0 : 6;
      const startOfSemester = new Date(now.getFullYear(), semester, 1);
      return Math.ceil((now.getTime() - startOfSemester.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    case "ano": {
      // Days since start of current year
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    case "todo":
      return 3650; // ~10 years - effectively all data
    default:
      return 30;
  }
}

interface HourlyApiResponse {
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

interface ProvincesApiResponse {
  success: boolean;
  data: {
    provinceRanking: Array<{
      code: string;
      name: string;
      count: number;
      avgDurationSecs: number | null;
    }>;
    communityRanking: Array<{ code: string; name: string; count: number }>;
    roadTypeBreakdown: Array<{ type: string; count: number }>;
    totals: { totalBeacons: number; provinces: number; communities: number };
  };
}

interface DurationApiResponse {
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

interface MapApiResponse {
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

interface RoadsApiResponse {
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-2 ${iconBgColor} rounded-lg`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      {isLoading ? (
        <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
      ) : (
        <p className="text-2xl font-bold text-gray-900 font-data">
          {typeof value === "number" ? value.toLocaleString("es-ES") : value}
        </p>
      )}
      <p className="text-sm text-gray-500">{label}</p>
      {subLabel && <p className="text-xs text-gray-400 mt-1">{subLabel}</p>}
    </div>
  );
}

function DailyTrendChart({
  data,
  isLoading,
}: {
  data?: DailyApiResponse["data"]["dailyData"];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="h-6 w-48 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-64 bg-gray-100 animate-pulse rounded" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-tl-600" />
          Tendencia Diaria
        </h2>
        <div className="h-64 flex items-center justify-center text-gray-500">
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-tl-600" />
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
                className="w-full bg-orange-500 rounded-t hover:bg-orange-600 transition-colors"
                style={{ height: `${height}%`, minHeight: day.v16Count > 0 ? "4px" : "0" }}
                title={`${day.date}: ${day.v16Count} balizas`}
              />
              <span className="text-xs text-gray-500 mt-1 truncate w-full text-center">
                {dayLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HourlyHeatmap({
  data,
  isLoading,
}: {
  data?: HourlyApiResponse["data"];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="h-6 w-48 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-48 bg-gray-100 animate-pulse rounded" />
      </div>
    );
  }

  if (!data || !data.heatmapData || data.heatmapData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600" />
          Patrón Horario
        </h2>
        <div className="h-48 flex items-center justify-center text-gray-500">
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
    if (intensity === 0) return "bg-gray-100";
    if (intensity < 0.25) return "bg-orange-100";
    if (intensity < 0.5) return "bg-orange-200";
    if (intensity < 0.75) return "bg-orange-400";
    return "bg-orange-600";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-purple-600" />
        Patrón Hora × Día de la Semana
      </h2>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex mb-1">
            <div className="w-12" />
            {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
              <div key={h} className="flex-1 text-xs text-gray-500 text-center">
                {h}:00
              </div>
            ))}
          </div>
          {/* Grid */}
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <div key={day} className="flex items-center mb-1">
              <div className="w-12 text-xs text-gray-500">{dayNames[day]}</div>
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
        <div className="mt-4 text-sm text-gray-600">
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

function DurationDistribution({
  data,
  isLoading,
}: {
  data?: DurationApiResponse["data"];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="h-6 w-48 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-48 bg-gray-100 animate-pulse rounded" />
      </div>
    );
  }

  if (!data || !data.stats || data.distribution.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-green-600" />
          Duración de Balizas
        </h2>
        <div className="h-48 flex items-center justify-center text-gray-500">
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-green-600" />
        Distribución de Duración
      </h2>
      <div className="space-y-3">
        {data.distribution.map((bucket, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-24 text-sm text-gray-600">{bucket.label}</div>
            <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
              <div
                className="h-full bg-green-500 rounded"
                style={{ width: `${(bucket.percentage / maxPercentage) * 100}%` }}
              />
            </div>
            <div className="w-16 text-sm text-gray-600 text-right font-data">{bucket.percentage}%</div>
          </div>
        ))}
      </div>
      {data.stats && (
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Media:</span>{" "}
            <span className="font-medium font-data">{data.stats.avgMinutes} min</span>
          </div>
          <div>
            <span className="text-gray-500">Mediana:</span>{" "}
            <span className="font-medium font-data">{data.stats.medianMinutes} min</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function HistoricoContent() {
  const [period, setPeriod] = useState<PeriodValue>("7d");

  const isRealtime = period === "ahora";
  const periodDays = getPeriodDays(period);

  // Realtime data - only fetch when in realtime mode
  const { data: realtimeData, isLoading: realtimeLoading } = useSWR<V16RealtimeResponse>(
    isRealtime ? "/api/v16" : null,
    fetcher,
    { refreshInterval: isRealtime ? 30000 : 0, revalidateOnFocus: isRealtime }
  );

  // Historical data - only fetch when NOT in realtime mode
  const { data: dailyData, isLoading: dailyLoading } = useSWR<DailyApiResponse>(
    !isRealtime ? `/api/historico/daily?days=${periodDays}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: hourlyData, isLoading: hourlyLoading } = useSWR<HourlyApiResponse>(
    !isRealtime ? `/api/historico/hourly?days=${Math.min(periodDays, 14)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: provincesData, isLoading: provincesLoading } = useSWR<ProvincesApiResponse>(
    !isRealtime ? `/api/historico/provinces?days=${periodDays}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: durationData, isLoading: durationLoading } = useSWR<DurationApiResponse>(
    !isRealtime ? `/api/historico/duration?days=${periodDays}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: mapData, isLoading: mapLoading } = useSWR<MapApiResponse>(
    !isRealtime ? `/api/historico/map?days=${periodDays}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: roadsData, isLoading: roadsLoading } = useSWR<RoadsApiResponse>(
    !isRealtime ? `/api/historico/roads?days=${periodDays}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const hasData = isRealtime
    ? (realtimeData?.count || 0) > 0
    : dailyData?.success && dailyData.data.totals.daysWithData > 0;

  // Transform realtime data to map format for the HistoricalMap component
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

  // Get data start date from daily API response
  const dataStartDate = dailyData?.data?.dataStartDate || null;

  // Convert province ranking to chart format
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

  // Build severity breakdown from map data (all beacons have severity)
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

  // Build top roads chart data
  const topRoadsChartData: ChartDataItem[] =
    roadsData?.data?.roads?.map((r) => ({
      name: r.road,
      value: r.count,
    })) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Balizas V16</h1>
            <p className="mt-2 text-gray-600">
              {isRealtime
                ? "Balizas V16 activas en tiempo real en carreteras españolas."
                : "Análisis histórico de emergencias señalizadas con baliza V16."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="period" className="text-sm text-gray-600">
              Período:
            </label>
            <select
              id="period"
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodValue)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data start date indicator */}
        {period === "todo" && dataStartDate && (
          <div className="mb-4 text-sm text-gray-500">
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
          <div className="mb-4 flex items-center gap-2 text-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-green-700 font-medium">
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
        <div className="mb-8">
          <HistoricalMap
            beacons={mapBeacons}
            clusters={isRealtime ? undefined : mapData?.data?.clusters}
            isLoading={isRealtime ? realtimeLoading : mapLoading}
            height="400px"
          />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={AlertTriangle}
            iconBgColor="bg-orange-50"
            iconColor="text-orange-600"
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
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
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
            iconBgColor="bg-tl-50"
            iconColor="text-tl-600"
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
            iconBgColor="bg-purple-50"
            iconColor="text-purple-600"
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

        {/* Charts Grid - Only show for historical data, not realtime */}
        {isRealtime ? (
          <div className="bg-tl-50 border border-tl-200 rounded-lg p-6 mb-8">
            <p className="text-tl-800 text-center">
              <span className="font-medium">Modo tiempo real activo.</span> Selecciona un período
              histórico para ver estadísticas y análisis detallados.
            </p>
          </div>
        ) : (
        <div className="space-y-8">
          {/* Daily Trend - Full Width */}
          <DailyTrendChart data={dailyData?.data?.dailyData} isLoading={dailyLoading} />

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Hourly Heatmap */}
            <HourlyHeatmap data={hourlyData?.data} isLoading={hourlyLoading} />

            {/* Duration Distribution */}
            <DurationDistribution data={durationData?.data} isLoading={durationLoading} />
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-gray-500" />
                  Ranking por Provincia
                </h2>
                <div className="h-64 flex items-center justify-center text-gray-500">
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-gray-500" />
                  Por Tipo de Vía
                </h2>
                <div className="h-64 flex items-center justify-center text-gray-500">
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-red-600" />
                  Distribución por Severidad
                </h2>
                <div className="space-y-3">
                  {severityChartData.map((item, idx) => {
                    const total = severityChartData.reduce((sum, i) => sum + i.value, 0);
                    const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    const colors: Record<string, string> = {
                      Baja: "bg-green-500",
                      Media: "bg-orange-500",
                      Alta: "bg-red-500",
                      "Muy Alta": "bg-red-900",
                    };
                    const bgColor = colors[item.name] || "bg-gray-500";
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-20 text-sm text-gray-600">{item.name}</div>
                        <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                          <div
                            className={`h-full ${bgColor} rounded`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-16 text-sm text-gray-600 text-right font-data">
                          {item.value} ({percentage}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Clasificación según nivel de urgencia de la emergencia
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-red-600" />
                  Distribución por Severidad
                </h2>
                <div className="h-64 flex items-center justify-center text-gray-500">
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Route className="w-5 h-5 text-tl-600" />
                  Top {topRoadsChartData.length} Carreteras
                </h2>
                <div className="space-y-3">
                  {topRoadsChartData.map((road, idx) => {
                    const maxValue = Math.max(...topRoadsChartData.map((r) => r.value));
                    const percentage = maxValue > 0 ? Math.round((road.value / maxValue) * 100) : 0;
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-16 text-sm font-medium text-gray-900">{road.name}</div>
                        <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                          <div
                            className="h-full bg-tl-500 rounded"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-10 text-sm text-gray-600 text-right font-data">{road.value}</div>
                      </div>
                    );
                  })}
                </div>
                {roadsData?.data?.totals && (
                  <p className="text-xs text-gray-500 mt-4">
                    <span className="font-data">{roadsData.data.totals.totalBeacons}</span> balizas en{" "}
                    <span className="font-data">{roadsData.data.totals.uniqueRoads}</span> carreteras diferentes
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Route className="w-5 h-5 text-tl-600" />
                  Carreteras con más balizas
                </h2>
                <div className="h-64 flex items-center justify-center text-gray-500">
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
      </main>
    </div>
  );
}
