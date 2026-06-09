"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon, Play } from "lucide-react";

// MapLibre + protomaps + pmtiles ≈ 260 KB gz. next/dynamic only fetches the
// chunk when the component actually renders, so gating the render gates the
// download: desktop mounts right after hydration (same UX as before), mobile
// waits for an explicit tap. Mobile Lighthouse before this change: perf 61,
// LCP 7.9 s, TTI 9.5 s — the map bundle competing with everything else on a
// throttled connection was the single largest cost.
const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full h-full bg-tl-50 dark:bg-gray-900 animate-pulse flex items-center justify-center"
        aria-hidden
      >
        <div className="text-center">
          <MapIcon className="w-14 h-14 text-tl-200 dark:text-tl-800 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cargando mapa interactivo...</p>
        </div>
      </div>
    ),
  }
);

const MOBILE_QUERY = "(max-width: 767px)";

/**
 * Hero map with device-aware mounting:
 *  - SSR + first paint: static brand panel (cheap, instant LCP).
 *  - Desktop: live map mounts immediately after hydration (unchanged UX).
 *  - Mobile: live map mounts on tap — keeps ~260 KB of map JS off the
 *    critical path for the device class where it hurts most.
 */
export function HeroMapDeferred() {
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (!window.matchMedia(MOBILE_QUERY).matches) {
      setShowMap(true);
    }
  }, []);

  if (showMap) {
    return (
      <TraficoMap
        preset="home"
        controls={{ layerPanel: true, legend: true, themeToggle: true, fullscreen: false }}
        initialView={{ center: [-3.7, 40.4], zoom: 5.5 }}
        className="w-full h-full"
      />
    );
  }

  // Static panel — pure CSS, no images, brand tokens only. Doubles as the
  // mobile tap-to-load surface and the desktop pre-hydration frame.
  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-tl-50 via-white to-tl-100 dark:from-gray-950 dark:via-slate-900 dark:to-tl-950">
      {/* Dot grid suggesting a map */}
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--color-tl-300) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
        aria-hidden
      />
      <button
        type="button"
        onClick={() => setShowMap(true)}
        className="absolute inset-x-0 bottom-8 mx-auto flex w-fit items-center gap-2.5 rounded-full bg-tl-600 px-6 py-3.5 text-white shadow-xl shadow-tl-600/25 active:scale-[0.98] transition-transform md:hidden"
        aria-label="Cargar el mapa interactivo en vivo"
      >
        <span className="relative flex h-2.5 w-2.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full rounded-full bg-tl-amber-400 opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-tl-amber-400" />
        </span>
        <span className="font-semibold text-sm">Ver mapa en vivo</span>
        <Play className="w-4 h-4 fill-current" aria-hidden />
      </button>
    </div>
  );
}
