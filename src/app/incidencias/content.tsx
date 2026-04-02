"use client";

import { fetcher } from "@/lib/fetcher";
import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_STYLE_DEFAULT, forceSpanishLabels } from "@/lib/map-config";
import Link from "next/link";
import {
  AlertTriangle,
  Loader2,
  List,
  Map as MapIcon,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  BarChart2,
} from "lucide-react";
import type { IncidentEffect, IncidentCause } from "@/lib/parsers/datex2";
import { IncidentFilters } from "@/components/incidents/IncidentFilters";
import { IncidentModal, type IncidentData } from "@/components/incidents/IncidentModal";
import {
  createIncidentMarkerElement,
  createSimpleMarkerElement,
  getIncidentPopupHTML,
  EFFECT_COLORS,
  EFFECT_LABELS,
  CAUSE_LABELS,
} from "@/components/map/IncidentMarker";

interface IncidentFeature {
  type: "Feature";
  id: string;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    situationId: string;
    type: string;
    effect: IncidentEffect;
    cause: IncidentCause;
    startedAt: string;
    endedAt: string | null;
    roadNumber: string | null;
    kmPoint: number | null;
    direction: string | null;
    province: string | null;
    community: string | null;
    severity: string;
    description: string | null;
    laneInfo: string | null;
    source: string;
  };
}

interface IncidentsResponse {
  count: number;
  totalCount: number;
  lastUpdated: string;
  counts: {
    byEffect: Record<string, number>;
    byCause: Record<string, number>;
    byProvince: Record<string, number>;
  };
  labels: {
    effects: Record<string, string>;
    causes: Record<string, string>;
  };
  geojson: {
    type: "FeatureCollection";
    features: IncidentFeature[];
  };
}


// Spain center coordinates
const SPAIN_CENTER: [number, number] = [-3.7038, 40.4168];
const SPAIN_BOUNDS: [[number, number], [number, number]] = [
  [-9.5, 35.5],
  [4.5, 44.0],
];

export function IncidenciasContent() {
  const searchParams = useSearchParams();
  const initialEffect = searchParams.get("effect")?.split(",").filter(Boolean) as IncidentEffect[] || [];
  const initialCause = searchParams.get("cause")?.split(",").filter(Boolean) as IncidentCause[] || [];

  const [activeEffects, setActiveEffects] = useState<IncidentEffect[]>(initialEffect);
  const [activeCauses, setActiveCauses] = useState<IncidentCause[]>(initialCause);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<IncidentFeature | null>(null);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Build API URL with filters
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (activeEffects.length > 0) {
      params.set("effect", activeEffects.join(","));
    }
    if (activeCauses.length > 0) {
      params.set("cause", activeCauses.join(","));
    }
    return `/api/incidents?${params.toString()}`;
  }, [activeEffects, activeCauses]);

  const { data, error, isLoading, mutate } = useSWR<IncidentsResponse>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 60000, // Refresh every minute
    }
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE_DEFAULT,
      center: SPAIN_CENTER,
      zoom: 6,
      maxBounds: SPAIN_BOUNDS,
      attributionControl: false,
    });

    map.current.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    map.current.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.current.on("load", () => {
      forceSpanishLabels(map.current!);
      setIsMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!map.current || !isMapLoaded || !data?.geojson?.features) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const features = data.geojson.features;
    const useDetailedMarkers = features.length < 100;

    features.forEach((feature) => {
      const { effect, cause } = feature.properties;
      const [lng, lat] = feature.geometry.coordinates;

      const el = useDetailedMarkers
        ? createIncidentMarkerElement(effect, cause, 28)
        : createSimpleMarkerElement(effect, 14);

      // Add click handler to open modal
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedIncident(feature);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([lng, lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [data?.geojson?.features, isMapLoaded]);

  const handleEffectToggle = (effect: IncidentEffect) => {
    setActiveEffects((prev) =>
      prev.includes(effect)
        ? prev.filter((e) => e !== effect)
        : [...prev, effect]
    );
  };

  const handleCauseToggle = (cause: IncidentCause) => {
    setActiveCauses((prev) =>
      prev.includes(cause)
        ? prev.filter((c) => c !== cause)
        : [...prev, cause]
    );
  };

  const handleClearAll = () => {
    setActiveEffects([]);
    setActiveCauses([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Actions bar */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
          <Link
            href="/incidencias/analytics"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300 hover:bg-tl-100 dark:bg-tl-900/30 transition-colors text-sm font-medium border border-tl-200 dark:border-tl-800 whitespace-nowrap self-start"
          >
            <BarChart2 className="w-4 h-4" />
            Ver análisis histórico
          </Link>
        </div>

        {/* Stats bar */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {isLoading ? "-" : data?.count || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Incidencias activas</p>
              </div>
              {data?.counts?.byEffect && (
                <>
                  <div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {data.counts.byEffect.ROAD_CLOSED || 0}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cortes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-500 dark:text-orange-400">
                      {data.counts.byEffect.SLOW_TRAFFIC || 0}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Retenciones</p>
                  </div>
                </>
              )}
              {data?.lastUpdated && (
                <div className="text-xs text-gray-400">
                  Actualizado:{" "}
                  {new Date(data.lastUpdated).toLocaleTimeString("es-ES")}
                </div>
              )}
            </div>

            {/* View toggle and refresh */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => mutate()}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-gray-900 rounded-lg transition-colors"
                title="Actualizar"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                <button
                  onClick={() => setViewMode("map")}
                  className={`px-3 py-2 flex items-center gap-1.5 text-sm ${
                    viewMode === "map"
                      ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300"
                      : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-950"
                  }`}
                >
                  <MapIcon className="w-4 h-4" />
                  Mapa
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-2 flex items-center gap-1.5 text-sm ${
                    viewMode === "list"
                      ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300"
                      : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-950"
                  }`}
                >
                  <List className="w-4 h-4" />
                  Lista
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters panel */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 mb-4">
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-950 transition-colors"
          >
            <span className="flex items-center gap-2">
              Filtros
              {(activeEffects.length > 0 || activeCauses.length > 0) && (
                <span className="bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 px-2 py-0.5 rounded-full text-xs">
                  {activeEffects.length + activeCauses.length} activos
                </span>
              )}
            </span>
            {filtersExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {filtersExpanded && (
            <div className="px-4 pb-4">
              <IncidentFilters
                activeEffects={activeEffects}
                activeCauses={activeCauses}
                onEffectToggle={handleEffectToggle}
                onCauseToggle={handleCauseToggle}
                onClearAll={handleClearAll}
                counts={data?.counts}
              />
            </div>
          )}
        </div>

        {/* Main content area */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-tl-600 dark:text-tl-400 animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Cargando incidencias...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex flex-col items-center justify-center py-20 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-8 h-8 mb-4" />
              <p>Error al cargar las incidencias</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Por favor, inténtalo de nuevo más tarde
              </p>
            </div>
          )}

          {/* Map container - always rendered to avoid race condition */}
          <div
            ref={mapContainer}
            className={`w-full h-[600px] relative ${viewMode !== "map" || isLoading || error ? "hidden" : ""}`}
            style={{ backgroundColor: "#f5f5f5", overflow: "hidden" }}
          />

          {/* List view */}
          {!isLoading && !error && viewMode === "list" && (
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {data?.geojson?.features.length === 0 && (
                <div className="py-16 text-center text-gray-500 dark:text-gray-400">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No hay incidencias</p>
                  <p className="text-sm mt-1">
                    {activeEffects.length > 0 || activeCauses.length > 0
                      ? "Prueba ajustando los filtros"
                      : "No hay incidencias activas en este momento"}
                  </p>
                </div>
              )}
              {data?.geojson?.features.map((feature) => (
                <IncidentListItem
                  key={feature.id}
                  feature={feature}
                  isSelected={selectedIncident?.id === feature.id}
                  onClick={() => setSelectedIncident(feature)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Legend (only in map view) */}
        {viewMode === "map" && !isLoading && !error && (
          <div className="mt-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Leyenda</h3>
            <div className="flex flex-wrap gap-4">
              {(Object.keys(EFFECT_COLORS) as IncidentEffect[]).map((effect) => (
                <div key={effect} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: EFFECT_COLORS[effect] }}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{EFFECT_LABELS[effect]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Incident Modal */}
      {selectedIncident && (
        <IncidentModal
          incident={featureToIncidentData(selectedIncident)}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  );
}

// Helper to convert IncidentFeature to IncidentData for the modal
function featureToIncidentData(feature: IncidentFeature): IncidentData {
  return {
    situationId: feature.properties.situationId,
    type: feature.properties.type,
    effect: feature.properties.effect,
    cause: feature.properties.cause,
    startedAt: feature.properties.startedAt,
    endedAt: feature.properties.endedAt,
    roadNumber: feature.properties.roadNumber,
    kmPoint: feature.properties.kmPoint,
    direction: feature.properties.direction,
    province: feature.properties.province,
    community: feature.properties.community,
    severity: feature.properties.severity,
    description: feature.properties.description,
    laneInfo: feature.properties.laneInfo,
    source: feature.properties.source,
    coordinates: feature.geometry.coordinates,
  };
}

// List item component
function IncidentListItem({
  feature,
  isSelected,
  onClick,
}: {
  feature: IncidentFeature;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { effect, cause, roadNumber, kmPoint, province, description, startedAt } =
    feature.properties;

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:bg-gray-950 transition-colors ${
        isSelected ? "bg-tl-50 dark:bg-tl-900/20" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Effect indicator */}
        <span
          className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
          style={{ backgroundColor: EFFECT_COLORS[effect] }}
        />

        <div className="flex-1 min-w-0">
          {/* Road and effect */}
          <div className="flex items-center gap-2 flex-wrap">
            {roadNumber && (
              <span className="font-semibold text-gray-900 dark:text-gray-100">{roadNumber}</span>
            )}
            {kmPoint && <span className="text-gray-500 dark:text-gray-400">km {kmPoint}</span>}
            <span className="text-sm text-gray-600 dark:text-gray-400">{EFFECT_LABELS[effect]}</span>
          </div>

          {/* Description */}
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{description}</p>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
            <span
              className="px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${EFFECT_COLORS[effect]}20`,
                color: EFFECT_COLORS[effect],
              }}
            >
              {CAUSE_LABELS[cause]}
            </span>
            {province && <span>{province}</span>}
            <span>
              {new Date(startedAt).toLocaleString("es-ES", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
