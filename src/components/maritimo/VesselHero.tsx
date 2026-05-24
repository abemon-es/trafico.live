/**
 * VesselHero — current position card + live map + animated wake trail
 *
 * Server component: receives pre-fetched position data from the page.
 * Map is rendered via TraficoMapEmbed using the maritime-live preset
 * which already handles vessel markers + 24h track.
 */

import { TraficoMapEmbed } from "@/components/map/TraficoMapEmbed";
import { MapPin, Navigation, Compass, Clock, AlertTriangle, Zap } from "lucide-react";

interface VesselHeroProps {
  mmsi: number;
  /** Latest AIS position row (may be null if no recent data) */
  latestPosition: {
    latitude: number;
    longitude: number;
    sog: number | null;
    cog: number | null;
    heading: number | null;
    navStatus: number | null;
    createdAt: Date;
  } | null;
  navStatusLabel: string;
  isRecent: boolean;
  isSignalLost: boolean;
  cleanDest: string | null;
}

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "hace menos de 1 minuto";
  if (mins < 60) return `hace ${mins} minuto${mins === 1 ? "" : "s"}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} hora${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `hace ${days} dia${days === 1 ? "" : "s"}`;
}

function compassDirection(degrees: number): string {
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSO","SO","OSO","O","ONO","NO","NNO"];
  return dirs[Math.round(degrees / 22.5) % 16];
}

export function VesselHero({
  mmsi,
  latestPosition,
  navStatusLabel,
  isRecent,
  isSignalLost,
  cleanDest,
}: VesselHeroProps) {
  return (
    <div className="space-y-4">
      {/* Current position card */}
      <div className="rounded-2xl border border-tl-sea-200 dark:border-tl-sea-800/50 bg-white dark:bg-gray-900 shadow-sm p-6">
        {latestPosition ? (
          <>
            {isSignalLost && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Senal perdida — ultima posicion {timeAgo(latestPosition.createdAt)}.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
              {/* Nav status */}
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estado</div>
                <div className="flex items-center gap-1.5">
                  {isRecent && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                    </span>
                  )}
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {navStatusLabel}
                  </span>
                </div>
              </div>

              {/* Speed */}
              <div>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <Zap className="w-3 h-3" />
                  Velocidad (SOG)
                </div>
                <div className={`font-mono text-lg font-bold [font-family:var(--font-jetbrains-mono)] ${isSignalLost ? "text-gray-400 dark:text-gray-600" : "text-tl-sea-700 dark:text-tl-sea-300"}`}>
                  {latestPosition.sog != null ? `${Number(latestPosition.sog).toFixed(1)} kn` : "N/D"}
                </div>
              </div>

              {/* Course */}
              <div>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <Compass className="w-3 h-3" />
                  Rumbo (COG)
                </div>
                <div className={`font-mono text-lg font-bold [font-family:var(--font-jetbrains-mono)] ${isSignalLost ? "text-gray-400 dark:text-gray-600" : "text-tl-sea-700 dark:text-tl-sea-300"}`}>
                  {latestPosition.cog != null
                    ? `${Number(latestPosition.cog).toFixed(0)}° ${compassDirection(Number(latestPosition.cog))}`
                    : "N/D"}
                </div>
              </div>

              {/* Destination */}
              {cleanDest && (
                <div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <Navigation className="w-3 h-3" />
                    Destino
                  </div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {cleanDest}
                  </div>
                </div>
              )}

              {/* Last seen */}
              <div>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <Clock className="w-3 h-3" />
                  Ultima senal
                </div>
                <div className="text-sm text-gray-900 dark:text-gray-100">
                  {timeAgo(latestPosition.createdAt)}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <MapPin className="w-5 h-5" />
            <p className="text-sm">
              Sin datos de posicion recientes en las ultimas 48 horas.
            </p>
          </div>
        )}
      </div>

      {/* Live map */}
      <div className="rounded-2xl overflow-hidden border border-tl-sea-200 dark:border-tl-sea-800/50">
        <TraficoMapEmbed
          preset="maritime-live"
          entity={{ type: "vessel", id: String(mmsi) }}
          initialView={
            latestPosition
              ? {
                  center: [latestPosition.longitude, latestPosition.latitude],
                  zoom: 10,
                }
              : undefined
          }
          controls={{ layerPanel: true, legend: true, themeToggle: true }}
          height={480}
        />
      </div>
    </div>
  );
}
