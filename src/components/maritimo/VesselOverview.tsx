"use client";

import useSWR from "swr";
import Link from "next/link";
import {
  Anchor,
  MoveHorizontal,
  MapPin,
  Clock,
  Ship,
  AlertTriangle,
  BarChart3,
  RouteIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CurrentPort {
  portCode: string | null;
  portName: string | null;
  slug: string | null;
  arrivedAt: string;
}

interface LastPort extends CurrentPort {
  departedAt: string | null;
}

interface TopPort {
  portCode: string;
  portName: string;
  slug: string | null;
  visits: number;
}

interface VesselSummary {
  success: boolean;
  vessel: {
    mmsi: number;
    name: string | null;
    flag: string | null;
    shipType: number | null;
    length: number | null;
    beam: number | null;
    destination: string | null;
    eta: string | null;
  };
  status: {
    isMoving: boolean;
    lastSignalAgo: number | null;
    currentPort: CurrentPort | null;
    lastPort: LastPort | null;
  };
  stats: {
    voyages30d: number;
    portCalls30d: number;
    totalDistanceNm30d: number;
    avgSpeedKn30d: number | null;
    topPorts: TopPort[];
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "hace <1 min";
  if (mins < 60) return `hace ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonCard({ rows = 2 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 animate-pulse">
      <div className="h-4 w-1/3 rounded bg-gray-100 dark:bg-gray-800 mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-3 w-full rounded bg-gray-100 dark:bg-gray-800 mt-2" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card: Estado actual
// ---------------------------------------------------------------------------

function StatusCard({ status, vessel }: { status: VesselSummary["status"]; vessel: VesselSummary["vessel"] }) {
  const { isMoving, lastSignalAgo, currentPort } = status;
  const signalLost = lastSignalAgo !== null && lastSignalAgo > 15;

  return (
    <div className="rounded-2xl border border-tl-sea-100 dark:border-tl-sea-900/40 bg-white dark:bg-gray-900 p-5 flex flex-col gap-3">
      {/* Title */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Estado actual
        </span>
        {signalLost && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-tl-amber-100 dark:bg-tl-amber-900/40 text-tl-amber-700 dark:text-tl-amber-300">
            <AlertTriangle className="w-3 h-3" />
            Senal perdida
          </span>
        )}
      </div>

      {/* Main status */}
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isMoving
              ? "bg-tl-sea-100 dark:bg-tl-sea-900/50"
              : currentPort
              ? "bg-emerald-100 dark:bg-emerald-900/40"
              : "bg-gray-100 dark:bg-gray-800"
          }`}
        >
          {isMoving ? (
            <MoveHorizontal className="w-5 h-5 text-tl-sea-600 dark:text-tl-sea-400" />
          ) : (
            <Anchor
              className={`w-5 h-5 ${
                currentPort
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            />
          )}
        </div>
        <div className="min-w-0">
          {isMoving ? (
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              En navegacion
            </p>
          ) : currentPort ? (
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Amarrado en{" "}
              {currentPort.slug ? (
                <Link
                  href={`/maritimo/puertos/${currentPort.slug}`}
                  className="text-tl-sea-600 dark:text-tl-sea-400 hover:underline"
                >
                  {currentPort.portName ?? currentPort.portCode ?? "Puerto"}
                </Link>
              ) : (
                <span>{currentPort.portName ?? currentPort.portCode ?? "Puerto"}</span>
              )}
            </p>
          ) : (
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Parado (sin puerto detectado)
            </p>
          )}

          {lastSignalAgo !== null && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Ultima senal hace {lastSignalAgo}min
            </p>
          )}
        </div>
      </div>

      {/* Destination if navigating */}
      {isMoving && vessel.destination && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3 mt-1">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Destino: <span className="text-gray-700 dark:text-gray-300 font-medium">{vessel.destination}</span>
          </span>
        </div>
      )}

      {/* Otros buques en este puerto */}
      {currentPort?.slug && (
        <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-1">
          <Link
            href={`/maritimo/puertos/${currentPort.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-tl-sea-600 dark:text-tl-sea-400 hover:underline"
          >
            <Ship className="w-3.5 h-3.5" />
            Ver otros buques en este puerto
          </Link>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card: Actividad 30 días
// ---------------------------------------------------------------------------

function ActivityCard({ stats }: { stats: VesselSummary["stats"] }) {
  const hasActivity = stats.voyages30d > 0 || stats.portCalls30d > 0;

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 flex flex-col gap-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        Actividad — ultimos 30 dias
      </span>

      {hasActivity ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100 [font-family:var(--font-jetbrains-mono)]">
              {stats.voyages30d}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {stats.voyages30d === 1 ? "Viaje" : "Viajes"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100 [font-family:var(--font-jetbrains-mono)]">
              {stats.portCalls30d}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {stats.portCalls30d === 1 ? "Escala" : "Escalas"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100 [font-family:var(--font-jetbrains-mono)]">
              {stats.totalDistanceNm30d.toLocaleString("es-ES")}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">nm recorridas</span>
          </div>
          {stats.avgSpeedKn30d !== null && (
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100 [font-family:var(--font-jetbrains-mono)]">
                {stats.avgSpeedKn30d}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">kn velocidad media</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
          <BarChart3 className="w-4 h-4" />
          Sin actividad reciente
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card: Puertos más visitados
// ---------------------------------------------------------------------------

function TopPortsCard({ topPorts }: { topPorts: TopPort[] }) {
  if (topPorts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 flex flex-col gap-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        Puertos mas visitados (30d)
      </span>
      <ul className="space-y-2">
        {topPorts.map((port, i) => (
          <li key={port.portCode} className="flex items-center gap-3">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-tl-sea-100 dark:bg-tl-sea-900/50 text-tl-sea-600 dark:text-tl-sea-400 flex-shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              {port.slug ? (
                <Link
                  href={`/maritimo/puertos/${port.slug}`}
                  className="text-sm font-medium text-tl-sea-600 dark:text-tl-sea-400 hover:underline truncate block"
                >
                  {port.portName}
                </Link>
              ) : (
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate block">
                  {port.portName}
                </span>
              )}
              <span className="text-xs text-gray-400 dark:text-gray-500">{port.portCode}</span>
            </div>
            <span className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300 flex-shrink-0 [font-family:var(--font-jetbrains-mono)]">
              {port.visits}x
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card: Último puerto
// ---------------------------------------------------------------------------

function LastPortCard({ lastPort }: { lastPort: LastPort }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 flex flex-col gap-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        Ultimo puerto
      </span>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
          <RouteIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Salio de{" "}
            {lastPort.slug ? (
              <Link
                href={`/maritimo/puertos/${lastPort.slug}`}
                className="text-tl-sea-600 dark:text-tl-sea-400 hover:underline"
              >
                {lastPort.portName ?? lastPort.portCode ?? "Puerto"}
              </Link>
            ) : (
              <span>{lastPort.portName ?? lastPort.portCode ?? "Puerto"}</span>
            )}
          </p>
          {lastPort.departedAt && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(lastPort.departedAt)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VesselOverview (main export)
// ---------------------------------------------------------------------------

interface VesselOverviewProps {
  mmsi: number;
}

export function VesselOverview({ mmsi }: VesselOverviewProps) {
  const { data, error, isLoading } = useSWR<VesselSummary>(
    `/api/maritimo/buques/${mmsi}/resumen`,
    fetcher,
    { refreshInterval: 30_000 }
  );

  if (isLoading) {
    return (
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
        <SkeletonCard rows={3} />
        <SkeletonCard rows={4} />
        <SkeletonCard rows={5} />
        <SkeletonCard rows={2} />
      </section>
    );
  }

  if (error || !data?.success) {
    return null;
  }

  const { vessel, status, stats } = data;

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
      <StatusCard status={status} vessel={vessel} />
      <ActivityCard stats={stats} />
      {stats.topPorts.length > 0 && <TopPortsCard topPorts={stats.topPorts} />}
      {status.lastPort && <LastPortCard lastPort={status.lastPort} />}
    </section>
  );
}
