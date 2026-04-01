"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Camera,
  Zap,
  Ban,
  RefreshCw,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronRight,
  Route,
  MapPin,
  List,
  Map as MapIcon,
  X,
  CloudRain,
  Navigation,
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
  Wrench,
} from "lucide-react";
import { LayerToggle } from "./LayerToggle";
import type { IncidentEffect, IncidentCause } from "@/lib/parsers/datex2";
import type { IncidentViewMode } from "./TrafficMap";

export type LocationPreset = "peninsula" | "canarias" | "ceuta" | "melilla";

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

const EFFECT_OPTIONS: { value: IncidentEffect; label: string; color: string }[] = [
  { value: "ROAD_CLOSED", label: "Carretera cortada", color: "#dc2626" },
  { value: "SLOW_TRAFFIC", label: "Tráfico lento", color: "#f97316" },
  { value: "RESTRICTED", label: "Restringido", color: "#eab308" },
  { value: "DIVERSION", label: "Desvío", color: "#3b82f6" },
  { value: "OTHER_EFFECT", label: "Otro", color: "#6b7280" },
];

const CAUSE_OPTIONS: { value: IncidentCause; label: string; color: string }[] = [
  { value: "ROADWORK", label: "Obras", color: "#d97706" },
  { value: "ACCIDENT", label: "Accidente", color: "#dc2626" },
  { value: "WEATHER", label: "Meteorológico", color: "#2563eb" },
  { value: "RESTRICTION", label: "Restricción", color: "#9333ea" },
  { value: "OTHER_CAUSE", label: "Otra causa", color: "#6b7280" },
];

// Layer metadata for the bottom sheet grid
const LAYER_DEFS: {
  key: keyof ActiveLayers;
  label: string;
  icon: React.ReactNode;
  countKey?: keyof NonNullable<MapControlsProps["counts"]>;
  color: string;
}[] = [
  { key: "incidents",       label: "Incidencias",   icon: <AlertTriangle className="w-5 h-5" />, countKey: "incidents",       color: "text-orange-500 dark:text-orange-400" },
  { key: "v16",             label: "V16",            icon: <AlertTriangle className="w-5 h-5" />, countKey: "v16",             color: "text-red-500 dark:text-red-400" },
  { key: "cameras",         label: "Cámaras",        icon: <Camera className="w-5 h-5" />,        countKey: "cameras",         color: "text-tl-500 dark:text-tl-400" },
  { key: "radars",          label: "Radares",        icon: <Radar className="w-5 h-5" />,         countKey: "radars",          color: "text-tl-amber-500 dark:text-tl-amber-400" },
  { key: "weather",         label: "Alertas",        icon: <CloudRain className="w-5 h-5" />,     countKey: "weather",         color: "text-tl-500 dark:text-tl-400" },
  { key: "riskZones",       label: "Riesgo",         icon: <ShieldAlert className="w-5 h-5" />,   countKey: "riskZones",       color: "text-red-500 dark:text-red-400" },
  { key: "chargers",        label: "Cargadores EV",  icon: <Zap className="w-5 h-5" />,           countKey: "chargers",        color: "text-green-500 dark:text-green-400" },
  { key: "gasStations",     label: "Gasolineras",    icon: <Fuel className="w-5 h-5" />,          countKey: "gasStations",     color: "text-tl-amber-500 dark:text-tl-amber-400" },
  { key: "highways",        label: "Autovías",       icon: <Route className="w-5 h-5" />,         countKey: undefined,         color: "text-cyan-500 dark:text-cyan-400" },
  { key: "provinces",       label: "Provincias",     icon: <MapPin className="w-5 h-5" />,        countKey: undefined,         color: "text-purple-500 dark:text-purple-400" },
  { key: "maritimeStations",label: "Marítimas",      icon: <Anchor className="w-5 h-5" />,        countKey: "maritimeStations",color: "text-tl-500 dark:text-tl-400" },
  { key: "zbe",             label: "Zonas ZBE",      icon: <Ban className="w-5 h-5" />,           countKey: "zbe",             color: "text-purple-500 dark:text-purple-400" },
  { key: "panels",          label: "Paneles",        icon: <Monitor className="w-5 h-5" />,       countKey: "panels",          color: "text-cyan-500 dark:text-cyan-400" },
];

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
  counts,
}: MapControlsProps) {
  // Desktop state
  const [showIncidentDropdown, setShowIncidentDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showMoreLayers, setShowMoreLayers] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  // Mobile sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetView, setSheetView] = useState<"layers" | "tools">("layers");
  const [incidentExpanded, setIncidentExpanded] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close desktop dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowIncidentDropdown(false);
      }
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sheetOpen]);

  const openSheet = (view: "layers" | "tools" = "layers") => {
    setSheetView(view);
    setSheetOpen(true);
  };
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const activeFilterCount = incidentFilters.effects.length + incidentFilters.causes.length;

  const handleEffectToggle = (effect: IncidentEffect) => {
    const newEffects = incidentFilters.effects.includes(effect)
      ? incidentFilters.effects.filter((e) => e !== effect)
      : [...incidentFilters.effects, effect];
    onIncidentFiltersChange({ ...incidentFilters, effects: newEffects });
  };

  const handleCauseToggle = (cause: IncidentCause) => {
    const newCauses = incidentFilters.causes.includes(cause)
      ? incidentFilters.causes.filter((c) => c !== cause)
      : [...incidentFilters.causes, cause];
    onIncidentFiltersChange({ ...incidentFilters, causes: newCauses });
  };

  const clearAllFilters = () => {
    onIncidentFiltersChange({ effects: [], causes: [] });
  };

  // Count active layers
  const activeLayerCount = Object.values(activeLayers).filter(Boolean).length;

  // ─── Tool button helper ───────────────────────────────────────────────────
  const ToolBtn = ({
    onClick,
    active,
    icon,
    label,
    title,
    activeColor = "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300",
  }: {
    onClick?: () => void;
    active?: boolean;
    icon: React.ReactNode;
    label: string;
    title?: string;
    activeColor?: string;
  }) => {
    if (!onClick) return null;
    return (
      <button
        onClick={onClick}
        title={title ?? label}
        aria-label={title ?? label}
        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors min-h-[60px] justify-center
          ${active
            ? activeColor
            : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-tl-50 dark:hover:bg-tl-900/20"
          }`}
      >
        {icon}
        <span className="text-[10px] font-body leading-tight text-center">{label}</span>
        {active && (
          <span className="w-1 h-1 rounded-full bg-tl-500 dark:bg-tl-400" />
        )}
      </button>
    );
  };

  // ─── Desktop incident dropdown ────────────────────────────────────────────
  const IncidentDropdownPanel = () => (
    <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 z-[100] p-4 max-h-[80vh] overflow-y-auto">
      {/* Toggle */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mostrar incidencias</span>
        <button
          onClick={() => onLayerToggle("incidents")}
          className={`relative w-10 h-6 rounded-full transition-all ${
            activeLayers.incidents
              ? "bg-orange-500"
              : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              activeLayers.incidents ? "translate-x-5" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Visualization mode */}
      {activeLayers.incidents && onIncidentViewModeChange && (
        <div className="mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Visualización</p>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {([
              { mode: "heatmap" as IncidentViewMode, label: "Calor", icon: <Flame className="w-3.5 h-3.5" /> },
              { mode: "clusters" as IncidentViewMode, label: "Grupos", icon: <Layers className="w-3.5 h-3.5" /> },
              { mode: "points" as IncidentViewMode, label: "Puntos", icon: <Circle className="w-3.5 h-3.5" /> },
            ] as const).map(({ mode, label, icon }) => (
              <button
                key={mode}
                onClick={() => onIncidentViewModeChange(mode)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors flex-1 justify-center ${
                  incidentViewMode === mode
                    ? "bg-white dark:bg-gray-900 text-orange-600 dark:text-orange-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Effect filters */}
      <div className="mb-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Tipo de afección</p>
        <div className="flex flex-wrap gap-1.5">
          {EFFECT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleEffectToggle(opt.value)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all ${
                incidentFilters.effects.includes(opt.value)
                  ? "text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              style={{
                backgroundColor: incidentFilters.effects.includes(opt.value) ? opt.color : undefined,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: incidentFilters.effects.includes(opt.value) ? "white" : opt.color }}
              />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cause filters */}
      <div className="mb-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Causa</p>
        <div className="flex flex-wrap gap-1.5">
          {CAUSE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleCauseToggle(opt.value)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all ${
                incidentFilters.causes.includes(opt.value)
                  ? "text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              style={{
                backgroundColor: incidentFilters.causes.includes(opt.value) ? opt.color : undefined,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: incidentFilters.causes.includes(opt.value) ? "white" : opt.color }}
              />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <button
          onClick={clearAllFilters}
          className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <X className="w-3 h-3" />
          Limpiar filtros
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          MOBILE COMPACT TOP BAR (hidden on md+)
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        className={`md:hidden ${
          isFullscreen
            ? "bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm"
            : "bg-white dark:bg-gray-900"
        } border-b border-gray-200 dark:border-gray-800`}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Layer count badge + sheet trigger */}
          <button
            onClick={() => openSheet("layers")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-tl-50 dark:bg-tl-900/30 border border-tl-200 dark:border-tl-800 text-tl-700 dark:text-tl-300 min-h-[44px] flex-1"
            aria-label="Abrir capas"
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="text-sm font-body font-medium truncate">
              {activeLayerCount > 0
                ? `${activeLayerCount} capa${activeLayerCount !== 1 ? "s" : ""} activa${activeLayerCount !== 1 ? "s" : ""}`
                : "Capas"}
            </span>
            {activeFilterCount > 0 && (
              <span className="ml-auto shrink-0 bg-orange-500 text-white text-[10px] font-mono px-1.5 py-0.5 rounded-full leading-none">
                {activeFilterCount}
              </span>
            )}
            <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0 opacity-50" />
          </button>

          {/* View mode toggle */}
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
            <button
              onClick={() => onViewModeChange("map")}
              className={`w-11 h-11 flex items-center justify-center transition-colors ${
                viewMode === "map"
                  ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300"
                  : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400"
              }`}
              title="Vista mapa"
              aria-label="Vista mapa"
            >
              <MapIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              className={`w-11 h-11 flex items-center justify-center transition-colors border-l border-gray-200 dark:border-gray-700 ${
                viewMode === "list"
                  ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300"
                  : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400"
              }`}
              title="Vista lista"
              aria-label="Vista lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 shrink-0"
            title="Actualizar"
            aria-label="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          {/* Fullscreen */}
          <button
            onClick={onFullscreenToggle}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          DESKTOP TOOLBAR (hidden below md)
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        className={`hidden md:block ${
          isFullscreen
            ? "bg-white dark:bg-gray-900/95 backdrop-blur-sm"
            : "bg-white dark:bg-gray-900"
        } border-b border-gray-200 dark:border-gray-800`}
      >
        <div className="px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
          {/* Left: Layers */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            <LayerToggle
              label={`V16${counts?.v16 ? ` (${counts.v16})` : ""}`}
              active={activeLayers.v16}
              onClick={() => onLayerToggle("v16")}
              color="red"
              icon={<AlertTriangle className="w-4 h-4" />}
            />

            {/* Incidents with dropdown */}
            <div className="relative z-[110]" ref={dropdownRef}>
              <button
                onClick={() => {
                  if (!activeLayers.incidents) onLayerToggle("incidents");
                  setShowIncidentDropdown(!showIncidentDropdown);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer ${
                  activeLayers.incidents
                    ? "bg-orange-100 dark:bg-orange-900/30 border-orange-500 text-orange-700 dark:text-orange-400"
                    : "bg-gray-50 dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Incidencias{counts?.incidents ? ` (${counts.incidents})` : ""}</span>
                {activeFilterCount > 0 && (
                  <span className="bg-orange-600 text-white text-xs px-1.5 rounded-full leading-none py-0.5">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showIncidentDropdown ? "rotate-180" : ""}`} />
              </button>

              {showIncidentDropdown && <IncidentDropdownPanel />}
            </div>

            <LayerToggle
              label={`Cámaras${counts?.cameras ? ` (${counts.cameras})` : ""}`}
              active={activeLayers.cameras}
              onClick={() => onLayerToggle("cameras")}
              color="blue"
              icon={<Camera className="w-4 h-4" />}
            />

            <LayerToggle
              label="Autovías"
              active={activeLayers.highways}
              onClick={() => onLayerToggle("highways")}
              color="cyan"
              icon={<Route className="w-4 h-4" />}
            />

            <LayerToggle
              label="Provincias"
              active={activeLayers.provinces}
              onClick={() => onLayerToggle("provinces")}
              color="purple"
              icon={<MapPin className="w-4 h-4" />}
            />

            {/* More layers toggle */}
            <button
              onClick={() => setShowMoreLayers(!showMoreLayers)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm font-medium border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Layers className="w-4 h-4" />
              <span>Más</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showMoreLayers ? "rotate-180" : ""}`} />
            </button>

            {/* Extended layers */}
            <div className={`${showMoreLayers ? "flex" : "hidden"} items-center gap-1.5 flex-wrap`}>
              <LayerToggle
                label={`Alertas${counts?.weather ? ` (${counts.weather})` : ""}`}
                active={activeLayers.weather}
                onClick={() => onLayerToggle("weather")}
                color="blue"
                icon={<CloudRain className="w-4 h-4" />}
              />
              <LayerToggle
                label={`Radares${counts?.radars ? ` (${counts.radars})` : ""}`}
                active={activeLayers.radars}
                onClick={() => onLayerToggle("radars")}
                color="yellow"
                icon={<Radar className="w-4 h-4" />}
              />
              <LayerToggle
                label={`Riesgo${counts?.riskZones ? ` (${counts.riskZones})` : ""}`}
                active={activeLayers.riskZones}
                onClick={() => onLayerToggle("riskZones")}
                color="red"
                icon={<ShieldAlert className="w-4 h-4" />}
              />
              <LayerToggle
                label={`Cargadores${counts?.chargers ? ` (${counts.chargers})` : ""}`}
                active={activeLayers.chargers}
                onClick={() => onLayerToggle("chargers")}
                color="green"
                icon={<Zap className="w-4 h-4" />}
              />
              <LayerToggle
                label={`Gasolineras${counts?.gasStations ? ` (${counts.gasStations})` : ""}`}
                active={activeLayers.gasStations}
                onClick={() => onLayerToggle("gasStations")}
                color="orange"
                icon={<Fuel className="w-4 h-4" />}
              />
              <LayerToggle
                label={`Marítimas${counts?.maritimeStations ? ` (${counts.maritimeStations})` : ""}`}
                active={activeLayers.maritimeStations}
                onClick={() => onLayerToggle("maritimeStations")}
                color="blue"
                icon={<Anchor className="w-4 h-4" />}
              />
              <LayerToggle
                label={`ZBE${counts?.zbe ? ` (${counts.zbe})` : ""}`}
                active={activeLayers.zbe}
                onClick={() => onLayerToggle("zbe")}
                color="purple"
                icon={<Ban className="w-4 h-4" />}
              />
              <LayerToggle
                label={`Paneles${counts?.panels ? ` (${counts.panels})` : ""}`}
                active={activeLayers.panels}
                onClick={() => onLayerToggle("panels")}
                color="cyan"
                icon={<Monitor className="w-4 h-4" />}
              />
            </div>
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 shrink-0" />

          {/* Right: Tools */}
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl px-2 py-1">
            {onTimelineToggle && (
              <button
                onClick={onTimelineToggle}
                className={`p-2 rounded-lg transition-colors ${timelineActive ? "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-700"}`}
                title={timelineActive ? "Desactivar línea temporal" : "Línea temporal 24h"}
                aria-label={timelineActive ? "Desactivar línea temporal" : "Línea temporal 24h"}
              >
                <History className="w-5 h-5" />
              </button>
            )}
            {onTerrain3DToggle && (
              <button
                onClick={onTerrain3DToggle}
                className={`p-2 rounded-lg transition-colors ${terrain3D ? "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-700"}`}
                title={terrain3D ? "Desactivar terreno 3D" : "Terreno 3D"}
                aria-label={terrain3D ? "Desactivar terreno 3D" : "Activar terreno 3D"}
              >
                <Mountain className="w-5 h-5" />
              </button>
            )}
            {onCorridorToggle && (
              <button
                onClick={onCorridorToggle}
                className={`p-2 rounded-lg transition-colors ${corridorActive ? "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-700"}`}
                title="Vista corredor"
                aria-label="Vista corredor"
              >
                <Route className="w-5 h-5" />
              </button>
            )}
            {onFlowToggle && (
              <button
                onClick={onFlowToggle}
                className={`p-2 rounded-lg transition-colors ${flowActive ? "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-700"}`}
                title="Flujo de tráfico"
                aria-label="Flujo de tráfico"
              >
                <Activity className="w-5 h-5" />
              </button>
            )}
            {onComparatorToggle && (
              <button
                onClick={onComparatorToggle}
                className={`p-2 rounded-lg transition-colors ${comparatorActive ? "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-700"}`}
                title="Comparador temporal"
                aria-label="Comparador temporal"
              >
                <ArrowLeftRight className="w-5 h-5" />
              </button>
            )}
            {onWeatherRadarToggle && (
              <button
                onClick={onWeatherRadarToggle}
                className={`p-2 rounded-lg transition-colors ${weatherRadar ? "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-700"}`}
                title={weatherRadar ? "Ocultar radar meteorológico" : "Radar meteorológico"}
                aria-label={weatherRadar ? "Ocultar radar meteorológico" : "Radar meteorológico"}
              >
                <CloudLightning className="w-5 h-5" />
              </button>
            )}
            {onVoiceToggle && (
              <button
                onClick={onVoiceToggle}
                className={`p-2 rounded-lg transition-colors ${voiceEnabled ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-700"}`}
                title={voiceEnabled ? "Desactivar alertas de voz" : "Activar alertas de voz"}
                aria-label={voiceEnabled ? "Desactivar alertas de voz" : "Activar alertas de voz"}
              >
                {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            )}
            {onDarkModeToggle && (
              <button
                onClick={onDarkModeToggle}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={darkMode ? "Mapa claro" : "Mapa oscuro"}
                aria-label={darkMode ? "Cambiar a mapa claro" : "Cambiar a mapa oscuro"}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}
          </div>

          {/* Location presets */}
          {onLocationChange && (
            <div className="relative" ref={locationDropdownRef}>
              <button
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1"
                title="Ir a ubicación"
                aria-label="Ir a ubicación"
              >
                <Navigation className="w-5 h-5" />
                <ChevronDown className={`w-3 h-3 transition-transform ${showLocationDropdown ? "rotate-180" : ""}`} />
              </button>
              {showLocationDropdown && (
                <div className="absolute top-full right-0 mt-2 w-44 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 z-[100] py-1">
                  {[
                    { preset: "peninsula" as const, label: "Península", emoji: "🇪🇸" },
                    { preset: "canarias" as const, label: "Islas Canarias", emoji: "🏝️" },
                    { preset: "ceuta" as const, label: "Ceuta", emoji: "🏛️" },
                    { preset: "melilla" as const, label: "Melilla", emoji: "🏛️" },
                  ].map(({ preset, label, emoji }) => (
                    <button
                      key={preset}
                      onClick={() => { onLocationChange(preset); setShowLocationDropdown(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors"
                    >
                      <span className="text-base">{emoji}</span> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* View mode toggle */}
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <button
              onClick={() => onViewModeChange("map")}
              className={`px-2.5 py-1.5 flex items-center gap-1 text-sm transition-colors ${
                viewMode === "map"
                  ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
              title="Vista mapa"
              aria-label="Vista mapa"
            >
              <MapIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              className={`px-2.5 py-1.5 flex items-center gap-1 text-sm border-l border-gray-200 dark:border-gray-800 transition-colors ${
                viewMode === "list"
                  ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
              title="Vista lista"
              aria-label="Vista lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            title="Actualizar"
            aria-label="Actualizar datos"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          {/* Fullscreen */}
          <button
            onClick={onFullscreenToggle}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MOBILE BOTTOM SHEET + BACKDROP (rendered in place, md:hidden)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden">
        {/* Backdrop */}
        <div
          ref={backdropRef}
          onClick={closeSheet}
          className={`fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm transition-opacity motion-reduce:transition-none ${
            sheetOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          aria-hidden="true"
        />

        {/* Sheet panel */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label={sheetView === "layers" ? "Capas del mapa" : "Herramientas del mapa"}
          className={`fixed bottom-0 left-0 right-0 z-[210] bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl
            flex flex-col max-h-[85dvh]
            transition-transform duration-300 ease-out motion-reduce:transition-none
            ${sheetOpen ? "translate-y-0" : "translate-y-full"}`}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>

          {/* Sheet header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
            {/* Tab switcher */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button
                onClick={() => setSheetView("layers")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-body font-medium transition-colors ${
                  sheetView === "layers"
                    ? "bg-white dark:bg-gray-900 text-tl-700 dark:text-tl-300 shadow-sm"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Capas</span>
              </button>
              <button
                onClick={() => setSheetView("tools")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-body font-medium transition-colors ${
                  sheetView === "tools"
                    ? "bg-white dark:bg-gray-900 text-tl-700 dark:text-tl-300 shadow-sm"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>Herramientas</span>
              </button>
            </div>

            {/* Close button */}
            <button
              onClick={closeSheet}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Cerrar panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── LAYERS VIEW ─────────────────────────────────────────── */}
          {sheetView === "layers" && (
            <div className="overflow-y-auto flex-1 px-4 py-4 space-y-5">
              {/* Layer grid */}
              <div>
                <p className="text-xs font-mono font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                  Capas del mapa
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {LAYER_DEFS.map((def) => {
                    const isActive = activeLayers[def.key];
                    const count = def.countKey ? counts?.[def.countKey] : undefined;
                    const isIncidents = def.key === "incidents";

                    return (
                      <div key={def.key} className="flex flex-col">
                        <button
                          onClick={() => {
                            onLayerToggle(def.key);
                            if (isIncidents && !activeLayers.incidents) {
                              setIncidentExpanded(true);
                            }
                          }}
                          className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-colors min-h-[56px] ${
                            isActive
                              ? "bg-tl-50 dark:bg-tl-900/20 border-tl-300 dark:border-tl-700"
                              : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                          }`}
                        >
                          {/* Icon */}
                          <span className={`shrink-0 ${isActive ? def.color : "text-gray-400 dark:text-gray-500"}`}>
                            {def.icon}
                          </span>

                          {/* Name + count */}
                          <div className="flex-1 min-w-0 text-left">
                            <span className={`text-sm font-body font-medium leading-tight block truncate ${
                              isActive ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"
                            }`}>
                              {def.label}
                            </span>
                            {count != null && count > 0 && (
                              <span className={`text-xs font-mono ${isActive ? "text-tl-600 dark:text-tl-400" : "text-gray-400 dark:text-gray-500"}`}>
                                {count}
                              </span>
                            )}
                          </div>

                          {/* Expand arrow for incidents */}
                          {isIncidents && isActive && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setIncidentExpanded(!incidentExpanded); }}
                              className="shrink-0 text-gray-400 dark:text-gray-500 p-1 -mr-1"
                              aria-label={incidentExpanded ? "Ocultar filtros" : "Mostrar filtros"}
                            >
                              <ChevronDown className={`w-4 h-4 transition-transform motion-reduce:transition-none ${incidentExpanded ? "rotate-180" : ""}`} />
                            </button>
                          )}

                          {/* Active dot */}
                          {isActive && !isIncidents && (
                            <span className="shrink-0 w-2 h-2 rounded-full bg-tl-500 dark:bg-tl-400" />
                          )}
                        </button>

                        {/* Incident expanded sub-filters */}
                        {isIncidents && isActive && incidentExpanded && (
                          <div className="mt-1 px-3 py-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/50 rounded-xl space-y-3">
                            {/* Visualization mode */}
                            {onIncidentViewModeChange && (
                              <div>
                                <p className="text-[10px] font-mono font-medium text-orange-600 dark:text-orange-500 uppercase tracking-wider mb-1.5">
                                  Visualización
                                </p>
                                <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/20 rounded-lg p-0.5">
                                  {([
                                    { mode: "heatmap" as IncidentViewMode, label: "Calor", icon: <Flame className="w-3 h-3" /> },
                                    { mode: "clusters" as IncidentViewMode, label: "Grupos", icon: <Layers className="w-3 h-3" /> },
                                    { mode: "points" as IncidentViewMode, label: "Puntos", icon: <Circle className="w-3 h-3" /> },
                                  ] as const).map(({ mode, label, icon }) => (
                                    <button
                                      key={mode}
                                      onClick={() => onIncidentViewModeChange(mode)}
                                      className={`flex items-center gap-1 px-2 py-1.5 rounded text-[11px] font-medium flex-1 justify-center transition-colors ${
                                        incidentViewMode === mode
                                          ? "bg-white dark:bg-gray-900 text-orange-600 dark:text-orange-400 shadow-sm"
                                          : "text-orange-700 dark:text-orange-400"
                                      }`}
                                    >
                                      {icon}
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Effect chips */}
                            <div>
                              <p className="text-[10px] font-mono font-medium text-orange-600 dark:text-orange-500 uppercase tracking-wider mb-1.5">
                                Afección
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {EFFECT_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.value}
                                    onClick={() => handleEffectToggle(opt.value)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                                      incidentFilters.effects.includes(opt.value) ? "text-white" : "bg-white/70 dark:bg-gray-800/70 text-gray-600 dark:text-gray-400"
                                    }`}
                                    style={{ backgroundColor: incidentFilters.effects.includes(opt.value) ? opt.color : undefined }}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: incidentFilters.effects.includes(opt.value) ? "white" : opt.color }} />
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Cause chips */}
                            <div>
                              <p className="text-[10px] font-mono font-medium text-orange-600 dark:text-orange-500 uppercase tracking-wider mb-1.5">
                                Causa
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {CAUSE_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.value}
                                    onClick={() => handleCauseToggle(opt.value)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                                      incidentFilters.causes.includes(opt.value) ? "text-white" : "bg-white/70 dark:bg-gray-800/70 text-gray-600 dark:text-gray-400"
                                    }`}
                                    style={{ backgroundColor: incidentFilters.causes.includes(opt.value) ? opt.color : undefined }}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: incidentFilters.causes.includes(opt.value) ? "white" : opt.color }} />
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {activeFilterCount > 0 && (
                              <button
                                onClick={clearAllFilters}
                                className="flex items-center gap-1 text-[11px] text-orange-600 dark:text-orange-500 hover:text-orange-800 dark:hover:text-orange-300"
                              >
                                <X className="w-3 h-3" />
                                Limpiar filtros
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── TOOLS VIEW ──────────────────────────────────────────── */}
          {sheetView === "tools" && (
            <div className="overflow-y-auto flex-1 px-4 py-4 space-y-5">
              {/* Tools grid */}
              <div>
                <p className="text-xs font-mono font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                  Herramientas
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <ToolBtn onClick={onTimelineToggle} active={timelineActive} icon={<History className="w-5 h-5" />} label="Temporal" />
                  <ToolBtn onClick={onTerrain3DToggle} active={terrain3D} icon={<Mountain className="w-5 h-5" />} label="Terreno 3D" />
                  <ToolBtn onClick={onCorridorToggle} active={corridorActive} icon={<Route className="w-5 h-5" />} label="Corredor" />
                  <ToolBtn onClick={onFlowToggle} active={flowActive} icon={<Activity className="w-5 h-5" />} label="Flujo" />
                  <ToolBtn onClick={onComparatorToggle} active={comparatorActive} icon={<ArrowLeftRight className="w-5 h-5" />} label="Comparar" />
                  <ToolBtn onClick={onWeatherRadarToggle} active={weatherRadar} icon={<CloudLightning className="w-5 h-5" />} label="Radar" />
                  <ToolBtn
                    onClick={onVoiceToggle}
                    active={voiceEnabled}
                    icon={voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    label="Voz"
                    activeColor="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  />
                  <ToolBtn
                    onClick={onDarkModeToggle}
                    active={darkMode}
                    icon={darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    label={darkMode ? "Mapa claro" : "Mapa oscuro"}
                    activeColor="bg-gray-800 text-gray-100"
                  />
                </div>
              </div>

              {/* Location presets */}
              {onLocationChange && (
                <div>
                  <p className="text-xs font-mono font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                    Ir a
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { preset: "peninsula" as const, label: "Península", emoji: "🇪🇸" },
                      { preset: "canarias" as const, label: "Islas Canarias", emoji: "🏝️" },
                      { preset: "ceuta" as const, label: "Ceuta", emoji: "🏛️" },
                      { preset: "melilla" as const, label: "Melilla", emoji: "🏛️" },
                    ].map(({ preset, label, emoji }) => (
                      <button
                        key={preset}
                        onClick={() => { onLocationChange(preset); closeSheet(); }}
                        className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-tl-50 dark:hover:bg-tl-900/20 hover:border-tl-300 dark:hover:border-tl-700 transition-colors min-h-[52px]"
                      >
                        <span className="text-xl">{emoji}</span>
                        <span className="text-sm font-body font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Safe area spacer */}
          <div className="h-safe-area-inset-bottom shrink-0 pb-4" />
        </div>
      </div>
    </>
  );
}
