"use client";

import useSWR from "swr";
import { Gauge, Activity, ArrowUp, ArrowDown, Clock, Loader2 } from "lucide-react";

interface DetectorProperties {
  id: string;
  road: string;
  kmPoint: number | null;
  direction: string | null;
  province: string | null;
  speed: number | null;
  intensity: number | null;
  occupancy: number | null;
  color: string;
  level: "FLOWING" | "SLOW" | "VERY_SLOW" | "CONGESTED";
  ratio: number;
  measuredAt: string;
}

interface Feature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: DetectorProperties;
}

interface LiveSpeedResponse {
  success: boolean;
  data: { type: "FeatureCollection"; features: Feature[] };
  count: number;
  timestamp: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const LEVEL_LABELS: Record<string, string> = {
  FLOWING: "Fluido",
  SLOW: "Lento",
  VERY_SLOW: "Muy lento",
  CONGESTED: "Congestionado",
};

const LEVEL_STYLES: Record<string, string> = {
  FLOWING: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800",
  SLOW: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800",
  VERY_SLOW: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800",
  CONGESTED: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800",
};

function DirectionIcon({ direction }: { direction: string | null }) {
  if (!direction) return null;
  const d = direction.toUpperCase();
  if (d.includes("CRECIENTE") || d.includes("ASC")) {
    return <ArrowUp className="w-3.5 h-3.5 text-gray-400" />;
  }
  if (d.includes("DECRECIENTE") || d.includes("DESC")) {
    return <ArrowDown className="w-3.5 h-3.5 text-gray-400" />;
  }
  return null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  return `hace ${hours}h`;
}

export function RoadLiveSpeed({ roadId }: { roadId: string }) {
  const { data, isLoading, error } = useSWR<LiveSpeedResponse>(
    `/api/roads/live-speed?road=${encodeURIComponent(roadId)}`,
    fetcher,
    { refreshInterval: 120_000, revalidateOnFocus: false }
  );

  // Don't render the section at all while loading for the first time or on error
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Gauge className="w-5 h-5 text-tl-600 dark:text-tl-400" />
          Velocidad en tiempo real
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Cargando datos de detectores...
        </div>
      </div>
    );
  }

  if (error || !data?.success) return null;

  const features = data.data.features;
  if (features.length === 0) return null;

  // Sort by km point ascending
  const sorted = [...features].sort(
    (a, b) => (a.properties.kmPoint ?? 9999) - (b.properties.kmPoint ?? 9999)
  );

  // Summary stats
  const withSpeed = sorted.filter((f) => f.properties.speed != null);
  const avgSpeed =
    withSpeed.length > 0
      ? Math.round(
          withSpeed.reduce((s, f) => s + (f.properties.speed ?? 0), 0) /
            withSpeed.length
        )
      : null;
  const totalIntensity = sorted.reduce(
    (s, f) => s + (f.properties.intensity ?? 0),
    0
  );
  const levelCounts: Record<string, number> = {};
  for (const f of sorted) {
    levelCounts[f.properties.level] =
      (levelCounts[f.properties.level] || 0) + 1;
  }
  const dominantLevel = Object.entries(levelCounts).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] ?? "FLOWING";

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Gauge className="w-5 h-5 text-tl-600 dark:text-tl-400" />
        Velocidad en tiempo real
        <span className="ml-auto text-xs font-normal text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {data.timestamp ? timeAgo(data.timestamp) : ""}
        </span>
      </h2>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2.5 bg-gray-50 dark:bg-gray-950 rounded-lg">
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100 font-data">
            {sorted.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Detectores
          </div>
        </div>
        <div className="text-center p-2.5 bg-gray-50 dark:bg-gray-950 rounded-lg">
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100 font-data">
            {avgSpeed != null ? `${avgSpeed} km/h` : "--"}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Vel. media
          </div>
        </div>
        <div className="text-center p-2.5 bg-gray-50 dark:bg-gray-950 rounded-lg">
          <div className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${LEVEL_STYLES[dominantLevel]}`}>
            {LEVEL_LABELS[dominantLevel]}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Estado general
          </div>
        </div>
      </div>

      {/* Detector cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {sorted.slice(0, 12).map((f) => {
          const p = f.properties;
          return (
            <div
              key={p.id}
              className={`p-3 rounded-lg border ${LEVEL_STYLES[p.level]}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  {p.kmPoint != null && (
                    <span className="font-data">km {p.kmPoint}</span>
                  )}
                  <DirectionIcon direction={p.direction} />
                </div>
                <span className="text-[10px] opacity-70">
                  {timeAgo(p.measuredAt)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {p.speed != null && (
                  <div className="flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 opacity-60" />
                    <span className="font-data text-sm font-bold">
                      {p.speed} km/h
                    </span>
                  </div>
                )}
                {p.intensity != null && (
                  <div className="flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 opacity-60" />
                    <span className="font-data text-xs">
                      {p.intensity.toLocaleString("es-ES")} veh/h
                    </span>
                  </div>
                )}
                {p.occupancy != null && (
                  <span className="font-data text-xs opacity-70">
                    {p.occupancy}% ocup.
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {sorted.length > 12 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          Y {sorted.length - 12} detectores mas en esta carretera.
        </p>
      )}

      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3">
        Datos de detectores DGT. Actualizado cada 5 minutos.
      </p>
    </div>
  );
}
