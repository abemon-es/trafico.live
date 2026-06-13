"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { matchLens, type MapLens } from "@/lib/map-layers/lenses";

interface MapLensBarProps {
  /** The lens set to render (global = all 10, or a vertical's scoped sub-views). */
  lenses: MapLens[];
  activeLayers: string[];
  onSelectLens: (lens: MapLens) => void;
  /** Context-aware accessible name, e.g. "Vistas del mapa de trenes". */
  ariaLabel?: string;
}

/**
 * Pinned, horizontally-scrollable intent selector at the top of the map.
 *
 * One tap swaps the whole map to a coherent layer set (see lenses.ts). The
 * matching lens is highlighted; when the user hand-tunes layers via
 * "Personalizar" a muted "Personalizado" marker shows (custom state).
 *
 * a11y (2026-06-13 panel review): this is a `role="toolbar"` (NOT tablist —
 * the chips control a map canvas, not tabpanels) with roving tabindex +
 * Arrow/Home/End keyboard navigation per the ARIA APG toolbar pattern. Active
 * lens = `aria-pressed`. Lens changes are announced via a live region wired in
 * TraficoMap (the map content changes silently otherwise).
 */
export function MapLensBar({
  lenses,
  activeLayers,
  onSelectLens,
  ariaLabel = "Vistas del mapa",
}: MapLensBarProps) {
  const activeLens = matchLens(activeLayers, lenses);
  const containerRef = useRef<HTMLDivElement>(null);

  // Roving tabindex: exactly one chip is in the tab order at a time. Start on
  // the active lens (or first chip).
  const activeIndex = activeLens
    ? lenses.findIndex((l) => l.id === activeLens.id)
    : 0;
  const [rovingIndex, setRovingIndex] = useState(activeIndex < 0 ? 0 : activeIndex);

  useEffect(() => {
    if (activeIndex >= 0) setRovingIndex(activeIndex);
  }, [activeIndex]);

  function focusChip(i: number) {
    containerRef.current
      ?.querySelectorAll<HTMLButtonElement>("button[data-lens-chip]")
      ?.[i]?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const n = lenses.length;
    let next = rovingIndex;
    switch (e.key) {
      case "ArrowRight": next = (rovingIndex + 1) % n; break;
      case "ArrowLeft": next = (rovingIndex - 1 + n) % n; break;
      case "Home": next = 0; break;
      case "End": next = n - 1; break;
      default: return;
    }
    e.preventDefault();
    setRovingIndex(next);
    focusChip(next);
  }

  return (
    <div className="absolute top-3 left-3 right-3 z-20">
      <div
        ref={containerRef}
        role="toolbar"
        aria-label={ariaLabel}
        aria-orientation="horizontal"
        onKeyDown={handleKeyDown}
        className="flex items-center gap-2 overflow-x-auto rounded-2xl bg-white/92 dark:bg-slate-900/92 backdrop-blur-md shadow-xl shadow-tl-900/10 border border-tl-300/20 dark:border-tl-600/20 p-1.5 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {lenses.map((lens, i) => {
          const Icon = lens.icon;
          const isActive = activeLens?.id === lens.id;
          return (
            <button
              key={lens.id}
              type="button"
              data-lens-chip
              aria-pressed={isActive}
              tabIndex={rovingIndex === i ? 0 : -1}
              onClick={() => {
                setRovingIndex(i);
                onSelectLens(lens);
              }}
              className={[
                "flex items-center gap-1.5 shrink-0 rounded-xl px-3.5 py-2.5 min-h-[44px] min-w-[44px] text-sm font-semibold font-['Exo_2']",
                "transition-[color,background-color,transform] duration-150 ease-in-out motion-safe:active:scale-[0.94]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-500 focus-visible:ring-offset-1",
                isActive
                  ? "bg-tl-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-ink-100 dark:hover:bg-slate-800",
              ].join(" ")}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden />
              {lens.label}
            </button>
          );
        })}

        {/* Custom state: no lens matches the hand-tuned layers. A muted marker
            so the empty-highlight state reads as intentional, not broken. */}
        {!activeLens && (
          <span
            className="flex items-center gap-1.5 shrink-0 rounded-xl px-3 py-2.5 min-h-[44px] text-sm font-semibold font-['Exo_2'] text-tl-600 dark:text-tl-300 bg-tl-50 dark:bg-tl-900/30"
            aria-label="Vista personalizada activa"
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" aria-hidden />
            Personalizado
          </span>
        )}
      </div>
    </div>
  );
}
