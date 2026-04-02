"use client";

import { fetcher } from "@/lib/fetcher";
import useSWR from "swr";
import {
  Train,
  MapPin,
  Route,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Info,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState, useMemo } from "react";

const EFFECT_LABELS: Record<string, string> = {
  NO_SERVICE: "Sin servicio",
  REDUCED_SERVICE: "Servicio reducido",
  SIGNIFICANT_DELAYS: "Retrasos significativos",
  DETOUR: "Desvío",
  MODIFIED_SERVICE: "Servicio modificado",
  OTHER_EFFECT: "Otra incidencia",
  UNKNOWN_EFFECT: "Incidencia",
};

const EFFECT_COLORS: Record<string, string> = {
  NO_SERVICE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  REDUCED_SERVICE: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  SIGNIFICANT_DELAYS: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  DETOUR: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  MODIFIED_SERVICE: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  OTHER_EFFECT: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  UNKNOWN_EFFECT: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

interface RouteEntry {
  routeId: string;
  shortName: string;
  longName: string;
  color: string;
  origin?: string;
  destination?: string;
}

interface StationFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    stationId: string;
    name: string;
    code?: string;
    lines?: string[];
    serviceTypes?: string[];
  };
}

interface AlertEntry {
  alertId: string;
  header?: string;
  description?: string;
  effect?: string;
  routeIds?: string[];
  network?: string;
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-[var(--tl-primary-bg)] flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5 text-[var(--tl-primary)]" />
      </div>
      <div>
        <p className={`text-xl font-heading font-bold font-mono ${color || "text-gray-900 dark:text-gray-100"}`}>
          {value}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function LineRow({ route }: { route: RouteEntry }) {
  const color = route.color ? `#${route.color.replace(/^#/, "")}` : "var(--tl-primary)";

  // Parse origin→destination from longName if origin/destination props are absent
  const [origin, destination] = useMemo(() => {
    if (route.origin && route.destination) return [route.origin, route.destination];
    const parts = (route.longName || "").split(/[-–—]/);
    if (parts.length >= 2) return [parts[0].trim(), parts[parts.length - 1].trim()];
    return [route.longName || "", ""];
  }, [route]);

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      {/* Line badge */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white font-heading font-bold text-sm"
        style={{ backgroundColor: color }}
      >
        {route.shortName || "C"}
      </div>

      {/* Origin→destination */}
      <div className="flex-1 min-w-0">
        {origin && destination ? (
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            <span className="truncate">{origin}</span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{destination}</span>
          </div>
        ) : (
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {route.longName || route.shortName}
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">Línea {route.shortName}</p>
      </div>
    </div>
  );
}

function StationRow({ station }: { station: StationFeature["properties"] }) {
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{station.name}</p>
        {station.code && (
          <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{station.code}</p>
        )}
      </div>
      {station.lines && station.lines.length > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          {station.lines.slice(0, 3).map((line) => (
            <span
              key={line}
              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--tl-primary-bg)] text-[var(--tl-primary)]"
            >
              {line}
            </span>
          ))}
          {station.lines.length > 3 && (
            <span className="text-[10px] text-gray-400">+{station.lines.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function CercaniasNetworkContent({
  network,
  displayName,
}: {
  network: string;
  displayName: string;
}) {
  const [stationSearch, setStationSearch] = useState("");
  const [showAllStations, setShowAllStations] = useState(false);

  // Stations for this network
  const { data: stationsData, isLoading: loadingStations } = useSWR(
    `/api/trenes/estaciones?network=${encodeURIComponent(displayName)}&format=geojson&limit=500`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Routes for this network
  const { data: routesData, isLoading: loadingRoutes } = useSWR(
    `/api/trenes/rutas?network=${encodeURIComponent(displayName)}&withShapes=false&limit=200`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Active alerts
  const { data: alertsData } = useSWR(
    `/api/trenes/alertas?active=true`,
    fetcher,
    { refreshInterval: 120000 }
  );

  const allStations: StationFeature["properties"][] = useMemo(() => {
    const features: StationFeature[] = stationsData?.features || [];
    return features
      .map((f) => f.properties)
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [stationsData]);

  const routes: RouteEntry[] = useMemo(() => {
    return (routesData?.data?.routes || []).sort((a: RouteEntry, b: RouteEntry) =>
      (a.shortName || "").localeCompare(b.shortName || "", "es", { numeric: true })
    );
  }, [routesData]);

  // Filter alerts that mention this network
  const networkAlerts: AlertEntry[] = useMemo(() => {
    const all: AlertEntry[] = alertsData?.data?.alerts || [];
    return all.filter((a) => {
      if (a.network && a.network.toLowerCase().includes(network.split("-")[0])) return true;
      const text = JSON.stringify(a).toLowerCase();
      return text.includes(displayName.toLowerCase().split("/")[0]);
    });
  }, [alertsData, network, displayName]);

  const filteredStations = useMemo(() => {
    if (!stationSearch) return allStations;
    const q = stationSearch.toLowerCase();
    return allStations.filter((s) => s.name.toLowerCase().includes(q));
  }, [allStations, stationSearch]);

  const visibleStations = showAllStations ? filteredStations : filteredStations.slice(0, 30);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Cercanías {displayName}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Estaciones · Líneas · Alertas en tiempo real
          </p>
        </div>
        <a
          href="/trenes"
          className="shrink-0 flex items-center gap-1.5 text-sm text-[var(--tl-primary)] font-semibold hover:underline"
        >
          <Train className="w-4 h-4" />
          Ver en el mapa
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          icon={MapPin}
          label="Estaciones"
          value={loadingStations ? "—" : allStations.length.toLocaleString("es-ES")}
        />
        <StatCard
          icon={Route}
          label="Líneas"
          value={loadingRoutes ? "—" : routes.length}
          color="text-[var(--tl-primary)]"
        />
        <StatCard
          icon={AlertTriangle}
          label="Alertas activas"
          value={networkAlerts.length}
          color={networkAlerts.length > 0 ? "text-[var(--tl-danger)]" : "text-[var(--tl-success)]"}
        />
      </div>

      {/* Alerts */}
      {networkAlerts.length > 0 && (
        <section>
          <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-[var(--tl-danger)]" />
            Alertas en Cercanías {displayName}
          </h2>
          <div className="space-y-2">
            {networkAlerts.map((a) => (
              <div
                key={a.alertId}
                className="bg-white dark:bg-gray-800 border border-red-100 dark:border-red-900/30 rounded-xl p-4 flex items-start gap-3"
              >
                <span
                  className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-semibold ${
                    EFFECT_COLORS[a.effect || ""] || EFFECT_COLORS.UNKNOWN_EFFECT
                  }`}
                >
                  {EFFECT_LABELS[a.effect || ""] || "Incidencia"}
                </span>
                <p className="text-sm text-gray-700 dark:text-gray-300 min-w-0">
                  {a.description || a.header || "Incidencia activa en esta red"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Lines */}
      <section>
        <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
          <Route className="w-5 h-5 text-[var(--tl-primary)]" />
          Líneas de Cercanías {displayName}
        </h2>

        {loadingRoutes ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : routes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No hay líneas disponibles para esta red en este momento.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/50 overflow-hidden">
            {routes.map((route) => (
              <div key={route.routeId} className="px-4">
                <LineRow route={route} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Stations */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[var(--tl-primary)]" />
            Estaciones
            {allStations.length > 0 && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                ({allStations.length})
              </span>
            )}
          </h2>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar estación..."
              value={stationSearch}
              onChange={(e) => setStationSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-[var(--tl-primary)] focus:ring-1 focus:ring-[var(--tl-primary)]/30 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
            />
          </div>
        </div>

        {loadingStations ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : filteredStations.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {stationSearch
                ? `No se encontraron estaciones para "${stationSearch}".`
                : "No hay estaciones disponibles para esta red."}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {visibleStations.map((station) => (
                  <div key={station.stationId} className="px-4">
                    <StationRow station={station} />
                  </div>
                ))}
              </div>
            </div>

            {filteredStations.length > 30 && (
              <button
                onClick={() => setShowAllStations(!showAllStations)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-sm text-[var(--tl-primary)] font-semibold hover:bg-[var(--tl-primary-bg)] rounded-lg transition-colors"
              >
                {showAllStations ? (
                  <>
                    Mostrar menos <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Ver todas las {filteredStations.length} estaciones{" "}
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </>
        )}
      </section>

      {/* Back link */}
      <div className="flex items-center gap-3">
        <a
          href="/trenes/cercanias"
          className="text-sm text-[var(--tl-primary)] hover:underline font-semibold flex items-center gap-1"
        >
          ← Todas las redes de Cercanías
        </a>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <a
          href="/trenes"
          className="text-sm text-[var(--tl-primary)] hover:underline font-semibold flex items-center gap-1.5"
        >
          <Train className="w-3.5 h-3.5" />
          Mapa ferroviario
        </a>
      </div>

      {/* Attribution */}
      <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
        <Info className="w-3 h-3 shrink-0" />
        Datos: Renfe Operadora (CC-BY 4.0). Alertas actualizadas cada 2 minutos. Estaciones y líneas
        GTFS semanales.
      </p>
    </div>
  );
}
