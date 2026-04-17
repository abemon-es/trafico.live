"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plane, Filter } from "lucide-react";
import { LivePanel } from "@/components/aviation/LivePanel";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-tl-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Plane className="mx-auto mb-3 h-10 w-10 animate-pulse text-tl-300" />
          <p className="font-['DM_Sans'] text-sm text-tl-500">Cargando tracker aéreo…</p>
        </div>
      </div>
    ),
  },
);

type Airline = "all" | "iberia" | "vueling" | "ryanair" | "airEuropa" | "binter";
type AircraftKind = "all" | "jet" | "turboprop" | "helicopter";

// Scaffold: filter state wired into UI; tile-level filtering arrives in S2.
export function MapaClient() {
  const [airline, setAirline] = useState<Airline>("all");
  const [altitudeMax, setAltitudeMax] = useState(12000);
  const [kind, setKind] = useState<AircraftKind>("all");
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="relative h-[calc(100dvh-64px)] w-full">
      <TraficoMap
        preset="aviacion"
        controls={{
          layerPanel: true,
          legend: true,
          themeToggle: true,
          fullscreen: true,
        }}
        syncUrl
        initialView={{ center: [-3.7, 40.4], zoom: 5.5 }}
        className="h-full w-full"
      />
      <p className="sr-only">Mapa interactivo de vuelos en tiempo real.</p>

      <FilterPanel
        airline={airline}
        setAirline={setAirline}
        altitudeMax={altitudeMax}
        setAltitudeMax={setAltitudeMax}
        kind={kind}
        setKind={setKind}
      />

      {/* Demo selection handle — real click wiring via TraficoMap events in S2 */}
      <button
        onClick={() => setSelected(selected ? null : "demo")}
        className="absolute bottom-6 left-4 z-20 rounded-lg bg-tl-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-tl-700"
      >
        {selected ? "Cerrar ficha demo" : "Ver ficha demo"}
      </button>

      <LivePanel icao24={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function FilterPanel({
  airline,
  setAirline,
  altitudeMax,
  setAltitudeMax,
  kind,
  setKind,
}: {
  airline: Airline;
  setAirline: (v: Airline) => void;
  altitudeMax: number;
  setAltitudeMax: (v: number) => void;
  kind: AircraftKind;
  setKind: (v: AircraftKind) => void;
}) {
  return (
    <div className="absolute left-4 top-4 z-20 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-tl-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mb-3 flex items-center gap-2 text-tl-700 dark:text-tl-200">
        <Filter className="h-4 w-4" />
        <span className="font-['Exo_2'] text-sm font-semibold">Filtros</span>
      </div>

      <label className="mb-3 block text-xs font-medium text-slate-700 dark:text-slate-300">
        Aerolínea
        <select
          value={airline}
          onChange={(e) => setAirline(e.target.value as Airline)}
          className="mt-1 w-full rounded-md border border-tl-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="all">Todas</option>
          <option value="iberia">Iberia</option>
          <option value="vueling">Vueling</option>
          <option value="ryanair">Ryanair</option>
          <option value="airEuropa">Air Europa</option>
          <option value="binter">Binter</option>
        </select>
      </label>

      <label className="mb-3 block text-xs font-medium text-slate-700 dark:text-slate-300">
        Altitud máxima ({altitudeMax} m)
        <input
          type="range"
          min={0}
          max={13000}
          step={500}
          value={altitudeMax}
          onChange={(e) => setAltitudeMax(parseInt(e.target.value, 10))}
          className="mt-1 w-full accent-tl-600"
        />
      </label>

      <fieldset className="text-xs">
        <legend className="mb-1 font-medium text-slate-700 dark:text-slate-300">Tipo</legend>
        <div className="flex flex-wrap gap-1">
          {(["all", "jet", "turboprop", "helicopter"] as AircraftKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-full px-2.5 py-1 text-[11px] capitalize transition-colors ${
                kind === k
                  ? "bg-tl-600 text-white"
                  : "bg-tl-50 text-slate-700 hover:bg-tl-100 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {k === "all" ? "Todos" : k === "jet" ? "Jet" : k === "turboprop" ? "Turbohélice" : "Helicóptero"}
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
