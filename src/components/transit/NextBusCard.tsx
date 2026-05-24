"use client";

/**
 * NextBusCard — shows "próximo bus en esta parada" for the first stop
 * (or the user's nearest stop if geolocation is granted).
 *
 * Polls /api/transporte/[operator]/parada/[stopId] every 15 s.
 * Graceful empty-state when no schedules are available.
 */

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Clock, MapPin, Bus, Loader2 } from "lucide-react";

interface Arrival {
  tripId: string;
  routeId: string;
  routeShortName: string | null;
  routeLongName: string | null;
  routeColor: string | null;
  headsign: string | null;
  scheduledArrival: string | null;
  minutesUntilArrival: number | null;
  realtimeVehicle: unknown | null;
}

interface StopArrivalResponse {
  stop: { stopId: string; stopName: string };
  arrivals: Arrival[];
  scheduleAvailable: boolean;
}

interface NextBusCardProps {
  operatorSlug: string;
  stopId: string;
  stopName: string;
  routeId: string;
  routeColor: string;
}

function isLightColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return false;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

export default function NextBusCard({
  operatorSlug,
  stopId,
  stopName,
  routeId,
  routeColor,
}: NextBusCardProps) {
  const { data, isLoading, error } = useSWR<StopArrivalResponse>(
    `/api/transporte/${encodeURIComponent(operatorSlug)}/parada/${encodeURIComponent(stopId)}?limit=5`,
    fetcher,
    { refreshInterval: 15000, revalidateOnFocus: true, dedupingInterval: 10000 }
  );

  // Filter arrivals to this specific route
  const arrivals = (data?.arrivals ?? []).filter(
    (a) => a.routeId === routeId
  );

  const bgColor = routeColor.startsWith("#") ? routeColor : `#${routeColor}`;
  const textColor = isLightColor(bgColor.replace("#", "")) ? "#111827" : "#fff";

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{ backgroundColor: bgColor }}
      >
        <Bus className="w-4 h-4 shrink-0" style={{ color: textColor }} />
        <div className="min-w-0">
          <p
            className="text-xs font-bold uppercase tracking-wide truncate"
            style={{ color: textColor, opacity: 0.8 }}
          >
            Primera parada
          </p>
          <p
            className="text-sm font-semibold truncate"
            style={{ color: textColor }}
          >
            <MapPin className="w-3 h-3 inline mr-1 opacity-70" />
            {stopName}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Consultando horarios…
          </div>
        )}

        {error && !isLoading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No se pudo cargar el próximo paso.
          </p>
        )}

        {!isLoading && !error && data?.scheduleAvailable === false && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Horarios no disponibles para este operador.
          </p>
        )}

        {!isLoading && !error && data?.scheduleAvailable !== false && arrivals.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sin próximos pasos programados.
          </p>
        )}

        {arrivals.length > 0 && (
          <ul className="space-y-2">
            {arrivals.slice(0, 3).map((a) => {
              const mins = a.minutesUntilArrival;
              const isNow = mins !== null && mins === 0;
              const isImminent = mins !== null && mins <= 2;
              return (
                <li
                  key={a.tripId}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {a.headsign || a.routeLongName || "Sin destino"}
                    </p>
                    {a.scheduledArrival && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {a.scheduledArrival.slice(0, 5)}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {mins !== null ? (
                      <span
                        className={`font-mono font-bold text-xl tabular-nums ${
                          isImminent
                            ? "text-green-600 dark:text-green-400 motion-safe:animate-pulse"
                            : "text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        {isNow ? "Ahora" : `${mins}′`}
                      </span>
                    ) : (
                      <span className="font-mono text-sm text-gray-400">—</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
