"use client";

import { useState, useEffect } from "react";
import { Layers, ChevronDown, ChevronRight, Sun, Moon } from "lucide-react";
import { GROUP_LABELS, GROUP_ORDER } from "@/lib/map-layers/groups";
import type { LayerDefinition } from "@/lib/map-layers/types";

interface TraficoMapControlsProps {
  availableLayers: LayerDefinition[];
  activeLayers: string[];
  onToggle: (id: string) => void;
  resolvedTheme: "light" | "dark";
  onThemeToggle?: () => void;
  showThemeToggle?: boolean;
  /** Header label. "Capas" by default; "Personalizar" when a lens bar owns
   *  primary layer selection. */
  title?: string;
  /** Drop the panel below a pinned lens bar so they don't overlap. */
  offsetTop?: boolean;
}

/**
 * Floating layer-toggle panel (right side of the map).
 *
 * Groups layers by LayerGroup, each section is collapsible.
 * Checkbox per layer with colour swatch from legend[0].
 */
export function TraficoMapControls({
  availableLayers,
  activeLayers,
  onToggle,
  resolvedTheme,
  onThemeToggle,
  showThemeToggle = true,
  title = "Capas",
  offsetTop = false,
}: TraficoMapControlsProps) {
  // Default collapsed on mobile so the panel doesn't cover the map on load.
  // When a lens bar is present the panel is also collapsed by default on
  // desktop — it's now secondary to the lens selector.
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const narrow =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches;
    if (narrow || offsetTop) setOpen(false);
  }, [offsetTop]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Group layers by their group key, preserving GROUP_ORDER
  const grouped = GROUP_ORDER.reduce<Record<string, LayerDefinition[]>>((acc, groupKey) => {
    const layers = availableLayers.filter((l) => l.group === groupKey);
    if (layers.length > 0) acc[groupKey] = layers;
    return acc;
  }, {});

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  };

  return (
    <div className={`absolute right-3 z-10 w-56 ${offsetTop ? "top-[4.75rem]" : "top-3"}`}>
      {/* Panel toggle header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl shadow-lg border border-tl-300/20 dark:border-tl-600/20 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 transition-colors"
        aria-label={open ? "Ocultar capas del mapa" : "Mostrar capas del mapa"}
        aria-expanded={open}
        aria-controls="trafico-map-layer-panel"
      >
        <span className="flex items-center gap-2 font-semibold text-sm font-['DM_Sans']">
          <Layers className="w-4 h-4 text-tl-600 dark:text-tl-300" aria-hidden />
          {title}
        </span>
        <div className="flex items-center gap-1">
          {showThemeToggle && onThemeToggle && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onThemeToggle(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onThemeToggle(); } }}
              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label={resolvedTheme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              {resolvedTheme === "dark"
                ? <Sun className="w-3.5 h-3.5 text-tl-amber-400" />
                : <Moon className="w-3.5 h-3.5 text-slate-400" />
              }
            </span>
          )}
          {open
            ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden />
            : <ChevronRight className="w-3.5 h-3.5 text-slate-400" aria-hidden />
          }
        </div>
      </button>

      {/* Layer list */}
      {open && (
        <div
          id="trafico-map-layer-panel"
          className="mt-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl shadow-lg border border-tl-300/20 dark:border-tl-600/20 overflow-hidden max-h-[calc(100vh-200px)] overflow-y-auto"
        >
          {Object.entries(grouped).map(([groupKey, layers]) => {
            const isCollapsed = collapsedGroups.has(groupKey);
            const activeCount = layers.filter((l) => activeLayers.includes(l.id)).length;
            const groupPanelId = `trafico-map-group-${groupKey.replace(/\./g, "-")}`;
            const groupLabel = GROUP_LABELS[groupKey] ?? groupKey;

            return (
              <div key={groupKey}>
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-700/50"
                  aria-expanded={!isCollapsed}
                  aria-controls={groupPanelId}
                  aria-label={
                    isCollapsed
                      ? `Mostrar capas de ${groupLabel}`
                      : `Ocultar capas de ${groupLabel}`
                  }
                >
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate text-left font-['DM_Sans']">
                    {groupLabel}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                    {activeCount > 0 && (
                      <span className="text-[9px] bg-tl-600 text-white rounded-full px-1.5 py-0.5 font-['JetBrains_Mono'] tabular-nums">
                        {activeCount}
                      </span>
                    )}
                    {isCollapsed
                      ? <ChevronRight className="w-3 h-3 text-slate-400" aria-hidden />
                      : <ChevronDown className="w-3 h-3 text-slate-400" aria-hidden />
                    }
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="py-1" id={groupPanelId}>
                    {layers.map((layer) => {
                      const isActive = activeLayers.includes(layer.id);
                      const swatchColor = layer.legend?.[0]?.color;

                      return (
                        <label
                          key={layer.id}
                          className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                          title={layer.description}
                        >
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => onToggle(layer.id)}
                            className="sr-only"
                            aria-label={
                              isActive
                                ? `Desactivar capa ${layer.label}`
                                : `Activar capa ${layer.label}`
                            }
                          />
                          {/* Custom checkbox */}
                          <span
                            className={[
                              "inline-flex items-center justify-center w-4 h-4 rounded flex-shrink-0 border transition-colors",
                              isActive
                                ? "bg-tl-600 border-tl-600 dark:bg-tl-400 dark:border-tl-400"
                                : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600",
                            ].join(" ")}
                            aria-hidden
                          >
                            {isActive && (
                              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                                <path
                                  d="M1.5 5.5L4 8l4.5-6"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </span>

                          {swatchColor && (
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: swatchColor }}
                              aria-hidden
                            />
                          )}

                          <span className="text-xs text-slate-700 dark:text-slate-300 leading-tight font-['DM_Sans'] truncate">
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
