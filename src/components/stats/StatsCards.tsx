"use client";

import useSWR from "swr";
import { AlertTriangle, TrendingUp, TrendingDown, Camera, Zap, Ban, Loader2 } from "lucide-react";

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

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number | null;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function StatCard({ title, value, change, icon, color, loading }: StatCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        {change !== undefined && change !== null && (
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
          </>
        )}
      </div>
    </div>
  );
}

export function StatsCards() {
  const { data: stats, error, isLoading } = useSWR<StatsData>("/api/stats", fetcher, {
    refreshInterval: 60000, // Refresh every 60 seconds
    revalidateOnFocus: true,
  });

  // Fallback values while loading or on error
  const displayStats = {
    v16Active: stats?.v16Active ?? 0,
    v16Change: stats?.v16Change ?? null,
    incidents: stats?.incidents ?? 0,
    incidentsChange: stats?.incidentsChange ?? null,
    cameras: stats?.cameras ?? 512,
    chargers: stats?.chargers ?? 8432,
    zbeZones: stats?.zbeZones ?? 156,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard
        title="V16 Activas"
        value={displayStats.v16Active}
        change={displayStats.v16Change}
        icon={<AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />}
        color="bg-red-50 dark:bg-red-900/20"
        loading={isLoading}
      />
      <StatCard
        title="Incidencias"
        value={displayStats.incidents}
        change={displayStats.incidentsChange}
        icon={<AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
        color="bg-orange-50"
        loading={isLoading}
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
  );
}
