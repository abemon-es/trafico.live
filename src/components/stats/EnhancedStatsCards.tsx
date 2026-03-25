"use client";

import useSWR from "swr";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Camera,
  Zap,
  Ban,
  Loader2,
  CloudRain,
  Clock,
  ArrowRight,
} from "lucide-react";

interface StatsData {
  v16Active: number;
  v16Change: number | null;
  incidents: number;
  incidentsChange: number | null;
  cameras: number;
  chargers: number;
  zbeZones: number;
  lastUpdated: string;
}

interface DashboardData {
  success: boolean;
  data: {
    sparkline: Array<{ hour: number; incidents: number; v16: number }>;
    comparison: {
      incidents: {
        today: number;
        yesterday: number;
        lastWeek: number;
        changeVsYesterday: number | null;
        changeVsLastWeek: number | null;
      };
      v16: {
        today: number;
        yesterday: number;
        lastWeek: number;
        changeVsYesterday: number | null;
        changeVsLastWeek: number | null;
      };
    };
    weather: {
      activeAlerts: number;
      hasActiveAlerts: boolean;
    };
    peakHours: {
      isPeakHour: boolean;
      currentHour: number;
      isAboveAverage: boolean;
      avgIncidents: number;
      currentIncidents: number;
    };
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Mini sparkline component
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 80;
  const height = 24;
  const padding = 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(" ")}
      />
    </svg>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number | null;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
  sparklineData?: number[];
  sparklineColor?: string;
  comparison?: {
    yesterday: number;
    lastWeek: number;
    changeVsYesterday: number | null;
    changeVsLastWeek: number | null;
  };
}

function StatCard({
  title,
  value,
  change,
  icon,
  color,
  loading,
  sparklineData,
  sparklineColor,
  comparison,
}: StatCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        {sparklineData && sparklineData.length > 0 && (
          <Sparkline data={sparklineData} color={sparklineColor || "#6B7280"} />
        )}
        {!sparklineData && change !== undefined && change !== null && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              isPositive ? "text-green-600 dark:text-green-400" : isNegative ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : isNegative ? (
              <TrendingDown className="w-4 h-4" />
            ) : null}
            <span className="font-data">{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div className="mt-3">
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400 dark:text-gray-500 dark:text-gray-400" />
            <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400">Cargando...</span>
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
              {typeof value === "number" ? value.toLocaleString("es-ES") : value}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            {comparison && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">
                <span>
                  Ayer: <span className="font-data">{comparison.yesterday}</span>
                  {comparison.changeVsYesterday !== null && (
                    <span
                      className={
                        comparison.changeVsYesterday > 0
                          ? "text-red-500 ml-1 font-data"
                          : comparison.changeVsYesterday < 0
                          ? "text-green-500 ml-1 font-data"
                          : "font-data"
                      }
                    >
                      ({comparison.changeVsYesterday > 0 ? "+" : ""}
                      {comparison.changeVsYesterday}%)
                    </span>
                  )}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function WeatherAlertBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800/50 rounded-lg p-3 flex items-center gap-3">
      <div className="p-2 bg-tl-amber-100 dark:bg-tl-amber-900/30 rounded-lg">
        <CloudRain className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-tl-amber-800 dark:text-tl-amber-300">
          <span className="font-data">{count}</span> {count === 1 ? "alerta meteorológica activa" : "alertas meteorológicas activas"}
        </p>
        <p className="text-xs text-tl-amber-600 dark:text-tl-amber-400">Puede afectar al tráfico</p>
      </div>
      <a
        href="/estadisticas?tab=clima"
        className="text-tl-amber-700 dark:text-tl-amber-400 hover:text-tl-amber-900 dark:hover:text-tl-amber-200 flex items-center gap-1 text-sm"
      >
        Ver <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}

function PeakHourBadge({
  isPeakHour,
  isAboveAverage,
  currentHour,
}: {
  isPeakHour: boolean;
  isAboveAverage: boolean;
  currentHour: number;
}) {
  if (!isPeakHour && !isAboveAverage) return null;

  const formatHour = (h: number) => `${h.toString().padStart(2, "0")}:00`;

  return (
    <div
      className={`rounded-lg p-3 flex items-center gap-3 ${
        isAboveAverage
          ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50"
          : "bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800/50"
      }`}
    >
      <div className={`p-2 rounded-lg ${isAboveAverage ? "bg-red-100 dark:bg-red-900/30" : "bg-tl-100 dark:bg-tl-900/30"}`}>
        <Clock className={`w-5 h-5 ${isAboveAverage ? "text-red-600 dark:text-red-400" : "text-tl-600 dark:text-tl-400"}`} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${isAboveAverage ? "text-red-800 dark:text-red-300" : "text-tl-800 dark:text-tl-300"}`}>
          {isAboveAverage
            ? "Actividad superior a la media"
            : `Hora punta (${formatHour(currentHour)})`}
        </p>
        <p className={`text-xs ${isAboveAverage ? "text-red-600 dark:text-red-400" : "text-tl-600 dark:text-tl-400"}`}>
          {isAboveAverage
            ? "Se recomienda precaución en carretera"
            : "Mayor concentración de tráfico habitual"}
        </p>
      </div>
    </div>
  );
}

export function EnhancedStatsCards() {
  const { data: stats, isLoading: statsLoading } = useSWR<StatsData>("/api/stats", fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
  });

  const { data: dashboard, isLoading: dashboardLoading } = useSWR<DashboardData>(
    "/api/dashboard/stats",
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
    }
  );

  const displayStats = {
    v16Active: stats?.v16Active ?? 0,
    v16Change: stats?.v16Change ?? null,
    incidents: stats?.incidents ?? 0,
    incidentsChange: stats?.incidentsChange ?? null,
    cameras: stats?.cameras ?? 0,
    chargers: stats?.chargers ?? 0,
    zbeZones: stats?.zbeZones ?? 0,
  };

  const sparklineIncidents = dashboard?.data?.sparkline?.map((d) => d.incidents) ?? [];
  const sparklineV16 = dashboard?.data?.sparkline?.map((d) => d.v16) ?? [];

  return (
    <div className="space-y-4">
      {/* Alert badges row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dashboard?.data?.weather?.hasActiveAlerts && (
          <WeatherAlertBadge count={dashboard.data.weather.activeAlerts} />
        )}
        {dashboard?.data?.peakHours && (
          <PeakHourBadge
            isPeakHour={dashboard.data.peakHours.isPeakHour}
            isAboveAverage={dashboard.data.peakHours.isAboveAverage}
            currentHour={dashboard.data.peakHours.currentHour}
          />
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="V16 Activas"
          value={displayStats.v16Active}
          change={displayStats.v16Change}
          icon={<AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />}
          color="bg-red-50 dark:bg-red-900/20"
          loading={statsLoading}
          sparklineData={sparklineV16}
          sparklineColor="#DC2626"
          comparison={
            dashboard?.data?.comparison?.v16
              ? {
                  yesterday: dashboard.data.comparison.v16.yesterday,
                  lastWeek: dashboard.data.comparison.v16.lastWeek,
                  changeVsYesterday: dashboard.data.comparison.v16.changeVsYesterday,
                  changeVsLastWeek: dashboard.data.comparison.v16.changeVsLastWeek,
                }
              : undefined
          }
        />
        <StatCard
          title="Incidencias"
          value={displayStats.incidents}
          change={displayStats.incidentsChange}
          icon={<AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
          color="bg-orange-50"
          loading={statsLoading}
          sparklineData={sparklineIncidents}
          sparklineColor="#EA580C"
          comparison={
            dashboard?.data?.comparison?.incidents
              ? {
                  yesterday: dashboard.data.comparison.incidents.yesterday,
                  lastWeek: dashboard.data.comparison.incidents.lastWeek,
                  changeVsYesterday: dashboard.data.comparison.incidents.changeVsYesterday,
                  changeVsLastWeek: dashboard.data.comparison.incidents.changeVsLastWeek,
                }
              : undefined
          }
        />
        <StatCard
          title="Cámaras"
          value={displayStats.cameras}
          icon={<Camera className="w-5 h-5 text-tl-600 dark:text-tl-400" />}
          color="bg-tl-50 dark:bg-tl-900/20"
        />
        <StatCard
          title="Cargadores EV"
          value={displayStats.chargers}
          icon={<Zap className="w-5 h-5 text-green-600 dark:text-green-400" />}
          color="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          title="Zonas ZBE"
          value={displayStats.zbeZones}
          icon={<Ban className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
          color="bg-purple-50"
        />
      </div>
    </div>
  );
}
