"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Zap,
  ChevronRight,
  TrendingDown,
  Info,
  MapPin,
  Calculator,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { AffiliateWidget } from "@/components/ads/AffiliateWidget";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EVPreset {
  name: string;
  battery: number; // kWh
  consumption: number; // kWh/100km
}

interface ChargingType {
  id: string;
  label: string;
  sublabel: string;
  pricePerKwh: number;
  powerKw: number;
  color: string;
  bgColor: string;
  borderColor: string;
  activeBg: string;
  activeBorder: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EV_PRESETS: EVPreset[] = [
  { name: "Tesla Model 3", battery: 60, consumption: 14.5 },
  { name: "VW ID.3", battery: 58, consumption: 15.0 },
  { name: "Renault Zoe", battery: 52, consumption: 17.0 },
  { name: "Hyundai Kona EV", battery: 64, consumption: 14.0 },
  { name: "Dacia Spring", battery: 27, consumption: 13.9 },
];

const CHARGING_TYPES: ChargingType[] = [
  {
    id: "home",
    label: "Casa (lenta)",
    sublabel: "~3.7 kW AC",
    pricePerKwh: 0.15,
    powerKw: 3.7,
    color: "text-tl-700",
    bgColor: "bg-tl-50",
    borderColor: "border-tl-200",
    activeBg: "bg-tl-100",
    activeBorder: "border-tl-500",
  },
  {
    id: "public-slow",
    label: "Pública lenta",
    sublabel: "22 kW AC",
    pricePerKwh: 0.30,
    powerKw: 22,
    color: "text-tl-amber-700",
    bgColor: "bg-tl-amber-50",
    borderColor: "border-tl-amber-200",
    activeBg: "bg-tl-amber-100",
    activeBorder: "border-tl-amber-500",
  },
  {
    id: "fast",
    label: "Rápida",
    sublabel: "50 kW DC",
    pricePerKwh: 0.45,
    powerKw: 50,
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    activeBg: "bg-orange-100",
    activeBorder: "border-orange-500",
  },
  {
    id: "ultra",
    label: "Ultra-rápida",
    sublabel: "150 kW DC",
    pricePerKwh: 0.65,
    powerKw: 150,
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    activeBg: "bg-green-100",
    activeBorder: "border-green-500",
  },
];

// Fuel reference values for comparison
const GASOLINE_PRICE = 1.55; // €/L
const DIESEL_PRICE = 1.35; // €/L
const GASOLINE_CONSUMPTION = 7.0; // L/100km
const DIESEL_CONSUMPTION = 5.5; // L/100km
const DEFAULT_EV_CONSUMPTION = 15.0; // kWh/100km (fallback)

// EV model comparison table data
const EV_COMPARISON: {
  model: string;
  battery: number;
  consumption: number;
  range: number;
  homeCost: number;
}[] = EV_PRESETS.map((ev) => ({
  model: ev.name,
  battery: ev.battery,
  consumption: ev.consumption,
  range: Math.round((ev.battery / ev.consumption) * 100),
  homeCost: parseFloat((ev.battery * 0.15).toFixed(2)),
}));

// ---------------------------------------------------------------------------
// Helper formatters
// ---------------------------------------------------------------------------

function formatEuros(value: number): string {
  return value.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTime(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`;
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SliderInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
  color,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit: string;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className={`text-sm font-bold ${color}`}>
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 accent-green-600"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CuantoCuestaCargarContent() {
  // Calculator state
  const [selectedPreset, setSelectedPreset] = useState<number | "custom">(0);
  const [customBattery, setCustomBattery] = useState(60);
  const [currentCharge, setCurrentCharge] = useState(20);
  const [targetCharge, setTargetCharge] = useState(80);
  const [selectedCharging, setSelectedCharging] = useState<string>("home");
  const [customPrice, setCustomPrice] = useState<number | null>(null);

  // Derived values
  const batteryKwh =
    selectedPreset === "custom"
      ? customBattery
      : EV_PRESETS[selectedPreset as number].battery;

  const evConsumption =
    selectedPreset === "custom"
      ? DEFAULT_EV_CONSUMPTION
      : EV_PRESETS[selectedPreset as number].consumption;

  const chargingType = CHARGING_TYPES.find((c) => c.id === selectedCharging)!;

  const pricePerKwh =
    customPrice !== null ? customPrice : chargingType.pricePerKwh;

  // Core calculation
  const results = useMemo(() => {
    const safeTarget = Math.max(currentCharge, targetCharge);
    const kwhNeeded = batteryKwh * (safeTarget - currentCharge) / 100;
    const cost = kwhNeeded * pricePerKwh;
    const timeHours = kwhNeeded / chargingType.powerKw;

    // Cost per 100km
    const costPer100km = evConsumption * pricePerKwh;

    // Km covered by this charge
    const kmFromCharge =
      kwhNeeded > 0 ? (kwhNeeded / evConsumption) * 100 : 0;

    // Fuel comparison for the same km
    const gasolineCostSameKm =
      (kmFromCharge / 100) * GASOLINE_CONSUMPTION * GASOLINE_PRICE;
    const dieselCostSameKm =
      (kmFromCharge / 100) * DIESEL_CONSUMPTION * DIESEL_PRICE;

    // Savings vs gasoline per 100km
    const gasolineCostPer100km =
      GASOLINE_CONSUMPTION * GASOLINE_PRICE;
    const dieselCostPer100km =
      DIESEL_CONSUMPTION * DIESEL_PRICE;
    const savingsVsGasolinePer100km = gasolineCostPer100km - costPer100km;
    const savingsVsDieselPer100km = dieselCostPer100km - costPer100km;

    return {
      kwhNeeded: parseFloat(kwhNeeded.toFixed(2)),
      cost: parseFloat(cost.toFixed(2)),
      timeHours,
      costPer100km: parseFloat(costPer100km.toFixed(2)),
      kmFromCharge: parseFloat(kmFromCharge.toFixed(0)),
      gasolineCostSameKm: parseFloat(gasolineCostSameKm.toFixed(2)),
      dieselCostSameKm: parseFloat(dieselCostSameKm.toFixed(2)),
      savingsVsGasolinePer100km: parseFloat(savingsVsGasolinePer100km.toFixed(2)),
      savingsVsDieselPer100km: parseFloat(savingsVsDieselPer100km.toFixed(2)),
      gasolineCostPer100km: parseFloat(gasolineCostPer100km.toFixed(2)),
      dieselCostPer100km: parseFloat(dieselCostPer100km.toFixed(2)),
    };
  }, [batteryKwh, currentCharge, targetCharge, pricePerKwh, chargingType, evConsumption]);

  const chargeDelta = Math.max(0, targetCharge - currentCharge);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Cargadores EV", href: "/carga-ev" },
            { name: "Calculadora de coste de carga", href: "/cuanto-cuesta-cargar" },
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
              ¿Cuánto Cuesta Cargar un Coche Eléctrico?
            </h1>
          </div>
          <p className="text-gray-600 text-base leading-relaxed">
            Calcula el coste exacto de cada carga según tu batería, nivel actual y tipo
            de cargador. Compara con gasolina y diésel para ver cuánto ahorras.
          </p>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* CALCULATOR FORM                                                      */}
        {/* ------------------------------------------------------------------ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-green-600" />
            Calculadora de coste de carga
          </h2>

          {/* Step 1: EV model / battery */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              1. Selecciona tu vehículo
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EV_PRESETS.map((ev, i) => (
                <button
                  key={ev.name}
                  onClick={() => setSelectedPreset(i)}
                  className={`text-left rounded-xl border px-3 py-2.5 transition-all text-sm ${
                    selectedPreset === i
                      ? "bg-green-50 border-green-500 ring-1 ring-green-500"
                      : "bg-gray-50 border-gray-200 hover:border-green-300 hover:bg-green-50"
                  }`}
                >
                  <p className="font-semibold text-gray-900 leading-snug">{ev.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ev.battery} kWh</p>
                </button>
              ))}
              <button
                onClick={() => setSelectedPreset("custom")}
                className={`text-left rounded-xl border px-3 py-2.5 transition-all text-sm ${
                  selectedPreset === "custom"
                    ? "bg-green-50 border-green-500 ring-1 ring-green-500"
                    : "bg-gray-50 border-gray-200 hover:border-green-300 hover:bg-green-50"
                }`}
              >
                <p className="font-semibold text-gray-900 leading-snug">Personalizado</p>
                <p className="text-xs text-gray-500 mt-0.5">Introduce batería</p>
              </button>
            </div>

            {selectedPreset === "custom" && (
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Capacidad de batería (kWh)
                </label>
                <input
                  type="number"
                  min={5}
                  max={200}
                  step={1}
                  value={customBattery}
                  onChange={(e) => setCustomBattery(Number(e.target.value))}
                  className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Step 2: Charge levels */}
          <div className="mb-6 space-y-5">
            <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              2. Nivel de carga
            </p>
            <SliderInput
              label="Carga actual"
              value={currentCharge}
              min={0}
              max={99}
              step={5}
              onChange={(v) => {
                setCurrentCharge(v);
                if (targetCharge <= v) setTargetCharge(Math.min(100, v + 5));
              }}
              unit="%"
              color="text-tl-amber-600"
            />
            <SliderInput
              label="Carga objetivo"
              value={targetCharge}
              min={Math.min(currentCharge + 5, 100)}
              max={100}
              step={5}
              onChange={setTargetCharge}
              unit="%"
              color="text-green-600"
            />
            {chargeDelta === 0 && (
              <p className="text-xs text-tl-amber-600 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                La carga objetivo debe ser mayor que la actual.
              </p>
            )}
          </div>

          {/* Step 3: Charging type */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              3. Tipo de cargador
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CHARGING_TYPES.map((ct) => (
                <button
                  key={ct.id}
                  onClick={() => {
                    setSelectedCharging(ct.id);
                    setCustomPrice(null);
                  }}
                  className={`text-left rounded-xl border px-3 py-2.5 transition-all ${
                    selectedCharging === ct.id
                      ? `${ct.activeBg} ${ct.activeBorder} ring-1 ${ct.activeBorder}`
                      : `${ct.bgColor} ${ct.borderColor} hover:ring-1 hover:${ct.activeBorder}`
                  }`}
                >
                  <p className={`text-sm font-semibold ${ct.color}`}>{ct.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ct.sublabel}</p>
                  <p className="text-xs font-bold text-gray-700 mt-1">
                    {ct.pricePerKwh.toFixed(2)} €/kWh
                  </p>
                </button>
              ))}
            </div>

            {/* Custom price override */}
            <div className="mt-3 flex items-center gap-3">
              <label className="text-sm text-gray-600 whitespace-nowrap">
                Precio real (€/kWh):
              </label>
              <input
                type="number"
                min={0.01}
                max={2}
                step={0.01}
                value={customPrice !== null ? customPrice : chargingType.pricePerKwh}
                onChange={(e) => setCustomPrice(parseFloat(e.target.value) || null)}
                className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {customPrice !== null && (
                <button
                  onClick={() => setCustomPrice(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Restablecer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* RESULTS                                                              */}
        {/* ------------------------------------------------------------------ */}
        <div
          className={`rounded-2xl border shadow-sm p-6 mb-6 transition-all ${
            chargeDelta > 0
              ? "bg-white border-green-200"
              : "bg-gray-50 border-gray-200 opacity-60"
          }`}
        >
          <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-green-600" />
            Resultado del cálculo
          </h2>

          {chargeDelta === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Ajusta los niveles de carga para ver el resultado.
            </p>
          ) : (
            <>
              {/* Primary metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">
                    Coste total
                  </p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatEuros(results.cost)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {results.kwhNeeded} kWh
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Tiempo estimado
                  </p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatTime(results.timeHours)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {chargingType.powerKw} kW · {chargeDelta}% de batería
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Coste/100 km
                  </p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatEuros(results.costPer100km)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {evConsumption} kWh/100km
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Autonomía añadida
                  </p>
                  <p className="text-2xl font-bold text-gray-800">
                    {results.kmFromCharge} km
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">aprox.</p>
                </div>
              </div>

              {/* Fuel comparison */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Comparativa para {results.kmFromCharge} km
                </p>
                <div className="space-y-3">
                  {/* EV */}
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-xs font-medium text-gray-600 text-right">
                      Eléctrico
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
                      <div
                        className="h-3 bg-green-500 rounded-full"
                        style={{ width: "100%" }}
                      />
                    </div>
                    <div className="w-16 text-xs font-bold text-green-700 text-right">
                      {formatEuros(results.cost)}
                    </div>
                  </div>

                  {/* Diesel */}
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-xs font-medium text-gray-600 text-right">
                      Diésel
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
                      <div
                        className="h-3 bg-tl-amber-400 rounded-full"
                        style={{
                          width:
                            results.cost > 0
                              ? `${Math.min(100, (results.dieselCostSameKm / results.gasolineCostSameKm) * 100)}%`
                              : "0%",
                        }}
                      />
                    </div>
                    <div className="w-16 text-xs font-bold text-tl-amber-700 text-right">
                      {formatEuros(results.dieselCostSameKm)}
                    </div>
                  </div>

                  {/* Gasolina */}
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-xs font-medium text-gray-600 text-right">
                      Gasolina 95
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
                      <div
                        className="h-3 bg-red-400 rounded-full"
                        style={{ width: "100%" }}
                      />
                    </div>
                    <div className="w-16 text-xs font-bold text-red-600 text-right">
                      {formatEuros(results.gasolineCostSameKm)}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Gasolina: {GASOLINE_CONSUMPTION}L/100km · {GASOLINE_PRICE}€/L &nbsp;|&nbsp;
                  Diésel: {DIESEL_CONSUMPTION}L/100km · {DIESEL_PRICE}€/L
                </p>
              </div>

              {/* Savings callout */}
              {results.savingsVsGasolinePer100km > 0 && (
                <div className="bg-green-600 rounded-xl p-4 text-white flex items-start gap-3">
                  <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingDown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-lg leading-tight">
                      Ahorras{" "}
                      <span className="text-green-200">
                        {formatEuros(results.savingsVsGasolinePer100km)}
                      </span>{" "}
                      vs gasolina por cada 100 km
                    </p>
                    <p className="text-green-100 text-sm mt-1">
                      Y{" "}
                      <span className="font-semibold">
                        {formatEuros(results.savingsVsDieselPer100km)}
                      </span>{" "}
                      vs diésel · Precio de carga: {pricePerKwh.toFixed(2)} €/kWh
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* EV MODEL COMPARISON TABLE                                            */}
        {/* ------------------------------------------------------------------ */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Comparativa de coches eléctricos populares
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Coste de carga completa desde 0% a 100%, tarifas de recarga en casa (0.15 €/kWh).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Modelo
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Batería
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Consumo
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Autonomía
                  </th>
                  <th className="text-right py-2 pl-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Carga casa
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {EV_COMPARISON.map((row) => (
                  <tr
                    key={row.model}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 pr-4 font-medium text-gray-900">
                      {row.model}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-600">
                      {row.battery} kWh
                    </td>
                    <td className="py-3 px-3 text-right text-gray-600">
                      {row.consumption} kWh/100
                    </td>
                    <td className="py-3 px-3 text-right text-gray-600">
                      ~{row.range} km
                    </td>
                    <td className="py-3 pl-3 text-right font-bold text-green-700">
                      {formatEuros(row.homeCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* WHERE TO CHARGE                                                       */}
        {/* ------------------------------------------------------------------ */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-600" />
            ¿Dónde cargar tu coche eléctrico?
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Encuentra electrolineras y puntos de recarga públicos cerca de ti.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/carga-ev"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Zap className="w-4 h-4" />
              Todos los cargadores
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/carga-ev/madrid"
              className="inline-flex items-center gap-2 bg-gray-100 hover:bg-green-50 hover:text-green-700 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Cargadores en Madrid
            </Link>
            <Link
              href="/carga-ev/barcelona"
              className="inline-flex items-center gap-2 bg-gray-100 hover:bg-green-50 hover:text-green-700 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Cargadores en Barcelona
            </Link>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* AFFILIATE WIDGET                                                      */}
        {/* ------------------------------------------------------------------ */}
        <AffiliateWidget type="ev-charger" className="mb-6" />

        {/* ------------------------------------------------------------------ */}
        {/* FAQ                                                                   */}
        {/* ------------------------------------------------------------------ */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: [
                  {
                    "@type": "Question",
                    name: "¿Cuánto cuesta cargar un coche eléctrico en casa?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Cargar un coche eléctrico en casa cuesta entre 4€ y 10€ por carga completa, según la batería del vehículo. Con una tarifa media de 0,15 €/kWh (tarifa valle nocturna), un Tesla Model 3 de 60 kWh cuesta unos 9€ en carga completa. Una recarga parcial del 20% al 80% (36 kWh) sale por unos 5,40€.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "¿Cuánto cuesta cargar en una electrolinera pública?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "En electrolineras públicas el precio varía según el operador y la velocidad: carga lenta (AC, 22 kW) suele costar entre 0,25 y 0,35 €/kWh; carga rápida (DC, 50 kW) entre 0,40 y 0,50 €/kWh; y ultra-rápida (150 kW+) puede superar los 0,65 €/kWh. La misma carga de 36 kWh costaría entre 9€ y 23€ en pública, frente a los 5,40€ en casa.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "¿Es más barato el coche eléctrico que la gasolina?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Sí, en casi todos los escenarios. Cargando en casa (~0,15 €/kWh) el coste por 100 km con un eléctrico es de 2-3€, frente a los 10-12€ de un gasolina (7 L/100km a 1,55 €/L) o los 7-8€ de un diésel (5,5 L/100km a 1,35 €/L). Incluso cargando siempre en electrolineras rápidas (~0,45 €/kWh), el coste eléctrico por 100 km es de unos 7€, aún inferior a la gasolina.",
                    },
                  },
                ],
              }),
            }}
          />
          <h2 className="text-lg font-bold text-gray-900 mb-5">
            Preguntas frecuentes sobre el coste de carga
          </h2>
          <div className="space-y-5 divide-y divide-gray-100">
            <div className="pt-0">
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Cuánto cuesta cargar un coche eléctrico en casa?
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Cargar en casa es la opción más económica. Con una tarifa media de{" "}
                <strong>0,15 €/kWh</strong> (tarifa valle nocturna), un coche de 60 kWh
                cuesta unos <strong>9€</strong> en carga completa. Una carga parcial del
                20% al 80% (36 kWh) sale por unos <strong>5,40€</strong>. Los
                cargadores <em>wallbox</em> de 7,4 kW reducen el tiempo a 5-8 horas.
              </p>
            </div>
            <div className="pt-5">
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Cuánto cuesta cargar en una electrolinera pública?
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                El precio varía según la potencia y el operador.{" "}
                <strong>Carga lenta AC (22 kW)</strong>: 0,25–0,35 €/kWh.{" "}
                <strong>Carga rápida DC (50 kW)</strong>: 0,40–0,50 €/kWh.{" "}
                <strong>Ultra-rápida (150 kW+)</strong>: desde 0,60 €/kWh. Esa misma carga de
                36 kWh que en casa cuesta 5,40€ puede llegar a 23€ en carga rápida.
              </p>
            </div>
            <div className="pt-5">
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Es más barato el coche eléctrico que la gasolina?
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Sí, en casi todos los escenarios. Cargando en casa el coste por 100 km
                es de{" "}
                <strong>
                  {formatEuros(DEFAULT_EV_CONSUMPTION * CHARGING_TYPES[0].pricePerKwh)}
                </strong>
                , frente a los{" "}
                <strong>{formatEuros(GASOLINE_CONSUMPTION * GASOLINE_PRICE)}</strong>{" "}
                de gasolina o los{" "}
                <strong>{formatEuros(DIESEL_CONSUMPTION * DIESEL_PRICE)}</strong> de
                diésel. Incluso en electrolinera rápida (~0,45 €/kWh) el coste eléctrico es
                de ~{formatEuros(DEFAULT_EV_CONSUMPTION * 0.45)} por 100 km, aún inferior a
                la gasolina.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* RELATED LINKS                                                         */}
        {/* ------------------------------------------------------------------ */}
        <RelatedLinks
          title="Más herramientas para conductores"
          links={[
            {
              title: "Cargadores EV en España",
              description:
                "Mapa y listado de todos los puntos de recarga. Filtra por potencia, conector y operador.",
              href: "/carga-ev",
              icon: <Zap className="w-5 h-5" />,
            },
            {
              title: "Calculadora de ruta",
              description:
                "Calcula el coste total de tu viaje: combustible, peajes y emisiones CO₂.",
              href: "/calculadora",
              icon: <Calculator className="w-5 h-5" />,
            },
            {
              title: "Blog — consejos EV",
              description:
                "Artículos sobre coches eléctricos, carga en casa y ahorro en carretera.",
              href: "/blog",
              icon: <Info className="w-5 h-5" />,
            },
          ]}
        />
      </div>
    </div>
  );
}
