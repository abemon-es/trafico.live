"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import type { LayerDefinition } from "@/lib/map-layers/types";

interface TraficoMapLegendProps {
  layers: LayerDefinition[];
  activeLayers: string[];
}

/**
 * Compact legend panel — shows colour swatches for all active layers
 * that declare a `legend` array.
 *
 * Mobile: collapsed by default (small "Leyenda" pill). Desktop: expanded.
 * Tap toggles. Keeps map viewport free on small screens where many active
 * layers can push the legend past the viewport height.
 */
export function TraficoMapLegend({ layers, activeLayers }: TraficoMapLegendProps) {
  const visibleLayers = layers.filter(
    (l) => activeLayers.includes(l.id) && l.legend && l.legend.length > 0,
  );

  // Collapsed on mobile by default; expanded on >= md.
  const [collapsedMobile, setCollapsedMobile] = useState(true);

  if (visibleLayers.length === 0) return null;

  return (
    <div className="absolute bottom-8 left-3 z-10">
      {/* Mobile: compact pill that expands on tap */}
      <div className="md:hidden">
        {collapsedMobile ? (
          <button
            type="button"
            onClick={() => setCollapsedMobile(false)}
            aria-label="Mostrar leyenda"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-lg border border-tl-300/20 dark:border-tl-600/20 text-[11px] font-semibold text-slate-600 dark:text-slate-300 font-['DM_Sans']"
          >
            <Info className="w-3 h-3" aria-hidden />
            Leyenda
            <ChevronUp className="w-3 h-3 opacity-60" aria-hidden />
          </button>
        ) : (
          <div className="max-w-[80vw] max-h-[60vh] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-tl-300/20 dark:border-tl-600/20 px-3 py-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-['DM_Sans']">
                Leyenda
              </p>
              <button
                type="button"
                onClick={() => setCollapsedMobile(true)}
                aria-label="Ocultar leyenda"
                className="p-0.5 -mr-1 rounded text-slate-400 hover:text-slate-600"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <LegendBody visibleLayers={visibleLayers} />
          </div>
        )}
      </div>

      {/* Desktop: always-on panel, capped height so very-many-layers scrolls */}
      <div className="hidden md:block max-w-[220px] max-h-[70vh] overflow-y-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl shadow-lg border border-tl-300/20 dark:border-tl-600/20 px-3 py-2">
        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-['DM_Sans']">
          Leyenda
        </p>
        <LegendBody visibleLayers={visibleLayers} />
      </div>
    </div>
  );
}

function LegendBody({ visibleLayers }: { visibleLayers: LayerDefinition[] }) {
  return (
    <div className="space-y-2">
      {visibleLayers.map((layer) => (
        <div key={layer.id}>
          <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 mb-1 font-['DM_Sans']">
            {layer.label}
          </p>
          <div className="space-y-0.5">
            {layer.legend!.map((entry) => (
              <div key={entry.label} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                  aria-hidden
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none font-['DM_Sans']">
                  {entry.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
