"use client";

import { fetcher } from "@/lib/fetcher";
import { useState, useMemo } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import {
  Train,
  Loader2,
  Filter,
  AlertTriangle,
  MapPin,
  Route,
  ChevronDown,
  Info,
  Radio,
  Clock,
  Zap,
} from "lucide-react";

const RailwayMap = dynamic(() => import("./railway-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-gray-900 animate-pulse flex items-center justify-center rounded-lg">
      <Train className="w-12 h-12 text-gray-600" />
    </div>
  ),
});

const SERVICE_COLORS: Record<string, string> = {
  CERCANIAS: "#059669",
  RODALIES: "#059669",
  AVE: "#dc2626",
  LARGA_DISTANCIA: "#d48139",
  MEDIA_DISTANCIA: "#366cf8",
  FEVE: "#8b5cf6",
};

const SERVICE_TYPES = [
  { value: "CERCANIAS", label: "Cercanías", color: "#059669" },
  { value: "AVE", label: "AVE", color: "#dc2626" },
  { value: "LARGA_DISTANCIA", label: "Larga Distancia", color: "#d48139" },
  { value: "MEDIA_DISTANCIA", label: "Media Distancia", color: "#366cf8" },
  { value: "RODALIES", label: "Rodalies", color: "#059669" },
  { value: "FEVE", label: "FEVE", color: "#8b5cf6" },
];

const EFFECT_LABELS: Record<string, string> = {
  NO_SERVICE: "Sin servicio",
  REDUCED_SERVICE: "Servicio reducido",
  SIGNIFICANT_DELAYS: "Retrasos significativos",
  DETOUR: "Desvío",
  ADDITIONAL_SERVICE: "Servicio adicional",
  MODIFIED_SERVICE: "Servicio modificado",
  STOP_MOVED: "Parada desplazada",
  OTHER_EFFECT: "Otra incidencia",
  UNKNOWN_EFFECT: "Incidencia",
};

export default function TrainesContent() {
  const [selectedServiceType, setSelectedServiceType] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<Record<string, unknown> | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<Record<string, unknown> | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // --- Stations GeoJSON (for map markers) ---
  const stationsParams = new URLSearchParams({ format: "geojson", limit: "3000" });
  if (selectedServiceType) stationsParams.set("serviceType", selectedServiceType);

  const { data: stationsGeoJSON, isLoading: loadingStations } = useSWR(
    `/api/trenes/estaciones?${stationsParams}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Enrich station features with color for the map
  const enrichedStations = useMemo(() => {
    if (!stationsGeoJSON?.features) return null;
    return {
      ...stationsGeoJSON,
      features: stationsGeoJSON.features.map((f: GeoJSON.Feature) => {
        const types: string[] = f.properties?.serviceTypes || [];
        const primaryType = types[0] || "";
        return {
          ...f,
          properties: {
            ...f.properties,
            color: SERVICE_COLORS[primaryType] || "#94b6ff",
          },
        };
      }),
    };
  }, [stationsGeoJSON]);

  // --- Routes with shapes (for line drawing) ---
  const routesParams = new URLSearchParams({ withShapes: "true", limit: "500" });
  if (selectedServiceType) routesParams.set("serviceType", selectedServiceType);

  const { data: routesData } = useSWR(
    `/api/trenes/rutas?${routesParams}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Convert routes to GeoJSON FeatureCollection of LineStrings
  const routesGeoJSON = useMemo(() => {
    const routes = routesData?.data?.routes || [];
    const features: GeoJSON.Feature[] = [];
    for (const r of routes) {
      if (!r.shapeGeoJSON?.coordinates?.length) continue;
      features.push({
        type: "Feature",
        geometry: r.shapeGeoJSON,
        properties: {
          routeId: r.routeId,
          shortName: r.shortName,
          serviceType: r.serviceType,
          color: r.color || SERVICE_COLORS[r.serviceType] || "#4a5568",
        },
      });
    }
    return { type: "FeatureCollection" as const, features };
  }, [routesData]);

  // --- Active alerts ---
  const { data: alertsData } = useSWR(
    `/api/trenes/alertas?active=true&limit=200`,
    fetcher,
    { refreshInterval: 120000 }
  );

  const alerts = alertsData?.data?.alerts || [];
  const alertRouteIds = useMemo(
    () => new Set<string>(alerts.filter((a: { isActive: boolean }) => a.isActive).flatMap((a: { routeIds: string[] }) => a.routeIds)),
    [alerts]
  );

  // --- Live train positions ---
  const { data: trainsData, isLoading: loadingTrains } = useSWR(
    `/api/trenes/posiciones`,
    fetcher,
    { refreshInterval: 15000 } // Refresh every 15 seconds
  );

  const trainCount = trainsData?.metadata?.count || 0;
  const trainStats = trainsData?.metadata?.stats || {};
  const trainsGeoJSON = trainsData?.features ? trainsData : null;

  // --- Stats ---
  const { data: stationsListData } = useSWR(
    `/api/trenes/estaciones?limit=1`,
    fetcher,
    { revalidateOnFocus: false }
  );
  const totalStations = stationsListData?.data?.pagination?.total || stationsGeoJSON?.features?.length || 0;
  const totalRoutes = routesData?.data?.pagination?.total || 0;
  const activeAlerts = alertsData?.data?.stats?.totalAlerts || 0;
  const routesByType = routesData?.data?.stats?.byServiceType || {};

  const isLoading = loadingStations || loadingTrains;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Red Ferroviaria de España
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Trenes en tiempo real, estaciones, líneas y alertas de servicio
          </p>
        </div>
        <div className="flex items-center gap-3">
          {trainCount > 0 && (
            <span className="flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-full text-sm font-medium">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              {trainCount} trenes en circulación
            </span>
          )}
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
            <Train className="w-3.5 h-3.5" />
            <span>En circulación</span>
          </div>
          <p className="text-2xl font-heading font-bold text-[var(--tl-success)] font-mono">
            {trainCount}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Retraso medio</span>
          </div>
          <p className={`text-2xl font-heading font-bold font-mono ${(trainStats.avgDelay || 0) > 5 ? "text-[var(--tl-danger)]" : "text-gray-900 dark:text-gray-100"}`}>
            {trainStats.avgDelay || 0}<span className="text-sm font-normal ml-0.5">min</span>
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>Estaciones</span>
          </div>
          <p className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100 font-mono">
            {totalStations.toLocaleString("es-ES")}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
            <Route className="w-3.5 h-3.5" />
            <span>Líneas</span>
          </div>
          <p className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100 font-mono">
            {totalRoutes.toLocaleString("es-ES")}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Alertas</span>
          </div>
          <p className={`text-2xl font-heading font-bold font-mono ${activeAlerts > 0 ? "text-[var(--tl-danger)]" : "text-[var(--tl-success)]"}`}>
            {activeAlerts}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 w-full"
        >
          <Filter className="w-4 h-4" />
          <span>Filtrar por tipo de servicio</span>
          <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>
        {showFilters && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setSelectedServiceType(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!selectedServiceType ? "bg-[var(--tl-primary)] text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}
            >
              Todos
            </button>
            {SERVICE_TYPES.map((st) => (
              <button
                key={st.value}
                onClick={() => setSelectedServiceType(st.value === selectedServiceType ? null : st.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${selectedServiceType === st.value ? "text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}
                style={selectedServiceType === st.value ? { backgroundColor: st.color } : {}}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: st.color }} />
                {st.label}
                {routesByType[st.value] ? ` (${routesByType[st.value]})` : ""}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
        <RailwayMap
          stationsGeoJSON={enrichedStations}
          routesGeoJSON={routesGeoJSON}
          alertRouteIds={alertRouteIds}
          trainsGeoJSON={trainsGeoJSON}
          onStationClick={(p) => { setSelectedTrain(null); setSelectedStation(p); }}
          onTrainClick={(p) => { setSelectedStation(null); setSelectedTrain(p); }}
        />

        {/* Legend */}
        <div className="px-4 py-2.5 border-t border-gray-700 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-400">
          <span className="font-medium text-gray-300">Estaciones:</span>
          {SERVICE_TYPES.slice(0, 4).map((st) => (
            <span key={st.value} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: st.color }} />
              {st.label}
            </span>
          ))}
          <span className="font-medium text-gray-300 ml-2">Trenes:</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Puntual</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> &lt;5 min</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> 5-15 min</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> &gt;15 min</span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-0.5" style={{ borderTop: "2px dashed #ef4444" }} />
            Alerta
          </span>
        </div>
      </div>

      {/* Selected Train Panel */}
      {selectedTrain && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${Number(selectedTrain.delay) <= 0 ? "bg-green-500" : Number(selectedTrain.delay) <= 5 ? "bg-yellow-500" : "bg-red-500"}`}>
                <Train className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-gray-100">
                  {String(selectedTrain.productType)} {String(selectedTrain.trainId)}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Material: {String(selectedTrain.material)}
                  {selectedTrain.accessible ? " · ♿ Accesible" : ""}
                </p>
              </div>
            </div>
            <button onClick={() => setSelectedTrain(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Retraso</p>
              <p className={`text-lg font-bold font-mono ${Number(selectedTrain.delay) <= 0 ? "text-green-600" : "text-red-600"}`}>
                {Number(selectedTrain.delay) <= 0 ? "Puntual" : `+${selectedTrain.delay} min`}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Origen</p>
              <p className="text-sm font-mono text-gray-900 dark:text-gray-100">{String(selectedTrain.origin)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Destino</p>
              <p className="text-sm font-mono text-gray-900 dark:text-gray-100">{String(selectedTrain.destination)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Próxima parada</p>
              <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                {String(selectedTrain.nextStation)}
                {selectedTrain.nextArrival ? ` · ${String(selectedTrain.nextArrival).slice(11, 16)}` : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Station Panel */}
      {selectedStation && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-gray-100">
                {String(selectedStation.name)}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {String(selectedStation.provinceName || "")}
                {selectedStation.code ? ` · Código: ${selectedStation.code}` : ""}
              </p>
            </div>
            <button onClick={() => setSelectedStation(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[var(--tl-danger)]" />
            Alertas activas ({alerts.length})
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {alerts.slice(0, 30).map((alert: Record<string, unknown>) => (
              <div
                key={String(alert.alertId)}
                className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800/50 p-3"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 shrink-0">
                    {EFFECT_LABELS[String(alert.effect)] || String(alert.effect)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100">{String(alert.description)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {new Date(String(alert.activePeriodStart)).toLocaleString("es-ES", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attribution */}
      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        <Info className="w-3.5 h-3.5" />
        <span>Origen de los datos: Renfe Operadora (CC-BY 4.0). Posiciones actualizadas cada 15 segundos.</span>
      </div>
    </div>
  );
}
