/**
 * /pulso — Indice Nacional de Pulso Provincial
 *
 * Grid of 52 provinces showing real-time summary: active incident count,
 * ICA air quality level, and latest fuel price. Sorted by incident count.
 *
 * Data source: Prisma (Postgres) — real production queries.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PROVINCES, PROVINCE_NAMES } from "@/lib/geo/ine-codes";
import { slugify } from "@/lib/geo/slugify";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  Activity,
  AlertTriangle,
  Fuel,
  MapPin,
  ArrowRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const revalidate = 120;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Pulso de Espana — Estado del transporte por provincia en tiempo real",
  description:
    "Estado del transporte en las 52 provincias espanolas: incidencias de trafico, calidad del aire y precios de combustible actualizados en tiempo real.",
  alternates: { canonical: `${BASE_URL}/pulso` },
  openGraph: {
    title: "Pulso de Espana — Transporte por provincia",
    description:
      "52 provincias. Incidencias, calidad del aire, combustible. Datos actualizados cada 2 minutos.",
    url: `${BASE_URL}/pulso`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// ICA helpers
// ---------------------------------------------------------------------------

const ICA_DOT_COLORS: Record<number, string> = {
  1: "#059669",
  2: "#84cc16",
  3: "#eab308",
  4: "#f97316",
  5: "#dc2626",
  6: "#7c2d12",
};

const ICA_LABELS: Record<number, string> = {
  1: "Buena",
  2: "Razonable",
  3: "Regular",
  4: "Desfavorable",
  5: "Muy desfavorable",
  6: "Extrema",
};

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getNationalPulseData() {
  const now = new Date();

  const [incidentGroups, airQualityStations, fuelPrices, weatherGroups] =
    await Promise.all([
      // Incident counts by province
      prisma.trafficIncident.groupBy({
        by: ["province"],
        where: { isActive: true },
        _count: { _all: true },
      }),

      // Air quality stations with latest reading
      prisma.airQualityStation.findMany({
        include: {
          readings: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),

      // Latest fuel prices per province (one per province, most recent)
      prisma.cNMCFuelPrice.findMany({
        where: {
          date: {
            gte: new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() - 5
            ),
          },
        },
        orderBy: { date: "desc" },
        distinct: ["province"],
        select: {
          province: true,
          priceGasoleoA: true,
          priceGasolina95: true,
        },
      }),

      // Weather alert counts by province
      prisma.weatherAlert.groupBy({
        by: ["province"],
        where: { isActive: true },
        _count: { _all: true },
      }),
    ]);

  // Build incident count map: province code → count
  const incidentMap = new Map<string, number>();
  for (const g of incidentGroups) {
    if (g.province) incidentMap.set(g.province, g._count._all);
  }

  // Build weather alert count map
  const weatherMap = new Map<string, number>();
  for (const g of weatherGroups) {
    if (g.province) weatherMap.set(g.province, g._count._all);
  }

  // Build ICA map: province code → average ICA
  const icaByProvince = new Map<string, number[]>();
  for (const station of airQualityStations) {
    const reading = station.readings[0];
    if (station.province && reading?.ica != null) {
      const arr = icaByProvince.get(station.province) || [];
      arr.push(reading.ica);
      icaByProvince.set(station.province, arr);
    }
  }
  const icaMap = new Map<string, number>();
  for (const [code, values] of icaByProvince) {
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    icaMap.set(code, avg);
  }

  // Build fuel map: province code → { gasoleoA, gasolina95 }
  const fuelMap = new Map<
    string,
    { gasoleoA: number | null; gasolina95: number | null }
  >();
  for (const fp of fuelPrices) {
    if (!fuelMap.has(fp.province)) {
      fuelMap.set(fp.province, {
        gasoleoA: fp.priceGasoleoA ? Number(fp.priceGasoleoA) : null,
        gasolina95: fp.priceGasolina95 ? Number(fp.priceGasolina95) : null,
      });
    }
  }

  // Assemble province cards
  const cards = PROVINCES.map((p) => ({
    code: p.code,
    name: PROVINCE_NAMES[p.code] || p.name,
    slug: slugify(p.name),
    incidents: incidentMap.get(p.code) ?? 0,
    weatherAlerts: weatherMap.get(p.code) ?? 0,
    ica: icaMap.get(p.code) ?? null,
    gasoleoA: fuelMap.get(p.code)?.gasoleoA ?? null,
  }));

  // Sort: most incidents first, then alphabetically
  cards.sort((a, b) => b.incidents - a.incidents || a.name.localeCompare(b.name));

  const totalIncidents = cards.reduce((s, c) => s + c.incidents, 0);
  const totalAlerts = cards.reduce((s, c) => s + c.weatherAlerts, 0);

  return { cards, totalIncidents, totalAlerts };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PulsoIndexPage() {
  const { cards, totalIncidents, totalAlerts } = await getNationalPulseData();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Pulso", href: "/pulso" },
        ]}
      />

      {/* ---- Hero ---- */}
      <div className="space-y-2">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-50">
          Pulso de Espana
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl">
          Estado del transporte en las 52 provincias. Incidencias de trafico,
          alertas meteorologicas, calidad del aire y precios de combustible
          actualizados en tiempo real.
        </p>
      </div>

      {/* ---- National summary ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard
          label="Incidencias activas"
          value={totalIncidents}
          icon={<AlertTriangle className="w-4 h-4" />}
          color={totalIncidents > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}
        />
        <SummaryCard
          label="Alertas meteo"
          value={totalAlerts}
          icon={<Activity className="w-4 h-4" />}
          color={totalAlerts > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}
        />
        <SummaryCard
          label="Provincias"
          value={cards.length}
          icon={<MapPin className="w-4 h-4" />}
          color="text-tl-600 dark:text-tl-400"
        />
        <SummaryCard
          label="Con datos ICA"
          value={cards.filter((c) => c.ica != null).length}
          icon={<Activity className="w-4 h-4" />}
          color="text-tl-600 dark:text-tl-400"
        />
      </div>

      {/* ---- Province grid ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.code}
            href={`/pulso/${card.slug}`}
            className="group block bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md hover:border-tl-300 dark:hover:border-tl-700 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-600 dark:group-hover:text-tl-400 transition-colors">
                {card.name}
              </h2>
              <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-tl-500 transition-colors" />
            </div>

            <div className="flex items-center gap-3 text-sm">
              {/* Incidents */}
              <div className="flex items-center gap-1">
                {card.incidents > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                    <AlertTriangle className="w-3 h-3" />
                    {card.incidents}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                    0
                  </span>
                )}
              </div>

              {/* Weather alerts */}
              {card.weatherAlerts > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                  {card.weatherAlerts} meteo
                </span>
              )}

              {/* ICA dot */}
              {card.ica != null && (
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        ICA_DOT_COLORS[Math.max(1, Math.min(6, card.ica))],
                    }}
                    title={`ICA ${card.ica}: ${ICA_LABELS[Math.max(1, Math.min(6, card.ica))]}`}
                  />
                  ICA {card.ica}
                </span>
              )}
            </div>

            {/* Fuel price */}
            {card.gasoleoA != null && (
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                <Fuel className="w-3 h-3" />
                <span className="font-mono">{card.gasoleoA.toFixed(3)}</span>{" "}
                EUR/L gasoleo
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* ---- Data attribution ---- */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-4">
        Datos: DGT, AEMET, MITECO, CNMC, Renfe. Actualizado cada 2 minutos.
      </p>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
        {icon} {label}
      </div>
      <div className={`text-2xl font-heading font-bold ${color}`}>
        {value}
      </div>
    </div>
  );
}
