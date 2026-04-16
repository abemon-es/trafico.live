"use client";

import { useState } from "react";
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Car,
  Train,
  Bus,
  Ship,
  Plane,
  Zap,
  Radio,
} from "lucide-react";

export interface LayerItem {
  id: string;
  label: string;
  defaultOn: boolean;
}

export interface LayerGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  layers: LayerItem[];
}

export const LAYER_GROUPS: LayerGroup[] = [
  {
    id: "roads",
    label: "Carreteras",
    icon: Car,
    layers: [
      { id: "incidents-circle", label: "Incidencias", defaultOn: true },
      { id: "roadworks-circle", label: "Obras", defaultOn: false },
      { id: "sensors-circle", label: "Sensores Madrid", defaultOn: false },
      { id: "radars-circle", label: "Radares", defaultOn: false },
      { id: "gas-stations-circle", label: "Gasolineras", defaultOn: false },
      { id: "road-segments-line", label: "IMD carreteras", defaultOn: false },
      { id: "roads-traffic", label: "Tráfico en vivo", defaultOn: false },
    ],
  },
  {
    id: "rail",
    label: "Ferrocarril",
    icon: Train,
    layers: [
      { id: "railway-routes-line", label: "Líneas ferroviarias", defaultOn: true },
      { id: "railway-stations-circle", label: "Estaciones", defaultOn: true },
      { id: "fleet-circle", label: "Trenes en vivo", defaultOn: true },
    ],
  },
  {
    id: "transit",
    label: "Transporte público",
    icon: Bus,
    layers: [
      { id: "transit-routes-line", label: "Líneas de bus/metro", defaultOn: false },
      { id: "transit-stops-circle", label: "Paradas", defaultOn: false },
    ],
  },
  {
    id: "maritime",
    label: "Marítimo",
    icon: Ship,
    layers: [
      { id: "eez-fill", label: "Zonas marítimas (ZEE)", defaultOn: false },
      { id: "ports-circle", label: "Puertos", defaultOn: false },
      { id: "ferry-routes-line", label: "Rutas de ferry", defaultOn: false },
      { id: "ferry-stops-circle", label: "Terminales ferry", defaultOn: false },
      { id: "vessels-circle", label: "Barcos en vivo", defaultOn: false },
      { id: "emergencies-circle", label: "Emergencias SASEMAR", defaultOn: false },
    ],
  },
  {
    id: "aviation",
    label: "Aviación",
    icon: Plane,
    layers: [
      { id: "airports-circle", label: "Aeropuertos", defaultOn: false },
      { id: "aircraft-circle", label: "Aviones en vivo", defaultOn: false },
    ],
  },
  {
    id: "infra",
    label: "Infraestructura",
    icon: Zap,
    layers: [
      { id: "chargers-circle", label: "Cargadores EV", defaultOn: false },
      { id: "stations-circle", label: "Estaciones aforo", defaultOn: false },
      { id: "climate-stations-circle", label: "Est. climáticas", defaultOn: false },
      { id: "air-quality-circle", label: "Calidad del aire", defaultOn: false },
      { id: "panels-circle", label: "Paneles variables", defaultOn: false },
    ],
  },
];

// Build initial visibility state from defaults
export function buildDefaultVisibility(): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const group of LAYER_GROUPS) {
    for (const layer of group.layers) {
      state[layer.id] = layer.defaultOn;
    }
  }
  return state;
}

interface LayerPanelProps {
  visibility: Record<string, boolean>;
  onToggle: (layerId: string, visible: boolean) => void;
}

export function LayerPanel({ visibility, onToggle }: LayerPanelProps) {
  const [open, setOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(LAYER_GROUPS.map((g) => [g.id, g.id === "roads" || g.id === "rail"]))
  );

  function toggleGroup(id: string) {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const activeCount = Object.values(visibility).filter(Boolean).length;

  return (
    <div
      className="absolute top-3 left-3 z-10 select-none"
      style={{ maxHeight: "calc(100dvh - 120px)", display: "flex", flexDirection: "column" }}
    >
      {/* Header toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium shadow-lg"
        style={{
          background: "rgba(15,23,42,0.88)",
          backdropFilter: "blur(8px)",
          color: "#e2e8f0",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Layers className="w-4 h-4 text-tl-300" />
        <span>Capas</span>
        {activeCount > 0 && (
          <span
            className="text-xs font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: "#1b4bd5", color: "#fff" }}
          >
            {activeCount}
          </span>
        )}
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 ml-auto opacity-60" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />
        )}
      </button>

      {/* Accordion panel */}
      {open && (
        <div
          className="mt-1 rounded-xl overflow-y-auto"
          style={{
            background: "rgba(15,23,42,0.88)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#e2e8f0",
            width: 220,
            flex: "1 1 auto",
            minHeight: 0,
          }}
        >
          {LAYER_GROUPS.map((group) => {
            const Icon = group.icon;
            const isExpanded = expandedGroups[group.id];
            const activeInGroup = group.layers.filter((l) => visibility[l.id]).length;

            return (
              <div key={group.id} className="border-b last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-white/5 transition-colors"
                  style={{ letterSpacing: "0.06em", color: "#94a3b8" }}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: "#7da4f0" }} />
                  <span className="flex-1 text-left">{group.label}</span>
                  {activeInGroup > 0 && (
                    <span className="text-xs font-bold" style={{ color: "#7da4f0" }}>
                      {activeInGroup}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 opacity-40" />
                  ) : (
                    <ChevronRight className="w-3 h-3 opacity-40" />
                  )}
                </button>

                {/* Layer items */}
                {isExpanded && (
                  <div className="pb-1">
                    {group.layers.map((layer) => {
                      const on = visibility[layer.id] ?? false;
                      return (
                        <label
                          key={layer.id}
                          className="flex items-center gap-2.5 px-4 py-1.5 cursor-pointer hover:bg-white/5 transition-colors"
                        >
                          {/* Toggle switch */}
                          <button
                            role="switch"
                            aria-checked={on}
                            onClick={() => onToggle(layer.id, !on)}
                            className="shrink-0 relative rounded-full transition-colors"
                            style={{
                              width: 28,
                              height: 16,
                              background: on ? "#1b4bd5" : "rgba(255,255,255,0.15)",
                            }}
                          >
                            <span
                              className="absolute top-0.5 rounded-full transition-transform"
                              style={{
                                width: 12,
                                height: 12,
                                background: "#fff",
                                left: on ? 14 : 2,
                                transition: "left 0.15s ease",
                              }}
                            />
                          </button>
                          <span
                            className="text-xs leading-tight"
                            style={{ color: on ? "#e2e8f0" : "#64748b" }}
                          >
                            {layer.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
