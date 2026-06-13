"use client";

import { MAP_LENSES, matchLens, type MapLens } from "@/lib/map-layers/lenses";

interface MapLensBarProps {
  activeLayers: string[];
  onSelectLens: (lens: MapLens) => void;
}

/**
 * Pinned, horizontally-scrollable intent selector at the top of the map.
 *
 * One tap swaps the whole map to a coherent layer set (see lenses.ts). The
 * matching lens is highlighted; when the user hand-tunes layers via
 * "Personalizar" no chip is active (custom state). This is the primary map
 * control on mobile — the layer panel is demoted to power-user fine-tuning.
 */
export function MapLensBar({ activeLayers, onSelectLens }: MapLensBarProps) {
  const activeLens = matchLens(activeLayers);

  return (
    <div className="absolute top-3 left-3 right-3 z-20">
      <div
        role="tablist"
        aria-label="¿Qué quieres ver en el mapa?"
        className="flex items-center gap-1.5 overflow-x-auto rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-lg border border-tl-300/20 dark:border-tl-600/20 p-1.5 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {MAP_LENSES.map((lens) => {
          const Icon = lens.icon;
          const isActive = activeLens?.id === lens.id;
          return (
            <button
              key={lens.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectLens(lens)}
              className={[
                "flex items-center gap-1.5 shrink-0 rounded-xl px-3.5 py-2.5 min-h-[44px] text-sm font-semibold font-['Exo_2'] transition-colors",
                isActive
                  ? "bg-tl-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
              ].join(" ")}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden />
              {lens.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
