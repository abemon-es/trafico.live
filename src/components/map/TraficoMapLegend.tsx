"use client";

import type { LayerDefinition } from "@/lib/map-layers/types";

interface TraficoMapLegendProps {
  layers: LayerDefinition[];
  activeLayers: string[];
}

/**
 * Compact legend panel — shows colour swatches for all active layers
 * that declare a `legend` array.
 */
export function TraficoMapLegend({ layers, activeLayers }: TraficoMapLegendProps) {
  const visibleLayers = layers.filter(
    (l) => activeLayers.includes(l.id) && l.legend && l.legend.length > 0,
  );

  if (visibleLayers.length === 0) return null;

  return (
    <div className="absolute bottom-8 left-3 z-10 max-w-[220px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl shadow-lg border border-tl-300/20 dark:border-tl-600/20 px-3 py-2">
      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-['DM_Sans']">
        Leyenda
      </p>
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
    </div>
  );
}
