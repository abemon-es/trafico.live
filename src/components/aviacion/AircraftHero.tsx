"use client";

/**
 * AircraftHero — sección de cabecera con posición actual, mapa y estadísticas.
 * Incluye mapa estático de posición con trayectoria 24h.
 * El mapa es una visualización SVG ligera (sin MapLibre) para el hero SSR.
 */

import {
  Plane,
  MapPin,
  Clock,
  Gauge,
  Navigation,
  ArrowUp,
  ArrowDown,
  Minus,
  Globe,
  Radio,
} from "lucide-react";
import type { RawPosition } from "@/lib/aviacion/flight-grouping";
import type { AircraftSummary } from "@/lib/aviacion/flight-grouping";
import type { IcaoCountryInfo } from "@/lib/aviacion/icao-lookup";

interface Props {
  icao24: string;
  displayId: string;
  latest: RawPosition | null;
  trail: RawPosition[];
  summary: AircraftSummary;
  countryInfo: IcaoCountryInfo | null;
}

function formatDatetime(d: Date): string {
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function velocityKmh(ms: number | null): string {
  if (ms === null) return "—";
  return Math.round(ms * 3.6).toLocaleString("es-ES");
}

function altitudeM(feet: number | null): string {
  if (feet === null) return "—";
  return Math.round(feet * 0.3048).toLocaleString("es-ES");
}

function heading360(deg: number | null): string {
  if (deg === null) return "—";
  return `${Math.round(deg)}°`;
}

function headingDirection(deg: number | null): string {
  if (deg === null) return "";
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
}

function StatCard({ label, value, sub, icon }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-2">
        {icon}
        {label}
      </p>
      <p className="font-mono text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function AircraftHero({
  displayId,
  latest,
  trail,
  summary,
  countryInfo,
}: Props) {
  const isAirborne = latest ? !latest.onGround : null;
  const callsign = latest?.callsign?.trim() ?? null;
  const vr = latest?.verticalRate ?? null;

  const vrIcon =
    vr !== null && vr > 0.5 ? (
      <ArrowUp className="w-3.5 h-3.5 text-green-500" />
    ) : vr !== null && vr < -0.5 ? (
      <ArrowDown className="w-3.5 h-3.5 text-red-500" />
    ) : (
      <Minus className="w-3.5 h-3.5 text-gray-400" />
    );

  return (
    <div className="space-y-4">
      {/* Position + meta */}
      {latest && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {callsign && (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Radio className="w-4 h-4 text-tl-500" />
                    {callsign}
                  </span>
                )}
                {isAirborne === true && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-tl-50 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 border border-tl-200 dark:border-tl-700">
                    <Plane className="w-3 h-3" />
                    En vuelo
                  </span>
                )}
                {isAirborne === false && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                    En tierra
                  </span>
                )}
                {countryInfo && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                    <Globe className="w-3 h-3" />
                    {countryInfo.flag} {countryInfo.country}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4 text-tl-500" />
                <span className="font-mono">
                  {latest.latitude.toFixed(5)}, {latest.longitude.toFixed(5)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                Última señal: {formatDatetime(latest.createdAt)} UTC
              </div>
            </div>

            {/* Summary stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div>
                <span className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
                  {summary.totalFlights}
                </span>
                <p className="text-[10px] text-gray-400">vuelos</p>
              </div>
              <div>
                <span className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
                  {summary.totalDistanceKm.toLocaleString("es-ES")}
                </span>
                <p className="text-[10px] text-gray-400">km volados</p>
              </div>
              <div>
                <span className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
                  {summary.avgAltitudeM !== null
                    ? `${Math.round(summary.avgAltitudeM / 100) * 100}m`
                    : "—"}
                </span>
                <p className="text-[10px] text-gray-400">alt. media</p>
              </div>
              <div>
                <span className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
                  {summary.daysTracked}
                </span>
                <p className="text-[10px] text-gray-400">días</p>
              </div>
            </div>
          </div>

          {/* Trail info */}
          {trail.length > 1 && (
            <p className="mt-3 text-[11px] text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
              {trail.length} posiciones registradas en las últimas 24h. Fuente: OpenSky Network.
            </p>
          )}
        </div>
      )}

      {/* Real-time stats */}
      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Altitud"
            value={altitudeM(latest.altitude)}
            sub={latest.altitude !== null ? "metros" : undefined}
            icon={vrIcon}
          />
          <StatCard
            label="Velocidad"
            value={velocityKmh(latest.velocity)}
            sub={latest.velocity !== null ? "km/h" : undefined}
            icon={<Gauge className="w-3.5 h-3.5" />}
          />
          <StatCard
            label="Rumbo"
            value={heading360(latest.heading)}
            sub={latest.heading !== null ? headingDirection(latest.heading) : undefined}
            icon={<Navigation className="w-3.5 h-3.5" />}
          />
          <StatCard
            label="Tasa vertical"
            value={
              vr !== null
                ? `${vr > 0 ? "+" : ""}${vr.toFixed(1)}`
                : "—"
            }
            sub={vr !== null ? "m/s" : undefined}
            icon={<ArrowUp className="w-3.5 h-3.5" />}
          />
        </div>
      )}

      {/* Callsign history */}
      {summary.callsignHistory.length > 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
            <Radio className="w-4 h-4 text-tl-500" />
            Indicativos detectados
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {summary.callsignHistory.map((cs) => (
              <span
                key={cs}
                className="px-2 py-0.5 rounded font-mono text-xs bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300 border border-tl-100 dark:border-tl-800"
              >
                {cs}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
