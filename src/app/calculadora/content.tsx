"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Fuel,
  MapPin,
  Calculator,
  Users,
  Leaf,
  ChevronRight,
  Info,
  Navigation,
  Clock,
  Zap,
  TrendingDown,
  Route,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import type { CalculadoraAlternative, CalculadoraResponse } from "@/app/api/calculadora/route";
import type { AutocompleteResult } from "@/app/api/calculadora/autocomplete/route";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FuelType = "diesel" | "gasolina95" | "gasolina98" | "electrico";

interface FuelDefaults {
  label: string;
  consumo: number;
  precio: number;
  co2Factor: number;
  unit: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const FUEL_DEFAULTS: Record<FuelType, FuelDefaults> = {
  diesel: {
    label: "Gasóleo A",
    consumo: 6.5,
    precio: 1.35,
    co2Factor: 2.65,
    unit: "L",
    color: "text-tl-amber-700 dark:text-tl-amber-300",
    bgColor: "bg-tl-amber-50 dark:bg-tl-amber-900/20",
    borderColor: "border-tl-amber-200 dark:border-tl-amber-800",
  },
  gasolina95: {
    label: "Gasolina 95",
    consumo: 7.5,
    precio: 1.55,
    co2Factor: 2.35,
    unit: "L",
    color: "text-tl-700 dark:text-tl-300",
    bgColor: "bg-tl-50 dark:bg-tl-900/20",
    borderColor: "border-tl-200 dark:border-tl-800",
  },
  gasolina98: {
    label: "Gasolina 98",
    consumo: 7.2,
    precio: 1.70,
    co2Factor: 2.31,
    unit: "L",
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    borderColor: "border-purple-200",
  },
  electrico: {
    label: "Eléctrico",
    consumo: 18,
    precio: 0.22,
    co2Factor: 0,
    unit: "kWh",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200",
  },
};

// ---------------------------------------------------------------------------
// Calculation helpers (used for comparison table + electric fallback)
// ---------------------------------------------------------------------------

interface CalcResult {
  combustible: number;
  peajes: number;
  total: number;
  porPersona: number;
  co2: number;
}

function calcular(
  distancia: number,
  consumo: number,
  precio: number,
  peajes: number,
  pasajeros: number,
  co2Factor: number
): CalcResult {
  const combustible = (distancia / 100) * consumo * precio;
  const total = combustible + peajes;
  return {
    combustible,
    peajes,
    total,
    porPersona: total / Math.max(1, pasajeros),
    co2: (distancia / 100) * consumo * co2Factor,
  };
}

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${m > 0 ? `${m} min` : ""}`.trim();
}

// ---------------------------------------------------------------------------
// Generic SWR fetcher
// ---------------------------------------------------------------------------

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Autocomplete field component
// ---------------------------------------------------------------------------

interface LocationFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: AutocompleteResult) => void;
  inputClass: string;
  labelClass: string;
}

function LocationField({
  label,
  placeholder,
  value,
  onChange,
  onSelect,
  inputClass,
  labelClass,
}: LocationFieldProps) {
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      onChange(v);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (v.length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      timerRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const res = await fetcher<{ results: AutocompleteResult[] }>(
            `/api/calculadora/autocomplete?q=${encodeURIComponent(v)}&limit=8`
          );
          setSuggestions(res.results ?? []);
          setOpen(true);
        } catch {
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [onChange]
  );

  const handleSelect = useCallback(
    (result: AutocompleteResult) => {
      onChange(result.label);
      onSelect(result);
      setSuggestions([]);
      setOpen(false);
    },
    [onChange, onSelect]
  );

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const kindIcon: Record<AutocompleteResult["kind"], string> = {
    city: "Ciudad",
    railway_station: "Tren",
    airport: "Aeropuerto",
    port: "Puerto",
    gas_station: "Gasolinera",
  };

  return (
    <div ref={containerRef} className="relative">
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <input
          type="text"
          className={inputClass}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 hover:bg-tl-50 dark:hover:bg-tl-900/20 flex items-center gap-2 text-sm transition-colors"
                onClick={() => handleSelect(s)}
              >
                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="flex-1 truncate text-gray-800 dark:text-gray-200">
                  {s.label}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {kindIcon[s.kind]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result card
// ---------------------------------------------------------------------------

function ResultCard({
  label,
  value,
  unit,
  highlight = false,
  icon,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl p-4 flex flex-col gap-1 ${
        highlight
          ? "bg-tl-600 text-white"
          : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
      }`}
    >
      <div
        className={`flex items-center gap-1.5 text-xs font-medium ${
          highlight ? "text-tl-100" : "text-gray-500 dark:text-gray-400"
        }`}
      >
        {icon}
        {label}
      </div>
      <div
        className={`text-2xl font-extrabold font-mono ${
          highlight ? "text-white" : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {value}
        <span
          className={`text-sm font-normal ml-1 ${
            highlight ? "text-tl-200" : "text-gray-400"
          }`}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route alternative tab panel
// ---------------------------------------------------------------------------

const ALT_META: Record<
  CalculadoraAlternative["label"],
  {
    label: string;
    icon: React.ReactNode;
    description: string;
    accentClass: string;
  }
> = {
  fastest: {
    label: "Rápida",
    icon: <Navigation className="w-4 h-4" />,
    description: "Ruta más rápida",
    accentClass: "border-tl-400 text-tl-600 dark:text-tl-400",
  },
  no_tolls: {
    label: "Sin peajes",
    icon: <Route className="w-4 h-4" />,
    description: "Evita autopistas de peaje",
    accentClass: "border-tl-amber-400 text-tl-amber-600 dark:text-tl-amber-400",
  },
  economy: {
    label: "Económica",
    icon: <TrendingDown className="w-4 h-4" />,
    description: "Mejor coste por km",
    accentClass: "border-green-400 text-green-600 dark:text-green-400",
  },
};

interface AlternativePanelProps {
  alt: CalculadoraAlternative;
  pasajeros: number;
}

function AlternativePanel({ alt, pasajeros }: AlternativePanelProps) {
  const meta = ALT_META[alt.label];

  return (
    <div className="space-y-4">
      {/* Route summary pill */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span className="font-semibold">{fmtDuration(alt.durationMin)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
          <Route className="w-4 h-4" />
          <span className="font-semibold font-mono">{fmt(alt.distanceKm, 0)} km</span>
        </div>
        {alt.tollRoads.length > 0 && (
          <div className="flex items-center gap-1 text-tl-amber-600 dark:text-tl-amber-400 text-xs font-medium">
            <Info className="w-3.5 h-3.5" />
            {alt.tollRoads.map((r) => r.tollRoadId).join(", ")}
          </div>
        )}
        {alt.routeSummary && (
          <div className="text-xs text-gray-400 truncate max-w-xs">{alt.routeSummary}</div>
        )}
      </div>

      {/* Cost cards */}
      <div className="grid grid-cols-2 gap-3">
        <ResultCard
          label="Combustible"
          value={fmt(alt.fuelCost)}
          unit="€"
          icon={<Fuel className="w-3.5 h-3.5" />}
        />
        <ResultCard
          label="Peajes"
          value={fmt(alt.tollCost)}
          unit="€"
          icon={<ChevronRight className="w-3.5 h-3.5" />}
        />
        <ResultCard
          label="Coste total"
          value={fmt(alt.totalCost)}
          unit="€"
          highlight
          icon={<Calculator className="w-3.5 h-3.5" />}
        />
        <ResultCard
          label={`Por persona (×${pasajeros})`}
          value={fmt(alt.perPerson)}
          unit="€"
          icon={<Users className="w-3.5 h-3.5" />}
        />
      </div>

      {/* CO2 + €/km */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-xl border bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 p-3 flex items-center gap-2">
          <Leaf className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              CO<sub>2</sub>
            </div>
            <div className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200">
              {fmt(alt.co2Kg)} kg
            </div>
          </div>
        </div>
        <div className="flex-1 rounded-xl border bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 p-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              €/km
            </div>
            <div className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200">
              {fmt(alt.eurPerKm, 3)}
            </div>
          </div>
        </div>
      </div>

      {/* Toll road breakdown */}
      {alt.tollRoads.length > 0 && (
        <div className="rounded-xl border border-tl-amber-200 dark:border-tl-amber-800 bg-tl-amber-50 dark:bg-tl-amber-900/10 p-3">
          <div className="text-xs font-semibold text-tl-amber-700 dark:text-tl-amber-300 uppercase tracking-wide mb-2">
            Autopistas de peaje
          </div>
          <div className="space-y-1">
            {alt.tollRoads.map((r) => (
              <div key={r.tollRoadId} className="flex justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300 truncate mr-2">
                  {r.name}
                </span>
                <span className="font-mono font-semibold text-tl-amber-700 dark:text-tl-amber-300 flex-shrink-0">
                  {fmt(r.priceLigeros)} €
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comparison row (used in comparison table)
// ---------------------------------------------------------------------------

interface ComparisonRowProps {
  fuelType: FuelType;
  distancia: number;
  peajes: number;
  pasajeros: number;
  isActive: boolean;
  liveFuelPrice?: number;
}

function ComparisonRow({
  fuelType,
  distancia,
  peajes,
  pasajeros,
  isActive,
  liveFuelPrice,
}: ComparisonRowProps) {
  const defaults = FUEL_DEFAULTS[fuelType];
  const precio = liveFuelPrice ?? defaults.precio;
  const result = calcular(
    distancia,
    defaults.consumo,
    precio,
    peajes,
    pasajeros,
    defaults.co2Factor
  );

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
        isActive
          ? `${defaults.bgColor} ${defaults.borderColor} shadow-sm`
          : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-2 h-8 rounded-full ${
            fuelType === "diesel"
              ? "bg-tl-amber-400"
              : fuelType === "gasolina95"
              ? "bg-tl-500"
              : fuelType === "gasolina98"
              ? "bg-purple-400"
              : "bg-green-400"
          }`}
        />
        <div>
          <div
            className={`font-semibold text-sm ${
              isActive ? defaults.color : "text-gray-700 dark:text-gray-300"
            }`}
          >
            {defaults.label}
          </div>
          <div className="text-xs text-gray-400">
            {defaults.consumo} {defaults.unit}/100km · {fmt(precio, 3)} €/
            {defaults.unit}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div
          className={`text-lg font-extrabold font-mono ${
            isActive ? defaults.color : "text-gray-800 dark:text-gray-200"
          }`}
        >
          {fmt(result.total)} €
        </div>
        <div className="text-xs text-gray-400 font-mono">
          {fmt(result.porPersona)} €/persona
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SelectedLocation {
  lat: number;
  lon: number;
  label: string;
  provinceCode?: string;
}

export default function CalculadoraContent() {
  // Live fuel prices (existing endpoint)
  const { data: fuelData } = useSWR<{
    national?: {
      avgGasoleoA: number | null;
      avgGasolina95: number | null;
      avgGasolina98: number | null;
    };
  }>("/api/fuel-prices/today", fetcher, { revalidateOnFocus: false });

  const livePrices: Partial<Record<FuelType, number>> = {
    diesel: fuelData?.national?.avgGasoleoA ?? undefined,
    gasolina95: fuelData?.national?.avgGasolina95 ?? undefined,
    gasolina98: fuelData?.national?.avgGasolina98 ?? undefined,
  };

  // Location state
  const [origenText, setOrigenText] = useState("Madrid");
  const [destinoText, setDestinoText] = useState("Barcelona");
  const [origenCoords, setOrigenCoords] = useState<SelectedLocation | null>(null);
  const [destinoCoords, setDestinoCoords] = useState<SelectedLocation | null>(null);

  // Form state
  const [fuelType, setFuelType] = useState<FuelType>("gasolina95");
  const [consumo, setConsumo] = useState(FUEL_DEFAULTS.gasolina95.consumo);
  const [pasajeros, setPasajeros] = useState(1);

  // Manual fallback state (when coordinates not resolved)
  const [manualDistancia, setManualDistancia] = useState(620);
  const [manualPeajes, setManualPeajes] = useState(0);

  // Route result state
  const [routeResult, setRouteResult] = useState<CalculadoraResponse | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CalculadoraAlternative["label"]>("fastest");

  const defaults = FUEL_DEFAULTS[fuelType];

  // Update consumo when fuel type changes
  useEffect(() => {
    setConsumo(FUEL_DEFAULTS[fuelType].consumo);
  }, [fuelType]);

  // Fetch route when both locations are resolved and not electric
  const fetchRoute = useCallback(async () => {
    if (!origenCoords || !destinoCoords) return;

    setRouteLoading(true);
    setRouteError(null);
    setRouteResult(null);

    try {
      const apiType = fuelType === "electrico" ? "gasolina95" : fuelType;
      const params = new URLSearchParams({
        originLat: String(origenCoords.lat),
        originLon: String(origenCoords.lon),
        destLat: String(destinoCoords.lat),
        destLon: String(destinoCoords.lon),
        fuelType: apiType,
        consumption: String(consumo),
        pasajeros: String(pasajeros),
        ...(origenCoords.provinceCode
          ? { provinceOrigin: origenCoords.provinceCode }
          : {}),
      });

      const res = await fetch(`/api/calculadora?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setRouteError(data.error ?? "Error al calcular la ruta.");
        return;
      }

      setRouteResult(data as CalculadoraResponse);
      setActiveTab("fastest");
    } catch {
      setRouteError("No se pudo conectar con el servidor de rutas.");
    } finally {
      setRouteLoading(false);
    }
  }, [origenCoords, destinoCoords, fuelType, consumo, pasajeros]);

  // Auto-fetch when inputs change
  useEffect(() => {
    if (origenCoords && destinoCoords) {
      fetchRoute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origenCoords, destinoCoords, fuelType, consumo, pasajeros]);

  const inputClass =
    "w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-tl-400 focus:ring-2 focus:ring-tl-100 outline-none transition-all placeholder:text-gray-400";
  const labelClass =
    "block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide";

  // Determine display distance & tolls for comparison table
  const displayDistancia =
    routeResult?.alternatives.find((a) => a.label === "fastest")?.distanceKm ??
    manualDistancia;
  const displayTolls =
    routeResult?.alternatives.find((a) => a.label === "fastest")?.tollCost ??
    manualPeajes;

  const hasRoute = !!origenCoords && !!destinoCoords;
  const showManualFallback = !hasRoute;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Herramientas", href: "/gasolineras" },
          { name: "Calculadora de Ruta", href: "/calculadora" },
        ]}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-tl-600 dark:text-tl-400 text-sm font-medium mb-2">
          <Calculator className="w-4 h-4" />
          <span>Herramienta gratuita</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Calculadora de Coste de Ruta
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl">
          Calcula el coste real de tu viaje en coche: combustible, peajes y emisiones de CO
          <sub>2</sub>. Compara los distintos tipos de combustible al instante.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ----------------------------------------------------------------- */}
        {/* FORM                                                               */}
        {/* ----------------------------------------------------------------- */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-tl-600 dark:text-tl-400" />
            Datos del viaje
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <LocationField
              label="Origen"
              placeholder="Madrid"
              value={origenText}
              onChange={(v) => {
                setOrigenText(v);
                setOrigenCoords(null);
                setRouteResult(null);
              }}
              onSelect={(r) => {
                setOrigenText(r.label);
                setOrigenCoords({ lat: r.lat, lon: r.lon, label: r.label, provinceCode: r.provinceCode });
              }}
              inputClass={inputClass}
              labelClass={labelClass}
            />
            <LocationField
              label="Destino"
              placeholder="Barcelona"
              value={destinoText}
              onChange={(v) => {
                setDestinoText(v);
                setDestinoCoords(null);
                setRouteResult(null);
              }}
              onSelect={(r) => {
                setDestinoText(r.label);
                setDestinoCoords({ lat: r.lat, lon: r.lon, label: r.label, provinceCode: r.provinceCode });
              }}
              inputClass={inputClass}
              labelClass={labelClass}
            />
          </div>

          {/* Manual distance fallback — shown when no coords resolved */}
          {showManualFallback && (
            <div className="mb-5">
              <label className={labelClass}>Distancia (km) — entrada manual</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  className={inputClass}
                  min={0}
                  step={1}
                  value={manualDistancia || ""}
                  onChange={(e) =>
                    setManualDistancia(isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value))
                  }
                  placeholder="620"
                />
                <div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  km de ida
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Selecciona origen y destino del desplegable para calcular la ruta real.
              </p>
            </div>
          )}

          {/* Fuel type selector */}
          <div className="mb-5">
            <label className={labelClass}>Tipo de combustible</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(FUEL_DEFAULTS) as FuelType[]).map((type) => {
                const d = FUEL_DEFAULTS[type];
                const isSelected = fuelType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFuelType(type)}
                    className={`rounded-lg border px-3 py-2.5 text-xs font-semibold transition-all text-left ${
                      isSelected
                        ? `${d.bgColor} ${d.borderColor} ${d.color} shadow-sm`
                        : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-950"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Consumo */}
            <div>
              <label className={labelClass}>
                Consumo medio ({defaults.unit}/100km)
              </label>
              <input
                type="number"
                className={inputClass}
                min={0}
                step={0.1}
                value={consumo || ""}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setConsumo(isNaN(v) ? 0 : v);
                }}
              />
            </div>

            {/* Pasajeros */}
            <div>
              <label className={labelClass}>Número de pasajeros</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPasajeros(n)}
                    className={`w-9 h-9 rounded-lg border text-sm font-bold transition-all ${
                      pasajeros === n
                        ? "bg-tl-600 border-tl-600 text-white shadow-sm"
                        : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-tl-300 hover:bg-tl-50 dark:bg-tl-900/20"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual peajes (only shown in fallback mode) */}
            {showManualFallback && (
              <div>
                <label className={labelClass}>Peajes (€)</label>
                <input
                  type="number"
                  className={inputClass}
                  min={0}
                  step={0.5}
                  value={manualPeajes || ""}
                  onChange={(e) =>
                    setManualPeajes(isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value))
                  }
                  placeholder="0"
                />
                <p className="text-xs text-gray-400 mt-1">Introduce importe estimado</p>
              </div>
            )}
          </div>

          {/* Fetch button when coords available but no result yet */}
          {hasRoute && !routeResult && !routeLoading && (
            <button
              type="button"
              onClick={fetchRoute}
              className="mt-5 w-full rounded-xl bg-tl-600 text-white py-3 text-sm font-semibold hover:bg-tl-700 transition-colors flex items-center justify-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Calcular ruta
            </button>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* RESULTS                                                            */}
        {/* ----------------------------------------------------------------- */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Route summary pill */}
          {(origenText || destinoText) && (
            <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-100 rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium text-tl-700 dark:text-tl-300">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {origenText || "…"} → {destinoText || "…"}
              </span>
              {routeResult && (
                <span className="ml-auto text-tl-500 whitespace-nowrap text-xs font-mono">
                  {fmt(
                    routeResult.alternatives.find((a) => a.label === "fastest")
                      ?.distanceKm ?? 0,
                    0
                  )}{" "}
                  km
                </span>
              )}
            </div>
          )}

          {/* Loading state */}
          {routeLoading && (
            <div className="flex items-center justify-center gap-3 py-12 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Calculando ruta…</span>
            </div>
          )}

          {/* Error state */}
          {routeError && !routeLoading && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm text-red-700 dark:text-red-400 mb-1">
                  No se pudo calcular la ruta
                </div>
                <p className="text-xs text-red-600 dark:text-red-400">{routeError}</p>
                {showManualFallback && (
                  <p className="text-xs text-gray-500 mt-1">
                    Puedes usar la entrada manual de distancia para una estimación aproximada.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Route alternatives tabs */}
          {routeResult && !routeLoading && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
              {/* Live fuel price badge */}
              {routeResult.fuelPrice && (
                <div className="mb-4 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5" />
                  Precio CNMC
                  {routeResult.fuelPrice.provinceCode !== "NAT"
                    ? ` prov. ${routeResult.fuelPrice.provinceCode}`
                    : " media nacional"}
                  :{" "}
                  <span className="font-mono font-semibold text-tl-600 dark:text-tl-400">
                    {fmt(routeResult.fuelPrice.price, 3)} €/L
                  </span>
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {routeResult.alternatives.map((alt) => {
                  const meta = ALT_META[alt.label];
                  const isActive = activeTab === alt.label;
                  return (
                    <button
                      key={alt.label}
                      type="button"
                      onClick={() => setActiveTab(alt.label)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-gray-100"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                    >
                      {meta.icon}
                      <span className="hidden sm:inline">{meta.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active tab content */}
              {routeResult.alternatives
                .filter((a) => a.label === activeTab)
                .map((alt) => (
                  <AlternativePanel key={alt.label} alt={alt} pasajeros={pasajeros} />
                ))}
            </div>
          )}

          {/* Manual fallback results — only when no route computed */}
          {!routeResult && !routeLoading && showManualFallback && (
            <>
              {(() => {
                const price = livePrices[fuelType] ?? defaults.precio;
                const result = calcular(
                  manualDistancia,
                  consumo,
                  price,
                  manualPeajes,
                  pasajeros,
                  defaults.co2Factor
                );
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <ResultCard
                        label="Coste combustible"
                        value={fmt(result.combustible)}
                        unit="€"
                        icon={<Fuel className="w-3.5 h-3.5" />}
                      />
                      <ResultCard
                        label="Peajes"
                        value={fmt(result.peajes)}
                        unit="€"
                        icon={<ChevronRight className="w-3.5 h-3.5" />}
                      />
                      <ResultCard
                        label="Coste total"
                        value={fmt(result.total)}
                        unit="€"
                        highlight
                        icon={<Calculator className="w-3.5 h-3.5" />}
                      />
                      <ResultCard
                        label={`Por persona (×${pasajeros})`}
                        value={fmt(result.porPersona)}
                        unit="€"
                        icon={<Users className="w-3.5 h-3.5" />}
                      />
                    </div>
                    <div
                      className={`rounded-xl border p-4 flex items-center gap-3 ${
                        fuelType === "electrico"
                          ? "bg-green-50 dark:bg-green-900/20 border-green-200"
                          : "bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800"
                      }`}
                    >
                      <Leaf
                        className={`w-5 h-5 flex-shrink-0 ${
                          fuelType === "electrico" ? "text-green-500" : "text-gray-400"
                        }`}
                      />
                      <div>
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                          Emisiones CO<sub>2</sub>
                        </div>
                        {fuelType === "electrico" ? (
                          <div className="text-lg font-extrabold font-mono text-green-700 dark:text-green-400">
                            0 kg{" "}
                            <span className="text-xs font-normal text-green-600 dark:text-green-400">
                              en circulación
                            </span>
                          </div>
                        ) : (
                          <div className="text-lg font-extrabold font-mono text-gray-800 dark:text-gray-200">
                            {fmt(result.co2)} kg{" "}
                            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                              · {fmt(result.co2 / Math.max(1, manualDistancia / 100), 2)} kg/100km
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </>
          )}

          {/* Quick links */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href="/precio-gasolina-hoy"
              className="inline-flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:border-tl-300 hover:text-tl-600 dark:text-tl-400 transition-colors"
            >
              <Fuel className="w-3 h-3" />
              Precio gasolina hoy
            </Link>
            <Link
              href="/precio-diesel-hoy"
              className="inline-flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:border-tl-300 hover:text-tl-600 dark:text-tl-400 transition-colors"
            >
              <Fuel className="w-3 h-3" />
              Precio diésel hoy
            </Link>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* COMPARISON TABLE                                                     */}
      {/* ------------------------------------------------------------------- */}
      <div className="mt-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-tl-600 dark:text-tl-400" />
          Comparativa por tipo de combustible
          <span className="text-xs font-normal text-gray-400 ml-1">
            · {origenText && destinoText ? `${origenText} → ${destinoText} · ` : ""}
            {fmt(displayDistancia, 0)} km
            {displayTolls > 0 ? ` · ${fmt(displayTolls)} € peajes` : " · sin peajes"}
            {" "}· {pasajeros} {pasajeros === 1 ? "persona" : "personas"}
          </span>
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Consumos por defecto. Los costes reales dependen de tu vehículo y la gasolinera.
          {routeResult?.fuelPrice && (
            <span className="ml-1 text-tl-500 dark:text-tl-400">
              Precios combustible: CNMC {routeResult.fuelPrice.provinceCode === "NAT" ? "media nacional" : `prov. ${routeResult.fuelPrice.provinceCode}`}.
            </span>
          )}
        </p>
        <div className="space-y-2">
          {(Object.keys(FUEL_DEFAULTS) as FuelType[]).map((type) => (
            <ComparisonRow
              key={type}
              fuelType={type}
              distancia={displayDistancia}
              peajes={displayTolls}
              pasajeros={pasajeros}
              isActive={fuelType === type}
              liveFuelPrice={livePrices[type]}
            />
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* FAQ                                                                  */}
      {/* ------------------------------------------------------------------- */}
      <div className="mt-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Preguntas frecuentes sobre el coste de un viaje en coche
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              ¿Cómo se calcula el coste de combustible de una ruta?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              La fórmula es sencilla:{" "}
              <strong>coste = (distancia ÷ 100) × consumo × precio por litro</strong>.
              Por ejemplo, para 600 km con un coche que consume 7 L/100km y gasolina a 1,55 €/L:
              (600 ÷ 100) × 7 × 1,55 = <strong>65,10 €</strong>. A eso hay que sumarle los
              peajes de la ruta.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              ¿Cuánto cuesta el peaje de Madrid a Barcelona?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              El trayecto Madrid–Barcelona por la AP-2 y AP-7 tiene un coste de peaje de entre{" "}
              <strong>45 € y 55 €</strong> para turismos, dependiendo del punto de origen/destino
              exacto. Puedes consultar el importe exacto en la web de cada concesionaria o en las
              apps de navegación. Desde 2024, algunas autovías anteriormente gratuitas cuentan con
              peajes blandos.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              ¿Vale la pena ir en coche eléctrico frente a uno de gasolina?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              En un viaje de 600 km, un eléctrico con 18 kWh/100km y electricidad a 0,22 €/kWh
              costaría unos <strong>23,76 €</strong> frente a los{" "}
              <strong>~69 €</strong> de un gasolina (7,5 L/100km a 1,55 €/L). El ahorro es
              significativo en trayectos largos, aunque hay que considerar el tiempo de recarga y
              la disponibilidad de cargadores en ruta.
            </p>
          </div>
        </div>
      </div>

      {/* Related links */}
      <RelatedLinks
        title="Más herramientas y recursos"
        links={[
          {
            title: "Precio Gasolina Hoy",
            description: "Media nacional de gasolina 95 y 98 en tiempo real",
            href: "/precio-gasolina-hoy",
            icon: <Fuel className="w-5 h-5" />,
          },
          {
            title: "Precio Diésel Hoy",
            description: "Gasóleo A — precio por provincia y gasolinera",
            href: "/precio-diesel-hoy",
            icon: <Fuel className="w-5 h-5" />,
          },
          {
            title: "Mapa de Gasolineras",
            description: "Encuentra la gasolinera más barata cerca de ti",
            href: "/gasolineras/mapa",
            icon: <MapPin className="w-5 h-5" />,
          },
          {
            title: "Herramientas Profesional",
            description: "Diésel bonificado, áreas de servicio y restricciones",
            href: "/profesional",
            icon: <Calculator className="w-5 h-5" />,
          },
        ]}
      />
    </div>
  );
}
