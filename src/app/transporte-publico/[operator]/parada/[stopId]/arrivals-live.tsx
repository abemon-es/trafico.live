"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
import Link from "next/link";
import { MapPin, AlertCircle, Clock, Info, ArrowRight } from "lucide-react";
import { fetcher } from "@/lib/fetcher";

// ── Types ──────────────────────────────────────────────────────────────────────

interface RealtimeVehicle {
  latitude: number;
  longitude: number;
  bearing: number | null;
  reportedAt: string;
}

interface Arrival {
  tripId: string;
  routeId: string;
  routeShortName: string | null;
  routeLongName: string | null;
  routeColor: string | null;
  headsign: string | null;
  scheduledArrival: string | null;
  scheduledDeparture: string | null;
  minutesUntilArrival: number | null;
  realtimeVehicle: RealtimeVehicle | null;
}

interface StopApiResponse {
  operator: { id: number; name: string; mdbId: string; mode: string };
  stop: { stopId: string; stopName: string; latitude: number; longitude: number };
  generatedAt: string;
  scheduleAvailable: boolean;
  arrivals: Arrival[];
}

// ── Mini-map (lazy loaded — MapLibre is a heavy import) ───────────────────────

const TransitStopMiniMap = dynamic(() => import("./stop-mini-map"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
      style={{ height: 320 }}
      aria-hidden="true"
    />
  ),
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function isLightColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return false;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

function formatHHMM(timeStr: string | null): string {
  if (!timeStr) return "—";
  // GTFS times can exceed 24h (e.g. "25:30:00") — display as-is but trim seconds
  const parts = timeStr.split(":");
  if (parts.length >= 2) return `${parts[0].padStart(2, "0")}:${parts[1]}`;
  return timeStr;
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function ArrivalsSkeleton() {
  return (
    <ul className="space-y-2" aria-busy="true" aria-label="Cargando llegadas">
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 animate-pulse"
        >
          <div className="w-10 h-6 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
          <div className="flex-1 h-4 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="w-8 h-7 rounded bg-gray-200 dark:bg-gray-700 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

// ── Route badge ────────────────────────────────────────────────────────────────

function RouteBadge({
  shortName,
  routeColor,
}: {
  shortName: string | null;
  routeColor: string | null;
}) {
  const raw = routeColor ? routeColor.replace("#", "") : null;
  const bg = raw ? `#${raw}` : "var(--tl-primary)";
  const textColor = raw && isLightColor(raw) ? "#111827" : "#ffffff";

  return (
    <span
      className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded-lg text-xs font-bold shrink-0 font-mono"
      style={{ backgroundColor: bg, color: textColor }}
    >
      {shortName || "—"}
    </span>
  );
}

// ── Single arrival row ─────────────────────────────────────────────────────────

function ArrivalRow({ arrival }: { arrival: Arrival }) {
  const mins = arrival.minutesUntilArrival;
  const hasRealtime = arrival.realtimeVehicle !== null;

  const isImminent = mins !== null && mins <= 2;

  // Respect prefers-reduced-motion — only add pulse class if motion OK
  // We rely on Tailwind's motion-safe variant for the animation.
  const minsClass = [
    "font-mono font-bold text-xl tabular-nums",
    hasRealtime
      ? "text-[var(--tl-success)]"
      : "text-gray-500 dark:text-gray-400",
    isImminent ? "motion-safe:animate-pulse" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <RouteBadge
        shortName={arrival.routeShortName}
        routeColor={arrival.routeColor}
      />

      {/* Headsign + long name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
          {arrival.headsign || arrival.routeLongName || arrival.routeShortName || "Sin destino"}
        </p>
        {arrival.scheduledArrival && (
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 shrink-0" />
            <span>{formatHHMM(arrival.scheduledArrival)}</span>
            {hasRealtime && (
              <span className="ml-1 text-[var(--tl-success)] font-semibold">
                · Tiempo real
              </span>
            )}
          </p>
        )}
      </div>

      {/* Minutes countdown */}
      <div className="shrink-0 text-right">
        {mins !== null ? (
          <span className={minsClass} title={`${mins} minutos`}>
            {mins === 0 ? "Ahora" : `${mins}′`}
          </span>
        ) : (
          <span className="font-mono text-sm text-gray-400">—</span>
        )}
      </div>
    </li>
  );
}

// ── No-schedule notice ─────────────────────────────────────────────────────────

function NoScheduleNotice() {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-8">
      <div className="w-12 h-12 rounded-full bg-[var(--tl-primary-bg)] flex items-center justify-center">
        <Info className="w-6 h-6 text-[var(--tl-primary)]" />
      </div>
      <div>
        <p className="font-heading font-semibold text-gray-900 dark:text-gray-100">
          Horarios no disponibles aún
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
          Este operador aún no tiene horarios integrados. Estamos empezando por
          Madrid y Barcelona.
        </p>
      </div>
      <Link
        href="/transporte-publico"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--tl-primary)] hover:underline"
      >
        Ver operadores disponibles
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface ArrivalsLiveProps {
  operator: string;
  stopId: string;
  initialStopLat: number;
  initialStopLon: number;
}

export default function ArrivalsLive({
  operator,
  stopId,
  initialStopLat,
  initialStopLon,
}: ArrivalsLiveProps) {
  const { data, isLoading, error } = useSWR<StopApiResponse>(
    `/api/transporte/${encodeURIComponent(operator)}/parada/${encodeURIComponent(stopId)}?limit=10`,
    fetcher,
    {
      refreshInterval: 15000,
      revalidateOnFocus: true,
      dedupingInterval: 10000,
    }
  );

  const lat = data?.stop.latitude ?? initialStopLat;
  const lon = data?.stop.longitude ?? initialStopLon;

  return (
    <div className="space-y-6">
      {/* Mini-map — always shown, uses initial coords then updates if API returns them */}
      <TransitStopMiniMap latitude={lat} longitude={lon} />

      {/* Arrivals section */}
      <section>
        <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Próximas llegadas
        </h2>

        {/* Loading */}
        {isLoading && <ArrivalsSkeleton />}

        {/* Error */}
        {error && !isLoading && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              No se pudieron cargar las llegadas. Reintenta en unos segundos.
            </p>
          </div>
        )}

        {/* No schedule */}
        {!isLoading && !error && data?.scheduleAvailable === false && (
          <NoScheduleNotice />
        )}

        {/* Arrivals list */}
        {!isLoading && !error && data?.scheduleAvailable !== false && (
          <>
            {data?.arrivals && data.arrivals.length > 0 ? (
              <ul
                aria-live="polite"
                aria-label="Próximas llegadas"
                className="space-y-2"
              >
                {data.arrivals.map((arrival) => (
                  <ArrivalRow key={`${arrival.tripId}-${arrival.routeId}`} arrival={arrival} />
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No hay llegadas programadas en este momento.
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
