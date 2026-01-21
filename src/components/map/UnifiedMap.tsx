"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { Map as MapIcon, AlertTriangle, Loader2 } from "lucide-react";
import { MapControls, type ActiveLayers, type IncidentFilters } from "./MapControls";
import { MapStats } from "./MapStats";
import type { V16Beacon, Incident, Camera, TrafficMapRef } from "./TrafficMap";
import { IncidentModal, type IncidentData } from "@/components/incidents/IncidentModal";
import {
  EFFECT_LABELS,
  CAUSE_LABELS,
  EFFECT_COLORS,
} from "./IncidentMarker";

// Dynamic import for map to avoid SSR issues
const TrafficMap = dynamic(() => import("./TrafficMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
      <MapIcon className="w-12 h-12 text-gray-400" />
    </div>
  ),
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface V16Response {
  count: number;
  beacons: V16Beacon[];
}

interface IncidentsResponse {
  count: number;
  incidents: Incident[];
}

interface CamerasResponse {
  count: number;
  cameras: Camera[];
}

interface Charger {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  city: string | null;
  province: string;
  operator: string | null;
  totalPowerKw: number;
  connectorCount: number;
  connectorTypes: string[];
  is24h: boolean;
}

interface ChargersResponse {
  count: number;
  chargers: Charger[];
}

interface UnifiedMapProps {
  defaultHeight?: string;
  showStats?: boolean;
  id?: string;
}

export function UnifiedMap({
  defaultHeight = "500px",
  showStats = true,
  id = "mapa",
}: UnifiedMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<TrafficMapRef>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const [activeLayers, setActiveLayers] = useState<ActiveLayers>({
    v16: true,
    incidents: true,
    cameras: false,
    chargers: false,
    zbe: false,
    weather: true,
    highways: true,
    provinces: false,
  });

  const [incidentFilters, setIncidentFilters] = useState<IncidentFilters>({
    effects: [],
    causes: [],
  });

  // Fetch data
  const {
    data: v16Data,
    mutate: mutateV16,
    isLoading: v16Loading,
  } = useSWR<V16Response>("/api/v16", fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
  });

  const {
    data: incidentsData,
    mutate: mutateIncidents,
    isLoading: incidentsLoading,
  } = useSWR<IncidentsResponse>("/api/incidents", fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
  });

  const { data: camerasData } = useSWR<CamerasResponse>(
    activeLayers.cameras ? "/api/cameras" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: chargersData } = useSWR<ChargersResponse>(
    activeLayers.chargers ? "/api/chargers" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const isLoading = v16Loading || incidentsLoading;

  // Handle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
      if (e.key === "Escape" && isFullscreen) {
        // Handled by browser
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleFullscreen, isFullscreen]);

  const handleLayerToggle = (layer: keyof ActiveLayers) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleRefresh = () => {
    setLastUpdated(new Date());
    mutateV16();
    mutateIncidents();
  };

  const handleIncidentClick = (incident: Incident) => {
    setSelectedIncident(incident);
  };

  const handleListItemClick = (incident: Incident) => {
    setSelectedIncident(incident);
    mapRef.current?.flyTo(incident.lng, incident.lat, 14);
  };

  // Filter incidents for display
  const filteredIncidents = (incidentsData?.incidents || []).filter((incident) => {
    if (incidentFilters.effects.length === 0 && incidentFilters.causes.length === 0) {
      return true;
    }
    const effectMatch =
      incidentFilters.effects.length === 0 || incidentFilters.effects.includes(incident.effect);
    const causeMatch =
      incidentFilters.causes.length === 0 || incidentFilters.causes.includes(incident.cause);
    return effectMatch && causeMatch;
  });

  // Calculate counts for display
  const counts = {
    v16: v16Data?.count || 0,
    incidents: filteredIncidents.length,
    cameras: camerasData?.count || 0,
    chargers: chargersData?.count || 0,
  };

  // Height calculation
  const mapHeight = isFullscreen ? "100%" : defaultHeight;

  return (
    <div
      ref={containerRef}
      id={id}
      className={`
        bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden
        ${isFullscreen ? "fixed inset-0 z-50 rounded-none border-0 flex flex-col" : ""}
      `}
    >
      {/* Header */}
      <div className={`p-4 border-b border-gray-200 ${isFullscreen ? "bg-white/95 backdrop-blur-sm" : ""}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapIcon className="w-5 h-5" />
            Mapa Interactivo
          </h2>
          {!isFullscreen && (
            <span className="text-sm text-gray-500">
              Pulsa <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">F</kbd> para pantalla completa
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <MapControls
        activeLayers={activeLayers}
        onLayerToggle={handleLayerToggle}
        incidentFilters={incidentFilters}
        onIncidentFiltersChange={setIncidentFilters}
        isFullscreen={isFullscreen}
        onFullscreenToggle={toggleFullscreen}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        counts={counts}
      />

      {/* Main content area */}
      <div className={`${isFullscreen ? "flex-1 flex" : ""}`}>
        {/* Map */}
        {viewMode === "map" && (
          <div className={`${isFullscreen ? "flex-1" : ""}`} style={{ height: isFullscreen ? "100%" : mapHeight }}>
            <TrafficMap
              ref={mapRef}
              activeLayers={activeLayers}
              v16Data={activeLayers.v16 ? v16Data?.beacons : undefined}
              incidentData={activeLayers.incidents ? incidentsData?.incidents : undefined}
              cameraData={activeLayers.cameras ? camerasData?.cameras : undefined}
              chargerData={activeLayers.chargers ? chargersData?.chargers : undefined}
              incidentFilters={incidentFilters}
              height="100%"
              onIncidentClick={handleIncidentClick}
            />
          </div>
        )}

        {/* List view */}
        {viewMode === "list" && (
          <div
            className={`overflow-y-auto ${isFullscreen ? "flex-1" : ""}`}
            style={{ height: isFullscreen ? "100%" : mapHeight }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No hay incidencias</p>
                <p className="text-sm">
                  {incidentFilters.effects.length > 0 || incidentFilters.causes.length > 0
                    ? "Prueba ajustando los filtros"
                    : "No hay incidencias activas"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredIncidents.map((incident) => (
                  <IncidentListItem
                    key={incident.id}
                    incident={incident}
                    onClick={() => handleListItemClick(incident)}
                    isSelected={selectedIncident?.id === incident.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats bar */}
      {showStats && (
        <MapStats
          v16Count={activeLayers.v16 ? counts.v16 : 0}
          incidentCount={activeLayers.incidents ? counts.incidents : 0}
          cameraCount={activeLayers.cameras ? counts.cameras : 0}
          lastUpdated={lastUpdated}
          isLoading={isLoading}
          isFullscreen={isFullscreen}
        />
      )}

      {/* Incident Modal */}
      {selectedIncident && (
        <IncidentModal
          incident={incidentToModalData(selectedIncident)}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  );
}

// Helper to convert Incident to IncidentData for the modal
function incidentToModalData(incident: Incident): IncidentData {
  return {
    situationId: incident.id,
    type: incident.type,
    effect: incident.effect,
    cause: incident.cause,
    startedAt: incident.startedAt || new Date().toISOString(),
    endedAt: null,
    roadNumber: incident.road || null,
    kmPoint: incident.km || null,
    direction: null,
    province: incident.province || null,
    community: null,
    severity: incident.severity,
    description: incident.description || null,
    laneInfo: incident.laneInfo || null,
    source: "DGT",
    coordinates: [incident.lng, incident.lat],
  };
}

// List item component
function IncidentListItem({
  incident,
  onClick,
  isSelected,
}: {
  incident: Incident;
  onClick: () => void;
  isSelected: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors
        ${isSelected ? "bg-blue-50" : ""}
      `}
    >
      <div className="flex items-start gap-3">
        <span
          className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
          style={{ backgroundColor: EFFECT_COLORS[incident.effect] }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {incident.road && (
              <span className="font-semibold text-gray-900">{incident.road}</span>
            )}
            {incident.km && <span className="text-gray-500">km {incident.km}</span>}
            <span className="text-sm text-gray-600">{EFFECT_LABELS[incident.effect]}</span>
          </div>
          {incident.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{incident.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
            <span
              className="px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${EFFECT_COLORS[incident.effect]}20`,
                color: EFFECT_COLORS[incident.effect],
              }}
            >
              {CAUSE_LABELS[incident.cause]}
            </span>
            {incident.province && <span>{incident.province}</span>}
            {incident.startedAt && (
              <span>
                {new Date(incident.startedAt).toLocaleString("es-ES", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
