"use client";

import { useState, useRef, useEffect } from "react";
import {
  AlertTriangle,
  Camera,
  Zap,
  Ban,
  RefreshCw,
  Maximize2,
  Minimize2,
  ChevronDown,
  Route,
  List,
  Map as MapIcon,
  X,
  CloudRain,
  Navigation,
  Wind,
  Radar,
  ShieldAlert,
  Fuel,
  Anchor,
  Flame,
  Layers,
  Circle,
  Monitor,
  Moon,
  Sun,
  History,
  Mountain,
  ArrowLeftRight,
  Activity,
  CloudLightning,
  Volume2,
  VolumeX,
  Construction,
  Gauge,
  Train,
  Bus,
  Ship,
  Plane,
} from "lucide-react";
import type { IncidentEffect, IncidentCause } from "@/lib/parsers/datex2";
import type { IncidentViewMode } from "./TrafficMap";

export type LocationPreset = "peninsula" | "canarias" | "baleares" | "ceuta" | "melilla" | "portugal" | "marruecos";

export interface ActiveLayers {
  v16: boolean;
  incidents: boolean;
  cameras: boolean;
  chargers: boolean;
  zbe: boolean;
  weather: boolean;
  highways: boolean;
  provinces: boolean;
  radars: boolean;
  riskZones: boolean;
  gasStations: boolean;
  maritimeStations: boolean;
  panels: boolean;
  liveSpeed: boolean;
  dangerScore: boolean;
  roadworks: boolean;
  sensors: boolean;
  citySensors: boolean;
  portugalGas: boolean;
  railwayStations: boolean;
  railwayRoutes: boolean;
  airports: boolean;
  ports: boolean;
  transitStops: boolean;
  transitRoutes: boolean;
  ferryStops: boolean;
  ferryRoutes: boolean;
  roadSegments: boolean;
  aircraft: boolean;
  vessels: boolean;
  climateStations: boolean;
}

export interface IncidentFilters {
  effects: IncidentEffect[];
  causes: IncidentCause[];
}

interface MapControlsProps {
  activeLayers: ActiveLayers;
  onLayerToggle: (layer: keyof ActiveLayers) => void;
  incidentFilters: IncidentFilters;
  onIncidentFiltersChange: (filters: IncidentFilters) => void;
  incidentViewMode?: IncidentViewMode;
  onIncidentViewModeChange?: (mode: IncidentViewMode) => void;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  isLoading: boolean;
  onRefresh: () => void;
  viewMode: "map" | "list";
  onViewModeChange: (mode: "map" | "list") => void;
  onLocationChange?: (preset: LocationPreset) => void;
  darkMode?: boolean;
  onDarkModeToggle?: () => void;
  timelineActive?: boolean;
  onTimelineToggle?: () => void;
  terrain3D?: boolean;
  onTerrain3DToggle?: () => void;
  corridorActive?: boolean;
  onCorridorToggle?: () => void;
  flowActive?: boolean;
  onFlowToggle?: () => void;
  comparatorActive?: boolean;
  onComparatorToggle?: () => void;
  weatherRadar?: boolean;
  onWeatherRadarToggle?: () => void;
  voiceEnabled?: boolean;
  onVoiceToggle?: () => void;
  // Weather overlays
  windOverlay?: boolean;
  onWindOverlayToggle?: () => void;
  cloudOverlay?: boolean;
  onCloudOverlayToggle?: () => void;
  tempOverlay?: boolean;
  onTempOverlayToggle?: () => void;
  // Satellite basemap
  satellite?: boolean;
  onSatelliteToggle?: () => void;
  // Driving mode
  drivingMode?: boolean;
  onDrivingModeToggle?: () => void;
  counts?: {
    v16: number;
    incidents: number;
    cameras: number;
    chargers: number;
    weather: number;
    radars: number;
    riskZones: number;
    zbe: number;
    gasStations: number;
    maritimeStations: number;
    panels: number;
  };
}

// ─── Layer categories ────────────────────────────────────────────────────────

type LayerDef = {
  key: keyof ActiveLayers;
  label: string;
  icon: React.ReactNode;
  countKey?: keyof NonNullable<MapControlsProps["counts"]>;
};

const CATEGORIES: { title: string; layers: LayerDef[] }[] = [
  {
    title: "Tráfico",
    layers: [
      { key: "v16", label: "Balizas V16", icon: <AlertTriangle className="w-4 h-4" />, countKey: "v16" },
      { key: "incidents", label: "Incidencias", icon: <AlertTriangle className="w-4 h-4" />, countKey: "incidents" },
      { key: "liveSpeed", label: "Velocidad en vivo", icon: <Activity className="w-4 h-4" /> },
      { key: "dangerScore", label: "Índice de peligro", icon: <ShieldAlert className="w-4 h-4" /> },
      { key: "panels", label: "Paneles PMV", icon: <Monitor className="w-4 h-4" />, countKey: "panels" },
      { key: "roadworks", label: "Obras", icon: <Construction className="w-4 h-4" /> },
      { key: "sensors", label: "Sensores Madrid", icon: <Gauge className="w-4 h-4" /> },
      { key: "citySensors", label: "Sensores ciudad", icon: <Gauge className="w-4 h-4" /> },
    ],
  },
  {
    title: "Infraestructura",
    layers: [
      { key: "cameras", label: "Cámaras DGT", icon: <Camera className="w-4 h-4" />, countKey: "cameras" },
      { key: "radars", label: "Radares", icon: <Radar className="w-4 h-4" />, countKey: "radars" },
      { key: "gasStations", label: "Gasolineras", icon: <Fuel className="w-4 h-4" />, countKey: "gasStations" },
      { key: "chargers", label: "Cargadores EV", icon: <Zap className="w-4 h-4" />, countKey: "chargers" },
      { key: "maritimeStations", label: "Marítimas", icon: <Anchor className="w-4 h-4" />, countKey: "maritimeStations" },
      { key: "portugalGas", label: "Gasolineras Portugal", icon: <Fuel className="w-4 h-4" /> },
    ],
  },
  {
    title: "Zonas y alertas",
    layers: [
      { key: "weather", label: "Alertas meteo", icon: <CloudRain className="w-4 h-4" />, countKey: "weather" },
      { key: "riskZones", label: "Zonas de riesgo", icon: <ShieldAlert className="w-4 h-4" />, countKey: "riskZones" },
      { key: "zbe", label: "Zonas ZBE", icon: <Ban className="w-4 h-4" />, countKey: "zbe" },
      { key: "provinces", label: "Provincias", icon: <Circle className="w-4 h-4" /> },
    ],
  },
  {
    title: "Mapa base",
    layers: [
      { key: "highways", label: "Red viaria", icon: <Route className="w-4 h-4" /> },
    ],
  },
  {
    title: "Transporte",
    layers: [
      { key: "railwayRoutes", label: "Vías de tren", icon: <Train className="w-4 h-4" /> },
      { key: "railwayStations", label: "Estaciones tren", icon: <Train className="w-4 h-4" /> },
      { key: "transitRoutes", label: "Rutas bus/metro", icon: <Bus className="w-4 h-4" /> },
      { key: "transitStops", label: "Paradas", icon: <Bus className="w-4 h-4" /> },
      { key: "ferryRoutes", label: "Rutas ferry", icon: <Ship className="w-4 h-4" /> },
      { key: "ferryStops", label: "Puertos ferry", icon: <Ship className="w-4 h-4" /> },
      { key: "aircraft", label: "Aviones en vuelo", icon: <Plane className="w-4 h-4" /> },
      { key: "vessels", label: "Buques AIS", icon: <Ship className="w-4 h-4" /> },
      { key: "airports", label: "Aeropuertos", icon: <Plane className="w-4 h-4" /> },
      { key: "ports", label: "Puertos", icon: <Anchor className="w-4 h-4" /> },
    ],
  },
  {
    title: "Datos ambientales",
    layers: [
      { key: "climateStations", label: "Estaciones AEMET", icon: <CloudRain className="w-4 h-4" /> },
      { key: "roadSegments", label: "IMD carreteras", icon: <Route className="w-4 h-4" /> },
    ],
  },
];

const EFFECT_OPTIONS: { value: IncidentEffect; label: string; color: string }[] = [
  { value: "ROAD_CLOSED", label: "Cortada", color: "#dc2626" },
  { value: "SLOW_TRAFFIC", label: "Lento", color: "#f97316" },
  { value: "RESTRICTED", label: "Restringido", color: "#eab308" },
  { value: "DIVERSION", label: "Desvío", color: "#3b82f6" },
  { value: "OTHER_EFFECT", label: "Otro", color: "#6b7280" },
];

const CAUSE_OPTIONS: { value: IncidentCause; label: string; color: string }[] = [
  { value: "ROADWORK", label: "Obras", color: "#d97706" },
  { value: "ACCIDENT", label: "Accidente", color: "#dc2626" },
  { value: "WEATHER", label: "Meteo", color: "#2563eb" },
  { value: "RESTRICTION", label: "Restricción", color: "#9333ea" },
  { value: "OTHER_CAUSE", label: "Otra", color: "#6b7280" },
];

// ─── Tool button helper ──────────────────────────────────────────────────────

function ToolBtn({ onClick, active, icon, title, activeColor }: {
  onClick?: () => void;
  active?: boolean;
  icon: React.ReactNode;
  title: string;
  activeColor?: string;
}) {
  if (!onClick) return null;
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-2 rounded-lg transition-colors ${
        active
          ? (activeColor || "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300")
          : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      {icon}
    </button>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MapControls({
  activeLayers,
  onLayerToggle,
  incidentFilters,
  onIncidentFiltersChange,
  incidentViewMode,
  onIncidentViewModeChange,
  isFullscreen,
  onFullscreenToggle,
  isLoading,
  onRefresh,
  viewMode,
  onViewModeChange,
  onLocationChange,
  darkMode,
  onDarkModeToggle,
  timelineActive,
  onTimelineToggle,
  terrain3D,
  onTerrain3DToggle,
  corridorActive,
  onCorridorToggle,
  flowActive,
  onFlowToggle,
  comparatorActive,
  onComparatorToggle,
  weatherRadar,
  onWeatherRadarToggle,
  voiceEnabled,
  onVoiceToggle,
  windOverlay,
  onWindOverlayToggle,
  cloudOverlay,
  onCloudOverlayToggle,
  tempOverlay,
  onTempOverlayToggle,
  satellite,
  onSatelliteToggle,
  drivingMode,
  onDrivingModeToggle,
  counts,
}: MapControlsProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [incidentFiltersOpen, setIncidentFiltersOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on outside click (desktop)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    }
    if (panelOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [panelOpen]);

  // Lock scroll when panel open on mobile
  useEffect(() => {
    if (panelOpen && window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [panelOpen]);

  const activeLayerCount = Object.values(activeLayers).filter(Boolean).length;
  const activeFilterCount = incidentFilters.effects.length + incidentFilters.causes.length;

  const handleEffectToggle = (effect: IncidentEffect) => {
    const effects = incidentFilters.effects.includes(effect)
      ? incidentFilters.effects.filter((e) => e !== effect)
      : [...incidentFilters.effects, effect];
    onIncidentFiltersChange({ ...incidentFilters, effects });
  };

  const handleCauseToggle = (cause: IncidentCause) => {
    const causes = incidentFilters.causes.includes(cause)
      ? incidentFilters.causes.filter((c) => c !== cause)
      : [...incidentFilters.causes, cause];
    onIncidentFiltersChange({ ...incidentFilters, causes });
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className={`${isFullscreen ? "bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm" : "bg-white dark:bg-gray-900"} border-b border-gray-200 dark:border-gray-800`}>
      {/* ── Top bar (always visible, same on all screens) ── */}
      <div className="flex items-center gap-1.5 px-3 py-2">
        {/* Layers button */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors min-h-[40px] ${
              panelOpen
                ? "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 border border-tl-300 dark:border-tl-700"
                : "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300 border border-tl-200 dark:border-tl-800 hover:bg-tl-100 dark:hover:bg-tl-900/30"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="font-heading">Capas</span>
            <span className="bg-tl-600 dark:bg-tl-500 text-white text-[10px] font-mono px-1.5 py-0.5 rounded-full leading-none">
              {activeLayerCount}
            </span>
            {activeFilterCount > 0 && (
              <span className="bg-tl-amber-500 text-white text-[10px] font-mono px-1.5 py-0.5 rounded-full leading-none">
                +{activeFilterCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${panelOpen ? "rotate-180" : ""}`} />
          </button>

          {/* ── Layer panel (dropdown on desktop, overlay on mobile) ── */}
          {panelOpen && (
            <>
              {/* Mobile backdrop */}
              <div
                className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={() => setPanelOpen(false)}
              />

              {/* Panel */}
              <div className="
                fixed inset-x-0 bottom-0 max-h-[80vh] z-50
                md:absolute md:inset-auto md:top-full md:left-0 md:mt-2 md:w-80 md:max-h-[70vh] md:bottom-auto
                bg-white dark:bg-gray-900 md:rounded-xl md:shadow-xl md:border md:border-gray-200 md:dark:border-gray-800
                rounded-t-2xl md:rounded-t-xl
                overflow-hidden flex flex-col
              ">
                {/* Drag handle (mobile) */}
                <div className="md:hidden flex justify-center py-2">
                  <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="font-heading font-bold text-sm text-gray-900 dark:text-gray-100">
                    Capas del mapa
                  </span>
                  <button
                    onClick={() => setPanelOpen(false)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1 p-3 space-y-4">
                  {CATEGORIES.map((cat) => (
                    <div key={cat.title}>
                      <p className="text-[10px] font-mono font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-1">
                        {cat.title}
                      </p>
                      <div className="space-y-0.5">
                        {cat.layers.map((layer) => {
                          const active = activeLayers[layer.key];
                          const count = layer.countKey ? counts?.[layer.countKey] : undefined;
                          const isIncidents = layer.key === "incidents";

                          return (
                            <div key={layer.key}>
                              {/* Layer row */}
                              <label className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                                active ? "bg-tl-50 dark:bg-tl-900/15" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                              }`}>
                                {/* Checkbox */}
                                <input
                                  type="checkbox"
                                  checked={active}
                                  onChange={() => onLayerToggle(layer.key)}
                                  className="sr-only"
                                />
                                <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                                  active
                                    ? "bg-tl-600 dark:bg-tl-500 border-tl-600 dark:border-tl-500"
                                    : "border-gray-300 dark:border-gray-600"
                                }`}>
                                  {active && (
                                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </span>

                                {/* Icon */}
                                <span className={active ? "text-tl-600 dark:text-tl-400" : "text-gray-400 dark:text-gray-500"}>
                                  {layer.icon}
                                </span>

                                {/* Label */}
                                <span className={`flex-1 text-sm ${
                                  active ? "font-medium text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"
                                }`}>
                                  {layer.label}
                                </span>

                                {/* Count */}
                                {count != null && count > 0 && (
                                  <span className="text-xs font-mono text-gray-400 dark:text-gray-500 tabular-nums">
                                    {count.toLocaleString("es-ES")}
                                  </span>
                                )}

                                {/* Incident sub-filter toggle */}
                                {isIncidents && active && (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIncidentFiltersOpen(!incidentFiltersOpen); }}
                                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setIncidentFiltersOpen(!incidentFiltersOpen); } }}
                                    className="text-gray-400 dark:text-gray-500 hover:text-tl-600 px-1 cursor-pointer"
                                    title="Filtros de incidencias"
                                  >
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${incidentFiltersOpen ? "rotate-180" : ""}`} />
                                    {activeFilterCount > 0 && (
                                      <span className="absolute -top-1 -right-1 bg-tl-amber-500 text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-mono">
                                        {activeFilterCount}
                                      </span>
                                    )}
                                  </span>
                                )}
                              </label>

                              {/* Incident sub-filters (inline expand) */}
                              {isIncidents && active && incidentFiltersOpen && (
                                <div className="ml-8 mr-2 mt-1 mb-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-3">
                                  {/* Effects */}
                                  <div>
                                    <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Afección</p>
                                    <div className="flex flex-wrap gap-1">
                                      {EFFECT_OPTIONS.map((opt) => {
                                        const on = incidentFilters.effects.includes(opt.value);
                                        return (
                                          <button
                                            key={opt.value}
                                            onClick={() => handleEffectToggle(opt.value)}
                                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                                              on ? "text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                                            }`}
                                            style={{ backgroundColor: on ? opt.color : undefined }}
                                          >
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: on ? "#fff" : opt.color }} />
                                            {opt.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Causes */}
                                  <div>
                                    <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Causa</p>
                                    <div className="flex flex-wrap gap-1">
                                      {CAUSE_OPTIONS.map((opt) => {
                                        const on = incidentFilters.causes.includes(opt.value);
                                        return (
                                          <button
                                            key={opt.value}
                                            onClick={() => handleCauseToggle(opt.value)}
                                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                                              on ? "text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                                            }`}
                                            style={{ backgroundColor: on ? opt.color : undefined }}
                                          >
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: on ? "#fff" : opt.color }} />
                                            {opt.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {activeFilterCount > 0 && (
                                    <button
                                      onClick={() => onIncidentFiltersChange({ effects: [], causes: [] })}
                                      className="text-[11px] text-gray-400 hover:text-red-500 flex items-center gap-1"
                                    >
                                      <X className="w-3 h-3" /> Limpiar {activeFilterCount}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Location presets */}
                  {onLocationChange && (
                    <div>
                      <p className="text-[10px] font-mono font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-1">
                        Ir a
                      </p>
                      <div className="grid grid-cols-4 gap-1">
                        {([
                          { preset: "peninsula" as LocationPreset, label: "Peninsu." },
                          { preset: "canarias" as LocationPreset, label: "Canarias" },
                          { preset: "baleares" as LocationPreset, label: "Baleares" },
                          { preset: "portugal" as LocationPreset, label: "Portugal" },
                          { preset: "ceuta" as LocationPreset, label: "Ceuta" },
                          { preset: "melilla" as LocationPreset, label: "Melilla" },
                          { preset: "marruecos" as LocationPreset, label: "Marruecos" },
                        ]).map(({ preset, label }) => (
                          <button
                            key={preset}
                            onClick={() => { onLocationChange(preset); setPanelOpen(false); }}
                            className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-tl-50 dark:hover:bg-tl-900/20 hover:text-tl-700 dark:hover:text-tl-300 transition-colors text-center"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Visualization mode toggle */}
        {onIncidentViewModeChange && (
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {([
              { mode: "heatmap" as const, icon: <Flame className="w-3.5 h-3.5" />, label: "Calor" },
              { mode: "clusters" as const, icon: <Layers className="w-3.5 h-3.5" />, label: "Grupos" },
              { mode: "points" as const, icon: <Circle className="w-3.5 h-3.5" />, label: "Puntos" },
            ]).map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => onIncidentViewModeChange(mode)}
                className={`px-2 py-1.5 flex items-center gap-1 text-xs font-medium transition-colors ${
                  incidentViewMode === mode
                    ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300"
                    : "bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-gray-700"
                }`}
                title={label}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Tools (icon buttons) */}
        <div className="flex items-center gap-0.5">
          <ToolBtn onClick={onTimelineToggle} active={timelineActive} icon={<History className="w-4 h-4" />} title="Timeline 24h" />
          <ToolBtn onClick={onTerrain3DToggle} active={terrain3D} icon={<Mountain className="w-4 h-4" />} title="Terreno 3D" />
          <ToolBtn onClick={onCorridorToggle} active={corridorActive} icon={<Route className="w-4 h-4" />} title="Corredor" />
          <ToolBtn onClick={onFlowToggle} active={flowActive} icon={<Activity className="w-4 h-4" />} title="Flujo" />
          <ToolBtn onClick={onComparatorToggle} active={comparatorActive} icon={<ArrowLeftRight className="w-4 h-4" />} title="Comparador" />
          <ToolBtn onClick={onWeatherRadarToggle} active={weatherRadar} icon={<CloudLightning className="w-4 h-4" />} title="Radar meteo" />
          <ToolBtn onClick={onVoiceToggle} active={voiceEnabled} icon={voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />} title="Voz" activeColor="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" />
          <ToolBtn onClick={onDarkModeToggle} active={darkMode} icon={darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} title={darkMode ? "Mapa claro" : "Mapa oscuro"} />
          <ToolBtn onClick={onSatelliteToggle} active={satellite} icon={<MapIcon className="w-4 h-4" />} title="Satélite" />
          <ToolBtn onClick={onWindOverlayToggle} active={windOverlay} icon={<Wind className="w-4 h-4" />} title="Viento" />
          <ToolBtn onClick={onCloudOverlayToggle} active={cloudOverlay} icon={<CloudRain className="w-4 h-4" />} title="Nubes" />
          <ToolBtn onClick={onDrivingModeToggle} active={drivingMode} icon={<Navigation className="w-4 h-4" />} title="Modo conducción" activeColor="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" />
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

        {/* View mode */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => onViewModeChange("map")}
            className={`p-2 transition-colors ${viewMode === "map" ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300" : "bg-white dark:bg-gray-900 text-gray-400"}`}
            title="Mapa" aria-label="Vista mapa"
          >
            <MapIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={`p-2 transition-colors ${viewMode === "list" ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300" : "bg-white dark:bg-gray-900 text-gray-400"}`}
            title="Lista" aria-label="Vista lista"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          title="Actualizar" aria-label="Actualizar"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>

        {/* Fullscreen */}
        <button
          onClick={onFullscreenToggle}
          className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title={isFullscreen ? "Salir" : "Completa"} aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
