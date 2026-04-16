"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import {
  Ship,
  Anchor,
  Navigation,
  Clock,
  ArrowRight,
  Gauge,
  Route,
  LogIn,
  LogOut,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types (matching the parallel API contract)
// ---------------------------------------------------------------------------

type PortCall = {
  id: string;
  mmsi: number;
  portName: string | null;
  portCode: string | null;
  arrivedAt: string;
  departedAt: string | null;
  durationH: number | null;
  latitude: number;
  longitude: number;
};

type Voyage = {
  id: string;
  mmsi: number;
  departurePort: string | null;
  arrivalPort: string | null;
  departedAt: string;
  arrivedAt: string | null;
  distanceNm: number | null;
  durationH: number | null;
  avgSpeedKn: number | null;
  status: "IN_TRANSIT" | "ARRIVED";
};

interface PortActivityData {
  port: { slug: string; name: string };
  arrivals: PortCall[];
  departures: PortCall[];
  voyages: Voyage[];
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  slug: string;
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDuration(h: number | null): string {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)} min`;
  const days = Math.floor(h / 24);
  const hours = Math.round(h % 24);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 animate-pulse">
      <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="flex-1 h-4 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="rounded-xl border border-tl-sea-200 dark:border-tl-sea-800/50 bg-white dark:bg-gray-900 overflow-hidden">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="divide-y divide-gray-100 dark:divide-gray-800">
          <SkeletonRow />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Anchor className="w-10 h-10 text-tl-sea-300 dark:text-tl-sea-700 mb-3" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PortCall row
// ---------------------------------------------------------------------------

function PortCallRow({ call, type }: { call: PortCall; type: "arrival" | "departure" }) {
  const isInPort = type === "arrival" && call.departedAt == null;

  return (
    <Link
      href={`/maritimo/buques/${call.mmsi}`}
      className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-tl-sea-50 dark:hover:bg-tl-sea-900/20 transition-colors group"
    >
      {/* MMSI / vessel */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Ship className="w-4 h-4 text-tl-sea-500 dark:text-tl-sea-400 flex-shrink-0" />
        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-sea-700 dark:group-hover:text-tl-sea-300 transition-colors">
          MMSI {call.mmsi}
        </span>
        {isInPort && (
          <span className="flex-shrink-0 text-xs font-medium px-1.5 py-0.5 rounded bg-tl-sea-100 text-tl-sea-700 dark:bg-tl-sea-900/40 dark:text-tl-sea-300">
            En puerto
          </span>
        )}
      </div>

      {/* Time */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-mono">
        <Clock className="w-3 h-3 flex-shrink-0" />
        {type === "arrival"
          ? formatDate(call.arrivedAt)
          : call.departedAt
            ? formatDate(call.departedAt)
            : "—"}
      </div>

      {/* Duration */}
      {call.durationH != null && (
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
          {formatDuration(call.durationH)}
        </span>
      )}

      <ArrowRight className="w-3 h-3 text-tl-sea-400 dark:text-tl-sea-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Voyage row
// ---------------------------------------------------------------------------

function VoyageRow({ voyage }: { voyage: Voyage }) {
  const isTransit = voyage.status === "IN_TRANSIT";

  return (
    <Link
      href={`/maritimo/buques/${voyage.mmsi}`}
      className="flex flex-wrap items-start gap-3 px-4 py-3 hover:bg-tl-sea-50 dark:hover:bg-tl-sea-900/20 transition-colors group"
    >
      {/* Route */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Route className="w-4 h-4 text-tl-sea-500 dark:text-tl-sea-400 flex-shrink-0" />
        <div className="min-w-0">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-sea-700 dark:group-hover:text-tl-sea-300 transition-colors">
            {voyage.departurePort ?? "Origen desconocido"}
          </span>
          <span className="mx-1.5 text-gray-400 dark:text-gray-600">→</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-sea-700 dark:group-hover:text-tl-sea-300 transition-colors">
            {voyage.arrivalPort ?? "Destino desconocido"}
          </span>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
            MMSI {voyage.mmsi}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs font-mono text-gray-500 dark:text-gray-400 flex-shrink-0">
        {voyage.distanceNm != null && (
          <span title="Distancia">
            {Math.round(voyage.distanceNm)} nm
          </span>
        )}
        {voyage.durationH != null && (
          <span title="Duración">
            <Clock className="w-3 h-3 inline mr-0.5" />
            {formatDuration(voyage.durationH)}
          </span>
        )}
        {voyage.avgSpeedKn != null && (
          <span title="Velocidad media">
            <Gauge className="w-3 h-3 inline mr-0.5" />
            {voyage.avgSpeedKn.toFixed(1)} kn
          </span>
        )}
        <span
          className={`px-1.5 py-0.5 rounded text-xs font-medium ${
            isTransit
              ? "bg-tl-sea-100 text-tl-sea-700 dark:bg-tl-sea-900/40 dark:text-tl-sea-300"
              : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
          }`}
        >
          {isTransit ? "En tránsito" : "Llegado"}
        </span>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Tab types
// ---------------------------------------------------------------------------

type Tab = "arrivals" | "inport" | "departures" | "voyages";

const TAB_LABELS: Record<Tab, string> = {
  arrivals: "Llegadas",
  inport: "En puerto",
  departures: "Partidas",
  voyages: "Viajes",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PortActivity({ slug }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("inport");

  const { data, error, isLoading } = useSWR<PortActivityData>(
    `/api/maritimo/puertos/${slug}/actividad`,
    fetcher,
    { refreshInterval: 120_000 }
  );

  // Derive "in port" from arrivals without departedAt
  const inPort = data?.arrivals.filter((c) => c.departedAt == null) ?? [];

  const tabCounts: Record<Tab, number> = {
    arrivals: data?.arrivals.length ?? 0,
    inport: inPort.length,
    departures: data?.departures.length ?? 0,
    voyages: data?.voyages.length ?? 0,
  };

  return (
    <section aria-label="Actividad del puerto">
      {/* Section header */}
      <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Navigation className="w-5 h-5 text-tl-sea-500" />
        Actividad portuaria reciente
      </h2>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 mb-4 overflow-x-auto">
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => {
          const Icon =
            tab === "arrivals" ? LogIn :
            tab === "inport" ? Anchor :
            tab === "departures" ? LogOut :
            Route;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? "border-tl-sea-500 text-tl-sea-700 dark:text-tl-sea-300"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {TAB_LABELS[tab]}
              {!isLoading && data && (
                <span
                  className={`ml-1 text-xs font-mono px-1.5 py-0.5 rounded-full ${
                    activeTab === tab
                      ? "bg-tl-sea-100 text-tl-sea-700 dark:bg-tl-sea-900/40 dark:text-tl-sea-300"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {tabCounts[tab]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="rounded-xl border border-tl-sea-200 dark:border-tl-sea-800/50 bg-white dark:bg-gray-900 overflow-hidden">
        {isLoading && <LoadingSkeleton />}

        {error && (
          <div className="py-10 text-center text-sm text-red-500 dark:text-red-400">
            Error al cargar los datos de actividad portuaria.
          </div>
        )}

        {!isLoading && !error && data && (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {activeTab === "arrivals" && (
              data.arrivals.length === 0
                ? <EmptyState label="Sin llegadas recientes registradas" />
                : data.arrivals.map((c) => (
                    <PortCallRow key={c.id} call={c} type="arrival" />
                  ))
            )}

            {activeTab === "inport" && (
              inPort.length === 0
                ? <EmptyState label="No hay buques en puerto en este momento" />
                : inPort.map((c) => (
                    <PortCallRow key={c.id} call={c} type="arrival" />
                  ))
            )}

            {activeTab === "departures" && (
              data.departures.length === 0
                ? <EmptyState label="Sin partidas recientes registradas" />
                : data.departures.map((c) => (
                    <PortCallRow key={c.id} call={c} type="departure" />
                  ))
            )}

            {activeTab === "voyages" && (
              data.voyages.length === 0
                ? <EmptyState label="Sin viajes registrados para este puerto" />
                : data.voyages.map((v) => (
                    <VoyageRow key={v.id} voyage={v} />
                  ))
            )}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-400 dark:text-gray-600">
        Actividad basada en señales AIS. Fuente: aisstream.io
      </p>
    </section>
  );
}
