"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import {
  Route,
  Ship,
  Clock,
  Gauge,
  Navigation,
  Anchor,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VoyageStatus = "IN_TRANSIT" | "ARRIVED";

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
  status: VoyageStatus;
};

interface VoyagesResponse {
  voyages: Voyage[];
  total: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDuration(h: number | null): string {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)} min`;
  const days = Math.floor(h / 24);
  const hours = Math.round(h % 24);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function VoyageSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 animate-pulse">
      <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800 mb-3" />
      <div className="flex gap-3">
        <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Voyage card
// ---------------------------------------------------------------------------

function VoyageCard({ voyage }: { voyage: Voyage }) {
  const isTransit = voyage.status === "IN_TRANSIT";

  return (
    <Link
      href={`/maritimo/buques/${voyage.mmsi}`}
      className="group flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-tl-sea-300 dark:hover:border-tl-sea-700 hover:shadow-md transition-all"
    >
      {/* Route header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Route className="w-4 h-4 text-tl-sea-500 dark:text-tl-sea-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-tl-sea-700 dark:group-hover:text-tl-sea-300 transition-colors leading-tight">
              {voyage.departurePort ?? "Origen desconocido"}
              <span className="mx-1.5 text-gray-400 dark:text-gray-600 font-normal">→</span>
              {voyage.arrivalPort ?? "Destino desconocido"}
            </div>
            <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 font-mono">
              MMSI {voyage.mmsi} · {formatDate(voyage.departedAt)}
            </div>
          </div>
        </div>

        <span
          className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
            isTransit
              ? "bg-tl-sea-100 text-tl-sea-700 dark:bg-tl-sea-900/40 dark:text-tl-sea-300"
              : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
          }`}
        >
          {isTransit ? "En tránsito" : "Llegado"}
        </span>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-3 text-xs font-mono text-gray-500 dark:text-gray-400">
        {voyage.distanceNm != null && (
          <span className="flex items-center gap-1">
            <Navigation className="w-3 h-3" />
            {Math.round(voyage.distanceNm)} nm
          </span>
        )}
        {voyage.durationH != null && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(voyage.durationH)}
          </span>
        )}
        {voyage.avgSpeedKn != null && (
          <span className="flex items-center gap-1">
            <Gauge className="w-3 h-3" />
            {voyage.avgSpeedKn.toFixed(1)} kn media
          </span>
        )}
        {voyage.arrivedAt && (
          <span className="flex items-center gap-1">
            <Anchor className="w-3 h-3" />
            {formatDate(voyage.arrivedAt)}
          </span>
        )}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Filter buttons
// ---------------------------------------------------------------------------

type Filter = "ALL" | "IN_TRANSIT" | "ARRIVED";

const FILTER_LABELS: Record<Filter, string> = {
  ALL: "Todos",
  IN_TRANSIT: "En tránsito",
  ARRIVED: "Llegados",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function VoyagesList() {
  const [filter, setFilter] = useState<Filter>("ALL");

  const { data, error, isLoading } = useSWR<VoyagesResponse>(
    "/api/maritimo/voyages?limit=50",
    fetcher,
    { refreshInterval: 180_000 }
  );

  const voyages = data?.voyages ?? [];

  const filtered = filter === "ALL"
    ? voyages
    : voyages.filter((v) => v.status === filter);

  // Show only top 24 after filter to keep the grid tight
  const displayed = filtered.slice(0, 24);

  return (
    <section aria-label="Rutas marítimas recientes">
      {/* Section header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Ship className="w-6 h-6 text-tl-sea-500" />
          Rutas marítimas recientes
        </h2>

        {/* Status filter */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-white dark:bg-gray-900 text-tl-sea-700 dark:text-tl-sea-300 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {FILTER_LABELS[f]}
              {!isLoading && data && f !== "ALL" && (
                <span className="ml-1.5 font-mono text-xs opacity-70">
                  {voyages.filter((v) => v.status === f).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <VoyageSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 p-6 text-center text-sm text-red-600 dark:text-red-400">
          No se pudieron cargar las rutas marítimas.
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && displayed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Anchor className="w-12 h-12 text-tl-sea-300 dark:text-tl-sea-700 mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filter === "ALL"
              ? "No hay rutas marítimas registradas"
              : `No hay rutas con estado "${FILTER_LABELS[filter]}"`}
          </p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !error && displayed.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayed.map((v) => (
              <VoyageCard key={v.id} voyage={v} />
            ))}
          </div>

          {filtered.length > 24 && (
            <p className="mt-4 text-sm text-center text-gray-500 dark:text-gray-400">
              Mostrando 24 de {filtered.length} rutas
            </p>
          )}

          <p className="mt-4 text-xs text-gray-400 dark:text-gray-600 text-center">
            Rutas calculadas a partir de señales AIS. Fuente: aisstream.io
          </p>
        </>
      )}
    </section>
  );
}
