"use client";

import Link from "next/link";
import useSWR from "swr";
import {
  Camera,
  Radar,
  Zap,
  Ban,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface InfraResponse {
  cameras: { count: number };
  radars: { count: number; byType?: Record<string, number> };
  chargers: { count: number };
  zbe: { count: number };
  panels: { count: number; withMessage?: number };
}

const fetcher = async (): Promise<InfraResponse> => {
  const [cameras, radars, chargers, zbe, panels] = await Promise.all([
    fetch("/api/cameras?limit=1").then((r) => r.json()),
    fetch("/api/radars?limit=1").then((r) => r.json()),
    fetch("/api/chargers?limit=1").then((r) => r.json()),
    fetch("/api/zbe").then((r) => r.json()),
    fetch("/api/panels?limit=1").then((r) => r.json()),
  ]);

  return {
    cameras: { count: cameras.count || 0 },
    radars: { count: radars.count || 0, byType: radars.summary?.byType },
    chargers: { count: chargers.totalCount || chargers.count || 0 },
    zbe: { count: zbe.data?.zones?.length || zbe.count || 0 },
    panels: { count: panels.count || 0, withMessage: panels.withMessage || 0 },
  };
};

function InfraCard({
  icon,
  label,
  count,
  sublabel,
  href,
  color,
  isLoading,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  sublabel?: string;
  href: string;
  color: string;
  isLoading: boolean;
}) {
  return (
    <Link
      href={href}
      className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md hover:border-tl-300 transition-all group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
          <div>
            {isLoading ? (
              <div className="h-7 w-16 bg-gray-200 animate-pulse rounded" />
            ) : (
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{count.toLocaleString("es-ES")}</p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-tl-500 transition-colors" />
      </div>
    </Link>
  );
}

export function InfrastructureStatus() {
  const { data, isLoading, error } = useSWR<InfraResponse>(
    "infrastructure-status",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      refreshInterval: 300000, // 5 minutes
    }
  );

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">Error al cargar estado de infraestructura</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Infraestructura</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Estado de los sistemas de tráfico</p>
        </div>
        <Link
          href="/explorar/infraestructura"
          className="text-sm text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 hover:underline flex items-center gap-1"
        >
          Ver todo
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <InfraCard
              icon={<Camera className="w-5 h-5 text-tl-600 dark:text-tl-400" />}
              label="Cámaras"
              count={data?.cameras.count || 0}
              href="/explorar/infraestructura?tab=camaras"
              color="bg-tl-50 dark:bg-tl-900/20"
              isLoading={isLoading}
            />
            <InfraCard
              icon={<Radar className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />}
              label="Radares"
              count={data?.radars.count || 0}
              sublabel={data?.radars.byType ? `${data.radars.byType.FIXED || 0} fijos` : undefined}
              href="/explorar/infraestructura?tab=radares"
              color="bg-yellow-50 dark:bg-yellow-900/20"
              isLoading={isLoading}
            />
            <InfraCard
              icon={<Zap className="w-5 h-5 text-green-600 dark:text-green-400" />}
              label="Cargadores EV"
              count={data?.chargers.count || 0}
              href="/explorar/infraestructura?tab=cargadores"
              color="bg-green-50 dark:bg-green-900/20"
              isLoading={isLoading}
            />
            <InfraCard
              icon={<Ban className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
              label="Zonas ZBE"
              count={data?.zbe.count || 0}
              href="/explorar/infraestructura?tab=zbe"
              color="bg-purple-50 dark:bg-purple-900/20"
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
