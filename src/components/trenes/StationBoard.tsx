"use client";

/**
 * StationBoard — Live arrivals / departures panel for a Renfe station.
 *
 * Data source: RailwayDelaySnapshot.brandStats joined with fleet positions.
 * Polls /api/trenes/estacion-board?slug=... every 60 s via SWR.
 *
 * Props:
 *   stationSlug  — URL slug of the station (matches RailwayStation.slug)
 *   stationCode  — Renfe station code (RailwayStation.code, e.g. "60000")
 *   variant      — "arrivals" | "departures" | "both" (default "both")
 */

import useSWR from "swr";
import { Train, Clock, AlertTriangle, ArrowRight, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BoardTrain {
  codTren: string;
  /** Commercial number shown to passengers */
  codComercial?: string;
  brand: string;
  origin: string;
  destination: string;
  /** ISO datetime of scheduled time at this station */
  scheduledTime: string;
  /** ISO datetime of estimated time (may equal scheduledTime if no delay) */
  estimatedTime?: string;
  /** Delay in minutes (positive = late) */
  delayMinutes: number;
  platform?: string;
  direction: "arrival" | "departure";
}

export interface BoardApiResponse {
  stationName: string;
  stationCode: string;
  trains: BoardTrain[];
  updatedAt: string;
  source: "live" | "static" | "empty";
}

export interface StationBoardProps {
  stationSlug: string;
  stationCode?: string;
  variant?: "arrivals" | "departures" | "both";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function delayLabel(minutes: number): string {
  if (minutes <= 0) return "A tiempo";
  if (minutes === 1) return "+1 min";
  return `+${minutes} min`;
}

function delayColorClasses(minutes: number): string {
  if (minutes <= 0) return "text-[var(--tl-success)] bg-green-50 dark:bg-green-900/20";
  if (minutes <= 5) return "text-[var(--tl-warning)] bg-tl-amber-50 dark:bg-tl-amber-900/20";
  if (minutes <= 15) return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20";
  if (minutes <= 30) return "text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30";
  return "text-[var(--tl-danger)] bg-red-50 dark:bg-red-900/20";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function delaySeverity(minutes: number): "on-time" | "slight" | "moderate" | "severe" | "critical" {
  if (minutes <= 0) return "on-time";
  if (minutes <= 5) return "slight";
  if (minutes <= 15) return "moderate";
  if (minutes <= 30) return "severe";
  return "critical";
}

// ─── Sub-component: single row ────────────────────────────────────────────────

function BoardRow({ train }: { train: BoardTrain }) {
  const sched = formatTime(train.scheduledTime);
  const est = train.estimatedTime ? formatTime(train.estimatedTime) : null;
  const severity = delaySeverity(train.delayMinutes);
  const showReclaim = train.delayMinutes >= 60;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      {/* Direction icon */}
      <div className="flex-shrink-0 text-gray-400 dark:text-gray-500">
        {train.direction === "arrival" ? (
          <ArrowLeft className="w-4 h-4" aria-label="Llegada" />
        ) : (
          <ArrowRight className="w-4 h-4" aria-label="Salida" />
        )}
      </div>

      {/* Train number + brand */}
      <div className="flex-shrink-0 min-w-[5rem]">
        <span className="font-data text-xs font-semibold text-tl-700 dark:text-tl-300 bg-tl-50 dark:bg-tl-900/30 px-2 py-0.5 rounded">
          {train.codComercial || train.codTren}
        </span>
        <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5 font-body">{train.brand}</p>
      </div>

      {/* Origin / Destination */}
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {train.direction === "arrival" ? train.origin : train.destination}
        </p>
        {train.platform && (
          <p className="text-[11px] text-gray-500 dark:text-gray-500 font-data">
            Vía {train.platform}
          </p>
        )}
      </div>

      {/* Scheduled time */}
      <div className="flex-shrink-0 text-right">
        <p className="font-data text-sm font-semibold text-gray-900 dark:text-gray-100">{sched}</p>
        {est && est !== sched && (
          <p className="font-data text-xs text-gray-500 dark:text-gray-400 line-through">{sched}</p>
        )}
      </div>

      {/* Delay badge */}
      <div className="flex-shrink-0 min-w-[4.5rem] text-right">
        <span
          className={`inline-block font-data text-xs font-bold px-2 py-0.5 rounded-full ${delayColorClasses(train.delayMinutes)}`}
        >
          {severity === "on-time" ? (
            <span className="flex items-center gap-0.5">✓ puntual</span>
          ) : (
            delayLabel(train.delayMinutes)
          )}
        </span>
        {showReclaim && (
          <Link
            href="/trenes/reclamaciones"
            className="mt-0.5 block text-[10px] text-tl-600 dark:text-tl-400 underline underline-offset-2"
            title="Puedes reclamar indemnización"
          >
            Reclamar
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StationBoard({
  stationSlug,
  stationCode,
  variant = "both",
}: StationBoardProps) {
  const params = new URLSearchParams({ slug: stationSlug });
  if (stationCode) params.set("code", stationCode);
  params.set("variant", variant);

  const { data, error, isLoading, mutate } = useSWR<BoardApiResponse>(
    `/api/trenes/estacion-board?${params.toString()}`,
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  );

  const trains = data?.trains ?? [];
  const arrivals = trains.filter((t) => t.direction === "arrival");
  const departures = trains.filter((t) => t.direction === "departure");

  const displayArrivals = variant !== "departures";
  const displayDepartures = variant !== "arrivals";

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800 bg-tl-50/60 dark:bg-tl-950/30">
        <div className="flex items-center gap-2">
          <Train className="w-4 h-4 text-tl-600 dark:text-tl-400" aria-hidden />
          <h2 className="font-heading text-sm font-semibold text-gray-900 dark:text-gray-100">
            {variant === "arrivals"
              ? "Llegadas"
              : variant === "departures"
              ? "Salidas"
              : "Llegadas y salidas"}
          </h2>
          {data?.source === "live" && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--tl-success)] bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--tl-success)] animate-pulse" />
              En vivo
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {data?.updatedAt && (
            <span className="hidden sm:block font-data text-[11px] text-gray-400 dark:text-gray-500">
              {formatTime(data.updatedAt)}
            </span>
          )}
          <button
            onClick={() => mutate()}
            className="p-1 rounded hover:bg-tl-100 dark:hover:bg-tl-900/30 text-gray-400 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
            aria-label="Actualizar tablón"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-10 text-gray-400 dark:text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="font-body text-sm">Cargando tablón…</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex items-center gap-3 p-5 text-sm text-gray-500 dark:text-gray-400">
          <AlertTriangle className="w-5 h-5 text-[var(--tl-warning)]" />
          <span className="font-body">
            No se pudo cargar el tablón. Los datos de tiempo real están disponibles para trenes de Larga
            Distancia Renfe.
          </span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && trains.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-center px-6">
          <Train className="w-8 h-8 text-gray-300 dark:text-gray-600" aria-hidden />
          <p className="font-body text-sm text-gray-500 dark:text-gray-400">
            No hay trenes en circulación con parada en esta estación en este momento.
          </p>
          <p className="font-body text-xs text-gray-400 dark:text-gray-500">
            Los datos de posición se actualizan cada 2 minutos desde la flota LD de Renfe.
          </p>
        </div>
      )}

      {/* Arrivals */}
      {!isLoading && !error && displayArrivals && arrivals.length > 0 && (
        <div>
          {variant === "both" && (
            <div className="px-5 pt-3 pb-1">
              <h3 className="font-heading text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                Llegadas
              </h3>
            </div>
          )}
          <div className="px-5">
            {arrivals.map((t) => (
              <BoardRow key={`arr-${t.codTren}-${t.scheduledTime}`} train={t} />
            ))}
          </div>
        </div>
      )}

      {/* Departures */}
      {!isLoading && !error && displayDepartures && departures.length > 0 && (
        <div>
          {variant === "both" && (
            <div className="px-5 pt-3 pb-1">
              <h3 className="font-heading text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5" />
                Salidas
              </h3>
            </div>
          )}
          <div className="px-5">
            {departures.map((t) => (
              <BoardRow key={`dep-${t.codTren}-${t.scheduledTime}`} train={t} />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {!isLoading && trains.length > 0 && (
        <div className="px-5 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <p className="font-body text-[11px] text-gray-400 dark:text-gray-500">
            Fuente: Renfe visor tiempo real LD (flota ~115 trenes).{" "}
            <span className="text-[var(--tl-warning)]">
              Retraso ≥60 min:{" "}
              <Link href="/trenes/reclamaciones" className="underline underline-offset-2">
                consulta tu derecho a indemnización
              </Link>
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
