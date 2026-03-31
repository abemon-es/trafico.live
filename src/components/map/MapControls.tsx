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
  counts,
}: MapControlsProps) {
  const [showIncidentDropdown, setShowIncidentDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
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

  return (
    <div className={`${isFullscreen ? "bg-white dark:bg-gray-900/95 backdrop-blur-sm" : "bg-white dark:bg-gray-900"} border-b border-gray-200 dark:border-gray-800`}>
      {/* Main toolbar */}
      <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        {/* Left side: Layer toggles */}
        <div className="flex items-center gap-2 flex-wrap flex-1">
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
                if (!activeLayers.incidents) {
                  onLayerToggle("incidents");
                }
                setShowIncidentDropdown(!showIncidentDropdown);
              }}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                border transition-all cursor-pointer
                ${activeLayers.incidents
                  ? "bg-orange-100 dark:bg-orange-900/30 border-orange-500 text-orange-700 dark:text-orange-400"
                  : "bg-gray-50 dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-900"
                }
              `}
            >
              {activeLayers.incidents && <span className="w-2 h-2 rounded-full bg-orange-50 dark:bg-orange-900/200" />}
              <AlertTriangle className="w-4 h-4" />
              <span>Incidencias{counts?.incidents ? ` (${counts.incidents})` : ""}</span>
              {activeFilterCount > 0 && (
                <span className="bg-orange-600 text-white text-xs px-1.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${showIncidentDropdown ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown */}
            {showIncidentDropdown && (
              <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 z-[100] p-4 max-h-[80vh] overflow-y-auto">
                {/* Toggle incidents layer */}
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mostrar incidencias</span>
                  <button
                    onClick={() => onLayerToggle("incidents")}
                    className={`relative w-10 h-6 rounded-full transition-all ${
                      activeLayers.incidents
                        ? "bg-orange-50 dark:bg-orange-900/200 shadow-inner"
                        : "bg-gray-200 ring-1 ring-inset ring-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white dark:bg-gray-900 rounded-full transition-transform ${
                        activeLayers.incidents ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Visualization mode toggle */}
                {activeLayers.incidents && onIncidentViewModeChange && (
                  <div className="mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Visualización</p>
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
                      <button
                        onClick={() => onIncidentViewModeChange("heatmap")}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                          incidentViewMode === "heatmap"
                            ? "bg-white dark:bg-gray-900 text-orange-600 dark:text-orange-400 shadow-sm"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100"
                        }`}
                        title="Mapa de calor"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>Calor</span>
                      </button>
                      <button
                        onClick={() => onIncidentViewModeChange("clusters")}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                          incidentViewMode === "clusters"
                            ? "bg-white dark:bg-gray-900 text-orange-600 dark:text-orange-400 shadow-sm"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100"
                        }`}
                        title="Agrupar"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Grupos</span>
                      </button>
                      <button
                        onClick={() => onIncidentViewModeChange("points")}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                          incidentViewMode === "points"
                            ? "bg-white dark:bg-gray-900 text-orange-600 dark:text-orange-400 shadow-sm"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100"
                        }`}
                        title="Puntos individuales"
                      >
                        <Circle className="w-3.5 h-3.5" />
                        <span>Puntos</span>
                      </button>
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
                        className={`
                          flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all
                          ${incidentFilters.effects.includes(opt.value)
                            ? "text-white"
                            : "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                          }
                        `}
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
                        className={`
                          flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all
                          ${incidentFilters.causes.includes(opt.value)
                            ? "text-white"
                            : "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                          }
                        `}
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

                {/* Clear all */}
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
                  >
                    <X className="w-3 h-3" />
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
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

          {/* More layers (collapsible on mobile) */}
          <div className="hidden sm:flex items-center gap-2">
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
              label={`Zonas riesgo${counts?.riskZones ? ` (${counts.riskZones})` : ""}`}
              active={activeLayers.riskZones}
              onClick={() => onLayerToggle("riskZones")}
              color="red"
              icon={<ShieldAlert className="w-4 h-4" />}
            />
            <LayerToggle
              label={`Cargadores EV${counts?.chargers ? ` (${counts.chargers})` : ""}`}
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
              label={`Zonas ZBE${counts?.zbe ? ` (${counts.zbe})` : ""}`}
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

        {/* Right side: Actions */}
        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          {onDarkModeToggle && (
            <button
              onClick={onDarkModeToggle}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={darkMode ? "Mapa claro" : "Mapa oscuro"}
              aria-label={darkMode ? "Cambiar a mapa claro" : "Cambiar a mapa oscuro"}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          )}

          {/* Location presets */}
          {onLocationChange && (
            <div className="relative" ref={locationDropdownRef}>
              <button
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-gray-900 rounded-lg transition-colors flex items-center gap-1"
                title="Ir a ubicación"
                aria-label="Ir a ubicación"
              >
                <Navigation className="w-5 h-5" />
                <ChevronDown className={`w-3 h-3 transition-transform ${showLocationDropdown ? "rotate-180" : ""}`} />
              </button>
              {showLocationDropdown && (
                <div className="absolute top-full right-0 mt-2 w-44 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 z-[100] py-1">
                  <button
                    onClick={() => { onLocationChange("peninsula"); setShowLocationDropdown(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-gray-900 flex items-center gap-2"
                  >
                    <span className="text-lg">🇪🇸</span> Península
                  </button>
                  <button
                    onClick={() => { onLocationChange("canarias"); setShowLocationDropdown(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-gray-900 flex items-center gap-2"
                  >
                    <span className="text-lg">🏝️</span> Islas Canarias
                  </button>
                  <button
                    onClick={() => { onLocationChange("ceuta"); setShowLocationDropdown(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-gray-900 flex items-center gap-2"
                  >
                    <span className="text-lg">🏛️</span> Ceuta
                  </button>
                  <button
                    onClick={() => { onLocationChange("melilla"); setShowLocationDropdown(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-gray-900 flex items-center gap-2"
                  >
                    <span className="text-lg">🏛️</span> Melilla
                  </button>
                </div>
              )}
            </div>
          )}

          {/* View mode toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <button
              onClick={() => onViewModeChange("map")}
              className={`px-2.5 py-1.5 flex items-center gap-1 text-sm ${
                viewMode === "map"
                  ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-950"
              }`}
              title="Vista mapa"
              aria-label="Vista mapa"
            >
              <MapIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              className={`px-2.5 py-1.5 flex items-center gap-1 text-sm ${
                viewMode === "list"
                  ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-950"
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
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-gray-900 rounded-lg transition-colors disabled:opacity-50"
            title="Actualizar"
            aria-label="Actualizar datos"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={onFullscreenToggle}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-gray-900 rounded-lg transition-colors"
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
