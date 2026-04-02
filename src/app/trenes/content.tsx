"use client";

import { fetcher } from "@/lib/fetcher";
import { useState } from "react";
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
} from "lucide-react";

const RailwayMap = dynamic(() => import("./railway-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[550px] bg-gray-100 dark:bg-gray-900 animate-pulse flex items-center justify-center rounded-lg">
      <Train className="w-12 h-12 text-gray-400" />
    </div>
  ),
});

interface Station {
  id: string;
  stopId: string;
  name: string;
  latitude: number;
  longitude: number;
  serviceTypes: string[];
  province?: string;
  provinceName?: string;
}

interface RouteData {
  routeId: string;
  shortName?: string;
  longName?: string;
  serviceType: string;
  color?: string;
  network?: string;
  shapeGeoJSON?: GeoJSON.LineString;
}

interface AlertData {
  alertId: string;
  routeIds: string[];
  description: string;
  effect: string;
  isActive: boolean;
  serviceType?: string;
  activePeriodStart: string;
  headerText?: string;
}

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
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch stations as GeoJSON for map
  const stationsParams = new URLSearchParams({ format: "geojson", limit: "3000" });
  if (selectedServiceType) stationsParams.set("serviceType", selectedServiceType);

  const { data: stationsGeoJSON, isLoading: loadingStations } = useSWR(
    `/api/trenes/estaciones?${stationsParams}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Fetch routes with shapes
  const routesParams = new URLSearchParams({ withShapes: "true", limit: "500" });
  if (selectedServiceType) routesParams.set("serviceType", selectedServiceType);

  const { data: routesData, isLoading: loadingRoutes } = useSWR(
    `/api/trenes/rutas?${routesParams}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Fetch active alerts
  const { data: alertsData, isLoading: loadingAlerts } = useSWR(
    `/api/trenes/alertas?active=true&limit=200`,
    fetcher,
    { refreshInterval: 120000 } // Refresh every 2 min
  );

  // Also fetch station list for stats
  const { data: stationsListData } = useSWR(
    `/api/trenes/estaciones?parentOnly=true&limit=1`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const routes: RouteData[] = routesData?.data?.routes || [];
  const alerts: AlertData[] = alertsData?.data?.alerts || [];
  const totalStations = stationsListData?.data?.pagination?.total || 0;
  const totalRoutes = routesData?.data?.pagination?.total || 0;
  const activeAlerts = alertsData?.data?.stats?.totalAlerts || 0;
  const routesByType = routesData?.data?.stats?.byServiceType || {};

  const isLoading = loadingStations || loadingRoutes;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Red Ferroviaria de España
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Mapa interactivo de estaciones, líneas y alertas en tiempo real
          </p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Cargando datos...</span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <MapPin className="w-4 h-4" />
            <span>Estaciones</span>
          </div>
          <p className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100 font-mono">
            {totalStations.toLocaleString("es-ES")}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <Route className="w-4 h-4" />
            <span>Líneas</span>
          </div>
          <p className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100 font-mono">
            {totalRoutes.toLocaleString("es-ES")}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>Alertas activas</span>
          </div>
          <p className={`text-2xl font-heading font-bold font-mono ${activeAlerts > 0 ? "text-[var(--tl-danger)]" : "text-[var(--tl-success)]"}`}>
            {activeAlerts}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <Train className="w-4 h-4" />
            <span>Tipos servicio</span>
          </div>
          <p className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100 font-mono">
            {Object.keys(routesByType).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
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
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !selectedServiceType
                  ? "bg-[var(--tl-primary)] text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Todos
            </button>
            {SERVICE_TYPES.map((st) => (
              <button
                key={st.value}
                onClick={() => setSelectedServiceType(st.value === selectedServiceType ? null : st.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  selectedServiceType === st.value
                    ? "text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
                style={selectedServiceType === st.value ? { backgroundColor: st.color } : {}}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: st.color }}
                />
                {st.label}
                {routesByType[st.value] ? ` (${routesByType[st.value]})` : ""}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <RailwayMap
          stationsGeoJSON={stationsGeoJSON}
          routes={routes}
          alerts={alerts}
          selectedServiceType={selectedServiceType}
          onStationClick={setSelectedStation}
        />

        {/* Map Legend */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
          {SERVICE_TYPES.map((st) => (
            <span key={st.value} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: st.color }} />
              {st.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-red-600" style={{ borderTop: "2px dashed #dc2626" }} />
            Con alerta activa
          </span>
        </div>
      </div>

      {/* Selected Station Detail */}
      {selectedStation && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
                {selectedStation.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedStation.provinceName || ""}
                {selectedStation.stopId ? ` · Código: ${selectedStation.stopId}` : ""}
              </p>
            </div>
            <button
              onClick={() => setSelectedStation(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Latitud</p>
              <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                {selectedStation.latitude.toFixed(5)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Longitud</p>
              <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                {selectedStation.longitude.toFixed(5)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Servicios</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {selectedStation.serviceTypes.map((st) => {
                  const stype = SERVICE_TYPES.find((s) => s.value === st);
                  return (
                    <span
                      key={st}
                      className="px-2 py-0.5 rounded text-xs text-white"
                      style={{ backgroundColor: stype?.color || "#94b6ff" }}
                    >
                      {stype?.label || st}
                    </span>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Provincia</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {selectedStation.provinceName || "—"}
              </p>
            </div>
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
          <div className="space-y-2">
            {alerts.slice(0, 20).map((alert) => (
              <div
                key={alert.alertId}
                className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800/50 p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                      {EFFECT_LABELS[alert.effect] || alert.effect}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {alert.description}
                    </p>
                    {alert.serviceType && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {SERVICE_TYPES.find((s) => s.value === alert.serviceType)?.label || alert.serviceType}
                        {" · "}
                        {new Date(alert.activePeriodStart).toLocaleString("es-ES", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {alerts.length > 20 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Mostrando 20 de {alerts.length} alertas
              </p>
            )}
          </div>
        </div>
      )}

      {/* Attribution */}
      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        <Info className="w-3.5 h-3.5" />
        <span>
          Origen de los datos: Renfe Operadora (CC-BY 4.0). Actualizado cada 2 minutos.
        </span>
      </div>
    </div>
  );
}
