"use client";

import { fetcher } from "@/lib/fetcher";
import { useState, useMemo } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Train,
  Loader2,
  AlertTriangle,
  MapPin,
  Route,
  Info,
  Radio,
  Clock,
  ArrowRight,
  Accessibility,
  TrendingUp,
  Trophy,
  ChevronRight,
  Map,
  List,
  BarChart3,
} from "lucide-react";

const RailwayMap = dynamic(() => import("./railway-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[650px] bg-gray-50 dark:bg-gray-900 animate-pulse flex items-center justify-center rounded-xl">
      <Train className="w-12 h-12 text-gray-300" />
    </div>
  ),
});

const SERVICE_COLORS: Record<string, string> = {
  CERCANIAS: "#059669", RODALIES: "#059669", AVE: "#dc2626",
  LARGA_DISTANCIA: "#d48139", MEDIA_DISTANCIA: "#366cf8", FEVE: "#8b5cf6",
};

const BRAND_COLORS: Record<string, string> = {
  AVE: "#6b21a8", Alvia: "#d48139", Avant: "#7c3aed", Euromed: "#0891b2",
  Talgo: "#be185d", MD: "#366cf8", Intercity: "#4b5563", Regional: "#6b7280",
};

const EFFECT_LABELS: Record<string, string> = {
  NO_SERVICE: "Sin servicio", REDUCED_SERVICE: "Servicio reducido",
  SIGNIFICANT_DELAYS: "Retrasos significativos", DETOUR: "Desvío",
  MODIFIED_SERVICE: "Servicio modificado", OTHER_EFFECT: "Otra incidencia",
  UNKNOWN_EFFECT: "Incidencia",
};

export default function TrainesContent() {
  const [selectedTrain, setSelectedTrain] = useState<Record<string, unknown> | null>(null);
  const [selectedStation, setSelectedStation] = useState<Record<string, unknown> | null>(null);

  // --- Stations GeoJSON ---
  const { data: stationsGeoJSON } = useSWR(
    `/api/trenes/estaciones?format=geojson&limit=3000`,
    fetcher, { revalidateOnFocus: false }
  );

  const enrichedStations = useMemo(() => {
    if (!stationsGeoJSON?.features) return null;
    return {
      ...stationsGeoJSON,
      features: stationsGeoJSON.features.map((f: GeoJSON.Feature) => ({
        ...f,
        properties: {
          ...f.properties,
          color: SERVICE_COLORS[(f.properties?.serviceTypes || [])[0]] || "#94b6ff",
        },
      })),
    };
  }, [stationsGeoJSON]);

  // --- Cercanías route shapes ---
  const { data: routesData } = useSWR(
    `/api/trenes/rutas?withShapes=true&limit=500&serviceType=CERCANIAS`,
    fetcher, { revalidateOnFocus: false }
  );

  const cercaniaLines = useMemo(() => {
    const routes = routesData?.data?.routes || [];
    const features: GeoJSON.Feature[] = [];
    for (const r of routes) {
      if (!r.shapeGeoJSON?.coordinates?.length) continue;
      features.push({
        type: "Feature",
        geometry: r.shapeGeoJSON,
        properties: { routeId: r.routeId, shortName: r.shortName, color: r.color || "#059669" },
      });
    }
    return { type: "FeatureCollection" as const, features };
  }, [routesData]);

  // --- Active alerts ---
  const { data: alertsData } = useSWR(
    `/api/trenes/alertas?active=true&limit=200`,
    fetcher, { refreshInterval: 120000 }
  );
  const alerts = alertsData?.data?.alerts || [];

  // --- Live train positions + routes ---
  const { data: liveData, isLoading: loadingTrains } = useSWR(
    `/api/trenes/posiciones`,
    fetcher, { refreshInterval: 15000 }
  );

  const trainPoints = liveData?.trains || null;
  const trainRoutes = liveData?.routes || null;
  const meta = liveData?.metadata || {};
  const trainCount = meta.count || 0;
  const stats = meta.stats || {};

  // --- Route stats ---
  const { data: routeStats } = useSWR(`/api/trenes/rutas?limit=1`, fetcher, { revalidateOnFocus: false });
  const totalRoutes = routeStats?.data?.pagination?.total || 0;
  const totalStations = stationsGeoJSON?.features?.length || 0;

  // --- Delay analytics ---
  const { data: delayStats } = useSWR(`/api/trenes/stats?period=today`, fetcher, { refreshInterval: 120000 });
  const current = delayStats?.data?.current;
  const brandLeaderboard = delayStats?.data?.brandPunctuality || [];

  // Parse train stops for detail panel
  const trainStops = useMemo(() => {
    if (!selectedTrain?.stopsJson) return [];
    try { return JSON.parse(String(selectedTrain.stopsJson)); } catch { return []; }
  }, [selectedTrain]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Red Ferroviaria de España
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Trenes en tiempo real · Estaciones · Líneas · Alertas
          </p>
        </div>
        <div className="flex items-center gap-3">
          {trainCount > 0 && (
            <span className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-full text-sm font-semibold border border-green-200 dark:border-green-800">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              {trainCount} trenes en vivo
            </span>
          )}
          {loadingTrains && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { icon: Train, label: "En circulación", value: trainCount, color: "text-[var(--tl-success)]" },
          { icon: Clock, label: "Retraso medio", value: `${stats.avgDelay || 0} min`, color: (stats.avgDelay || 0) > 5 ? "text-[var(--tl-danger)]" : "text-gray-900 dark:text-gray-100" },
          { icon: MapPin, label: "Estaciones", value: totalStations.toLocaleString("es-ES"), color: "text-gray-900 dark:text-gray-100" },
          { icon: Route, label: "Líneas", value: totalRoutes.toLocaleString("es-ES"), color: "text-gray-900 dark:text-gray-100" },
          { icon: AlertTriangle, label: "Alertas", value: alerts.length, color: alerts.length > 0 ? "text-[var(--tl-danger)]" : "text-[var(--tl-success)]" },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-0.5">
              <s.icon className="w-3.5 h-3.5" />
              <span>{s.label}</span>
            </div>
            <p className={`text-xl font-heading font-bold font-mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <RailwayMap
          stationsGeoJSON={enrichedStations}
          cercaniaLines={cercaniaLines}
          trainRoutes={trainRoutes}
          trainPoints={trainPoints}
          onTrainClick={(p) => { setSelectedStation(null); setSelectedTrain(p); }}
          onStationClick={(p) => { setSelectedTrain(null); setSelectedStation(p); }}
        />

        {/* Legend */}
        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-600 dark:text-gray-300">Trenes:</span>
          {[
            ["#059669", "Puntual"],
            ["#ca8a04", "<5 min"],
            ["#ea580c", "5-15 min"],
            ["#dc2626", ">15 min"],
          ].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: c }} />
              {l}
            </span>
          ))}
          <span className="font-semibold text-gray-600 dark:text-gray-300 ml-2">Líneas:</span>
          {[
            ["#dc2626", "AVE"],
            ["#d48139", "Alvia"],
            ["#366cf8", "MD"],
            ["#059669", "Cercanías"],
          ].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1">
              <span className="w-4 h-0.5 rounded" style={{ backgroundColor: c }} />
              {l}
            </span>
          ))}
        </div>
      </div>
      </div>{/* end hidden old sections */}

      {/* Train Detail Panel */}
      {selectedTrain && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700" style={{ backgroundColor: `${BRAND_COLORS[String(selectedTrain.brand)] || "#6b7280"}10` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: BRAND_COLORS[String(selectedTrain.brand)] || "#6b7280" }}>
                <Train className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-gray-100">
                  {String(selectedTrain.brand)} {String(selectedTrain.trainId)}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {String(selectedTrain.productType)} · Material {String(selectedTrain.material)}
                  {selectedTrain.accessible === true || selectedTrain.accessible === "true" ? " · ♿ Accesible" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${Number(selectedTrain.delay) <= 0 ? "bg-green-100 text-green-700" : Number(selectedTrain.delay) <= 5 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                {Number(selectedTrain.delay) <= 0 ? "✓ Puntual" : `+${selectedTrain.delay} min`}
              </div>
              <button onClick={() => setSelectedTrain(null)} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
            </div>
          </div>

          {/* Route info */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-3 text-lg font-mono font-semibold text-gray-900 dark:text-gray-100 mb-4">
              <span>{String(selectedTrain.origin)}</span>
              <ArrowRight className="w-5 h-5 text-gray-400" />
              <span>{String(selectedTrain.destination)}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Próxima parada</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{String(selectedTrain.nextStation)}</p>
                <p className="text-xs text-gray-500">{selectedTrain.nextArrival ? String(selectedTrain.nextArrival).slice(11, 16) : ""}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Parada anterior</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{String(selectedTrain.prevStation)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Paradas totales</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{String(selectedTrain.stopsCount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Tipo de servicio</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{String(selectedTrain.productType)}</p>
              </div>
            </div>

            {/* Station schedule */}
            {trainStops.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Recorrido</p>
                <div className="flex items-center gap-1 overflow-x-auto pb-2">
                  {trainStops.map((stop: { p: string; h: string }, i: number) => (
                    <div key={i} className="flex items-center gap-1 shrink-0">
                      <div className="flex flex-col items-center">
                        <span className={`w-3 h-3 rounded-full border-2 ${i === 0 || i === trainStops.length - 1 ? "bg-gray-900 dark:bg-white border-gray-900 dark:border-white" : "bg-white dark:bg-gray-800 border-gray-400"}`} />
                        <span className="text-[10px] font-mono text-gray-600 dark:text-gray-400 mt-0.5">{stop.h}</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">{stop.p}</span>
                      </div>
                      {i < trainStops.length - 1 && (
                        <div className="w-8 h-0.5 bg-gray-300 dark:bg-gray-600 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Station Panel */}
      {selectedStation && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-gray-100">{String(selectedStation.name)}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{String(selectedStation.provinceName || "")}{selectedStation.code ? ` · ${selectedStation.code}` : ""}</p>
            </div>
            <button onClick={() => setSelectedStation(null)} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[var(--tl-danger)]" />
            Alertas activas ({alerts.length})
          </h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {alerts.slice(0, 25).map((a: Record<string, unknown>) => (
              <div key={String(a.alertId)} className="bg-white dark:bg-gray-800 rounded-lg border border-red-100 dark:border-red-900/30 p-3 flex items-start gap-3">
                <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                  {EFFECT_LABELS[String(a.effect)] || String(a.effect)}
                </span>
                <p className="text-sm text-gray-700 dark:text-gray-300 min-w-0">{String(a.description)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Analytics Section ── */}
      {current && (
        <div className="space-y-4">
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[var(--tl-primary)]" />
            Puntualidad en tiempo real
          </h2>

          {/* Punctuality gauge + delay distribution */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Puntualidad</p>
              <p className={`text-3xl font-heading font-bold font-mono ${Number(current.punctualityRate) >= 80 ? "text-[var(--tl-success)]" : Number(current.punctualityRate) >= 60 ? "text-yellow-600" : "text-[var(--tl-danger)]"}`}>
                {Number(current.punctualityRate).toFixed(1)}%
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">trenes con &le;5 min retraso</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Retraso medio</p>
              <p className="text-3xl font-heading font-bold font-mono text-gray-900 dark:text-gray-100">
                {Number(current.avgDelay).toFixed(1)}<span className="text-sm font-normal ml-0.5">min</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">mediana {current.p50Delay || 0} min, p90 {current.p90Delay || 0} min</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Retraso max</p>
              <p className={`text-3xl font-heading font-bold font-mono ${current.maxDelay > 30 ? "text-[var(--tl-danger)]" : "text-gray-900 dark:text-gray-100"}`}>
                {current.maxDelay}<span className="text-sm font-normal ml-0.5">min</span>
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Distribución</p>
              <div className="flex items-end gap-1 h-8">
                {[
                  { count: current.onTimeCount, color: "#059669", label: "Puntual" },
                  { count: current.slightCount, color: "#ca8a04", label: "<5m" },
                  { count: current.moderateCount, color: "#ea580c", label: "5-15m" },
                  { count: current.severeCount, color: "#dc2626", label: ">15m" },
                ].map((b) => {
                  const pct = current.totalTrains > 0 ? (b.count / current.totalTrains) * 100 : 0;
                  return (
                    <div key={b.label} className="flex-1 flex flex-col items-center gap-0.5" title={`${b.label}: ${b.count}`}>
                      <div className="w-full rounded-t" style={{ backgroundColor: b.color, height: `${Math.max(pct * 0.3, 2)}px` }} />
                      <span className="text-[9px] text-gray-400">{b.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Brand punctuality leaderboard */}
          {brandLeaderboard.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-heading font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Puntualidad por marca
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {brandLeaderboard.map((b: { brand: string; punctuality: number; avgDelay: number; total: number }, i: number) => (
                  <div key={b.brand} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                    <span className={`text-sm font-bold font-mono w-5 ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-gray-500"}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{b.brand}</p>
                      <p className="text-[10px] text-gray-500">
                        <span className={`font-mono font-semibold ${b.punctuality >= 80 ? "text-green-600" : b.punctuality >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                          {b.punctuality}%
                        </span>
                        {" · "}{b.avgDelay}min · {b.total} trenes
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Navigation to sub-pages ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: "/trenes/estaciones", icon: MapPin, title: "Estaciones", desc: `${totalStations.toLocaleString("es-ES")} estaciones en toda España`, color: "var(--tl-primary)" },
          { href: "/trenes/lineas", icon: Route, title: "Líneas y marcas", desc: `${totalRoutes} rutas: AVE, Alvia, Cercanías...`, color: "var(--tl-accent)" },
          { href: "/trenes/cercanias", icon: Map, title: "Cercanías", desc: "12 redes: Madrid, Barcelona, Valencia...", color: "#059669" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-[var(--tl-primary)] hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${link.color}15` }}>
                  <link.icon className="w-5 h-5" style={{ color: link.color }} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-gray-900 dark:text-gray-100">{link.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{link.desc}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[var(--tl-primary)] transition-colors shrink-0 mt-2" />
            </div>
          </Link>
        ))}
      </div>

      {/* Attribution */}
      <p className="flex items-center gap-1.5 text-[11px] text-gray-400 pb-4">
        <Info className="w-3 h-3" />
        Origen de los datos: Renfe Operadora (CC-BY 4.0). Posiciones cada 15s. Analytics cada 2 min.
      </p>
      </div>
      {/* close content section */}
    </div>
  );
}
