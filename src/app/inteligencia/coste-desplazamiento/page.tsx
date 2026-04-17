import type { Metadata } from "next";
import {
  Car,
  Train,
  Plane,
  Calculator,
  Leaf,
  Shield,
  BarChart3,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  StructuredData,
  generateDatasetSchema,
} from "@/components/seo/StructuredData";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import prisma from "@/lib/db";
import { CORRIDORS } from "@/lib/corridors";
import { TripCostCalculator } from "./calculator";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title:
    "Calculadora de coste de viaje — Coche vs Tren vs Avion",
  description:
    "Compara el coste, tiempo, emisiones CO2 y seguridad de viajar en coche, tren o avion entre las principales ciudades espanolas. Datos reales de combustible CNMC y accidentes DGT.",
  alternates: { canonical: `${BASE_URL}/inteligencia/coste-desplazamiento` },
  openGraph: {
    title: "Calculadora de coste de viaje — Coche vs Tren vs Avion",
    description:
      "Comparativa multimodal de coste, tiempo, CO2 y riesgo entre 12 corredores espanoles. Datos de CNMC, DGT y calculos propios.",
    url: `${BASE_URL}/inteligencia/coste-desplazamiento`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

export default async function CosteDesplazamientoPage() {
  // Fetch data in parallel
  const [fuelPrices, accidentRaw] = await Promise.all([
    // National average fuel prices (latest date)
    prisma.cNMCFuelPrice
      .findMany({
        where: {
          priceGasoleoA: { not: null },
          priceGasolina95: { not: null },
        },
        orderBy: { date: "desc" },
        take: 52, // ~52 provinces, latest date
        select: {
          province: true,
          priceGasoleoA: true,
          priceGasolina95: true,
          date: true,
        },
      })
      .catch(() => []),

    // Accident stats grouped by road (for corridor risk)
    prisma.accidentMicrodata
      .groupBy({
        by: ["roadNumber"],
        where: {
          year: { gte: 2019 },
          roadNumber: {
            in: CORRIDORS.flatMap((c) => c.roads),
          },
        },
        _count: true,
        _sum: {
          fatalities: true,
          hospitalized: true,
        },
      })
      .catch(() => []),
  ]);

  // Compute national fuel averages
  let avgGasoleoA = 1.45; // fallback
  let avgGasolina95 = 1.55; // fallback
  let fuelDate: string | null = null;

  if (fuelPrices.length > 0) {
    const gasoleoValues = fuelPrices
      .map((fp) => (fp.priceGasoleoA ? Number(fp.priceGasoleoA) : null))
      .filter((v): v is number => v !== null);
    const gasolina95Values = fuelPrices
      .map((fp) => (fp.priceGasolina95 ? Number(fp.priceGasolina95) : null))
      .filter((v): v is number => v !== null);

    if (gasoleoValues.length > 0) {
      avgGasoleoA =
        Math.round(
          (gasoleoValues.reduce((sum, v) => sum + v, 0) /
            gasoleoValues.length) *
            1000
        ) / 1000;
    }
    if (gasolina95Values.length > 0) {
      avgGasolina95 =
        Math.round(
          (gasolina95Values.reduce((sum, v) => sum + v, 0) /
            gasolina95Values.length) *
            1000
        ) / 1000;
    }

    fuelDate = fuelPrices[0]?.date
      ? fuelPrices[0].date instanceof Date
        ? fuelPrices[0].date.toISOString().slice(0, 10)
        : String(fuelPrices[0].date).slice(0, 10)
      : null;
  }

  // Build accident stats lookup by road
  const accidentsByRoad: Record<
    string,
    { total: number; fatalities: number; hospitalized: number }
  > = {};
  for (const row of accidentRaw) {
    if (row.roadNumber) {
      accidentsByRoad[row.roadNumber] = {
        total: row._count,
        fatalities: row._sum?.fatalities ?? 0,
        hospitalized: row._sum?.hospitalized ?? 0,
      };
    }
  }

  return (
    <>
      <StructuredData
        data={generateDatasetSchema({
          name: "Calculadora de coste de viaje multimodal en Espana",
          description:
            "Comparativa de coste, tiempo, emisiones CO2 y seguridad entre coche, tren y avion para los principales corredores de transporte espanoles.",
          url: `${BASE_URL}/inteligencia/coste-desplazamiento`,
          keywords: [
            "calculadora coste viaje",
            "coche vs tren vs avion",
            "emisiones CO2 transporte",
            "comparativa transporte Espana",
          ],
          spatialCoverage: "Espana",
        })}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Inteligencia", href: "/inteligencia" },
            {
              name: "Coste Desplazamiento",
              href: "/inteligencia/coste-desplazamiento",
            },
          ]}
        />

        {/* Hero */}
        <header className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
            Calculadora de coste de viaje
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl">
            Compara el coste, tiempo, emisiones de CO<sub>2</sub> y seguridad de
            viajar en coche, tren o avion entre las principales ciudades
            espanolas. Datos reales de combustible y accidentes.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-tl-50 dark:bg-tl-900/40 text-tl-700 dark:text-tl-300 border border-tl-200 dark:border-tl-800">
              <Calculator className="w-4 h-4" />
              Calculadora interactiva
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              <Car className="w-4 h-4" />
              Coche
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              <Train className="w-4 h-4" />
              Tren
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              <Plane className="w-4 h-4" />
              Avion
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Leaf className="w-4 h-4" />
              Emisiones CO<sub>2</sub>
            </span>
          </div>
        </header>

        {/* Features overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-tl-500" />
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                Coste real
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Precio de combustible actualizado diariamente desde la CNMC.
              Estimaciones de tren y avion con tarifas base.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                Huella de carbono
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Emisiones de CO<sub>2</sub> por pasajero y kilometro segun
              factores de la Agencia Europea de Medio Ambiente y MITECO.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-tl-amber-500" />
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                Seguridad vial
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Datos de accidentes por corredor (DGT, 2019-2023). Comparativa de
              siniestralidad por modo de transporte.
            </p>
          </div>
        </div>

        {/* Calculator */}
        <TripCostCalculator
          corridors={CORRIDORS}
          fuelData={{
            gasoleoA: avgGasoleoA,
            gasolina95: avgGasolina95,
            date: fuelDate,
          }}
          accidentsByRoad={accidentsByRoad}
        />

        {/* Attribution */}
        <p className="text-xs text-gray-400 dark:text-gray-600">
          Fuente: CNMC (combustible), DGT (accidentes), EEA y MITECO (emisiones
          CO<sub>2</sub>), calculos propios. Precios de tren y avion son
          estimaciones orientativas. Ultima actualizacion de combustible:{" "}
          {fuelDate ?? "N/D"}.
        </p>

        <RelatedLinks
          links={[
            {
              title: "Corredores de transporte",
              description:
                "Comparativa completa de los 12 corredores principales",
              href: "/corredores",
              icon: <Car className="w-5 h-5" />,
            },
            {
              title: "Precio del combustible",
              description:
                "Historico de precios de gasolina y gasoleo por provincia",
              href: "/combustible",
              icon: <BarChart3 className="w-5 h-5" />,
            },
            {
              title: "Red ferroviaria",
              description:
                "Mapa de trenes en tiempo real, estaciones y lineas",
              href: "/trenes",
              icon: <Train className="w-5 h-5" />,
            },
            {
              title: "Aviacion",
              description: "Aeropuertos AENA y posiciones de aeronaves",
              href: "/aviacion",
              icon: <Plane className="w-5 h-5" />,
            },
          ]}
        />
      </main>
    </>
  );
}
