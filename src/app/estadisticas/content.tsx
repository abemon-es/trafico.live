"use client";

import { useState } from "react";
import useSWR from "swr";
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
    provinceRanking: Array<{ code: string; name: string; count: number }>;
    roadTypeBreakdown: Array<{ type: string; count: number }>;
    totals: { totalBeacons: number; provinces: number };
  };
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-2 ${iconBgColor} rounded-lg`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      {isLoading ? (
        <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
      ) : (
        <p className="text-2xl font-bold text-gray-900">
          {typeof value === "number" ? value.toLocaleString("es-ES") : value}
        </p>
      )}
      <p className="text-sm text-gray-500">{label}</p>
      {subLabel && <p className="text-xs text-gray-400 mt-1">{subLabel}</p>}
      {trend && !isLoading && (
        <div
          className={`flex items-center gap-1 mt-1 text-sm ${
            trend.isPositive ? "text-green-600" : "text-red-600"
          }`}
        >
          {trend.isPositive ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
          <span>{Math.abs(trend.value).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      {description && <p className="mt-1 text-gray-600">{description}</p>}
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600" />
          Patrón Hora × Día
        </h3>
        <div className="h-48 flex items-center justify-center text-gray-500">
          {isLoading ? <div className="animate-pulse">Cargando...</div> : <p>Sin datos</p>}
        </div>
      </div>
    );
  }

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const colorClasses = {
    red: ["bg-gray-100", "bg-red-100", "bg-red-200", "bg-red-400", "bg-red-600"],
    orange: ["bg-gray-100", "bg-orange-100", "bg-orange-200", "bg-orange-400", "bg-orange-600"],
    blue: ["bg-gray-100", "bg-blue-100", "bg-blue-200", "bg-blue-400", "bg-blue-600"],
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-purple-600" />
        Patrón Hora × Día
      </h3>
      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          <div className="flex mb-1">
            <div className="w-10" />
            {[0, 6, 12, 18].map((h) => (
              <div key={h} className="flex-1 text-xs text-gray-500 text-center">
                {h}h
              </div>
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <div key={day} className="flex items-center mb-0.5">
              <div className="w-10 text-xs text-gray-500">{dayNames[day]}</div>
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
        <p className="mt-3 text-sm text-gray-600">
          Pico: <span className="font-medium">{peaks.hour.hour}:00</span> ({peaks.day.dayName})
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="h-32 flex items-center justify-center text-gray-500">
          {isLoading ? <div className="animate-pulse">Cargando...</div> : <p>Sin datos</p>}
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const bgColor = color === "orange" ? "bg-orange-500" : color === "blue" ? "bg-blue-500" : "bg-red-500";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
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
      <p className="text-xs text-gray-500 mt-2">Últimos 30 días</p>
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
          iconBgColor="bg-red-50"
          iconColor="text-red-600"
          value={hasIncidents ? incidentStats.data.totals.activeNow : "-"}
          label="Incidencias Activas"
          isLoading={incidentLoading}
        />
        <StatCard
          icon={Zap}
          iconBgColor="bg-orange-50"
          iconColor="text-orange-600"
          value={hasV16 ? v16Stats.data.totals.v16Total : "-"}
          label="Balizas V16 (30d)"
          isLoading={v16Loading}
        />
        <StatCard
          icon={Clock}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          value={hasIncidents ? incidentStats.data.totals.incidentsLast24h : "-"}
          label="Incidencias 24h"
          isLoading={incidentLoading}
        />
        <StatCard
          icon={Calendar}
          iconBgColor="bg-purple-50"
          iconColor="text-purple-600"
          value={hasIncidents ? incidentStats.data.totals.incidentsLast7d : "-"}
          label="Incidencias 7d"
          isLoading={incidentLoading}
        />
        <StatCard
          icon={Clock}
          iconBgColor="bg-green-50"
          iconColor="text-green-600"
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
    ACCIDENT: "bg-red-500",
    ROADWORK: "bg-orange-500",
    CONGESTION: "bg-yellow-500",
    HAZARD: "bg-purple-500",
    VEHICLE_BREAKDOWN: "bg-blue-500",
    WEATHER: "bg-cyan-500",
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
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
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
          iconBgColor="bg-red-50"
          iconColor="text-red-600"
          value={hasData ? stats!.totals.totalIncidents : "-"}
          label="Total Período"
          isLoading={isLoading}
        />
        <StatCard
          icon={Activity}
          iconBgColor="bg-green-50"
          iconColor="text-green-600"
          value={hasData ? stats!.totals.activeNow : "-"}
          label="Activas Ahora"
          isLoading={isLoading}
        />
        <StatCard
          icon={Clock}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          value={hasData ? stats!.totals.incidentsLast24h : "-"}
          label="Últimas 24h"
          isLoading={isLoading}
        />
        <StatCard
          icon={Calendar}
          iconBgColor="bg-purple-50"
          iconColor="text-purple-600"
          value={hasData ? stats!.totals.incidentsLast7d : "-"}
          label="Últimos 7 días"
          isLoading={isLoading}
        />
        <StatCard
          icon={Clock}
          iconBgColor="bg-orange-50"
          iconColor="text-orange-600"
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-600" />
              Por Tipo
            </h3>
            <div className="space-y-2">
              {stats.byType.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-24 text-sm text-gray-600 truncate">{item.label}</div>
                  <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className={`h-full ${typeColors[item.type] || "bg-gray-500"} rounded`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <div className="w-16 text-sm text-gray-600 text-right">{item.percentage}%</div>
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

function V16Section({
  dailyData,
  provincesData,
  dailyLoading,
  provincesLoading,
  period,
  setPeriod,
}: {
  dailyData?: V16StatsResponse;
  provincesData?: V16ProvincesResponse;
  dailyLoading: boolean;
  provincesLoading: boolean;
  period: number;
  setPeriod: (p: number) => void;
}) {
  const hasDaily = dailyData?.success;
  const hasProvinces = provincesData?.success;

  const roadTypeLabels: Record<string, string> = {
    AUTOPISTA: "Autopista",
    AUTOVIA: "Autovía",
    NACIONAL: "Nacional",
    COMARCAL: "Comarcal",
    PROVINCIAL: "Provincial",
    OTHER: "Otra",
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SectionHeader
          title="Estadísticas de Balizas V16"
          description="Análisis histórico de emergencias señalizadas con baliza V16"
        />
        <select
          value={period}
          onChange={(e) => setPeriod(parseInt(e.target.value, 10))}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        >
          <option value={7}>7 días</option>
          <option value={14}>14 días</option>
          <option value={30}>30 días</option>
          <option value={90}>90 días</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Zap}
          iconBgColor="bg-orange-50"
          iconColor="text-orange-600"
          value={hasDaily ? dailyData.data.totals.v16Total : "-"}
          label="Total Balizas"
          subLabel={hasDaily ? `${dailyData.data.totals.daysWithData} días` : undefined}
          isLoading={dailyLoading}
        />
        <StatCard
          icon={Clock}
          iconBgColor="bg-green-50"
          iconColor="text-green-600"
          value={
            hasDaily && dailyData.data.totals.avgDurationSecs
              ? `${Math.round(dailyData.data.totals.avgDurationSecs / 60)}m`
              : "-"
          }
          label="Duración Media"
          isLoading={dailyLoading}
        />
        <StatCard
          icon={Calendar}
          iconBgColor="bg-purple-50"
          iconColor="text-purple-600"
          value={
            hasDaily && dailyData.data.peak
              ? new Date(dailyData.data.peak.date).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                })
              : "-"
          }
          label="Día Pico"
          subLabel={hasDaily && dailyData.data.peak ? `${dailyData.data.peak.count} balizas` : undefined}
          isLoading={dailyLoading}
        />
        <StatCard
          icon={MapPin}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          value={hasProvinces ? provincesData.data.totals.provinces : "-"}
          label="Provincias"
          isLoading={provincesLoading}
        />
      </div>

      {/* Daily Trend */}
      <DailyTrendMini
        data={dailyData?.data?.dailyData?.map((d) => ({ date: d.date, count: d.v16Count }))}
        isLoading={dailyLoading}
        color="orange"
        title="Tendencia Diaria"
      />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {hasProvinces && provincesData.data.provinceRanking.length > 0 && (
          <BreakdownChart
            title="Top Provincias"
            data={provincesData.data.provinceRanking.slice(0, 15).map((p) => ({
              name: p.name,
              value: p.count,
            }))}
            labelWidth={110}
          />
        )}

        {hasProvinces && provincesData.data.roadTypeBreakdown.length > 0 && (
          <BreakdownChart
            title="Por Tipo de Vía"
            data={provincesData.data.roadTypeBreakdown.map((r) => ({
              name: roadTypeLabels[r.type] || r.type,
              value: r.count,
            }))}
            labelWidth={90}
          />
        )}
      </div>

      {/* Data Start Date */}
      {hasDaily && dailyData.data.dataStartDate && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-800">
            <span className="font-medium">Recopilando datos desde:</span>{" "}
            {new Date(dailyData.data.dataStartDate).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      )}
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
          iconBgColor="bg-red-50"
          iconColor="text-red-600"
          value={hasData ? historicalData!.totals.accidents : "-"}
          label={`Accidentes (${latestYear})`}
          isLoading={isLoading}
        />
        <StatCard
          icon={Users}
          iconBgColor="bg-gray-100"
          iconColor="text-gray-600"
          value={hasData ? historicalData!.totals.fatalities : "-"}
          label={`Fallecidos (${latestYear})`}
          isLoading={isLoading}
        />
        <StatCard
          icon={Car}
          iconBgColor="bg-orange-50"
          iconColor="text-orange-600"
          value={hasData ? historicalData!.totals.hospitalized : "-"}
          label="Heridos graves"
          isLoading={isLoading}
        />
        <StatCard
          icon={yoyTrend?.isPositive ? TrendingDown : TrendingUp}
          iconBgColor={yoyTrend?.isPositive ? "bg-green-50" : "bg-red-50"}
          iconColor={yoyTrend?.isPositive ? "text-green-600" : "text-red-600"}
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
    CRITICAL: { bg: "bg-red-600", text: "text-red-600", label: "Crítico" },
    HIGH: { bg: "bg-orange-500", text: "text-orange-600", label: "Alto" },
    MEDIUM: { bg: "bg-yellow-500", text: "text-yellow-600", label: "Medio" },
    LOW: { bg: "bg-green-500", text: "text-green-600", label: "Bajo" },
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
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
            value={data.data.summary.totalRoads}
            label="Carreteras Analizadas"
            isLoading={isLoading}
          />
          <StatCard
            icon={Shield}
            iconBgColor="bg-red-50"
            iconColor="text-red-600"
            value={data.data.summary.criticalRoads}
            label="Riesgo Crítico"
            isLoading={isLoading}
          />
          <StatCard
            icon={AlertTriangle}
            iconBgColor="bg-orange-50"
            iconColor="text-orange-600"
            value={data.data.summary.highRiskRoads}
            label="Riesgo Alto"
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Road List */}
      {hasData && data.data.roads.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Ranking de Carreteras por Riesgo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Carretera</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Incidencias</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Balizas V16</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Duración Med.</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Nivel Riesgo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.roads.slice(0, 20).map((road, idx) => {
                  const risk = riskColors[road.riskLevel] || riskColors.LOW;
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{road.road}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">{road.incidentCount}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">{road.v16Count}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <CloudRain className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Con Alertas</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {data.data.correlation.withAlerts.avgIncidents.toFixed(1)}
            </p>
            <p className="text-sm text-gray-500">incidencias/día promedio</p>
            <p className="text-xs text-gray-400 mt-1">{data.data.correlation.withAlerts.days} días</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Sin Alertas</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {data.data.correlation.withoutAlerts.avgIncidents.toFixed(1)}
            </p>
            <p className="text-sm text-gray-500">incidencias/día promedio</p>
            <p className="text-xs text-gray-400 mt-1">{data.data.correlation.withoutAlerts.days} días</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Multiplicador</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">×{data.data.correlation.impactMultiplier.toFixed(2)}</p>
            <p className="text-sm text-gray-500">más incidencias con alertas</p>
          </div>
        </div>
      )}

      {/* By Alert Type */}
      {hasData && data.data.byAlertType.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Impacto por Tipo de Alerta</h3>
          <div className="space-y-3">
            {data.data.byAlertType.map((alert, idx) => {
              const maxAvg = Math.max(...data.data.byAlertType.map((a) => a.avgIncidents), 1);
              const width = (alert.avgIncidents / maxAvg) * 100;
              return (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-20 text-sm text-gray-600">
                    {alertTypeLabels[alert.type] || alert.type}
                  </div>
                  <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                    <div className="h-full bg-blue-500 rounded" style={{ width: `${width}%` }} />
                  </div>
                  <div className="w-24 text-sm text-gray-600 text-right">
                    {alert.avgIncidents.toFixed(1)} inc/día
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!hasData && !isLoading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
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
            iconBgColor="bg-orange-50"
            iconColor="text-orange-600"
            value={data.data.summary.totalV16}
            label="Balizas V16"
            subLabel="analizadas"
            isLoading={isLoading}
          />
          <StatCard
            icon={AlertTriangle}
            iconBgColor="bg-red-50"
            iconColor="text-red-600"
            value={data.data.summary.totalIncidents}
            label="Incidencias"
            subLabel="analizadas"
            isLoading={isLoading}
          />
          <StatCard
            icon={Link2}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
            value={data.data.summary.totalCorrelations}
            label="Correlaciones"
            subLabel="encontradas"
            isLoading={isLoading}
          />
          <StatCard
            icon={Activity}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Por Distancia
            </h3>
            <div className="space-y-3">
              {[
                { label: "< 500m", value: data.data.byDistance.under500m, color: "bg-red-500" },
                { label: "500m - 1km", value: data.data.byDistance.under1km, color: "bg-orange-500" },
                { label: "1km - 2km", value: data.data.byDistance.under2km, color: "bg-yellow-500" },
                { label: "> 2km", value: data.data.byDistance.over2km, color: "bg-green-500" },
              ].map((item) => {
                const total = data.data.summary.totalCorrelations || 1;
                const percentage = Math.round((item.value / total) * 100);
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-20 text-sm text-gray-600">{item.label}</div>
                    <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                      <div className={`h-full ${item.color} rounded`} style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="w-16 text-sm text-gray-600 text-right">{item.value}</div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Distancia entre baliza V16 e incidencia más cercana
            </p>
          </div>

          {/* By Time Difference */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Por Proximidad Temporal
            </h3>
            <div className="space-y-3">
              {[
                { label: "Durante", value: data.data.byTimeDiff.during, color: "bg-red-500" },
                { label: "< 15 min", value: data.data.byTimeDiff.within15min, color: "bg-orange-500" },
                { label: "15-30 min", value: data.data.byTimeDiff.within30min, color: "bg-yellow-500" },
                { label: "30-60 min", value: data.data.byTimeDiff.within60min, color: "bg-green-500" },
              ].map((item) => {
                const total = data.data.summary.totalCorrelations || 1;
                const percentage = Math.round((item.value / total) * 100);
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-20 text-sm text-gray-600">{item.label}</div>
                    <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                      <div className={`h-full ${item.color} rounded`} style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="w-16 text-sm text-gray-600 text-right">{item.value}</div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-gray-500">
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Interpretación</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • <strong>{data.data.summary.v16CorrelationRate}%</strong> de las balizas V16 se activaron cerca
              de una incidencia reportada (en espacio y tiempo)
            </li>
            <li>
              • <strong>{data.data.summary.incidentCorrelationRate}%</strong> de las incidencias tuvieron una
              baliza V16 activada en sus inmediaciones
            </li>
            <li>
              • El análisis considera un radio máximo de {data.data.parameters.maxDistanceKm}km y
              diferencia temporal de {data.data.parameters.maxTimeDiffMinutes} minutos
            </li>
          </ul>
        </div>
      )}

      {/* Sample Correlations Table */}
      {hasData && data.data.sampleCorrelations.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Ejemplos de Correlaciones</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distancia</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dif. Tiempo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora V16</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora Incid.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provincia</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Carretera</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.sampleCorrelations.slice(0, 10).map((corr, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{corr.distanceKm} km</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {corr.timeDiffMinutes === 0 ? "Durante" : `${corr.timeDiffMinutes} min`}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(corr.v16Time).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(corr.incidentTime).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{corr.province || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{corr.road || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasData && !isLoading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
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
                ? "bg-blue-100 text-blue-700 border border-blue-200"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Provincias
          </button>
          <button
            onClick={() => setRankingType("roads")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              rankingType === "roads"
                ? "bg-blue-100 text-blue-700 border border-blue-200"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Más Incidencias (Total)
              </h3>
              <div className="space-y-2">
                {data.provinces.byIncidentsTotal.slice(0, 10).map((p, idx) => {
                  const maxVal = data.provinces.byIncidentsTotal[0]?.totalIncidents || 1;
                  const width = (p.totalIncidents / maxVal) * 100;
                  return (
                    <div key={p.province} className="flex items-center gap-2">
                      <span className="w-6 text-sm text-gray-500">#{idx + 1}</span>
                      <span className="w-24 text-sm font-medium text-gray-700 truncate">{p.province}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                        <div className="h-full bg-red-500 rounded" style={{ width: `${width}%` }} />
                      </div>
                      <span className="w-16 text-sm text-gray-600 text-right">{p.totalIncidents}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* By Incidents per 100k */}
          {data.provinces.byIncidentsPer100k.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                Incidencias por 100k hab.
              </h3>
              <div className="space-y-2">
                {data.provinces.byIncidentsPer100k.slice(0, 10).map((p, idx) => {
                  const maxVal = data.provinces.byIncidentsPer100k[0]?.incidentsPer100k || 1;
                  const width = (p.incidentsPer100k / maxVal) * 100;
                  return (
                    <div key={p.province} className="flex items-center gap-2">
                      <span className="w-6 text-sm text-gray-500">#{idx + 1}</span>
                      <span className="w-24 text-sm font-medium text-gray-700 truncate">{p.province}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                        <div className="h-full bg-purple-500 rounded" style={{ width: `${width}%` }} />
                      </div>
                      <span className="w-16 text-sm text-gray-600 text-right">{p.incidentsPer100k.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-3">Normalizado por población provincial</p>
            </div>
          )}

          {/* By V16 Total */}
          {data.provinces.byV16Total.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-500" />
                Más Balizas V16
              </h3>
              <div className="space-y-2">
                {data.provinces.byV16Total.slice(0, 10).map((p, idx) => {
                  const maxVal = data.provinces.byV16Total[0]?.totalV16 || 1;
                  const width = (p.totalV16 / maxVal) * 100;
                  return (
                    <div key={p.province} className="flex items-center gap-2">
                      <span className="w-6 text-sm text-gray-500">#{idx + 1}</span>
                      <span className="w-24 text-sm font-medium text-gray-700 truncate">{p.province}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                        <div className="h-full bg-orange-500 rounded" style={{ width: `${width}%` }} />
                      </div>
                      <span className="w-16 text-sm text-gray-600 text-right">{p.totalV16}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* By Accidents per 100k */}
          {data.provinces.byAccidentsPer100k.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Car className="w-5 h-5 text-gray-600" />
                Accidentes por 100k hab.
              </h3>
              <div className="space-y-2">
                {data.provinces.byAccidentsPer100k.slice(0, 10).map((p, idx) => {
                  const maxVal = data.provinces.byAccidentsPer100k[0]?.accidentsPer100k || 1;
                  const width = (p.accidentsPer100k / maxVal) * 100;
                  return (
                    <div key={p.province} className="flex items-center gap-2">
                      <span className="w-6 text-sm text-gray-500">#{idx + 1}</span>
                      <span className="w-24 text-sm font-medium text-gray-700 truncate">{p.province}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                        <div className="h-full bg-gray-500 rounded" style={{ width: `${width}%` }} />
                      </div>
                      <span className="w-16 text-sm text-gray-600 text-right">{p.accidentsPer100k.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-3">Datos históricos DGT</p>
            </div>
          )}

          {/* Most Improved */}
          {data.provinces.mostImproved.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-green-600" />
                Mayor Mejora
              </h3>
              <div className="space-y-2">
                {data.provinces.mostImproved.slice(0, 5).map((p, idx) => (
                  <div key={p.province} className="flex items-center justify-between">
                    <span className="font-medium text-green-800">{p.province}</span>
                    <span className="text-green-600 font-bold">{p.changePercent.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-700 mt-3">Variación respecto al año anterior</p>
            </div>
          )}

          {/* Most Worsened */}
          {data.provinces.mostWorsened.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-600" />
                Mayor Empeoramiento
              </h3>
              <div className="space-y-2">
                {data.provinces.mostWorsened.slice(0, 5).map((p, idx) => (
                  <div key={p.province} className="flex items-center justify-between">
                    <span className="font-medium text-red-800">{p.province}</span>
                    <span className="text-red-600 font-bold">+{p.changePercent.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-red-700 mt-3">Variación respecto al año anterior</p>
            </div>
          )}
        </div>
      )}

      {/* Road Rankings */}
      {rankingType === "roads" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Total Incidents */}
          {data.roads.byIncidentsTotal.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Más Incidencias
              </h3>
              <div className="space-y-2">
                {data.roads.byIncidentsTotal.slice(0, 10).map((r, idx) => {
                  const maxVal = data.roads.byIncidentsTotal[0]?.totalIncidents || 1;
                  const width = (r.totalIncidents / maxVal) * 100;
                  return (
                    <div key={r.roadName} className="flex items-center gap-2">
                      <span className="w-6 text-sm text-gray-500">#{idx + 1}</span>
                      <span className="w-20 text-sm font-bold text-blue-600">{r.roadName}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                        <div className="h-full bg-red-500 rounded" style={{ width: `${width}%` }} />
                      </div>
                      <span className="w-12 text-sm text-gray-600 text-right">{r.totalIncidents}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* By Risk Score */}
          {data.roads.byRiskScore.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-500" />
                Mayor Riesgo
              </h3>
              <div className="space-y-2">
                {data.roads.byRiskScore.slice(0, 10).map((r, idx) => {
                  const maxVal = data.roads.byRiskScore[0]?.riskScore || 1;
                  const width = (r.riskScore / maxVal) * 100;
                  return (
                    <div key={r.roadName} className="flex items-center gap-2">
                      <span className="w-6 text-sm text-gray-500">#{idx + 1}</span>
                      <span className="w-20 text-sm font-bold text-blue-600">{r.roadName}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                        <div className="h-full bg-orange-500 rounded" style={{ width: `${width}%` }} />
                      </div>
                      <span className="w-12 text-sm text-gray-600 text-right">{r.riskScore.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* By IMD */}
          {data.roads.byIMD.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Car className="w-5 h-5 text-green-500" />
                Mayor Tráfico (IMD)
              </h3>
              <div className="space-y-2">
                {data.roads.byIMD.slice(0, 10).map((r, idx) => {
                  const maxVal = data.roads.byIMD[0]?.avgIMD || 1;
                  const width = (r.avgIMD / maxVal) * 100;
                  return (
                    <div key={r.roadName} className="flex items-center gap-2">
                      <span className="w-6 text-sm text-gray-500">#{idx + 1}</span>
                      <span className="w-20 text-sm font-bold text-blue-600">{r.roadName}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                        <div className="h-full bg-green-500 rounded" style={{ width: `${width}%` }} />
                      </div>
                      <span className="w-16 text-sm text-gray-600 text-right">{(r.avgIMD / 1000).toFixed(0)}k</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-3">Intensidad Media Diaria (veh/día)</p>
            </div>
          )}

          {/* Most Dangerous */}
          {data.roads.mostDangerous.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Más Peligrosas
              </h3>
              <div className="space-y-3">
                {data.roads.mostDangerous.slice(0, 5).map((r, idx) => (
                  <div key={r.roadName} className="flex items-center justify-between bg-white rounded px-3 py-2">
                    <div>
                      <span className="font-bold text-red-800">{r.roadName}</span>
                      <p className="text-xs text-red-600">{r.incidentsPerKm.toFixed(2)} inc/km</p>
                    </div>
                    <span className="text-lg font-bold text-red-700">{r.riskScore.toFixed(1)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-red-700 mt-3">Combinación de riesgo e incidencias por km</p>
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

export function EstadisticasContent() {
  const [activeTab, setActiveTab] = useState<TabId>("resumen");
  const [incidentPeriod, setIncidentPeriod] = useState(30);
  const [v16Period, setV16Period] = useState(30);

  // Fetch all data
  const { data: historicalData, isLoading: historicalLoading } = useSWR<HistoricalApiResponse>(
    "/api/historical",
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: incidentStats, isLoading: incidentLoading } = useSWR<IncidentStatsResponse>(
    `/api/incidents/stats?days=${incidentPeriod}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: v16Daily, isLoading: v16DailyLoading } = useSWR<V16StatsResponse>(
    `/api/historico/daily?days=${v16Period}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: v16Provinces, isLoading: v16ProvincesLoading } = useSWR<V16ProvincesResponse>(
    `/api/historico/provinces?days=${v16Period}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: roadRisk, isLoading: roadRiskLoading } = useSWR<RoadRiskResponse>(
    "/api/roads/risk",
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: weatherImpact, isLoading: weatherLoading } = useSWR<WeatherImpactResponse>(
    "/api/weather/impact",
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: correlation, isLoading: correlationLoading } = useSWR<CorrelationResponse>(
    "/api/historico/correlation?days=30",
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: rankings, isLoading: rankingsLoading } = useSWR<RankingsResponse>(
    "/api/rankings",
    fetcher,
    { revalidateOnFocus: false }
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Estadísticas de Tráfico</h1>
          <p className="mt-2 text-gray-600">
            Análisis completo del tráfico en España: incidencias, balizas V16, accidentes históricos y más.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200">
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
                        ? "border-red-600 text-red-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
            v16Stats={v16Daily}
            incidentLoading={incidentLoading}
            v16Loading={v16DailyLoading}
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

        {activeTab === "v16" && (
          <V16Section
            dailyData={v16Daily}
            provincesData={v16Provinces}
            dailyLoading={v16DailyLoading}
            provincesLoading={v16ProvincesLoading}
            period={v16Period}
            setPeriod={setV16Period}
          />
        )}

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
        <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fuentes de datos</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <h3 className="font-medium text-gray-900">DGT en Cifras</h3>
              <p className="text-sm text-gray-500 mt-1">
                Estadísticas anuales oficiales de siniestralidad vial.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">NAP DATEX II</h3>
              <p className="text-sm text-gray-500 mt-1">
                Datos en tiempo real de incidencias y balizas V16.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">SCT / Euskadi / Madrid</h3>
              <p className="text-sm text-gray-500 mt-1">
                Fuentes regionales de tráfico complementarias.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">AEMET</h3>
              <p className="text-sm text-gray-500 mt-1">
                Alertas meteorológicas para análisis de impacto.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
