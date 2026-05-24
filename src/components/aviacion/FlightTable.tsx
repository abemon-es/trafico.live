"use client";

/**
 * FlightTable — tabla de vuelos recientes computados para una aeronave.
 * Muestra los últimos 30 vuelos agrupados, con aeropuerto de salida/llegada,
 * hora, duración, altitud máxima y distancia.
 */

import Link from "next/link";
import { Plane, MapPin, Clock, Gauge, ArrowRight, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ComputedFlight } from "@/lib/aviacion/flight-grouping";

interface Props {
  flights: ComputedFlight[];
  icao24: string;
}

type SortKey = "date" | "duration" | "distance" | "altitude";
type SortDir = "asc" | "desc";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function altM(feet: number | null): string {
  if (feet === null) return "—";
  return `${Math.round(feet * 0.3048).toLocaleString("es-ES")} m`;
}

export function FlightTable({ flights, icao24 }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  if (flights.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Sin vuelos registrados en el período consultado.
      </div>
    );
  }

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...flights].sort((a, b) => {
    let av: number, bv: number;
    switch (sortKey) {
      case "date":
        av = a.departureAt.getTime();
        bv = b.departureAt.getTime();
        break;
      case "duration":
        av = a.durationSeconds;
        bv = b.durationSeconds;
        break;
      case "distance":
        av = a.distanceKm;
        bv = b.distanceKm;
        break;
      case "altitude":
        av = a.maxAltitudeFeet ?? 0;
        bv = b.maxAltitudeFeet ?? 0;
        break;
    }
    return sortDir === "desc" ? bv - av : av - bv;
  });

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === "desc" ? (
        <ChevronDown className="w-3 h-3 inline ml-0.5" />
      ) : (
        <ChevronUp className="w-3 h-3 inline ml-0.5" />
      )
    ) : null;

  const th =
    "text-xs text-gray-500 dark:text-gray-400 font-normal pb-2 cursor-pointer select-none hover:text-gray-800 dark:hover:text-gray-200 whitespace-nowrap";

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className={`${th} text-left pr-4`} onClick={() => handleSort("date")}>
              Fecha <SortIcon k="date" />
            </th>
            <th className={`${th} text-left pr-4`}>Salida</th>
            <th className={`${th} text-left pr-4`}>Llegada</th>
            <th className={`${th} text-right pr-4`} onClick={() => handleSort("duration")}>
              Duración <SortIcon k="duration" />
            </th>
            <th className={`${th} text-right pr-4`} onClick={() => handleSort("altitude")}>
              Alt. máx. <SortIcon k="altitude" />
            </th>
            <th className={`${th} text-right pr-4`} onClick={() => handleSort("distance")}>
              Dist. <SortIcon k="distance" />
            </th>
            <th className={`${th} text-left`}>Detalle</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
          {sorted.map((f) => {
            const dateSlug = f.date;
            return (
              <tr key={dateSlug + f.index} className="hover:bg-gray-50 dark:hover:bg-gray-950/50 group">
                <td className="py-2 pr-4 whitespace-nowrap">
                  <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                    {formatDate(f.departureAt)}
                  </span>
                  <span className="ml-1 text-[10px] text-gray-400 font-mono">
                    {formatTime(f.departureAt)}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  {f.departureAirport ? (
                    <span className="inline-flex items-center gap-1 text-xs">
                      <MapPin className="w-3 h-3 text-tl-500 flex-shrink-0" />
                      <span className="font-mono text-gray-800 dark:text-gray-200">
                        {f.departureAirport.iata ?? f.departureAirport.icao}
                      </span>
                      <span className="text-gray-400 hidden sm:inline truncate max-w-[80px]">
                        {f.departureAirport.city}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  {f.arrivalAirport ? (
                    <span className="inline-flex items-center gap-1 text-xs">
                      <MapPin className="w-3 h-3 text-tl-amber-400 flex-shrink-0" />
                      <span className="font-mono text-gray-800 dark:text-gray-200">
                        {f.arrivalAirport.iata ?? f.arrivalAirport.icao}
                      </span>
                      <span className="text-gray-400 hidden sm:inline truncate max-w-[80px]">
                        {f.arrivalAirport.city}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="py-2 pr-4 text-right">
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-gray-700 dark:text-gray-300">
                    <Clock className="w-3 h-3 text-gray-400" />
                    {formatDuration(f.durationSeconds)}
                  </span>
                </td>
                <td className="py-2 pr-4 text-right font-mono text-xs text-gray-700 dark:text-gray-300">
                  {altM(f.maxAltitudeFeet)}
                </td>
                <td className="py-2 pr-4 text-right font-mono text-xs text-gray-700 dark:text-gray-300">
                  {f.distanceKm > 0 ? `${f.distanceKm.toLocaleString("es-ES")} km` : "—"}
                </td>
                <td className="py-2">
                  <Link
                    href={`/aviacion/avion/${icao24}/vuelo/${dateSlug}`}
                    className="inline-flex items-center gap-1 text-xs text-tl-600 dark:text-tl-400 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Ver <ArrowRight className="w-3 h-3" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3">
        Vuelos agrupados por intervalos de silencio &gt;30 min. Fuente: OpenSky Network.
      </p>
    </div>
  );
}
