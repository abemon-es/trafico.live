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
} from "lucide-react";
import { LayerToggle } from "./LayerToggle";
import type { IncidentEffect, IncidentCause } from "@/lib/parsers/datex2";

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
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  isLoading: boolean;
  onRefresh: () => void;
  viewMode: "map" | "list";
  onViewModeChange: (mode: "map" | "list") => void;
  onLocationChange?: (preset: LocationPreset) => void;
  counts?: {
    v16: number;
    incidents: number;
    cameras: number;
    chargers: number;
    weather: number;
    radars: number;
    riskZones: number;
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
  isFullscreen,
  onFullscreenToggle,
  isLoading,
  onRefresh,
  viewMode,
  onViewModeChange,
  onLocationChange,
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
    <div className={`${isFullscreen ? "bg-white/95 backdrop-blur-sm" : "bg-white"} border-b border-gray-200`}>
      {/* Main toolbar */}
      <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        {/* Left side: Layer toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          <LayerToggle
            label={`V16${counts?.v16 ? ` (${counts.v16})` : ""}`}
            active={activeLayers.v16}
            onClick={() => onLayerToggle("v16")}
            color="red"
            icon={<AlertTriangle className="w-4 h-4" />}
          />

          {/* Incidents with dropdown */}
          <div className="relative" ref={dropdownRef}>
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
                  ? "bg-orange-100 border-orange-500 text-orange-700"
                  : "bg-gray-50 border-gray-300 text-gray-500 hover:bg-gray-100"
                }
              `}
            >
              {activeLayers.incidents && <span className="w-2 h-2 rounded-full bg-orange-500" />}
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
              <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4">
                {/* Toggle incidents layer */}
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-700">Mostrar incidencias</span>
                  <button
                    onClick={() => onLayerToggle("incidents")}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      activeLayers.incidents ? "bg-orange-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        activeLayers.incidents ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Effect filters */}
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Tipo de afección</p>
                  <div className="flex flex-wrap gap-1.5">
                    {EFFECT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleEffectToggle(opt.value)}
                        className={`
                          flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all
                          ${incidentFilters.effects.includes(opt.value)
                            ? "text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Causa</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CAUSE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleCauseToggle(opt.value)}
                        className={`
                          flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all
                          ${incidentFilters.causes.includes(opt.value)
                            ? "text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
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
              label="Cargadores EV"
              active={activeLayers.chargers}
              onClick={() => onLayerToggle("chargers")}
              color="green"
              icon={<Zap className="w-4 h-4" />}
            />
            <LayerToggle
              label="Zonas ZBE"
              active={activeLayers.zbe}
              onClick={() => onLayerToggle("zbe")}
              color="purple"
              icon={<Ban className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-2">
          {/* Location presets */}
          {onLocationChange && (
            <div className="relative" ref={locationDropdownRef}>
              <button
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                title="Ir a ubicación"
              >
                <Navigation className="w-5 h-5" />
                <ChevronDown className={`w-3 h-3 transition-transform ${showLocationDropdown ? "rotate-180" : ""}`} />
              </button>
              {showLocationDropdown && (
                <div className="absolute top-full right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                  <button
                    onClick={() => { onLocationChange("peninsula"); setShowLocationDropdown(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <span className="text-lg">🇪🇸</span> Península
                  </button>
                  <button
                    onClick={() => { onLocationChange("canarias"); setShowLocationDropdown(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <span className="text-lg">🏝️</span> Islas Canarias
                  </button>
                  <button
                    onClick={() => { onLocationChange("ceuta"); setShowLocationDropdown(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <span className="text-lg">🏛️</span> Ceuta
                  </button>
                  <button
                    onClick={() => { onLocationChange("melilla"); setShowLocationDropdown(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <span className="text-lg">🏛️</span> Melilla
                  </button>
                </div>
              )}
            </div>
          )}

          {/* View mode toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => onViewModeChange("map")}
              className={`px-2.5 py-1.5 flex items-center gap-1 text-sm ${
                viewMode === "map"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
              title="Vista mapa"
            >
              <MapIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              className={`px-2.5 py-1.5 flex items-center gap-1 text-sm ${
                viewMode === "list"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
              title="Vista lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={onFullscreenToggle}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
