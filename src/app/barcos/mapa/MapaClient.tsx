"use client";

import { useState } from "react";
import { defaultLensLayers } from "@/lib/map-layers/lenses";
import dynamic from "next/dynamic";
import { Ship, Filter } from "lucide-react";
import { LivePanel } from "@/components/maritime/LivePanel";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-tl-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Ship className="mx-auto mb-3 h-10 w-10 animate-pulse text-tl-300" />
          <p className="font-['DM_Sans'] text-sm text-tl-500">Cargando tracker de buques…</p>
        </div>
      </div>
    ),
  },
);

type Category = "all" | "passenger" | "cargo" | "tanker" | "fishing" | "other";

// Scaffold: filter state wired into UI; tile-level filtering arrives in S2.
export function MapaClient() {
  const [category, setCategory] = useState<Category>("all");
  const [selectedMmsi, setSelectedMmsi] = useState<number | null>(null);

  return (
    <div className="relative h-[calc(100dvh-64px)] w-full">
      <TraficoMap
        initialLayers={defaultLensLayers("maritimo")}
        controls={{ lensBar: "maritimo",
          layerPanel: true,
          legend: true,
          themeToggle: true,
          fullscreen: true,
        }}
        syncUrl
        initialView={{ center: [-4.0, 38.5], zoom: 5.4 }}
        className="h-full w-full"
      />
      <p className="sr-only">Mapa interactivo de buques en tiempo real.</p>

      <FilterPanel category={category} setCategory={setCategory} />

      {/* Demo selection handle — real click wiring via TraficoMap events in S2 */}
      <button
        onClick={() => setSelectedMmsi(selectedMmsi ? null : 224_000_000)}
        className="absolute bottom-6 left-4 z-20 rounded-lg bg-tl-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-tl-700"
      >
        {selectedMmsi ? "Cerrar ficha demo" : "Ver ficha demo"}
      </button>

      <LivePanel mmsi={selectedMmsi} onClose={() => setSelectedMmsi(null)} />
    </div>
  );
}

function FilterPanel({
  category,
  setCategory,
}: {
  category: Category;
  setCategory: (v: Category) => void;
}) {
  const options: { value: Category; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "passenger", label: "Pasajeros" },
    { value: "cargo", label: "Carga" },
    { value: "tanker", label: "Petrolero" },
    { value: "fishing", label: "Pesca" },
    { value: "other", label: "Otros" },
  ];

  return (
    <div className="absolute left-4 top-4 z-20 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-tl-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mb-3 flex items-center gap-2 text-tl-700 dark:text-tl-200">
        <Filter className="h-4 w-4" />
        <span className="font-['Exo_2'] text-sm font-semibold">Filtros</span>
      </div>

      <fieldset className="text-xs">
        <legend className="mb-2 font-medium text-slate-700 dark:text-slate-300">Categoría</legend>
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCategory(opt.value)}
              className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                category === opt.value
                  ? "bg-tl-600 text-white"
                  : "bg-tl-50 text-slate-700 hover:bg-tl-100 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>

      <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
        Filtrado completo en S2. Hoy: indicadores visuales.
      </p>
    </div>
  );
}
