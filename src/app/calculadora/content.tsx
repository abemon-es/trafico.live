"use client";

import { fetcher } from "@/lib/fetcher";
import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Fuel, MapPin, Calculator, Users, Leaf, ChevronRight, Info } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FuelType = "diesel" | "gasolina95" | "gasolina98" | "electrico";

interface FuelDefaults {
  label: string;
  consumo: number; // L/100km or kWh/100km
  precio: number; // €/L or €/kWh
  co2Factor: number; // kg per litre/kWh (0 for electric)
  unit: string; // "L" or "kWh"
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
// Calculation helpers
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

// ---------------------------------------------------------------------------
// Sub-components
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
      <div className={`text-2xl font-extrabold ${highlight ? "text-white" : "text-gray-900 dark:text-gray-100"}`}>
        {value}
        <span className={`text-sm font-normal ml-1 ${highlight ? "text-tl-200" : "text-gray-400"}`}>
          {unit}
        </span>
      </div>
    </div>
  );
}

interface ComparisonRowProps {
  fuelType: FuelType;
  distancia: number;
  peajes: number;
  pasajeros: number;
  isActive: boolean;
}

function ComparisonRow({
  fuelType,
  distancia,
  peajes,
  pasajeros,
  isActive,
}: ComparisonRowProps) {
  const defaults = FUEL_DEFAULTS[fuelType];
  const result = calcular(
    distancia,
    defaults.consumo,
    defaults.precio,
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
              ? "bg-tl-50 dark:bg-tl-900/200"
              : fuelType === "gasolina98"
              ? "bg-purple-50 dark:bg-purple-900/200"
              : "bg-green-50 dark:bg-green-900/200"
          }`}
        />
        <div>
          <div className={`font-semibold text-sm ${isActive ? defaults.color : "text-gray-700 dark:text-gray-300"}`}>
            {defaults.label}
          </div>
          <div className="text-xs text-gray-400">
            {defaults.consumo} {defaults.unit}/100km · {fmt(defaults.precio, 3)} €/{defaults.unit}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-lg font-extrabold ${isActive ? defaults.color : "text-gray-800 dark:text-gray-200"}`}>
          {fmt(result.total)} €
        </div>
        <div className="text-xs text-gray-400">{fmt(result.porPersona)} €/persona</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------


export default function CalculadoraContent() {
  // Fetch live fuel prices
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

  // Form state
  const [origen, setOrigen] = useState("Madrid");
  const [destino, setDestino] = useState("Barcelona");
  const [distancia, setDistancia] = useState(620);
  const [fuelType, setFuelType] = useState<FuelType>("gasolina95");
  const [consumo, setConsumo] = useState(FUEL_DEFAULTS.gasolina95.consumo);
  const [precio, setPrecio] = useState(FUEL_DEFAULTS.gasolina95.precio);
  const [peajes, setPeajes] = useState(0);
  const [pasajeros, setPasajeros] = useState(1);

  // Update consumo/precio defaults when fuel type changes or live prices arrive
  useEffect(() => {
    setConsumo(FUEL_DEFAULTS[fuelType].consumo);
    setPrecio(livePrices[fuelType] ?? FUEL_DEFAULTS[fuelType].precio);
  }, [fuelType, fuelData]);

  const defaults = FUEL_DEFAULTS[fuelType];
  const result = calcular(distancia, consumo, precio, peajes, pasajeros, defaults.co2Factor);

  const handleDistanciaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setDistancia(isNaN(v) ? 0 : v);
  }, []);

  const handleConsumoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setConsumo(isNaN(v) ? 0 : v);
  }, []);

  const handlePrecioChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setPrecio(isNaN(v) ? 0 : v);
  }, []);

  const handlePeajesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setPeajes(isNaN(v) ? 0 : v);
  }, []);

  const inputClass =
    "w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-tl-400 focus:ring-2 focus:ring-tl-100 outline-none transition-all placeholder:text-gray-400";

  const labelClass = "block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide";

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
        {/* FORM — left / top                                                  */}
        {/* ----------------------------------------------------------------- */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-tl-600 dark:text-tl-400" />
            Datos del viaje
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {/* Origen */}
            <div>
              <label className={labelClass}>Origen</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Madrid"
                value={origen}
                onChange={(e) => setOrigen(e.target.value)}
              />
            </div>
            {/* Destino */}
            <div>
              <label className={labelClass}>Destino</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Barcelona"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
              />
            </div>
          </div>

          {/* Distancia */}
          <div className="mb-5">
            <label className={labelClass}>
              Distancia (km)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                className={inputClass}
                min={0}
                step={1}
                value={distancia || ""}
                onChange={handleDistanciaChange}
                placeholder="620"
              />
              <div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                km de ida
              </div>
            </div>
          </div>

          {/* Tipo combustible */}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
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
                onChange={handleConsumoChange}
              />
            </div>

            {/* Precio */}
            <div>
              <label className={labelClass}>
                Precio combustible (€/{defaults.unit})
              </label>
              <input
                type="number"
                className={inputClass}
                min={0}
                step={0.001}
                value={precio || ""}
                onChange={handlePrecioChange}
              />
              <p className="text-xs text-gray-400 mt-1">
                Precio por defecto estimado · ajusta al precio actual
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Peajes */}
            <div>
              <label className={labelClass}>Peajes estimados (€)</label>
              <input
                type="number"
                className={inputClass}
                min={0}
                step={0.5}
                value={peajes || ""}
                onChange={handlePeajesChange}
                placeholder="0"
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
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* RESULTS — right / bottom                                           */}
        {/* ----------------------------------------------------------------- */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Route summary pill */}
          {origen && destino && (
            <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-100 rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium text-tl-700 dark:text-tl-300">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {origen} → {destino}
              </span>
              {distancia > 0 && (
                <span className="ml-auto text-tl-500 whitespace-nowrap text-xs">
                  {fmt(distancia, 0)} km
                </span>
              )}
            </div>
          )}

          {/* Result cards */}
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

          {/* CO2 card */}
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
                <div className="text-lg font-extrabold text-green-700 dark:text-green-400">
                  0 kg{" "}
                  <span className="text-xs font-normal text-green-600 dark:text-green-400">en circulación</span>
                </div>
              ) : (
                <div className="text-lg font-extrabold text-gray-800 dark:text-gray-200">
                  {fmt(result.co2)} kg{" "}
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                    · {fmt(result.co2 / Math.max(1, distancia / 100), 2)} kg/100km
                  </span>
                </div>
              )}
            </div>
          </div>

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
          {origen && destino && (
            <span className="text-xs font-normal text-gray-400 ml-1">
              · {origen} → {destino} · {fmt(distancia, 0)} km · {peajes > 0 ? `${fmt(peajes)} € peajes` : "sin peajes"} · {pasajeros} {pasajeros === 1 ? "persona" : "personas"}
            </span>
          )}
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Consumos y precios por defecto. Los costes reales dependen de tu vehículo y la gasolinera.
        </p>
        <div className="space-y-2">
          {(Object.keys(FUEL_DEFAULTS) as FuelType[]).map((type) => (
            <ComparisonRow
              key={type}
              fuelType={type}
              distancia={distancia}
              peajes={peajes}
              pasajeros={pasajeros}
              isActive={fuelType === type}
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
              La fórmula es sencilla: <strong>coste = (distancia ÷ 100) × consumo × precio por litro</strong>.
              Por ejemplo, para 600 km con un coche que consume 7 L/100km y gasolina a 1,55 €/L:
              (600 ÷ 100) × 7 × 1,55 = <strong>65,10 €</strong>. A eso hay que sumarle los peajes de la ruta.
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
