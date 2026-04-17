"use client";

import { useEffect, useState } from "react";
import { Plane, X, Navigation } from "lucide-react";

export interface AircraftSummary {
  icao24: string;
  callsign?: string | null;
  origin_country?: string | null;
  latitude: number;
  longitude: number;
  baro_altitude?: number | null;
  velocity?: number | null;
  true_track?: number | null;
  on_ground?: boolean | null;
}

interface LivePanelProps {
  icao24: string | null;
  onClose: () => void;
}

// Panel for aircraft details; consumes /api/aviacion GeoJSON and filters by icao24.
// Real interactive tile click wiring arrives in S2; for S0 scaffold we fetch once.
export function LivePanel({ icao24, onClose }: LivePanelProps) {
  const [data, setData] = useState<AircraftSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!icao24) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/aviacion?limit=2000`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        // Expect GeoJSON FeatureCollection with properties.icao24
        const feat = json?.features?.find(
          (f: { properties?: { icao24?: string } }) => f.properties?.icao24 === icao24,
        );
        if (feat) {
          const [lng, lat] = feat.geometry?.coordinates ?? [0, 0];
          setData({
            icao24,
            callsign: feat.properties?.callsign,
            origin_country: feat.properties?.origin_country,
            latitude: lat,
            longitude: lng,
            baro_altitude: feat.properties?.baro_altitude,
            velocity: feat.properties?.velocity,
            true_track: feat.properties?.true_track,
            on_ground: feat.properties?.on_ground,
          });
        } else {
          setData(null);
        }
      })
      .catch(() => setData(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [icao24]);

  if (!icao24) return null;

  return (
    <aside
      className="absolute right-4 top-4 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-tl-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95"
      aria-label="Detalle de aeronave"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2 text-tl-700 dark:text-tl-200">
          <Plane className="h-4 w-4" />
          <span className="font-['JetBrains_Mono'] text-xs font-semibold">{icao24.toUpperCase()}</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar panel"
          className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Cargando…</p>}

      {!loading && !data && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Aeronave no encontrada en la ventana activa.
        </p>
      )}

      {!loading && data && (
        <dl className="space-y-2 text-sm">
          <Row label="Callsign" value={data.callsign ?? "—"} mono />
          <Row label="País origen" value={data.origin_country ?? "—"} />
          <Row
            label="Altitud"
            value={data.baro_altitude != null ? `${Math.round(data.baro_altitude)} m` : "—"}
            mono
          />
          <Row
            label="Velocidad"
            value={data.velocity != null ? `${Math.round((data.velocity ?? 0) * 1.944)} kn` : "—"}
            mono
          />
          <Row
            label="Rumbo"
            value={
              data.true_track != null ? (
                <span className="inline-flex items-center gap-1">
                  <Navigation
                    className="h-3 w-3"
                    style={{ transform: `rotate(${data.true_track}deg)` }}
                  />
                  {Math.round(data.true_track)}°
                </span>
              ) : (
                "—"
              )
            }
          />
          <Row label="En tierra" value={data.on_ground ? "Sí" : "No"} />
        </dl>
      )}

      <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
        Datos: OpenSky Network (CC BY 4.0)
      </p>
    </aside>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd
        className={`text-slate-900 dark:text-white ${mono ? "font-['JetBrains_Mono']" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
