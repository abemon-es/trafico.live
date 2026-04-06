"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Car,
  Train,
  Plane,
  Clock,
  Fuel,
  Leaf,
  Shield,
  ArrowRight,
  MapPin,
  Check,
  Calculator,
  AlertTriangle,
} from "lucide-react";
import type { Corridor } from "@/lib/corridors";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface FuelData {
  gasoleoA: number;
  gasolina95: number;
  date: string | null;
}

interface CorridorCostProps {
  corridors: Corridor[];
  fuelData: FuelData;
  accidentsByRoad: Record<
    string,
    { total: number; fatalities: number; hospitalized: number }
  >;
}

interface TripResult {
  car: {
    time: number;
    costGasoleo: number;
    costGasolina95: number;
    co2: number;
  };
  train: {
    time: number | null;
    brands: string[];
    priceFrom: number | null;
    co2: number;
  } | null;
  plane: {
    time: number;
    priceEstimate: number;
    airports: string;
    co2: number;
  } | null;
  risk: {
    accidentsPerYear: number;
    fatalities: number;
  };
  corridor: Corridor;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const CO2_FACTORS = { car: 0.12, train: 0.014, plane: 0.255 };
const CAR_CONSUMPTION = 7; // L/100km

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function formatPrice(n: number): string {
  return n.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCO2(kg: number): string {
  return kg.toLocaleString("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Static train price estimates */
const TRAIN_PRICES: Record<string, number> = {
  "madrid-barcelona": 25,
  "madrid-sevilla": 25,
  "madrid-valencia": 15,
  "barcelona-valencia": 20,
  "madrid-malaga": 25,
  "madrid-bilbao": 25,
  "sevilla-malaga": 15,
  "valencia-alicante": 10,
  "madrid-zaragoza": 15,
  "barcelona-zaragoza": 15,
  "madrid-alicante": 20,
  "madrid-coruna": 30,
};

/** Rough plane estimate: base + per-km */
function estimatePlanePrice(distanceKm: number): number {
  return Math.round(30 + distanceKm * 0.08);
}

/* -------------------------------------------------------------------------- */
/*  Unique cities from corridors                                               */
/* -------------------------------------------------------------------------- */

function getUniqueCities(corridors: Corridor[]) {
  const cities = new Map<string, { city: string; province: string }>();
  for (const c of corridors) {
    if (!cities.has(c.origin.province)) {
      cities.set(c.origin.province, {
        city: c.origin.city,
        province: c.origin.province,
      });
    }
    if (!cities.has(c.destination.province)) {
      cities.set(c.destination.province, {
        city: c.destination.city,
        province: c.destination.province,
      });
    }
  }
  return Array.from(cities.values()).sort((a, b) =>
    a.city.localeCompare(b.city, "es")
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function TripCostCalculator({
  corridors,
  fuelData,
  accidentsByRoad,
}: CorridorCostProps) {
  const [originProvince, setOriginProvince] = useState<string>("");
  const [destProvince, setDestProvince] = useState<string>("");

  const cities = useMemo(() => getUniqueCities(corridors), [corridors]);

  // Get valid destinations for selected origin
  const validDestinations = useMemo(() => {
    if (!originProvince) return [];
    const dests = new Set<string>();
    for (const c of corridors) {
      if (c.origin.province === originProvince)
        dests.add(c.destination.province);
      if (c.destination.province === originProvince)
        dests.add(c.origin.province);
    }
    return cities.filter((city) => dests.has(city.province));
  }, [originProvince, corridors, cities]);

  // Find corridor and compute trip
  const tripResult = useMemo<TripResult | null>(() => {
    if (!originProvince || !destProvince) return null;

    const corridor = corridors.find(
      (c) =>
        (c.origin.province === originProvince &&
          c.destination.province === destProvince) ||
        (c.origin.province === destProvince &&
          c.destination.province === originProvince)
    );
    if (!corridor) return null;

    const hasRail = !!(
      corridor.trainBrands && corridor.trainBrands.length > 0
    );
    const hasAir = !!(corridor.origin.iata && corridor.destination.iata);

    // Car cost
    const carCostGasoleo =
      (corridor.distance / 100) * CAR_CONSUMPTION * fuelData.gasoleoA;
    const carCostGasolina95 =
      (corridor.distance / 100) * CAR_CONSUMPTION * fuelData.gasolina95;
    const co2Car = corridor.distance * CO2_FACTORS.car;

    // Train
    const trainPrice = TRAIN_PRICES[corridor.slug] ?? null;
    const co2Train = corridor.distance * CO2_FACTORS.train;

    // Plane
    const planePrice = estimatePlanePrice(corridor.distance);
    const co2Plane = corridor.distance * CO2_FACTORS.plane;
    const planeTime = 60 + 120; // 1h flight + 2h airport

    // Accident risk from corridor roads
    let accTotal = 0;
    let accFatalities = 0;
    for (const road of corridor.roads) {
      const stats = accidentsByRoad[road];
      if (stats) {
        accTotal += stats.total;
        accFatalities += stats.fatalities;
      }
    }

    return {
      car: {
        time: corridor.driveTime,
        costGasoleo: Math.round(carCostGasoleo * 100) / 100,
        costGasolina95: Math.round(carCostGasolina95 * 100) / 100,
        co2: Math.round(co2Car * 10) / 10,
      },
      train: hasRail
        ? {
            time: corridor.trainTime ?? null,
            brands: corridor.trainBrands ?? [],
            priceFrom: trainPrice,
            co2: Math.round(co2Train * 10) / 10,
          }
        : null,
      plane: hasAir
        ? {
            time: planeTime,
            priceEstimate: planePrice,
            airports: `${corridor.origin.iata} — ${corridor.destination.iata}`,
            co2: Math.round(co2Plane * 10) / 10,
          }
        : null,
      risk: {
        accidentsPerYear: Math.round(accTotal / 5),
        fatalities: accFatalities,
      },
      corridor,
    };
  }, [originProvince, destProvince, corridors, fuelData, accidentsByRoad]);

  const handleOriginChange = useCallback(
    (value: string) => {
      setOriginProvince(value);
      // Reset destination if it's no longer valid
      if (destProvince) {
        const valid = corridors.some(
          (c) =>
            (c.origin.province === value &&
              c.destination.province === destProvince) ||
            (c.origin.province === destProvince &&
              c.destination.province === value)
        );
        if (!valid) setDestProvince("");
      }
    },
    [destProvince, corridors]
  );

  // Determine winners
  const winners = useMemo(() => {
    if (!tripResult) return { fastest: "", cheapest: "", greenest: "" };

    const times: { mode: string; t: number }[] = [
      { mode: "car", t: tripResult.car.time },
    ];
    if (tripResult.train?.time)
      times.push({ mode: "train", t: tripResult.train.time });
    if (tripResult.plane)
      times.push({ mode: "plane", t: tripResult.plane.time });

    const costs: { mode: string; c: number }[] = [
      { mode: "car", c: tripResult.car.costGasoleo },
    ];
    if (tripResult.train?.priceFrom)
      costs.push({ mode: "train", c: tripResult.train.priceFrom });
    if (tripResult.plane)
      costs.push({ mode: "plane", c: tripResult.plane.priceEstimate });

    const co2s: { mode: string; e: number }[] = [
      { mode: "car", e: tripResult.car.co2 },
    ];
    if (tripResult.train)
      co2s.push({ mode: "train", e: tripResult.train.co2 });
    if (tripResult.plane)
      co2s.push({ mode: "plane", e: tripResult.plane.co2 });

    return {
      fastest: times.sort((a, b) => a.t - b.t)[0]?.mode ?? "",
      cheapest: costs.sort((a, b) => a.c - b.c)[0]?.mode ?? "",
      greenest: co2s.sort((a, b) => a.e - b.e)[0]?.mode ?? "",
    };
  }, [tripResult]);

  // City labels
  const originLabel =
    cities.find((c) => c.province === originProvince)?.city ?? "";
  const destLabel =
    cities.find((c) => c.province === destProvince)?.city ?? "";

  return (
    <div className="space-y-8">
      {/* ---- FORM ---- */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Calculator className="w-5 h-5 text-tl-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Selecciona tu ruta
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
          {/* Origin */}
          <div>
            <label
              htmlFor="origin"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              <MapPin className="w-3.5 h-3.5 inline mr-1" />
              Origen
            </label>
            <select
              id="origin"
              value={originProvince}
              onChange={(e) => handleOriginChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-tl-500 focus:border-tl-500 transition-colors"
            >
              <option value="">Seleccionar ciudad</option>
              {cities.map((city) => (
                <option key={city.province} value={city.province}>
                  {city.city}
                </option>
              ))}
            </select>
          </div>

          {/* Arrow */}
          <div className="hidden sm:flex items-center justify-center pt-6">
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>

          {/* Destination */}
          <div>
            <label
              htmlFor="destination"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              <MapPin className="w-3.5 h-3.5 inline mr-1" />
              Destino
            </label>
            <select
              id="destination"
              value={destProvince}
              onChange={(e) => setDestProvince(e.target.value)}
              disabled={!originProvince}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-tl-500 focus:border-tl-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {originProvince
                  ? "Seleccionar destino"
                  : "Elige primero el origen"}
              </option>
              {validDestinations.map((city) => (
                <option key={city.province} value={city.province}>
                  {city.city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fuel info */}
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
          <Fuel className="w-3.5 h-3.5" />
          <span>
            Precios combustible:{" "}
            <span className="font-mono font-medium">
              {formatPrice(fuelData.gasoleoA)}
            </span>{" "}
            EUR/L gasoleo A,{" "}
            <span className="font-mono font-medium">
              {formatPrice(fuelData.gasolina95)}
            </span>{" "}
            EUR/L gasolina 95
            {fuelData.date && (
              <span className="text-gray-400 dark:text-gray-600">
                {" "}
                ({fuelData.date})
              </span>
            )}
          </span>
        </div>
      </div>

      {/* ---- NO CORRIDOR MESSAGE ---- */}
      {originProvince && destProvince && !tripResult && (
        <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-tl-amber-400 mx-auto mb-3" />
          <p className="text-gray-700 dark:text-gray-300 font-medium">
            Ruta no disponible
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Consulta nuestros corredores principales en la seccion inferior.
          </p>
        </div>
      )}

      {/* ---- RESULTS ---- */}
      {tripResult && (
        <div className="space-y-6">
          {/* Route header */}
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <span className="text-lg font-bold">{originLabel}</span>
            <ArrowRight className="w-5 h-5 text-tl-500" />
            <span className="text-lg font-bold">{destLabel}</span>
            <span className="text-sm text-gray-500 dark:text-gray-500 font-mono ml-2">
              {tripResult.corridor.distance} km
            </span>
          </div>

          {/* Mode cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* --- CAR --- */}
            <ModeCard
              mode="car"
              icon={<Car className="w-6 h-6" />}
              title="Coche"
              winners={winners}
              time={tripResult.car.time}
              cost={tripResult.car.costGasoleo}
              costLabel="gasoleo A"
              costAlt={tripResult.car.costGasolina95}
              costAltLabel="gasolina 95"
              co2={tripResult.car.co2}
              riskLabel={
                tripResult.risk.accidentsPerYear > 0
                  ? `${tripResult.risk.accidentsPerYear} accidentes/ano en esta ruta`
                  : "Sin datos de accidentes"
              }
              riskLevel="medio"
              extra={
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Carreteras: {tripResult.corridor.roads.join(", ")}
                </div>
              }
            />

            {/* --- TRAIN --- */}
            {tripResult.train ? (
              <ModeCard
                mode="train"
                icon={<Train className="w-6 h-6" />}
                title="Tren"
                winners={winners}
                time={tripResult.train.time}
                cost={tripResult.train.priceFrom}
                costLabel="desde"
                co2={tripResult.train.co2}
                riskLabel="Indice de siniestralidad muy bajo"
                riskLevel="bajo"
                extra={
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tripResult.train.brands.map((b) => (
                      <span
                        key={b}
                        className="px-2 py-0.5 text-xs font-medium rounded bg-tl-50 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                }
              />
            ) : (
              <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex items-center justify-center text-center">
                <div>
                  <Train className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Sin conexion ferroviaria directa
                  </p>
                </div>
              </div>
            )}

            {/* --- PLANE --- */}
            {tripResult.plane ? (
              <ModeCard
                mode="plane"
                icon={<Plane className="w-6 h-6" />}
                title="Avion"
                winners={winners}
                time={tripResult.plane.time}
                cost={tripResult.plane.priceEstimate}
                costLabel="estimado"
                co2={tripResult.plane.co2}
                riskLabel="Indice de siniestralidad minimo"
                riskLevel="bajo"
                extra={
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {tripResult.plane.airports} (incluye 2h aeropuerto)
                  </div>
                }
              />
            ) : (
              <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex items-center justify-center text-center">
                <div>
                  <Plane className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Sin conexion aerea directa
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* CO2 Comparison Bar */}
          <CO2ComparisonBar
            car={tripResult.car.co2}
            train={tripResult.train?.co2 ?? null}
            plane={tripResult.plane?.co2 ?? null}
          />

          {/* Methodology note */}
          <div className="text-xs text-gray-400 dark:text-gray-600 space-y-1">
            <p>
              Consumo medio: {CAR_CONSUMPTION} L/100km. Emisiones CO
              <sub>2</sub>: coche {CO2_FACTORS.car} kg/km, tren{" "}
              {CO2_FACTORS.train} kg/km, avion {CO2_FACTORS.plane} kg/km
              (fuente: EEA, MITECO).
            </p>
            <p>
              Precios del tren orientativos (tarifa base). Los precios del avion
              son estimaciones para reserva anticipada.
            </p>
          </div>
        </div>
      )}

      {/* ---- CORRIDOR GRID ---- */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Corredores disponibles
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {corridors.map((c) => {
            const hasRail = !!(
              c.trainBrands && c.trainBrands.length > 0
            );
            const hasAir = !!(c.origin.iata && c.destination.iata);

            return (
              <button
                key={c.slug}
                onClick={() => {
                  setOriginProvince(c.origin.province);
                  setDestProvince(c.destination.province);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:shadow-md hover:border-tl-300 dark:hover:border-tl-700 transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-tl-600 dark:group-hover:text-tl-400 transition-colors text-sm">
                    {c.name}
                  </h3>
                  <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-tl-500 transition-colors flex-shrink-0" />
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <span className="font-mono font-medium">
                    {c.distance} km
                  </span>
                  <span>{formatTime(c.driveTime)}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-tl-amber-50 dark:bg-tl-amber-900/30 text-tl-amber-700 dark:text-tl-amber-300">
                    <Car className="w-2.5 h-2.5" />
                    Coche
                  </span>
                  {hasRail && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-tl-50 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300">
                      <Train className="w-2.5 h-2.5" />
                      Tren
                    </span>
                  )}
                  {hasAir && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-tl-sea-50 dark:bg-tl-sea-900/30 text-tl-sea-700 dark:text-tl-sea-300">
                      <Plane className="w-2.5 h-2.5" />
                      Avion
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ModeCard                                                                   */
/* -------------------------------------------------------------------------- */

interface ModeCardProps {
  mode: "car" | "train" | "plane";
  icon: React.ReactNode;
  title: string;
  winners: { fastest: string; cheapest: string; greenest: string };
  time: number | null;
  cost: number | null;
  costLabel: string;
  costAlt?: number;
  costAltLabel?: string;
  co2: number;
  riskLabel: string;
  riskLevel: "bajo" | "medio" | "alto";
  extra?: React.ReactNode;
}

function ModeCard({
  mode,
  icon,
  title,
  winners,
  time,
  cost,
  costLabel,
  costAlt,
  costAltLabel,
  co2,
  riskLabel,
  riskLevel,
  extra,
}: ModeCardProps) {
  const isWinnerTime = winners.fastest === mode;
  const isWinnerCost = winners.cheapest === mode;
  const isWinnerCO2 = winners.greenest === mode;
  const isAnyWinner = isWinnerTime || isWinnerCost || isWinnerCO2;

  const modeColors = {
    car: "text-tl-amber-500",
    train: "text-tl-500",
    plane: "text-tl-sea-500",
  };

  const riskColors = {
    bajo: "text-green-600 dark:text-green-400",
    medio: "text-tl-amber-500",
    alto: "text-red-500",
  };

  return (
    <div
      className={`bg-white dark:bg-gray-900 border rounded-2xl p-5 shadow-sm transition-all ${
        isAnyWinner
          ? "ring-2 ring-tl-500 border-tl-300 dark:border-tl-700"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={modeColors[mode]}>{icon}</span>
          <h3 className="font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-4 min-h-[24px]">
        {isWinnerTime && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-tl-50 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300">
            <Clock className="w-3 h-3" />
            Mas rapido
          </span>
        )}
        {isWinnerCost && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300">
            <Check className="w-3 h-3" />
            Mas barato
          </span>
        )}
        {isWinnerCO2 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
            <Leaf className="w-3 h-3" />
            Mas ecologico
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="space-y-3">
        {/* Time */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Tiempo
          </span>
          <span className="ml-auto font-mono font-bold text-gray-900 dark:text-gray-100">
            {time != null ? formatTime(time) : "—"}
          </span>
        </div>

        {/* Cost */}
        <div>
          <div className="flex items-center gap-2">
            <Fuel className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Coste{" "}
              <span className="text-xs text-gray-400">({costLabel})</span>
            </span>
            <span className="ml-auto font-mono font-bold text-gray-900 dark:text-gray-100">
              {cost != null ? `${formatPrice(cost)} EUR` : "—"}
            </span>
          </div>
          {costAlt != null && costAltLabel && (
            <div className="flex items-center gap-2 ml-6 mt-0.5">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {costAltLabel}
              </span>
              <span className="ml-auto font-mono text-xs text-gray-500 dark:text-gray-400">
                {formatPrice(costAlt)} EUR
              </span>
            </div>
          )}
        </div>

        {/* CO2 */}
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            CO<sub>2</sub>
          </span>
          <span
            className={`ml-auto font-mono font-bold ${
              isWinnerCO2
                ? "text-green-600 dark:text-green-400"
                : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {formatCO2(co2)} kg
          </span>
        </div>

        {/* Risk */}
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Seguridad
          </span>
          <span
            className={`ml-auto text-xs font-medium ${riskColors[riskLevel]}`}
          >
            {riskLabel}
          </span>
        </div>

        {extra}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  CO2 Comparison Bar                                                         */
/* -------------------------------------------------------------------------- */

function CO2ComparisonBar({
  car,
  train,
  plane,
}: {
  car: number;
  train: number | null;
  plane: number | null;
}) {
  const maxCO2 = Math.max(car, train ?? 0, plane ?? 0);
  if (maxCO2 === 0) return null;

  const entries: {
    label: string;
    value: number;
    color: string;
    icon: React.ReactNode;
  }[] = [];

  if (train != null) {
    entries.push({
      label: "Tren",
      value: train,
      color: "bg-emerald-500",
      icon: <Train className="w-3.5 h-3.5" />,
    });
  }
  entries.push({
    label: "Coche",
    value: car,
    color: "bg-tl-amber-400",
    icon: <Car className="w-3.5 h-3.5" />,
  });
  if (plane != null) {
    entries.push({
      label: "Avion",
      value: plane,
      color: "bg-red-400",
      icon: <Plane className="w-3.5 h-3.5" />,
    });
  }

  // Sort low -> high
  entries.sort((a, b) => a.value - b.value);

  // CO2 savings message
  const lowestCO2 = entries[0];
  const highestCO2 = entries[entries.length - 1];
  const savedKg =
    Math.round((highestCO2.value - lowestCO2.value) * 10) / 10;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Leaf className="w-5 h-5 text-emerald-500" />
        <h3 className="font-bold text-gray-900 dark:text-gray-100">
          Comparativa de emisiones CO<sub>2</sub>
        </h3>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.label} className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 w-16 text-xs text-gray-600 dark:text-gray-400">
              {entry.icon}
              {entry.label}
            </div>
            <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${entry.color} rounded-full transition-all duration-500`}
                style={{
                  width: `${Math.max((entry.value / maxCO2) * 100, 3)}%`,
                }}
              />
            </div>
            <span className="w-20 text-right font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
              {formatCO2(entry.value)} kg
            </span>
          </div>
        ))}
      </div>

      {savedKg > 0 && (
        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
            Elegir {lowestCO2.label.toLowerCase()} en lugar de{" "}
            {highestCO2.label.toLowerCase()} ahorra{" "}
            <span className="font-mono font-bold">
              {formatCO2(savedKg)} kg
            </span>{" "}
            de CO<sub>2</sub> por viaje.
          </p>
        </div>
      )}
    </div>
  );
}
