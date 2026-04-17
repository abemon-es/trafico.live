"use client";

import { useEffect, useState } from "react";
import { Ship, X, Navigation } from "lucide-react";

export interface VesselSummary {
  mmsi: number;
  name?: string | null;
  category?: string | null;
  flag?: string | null;
  destination?: string | null;
  latitude: number;
  longitude: number;
  sog?: number | null;
  cog?: number | null;
  length?: number | null;
  gt?: number | null;
}

interface LivePanelProps {
  mmsi: number | null;
  onClose: () => void;
}

// Panel for vessel details; consumes /api/maritimo GeoJSON and filters by mmsi.
export function LivePanel({ mmsi, onClose }: LivePanelProps) {
  const [data, setData] = useState<VesselSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mmsi == null) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/maritimo?limit=2000`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const feat = json?.features?.find(
          (f: { properties?: { mmsi?: number } }) => f.properties?.mmsi === mmsi,
        );
        if (feat) {
          const [lng, lat] = feat.geometry?.coordinates ?? [0, 0];
          setData({
            mmsi,
            name: feat.properties?.name,
            category: feat.properties?.category,
            flag: feat.properties?.flag,
            destination: feat.properties?.destination,
            latitude: lat,
            longitude: lng,
            sog: feat.properties?.sog,
            cog: feat.properties?.cog,
            length: feat.properties?.length,
            gt: feat.properties?.gt,
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
  }, [mmsi]);

  if (mmsi == null) return null;

  return (
    <aside
      className="absolute right-4 top-4 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-tl-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95"
      aria-label="Detalle del buque"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2 text-tl-700 dark:text-tl-200">
          <Ship className="h-4 w-4" />
          <span className="font-['JetBrains_Mono'] text-xs font-semibold">MMSI {mmsi}</span>
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
          Buque no encontrado en la ventana activa.
        </p>
      )}

      {!loading && data && (
        <dl className="space-y-2 text-sm">
          <Row label="Nombre" value={data.name ?? "—"} />
          <Row label="Categoría" value={data.category ?? "—"} />
          <Row label="Bandera" value={data.flag ?? "—"} />
          <Row label="Destino" value={data.destination ?? "—"} />
          <Row
            label="Velocidad"
            value={data.sog != null ? `${data.sog.toFixed(1)} kn` : "—"}
            mono
          />
          <Row
            label="Rumbo"
            value={
              data.cog != null ? (
                <span className="inline-flex items-center gap-1">
                  <Navigation
                    className="h-3 w-3"
                    style={{ transform: `rotate(${data.cog}deg)` }}
                  />
                  {Math.round(data.cog)}°
                </span>
              ) : (
                "—"
              )
            }
          />
          <Row
            label="Eslora"
            value={data.length != null ? `${data.length} m` : "—"}
            mono
          />
        </dl>
      )}

      <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
        Datos: aisstream.io · AIS en tiempo real
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
