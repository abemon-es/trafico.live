"use client";

/**
 * AirportVisits — top aeropuertos españoles visitados por la aeronave.
 * Muestra contador de visitas y fecha de última visita.
 */

import { MapPin, Calendar } from "lucide-react";
import type { AirportVisit } from "@/lib/aviacion/flight-grouping";

interface Props {
  visits: AirportVisit[];
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function AirportVisits({ visits }: Props) {
  if (visits.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
        No se detectaron aeropuertos españoles en el período consultado.
      </div>
    );
  }

  const maxVisits = Math.max(...visits.map((v) => v.visitCount));

  return (
    <div className="space-y-2">
      {visits.slice(0, 10).map((v) => {
        const pct = Math.round((v.visitCount / maxVisits) * 100);
        return (
          <div
            key={v.icao}
            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-3 flex items-center gap-3"
          >
            {/* IATA / ICAO badge */}
            <div className="flex-shrink-0 w-12 text-center">
              <span className="font-mono text-sm font-bold text-tl-700 dark:text-tl-300">
                {v.iata ?? v.icao}
              </span>
            </div>

            {/* Name + bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-3.5 h-3.5 text-tl-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {v.name}
                </span>
                {v.city && (
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    · {v.city}
                  </span>
                )}
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-tl-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex-shrink-0 text-right">
              <span className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">
                {v.visitCount}
              </span>
              <span className="text-[10px] text-gray-400 block">visitas</span>
            </div>

            {/* Last visit */}
            <div className="flex-shrink-0 text-right hidden sm:block">
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                <Calendar className="w-3 h-3" />
                {formatDate(v.lastVisitAt)}
              </span>
            </div>
          </div>
        );
      })}
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
        Aeropuertos dentro de 8 km de los puntos de despegue/aterrizaje detectados.
      </p>
    </div>
  );
}
