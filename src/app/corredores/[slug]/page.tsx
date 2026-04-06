import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Car,
  Train,
  Plane,
  Clock,
  Fuel,
  AlertTriangle,
  Leaf,
  ArrowRight,
  Ruler,
  Route,
  Users,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import prisma from "@/lib/db";
import {
  CORRIDORS,
  getCorridorBySlug,
  getAllCorridorSlugs,
  hasAirConnection,
  hasRailConnection,
  CO2_FACTORS,
  CAR_CONSUMPTION_L_100KM,
  TRAIN_PRICE_ESTIMATES,
} from "@/lib/corridors";
import { MobilityChart } from "./mobility-chart";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllCorridorSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const corridor = getCorridorBySlug(slug);

  if (!corridor) {
    return { title: "Corredor no encontrado" };
  }

  const modes: string[] = ["coche"];
  if (hasRailConnection(corridor)) modes.push("tren");
  if (hasAirConnection(corridor)) modes.push("avion");

  const title = `Corredor ${corridor.name}: ${modes.join(" vs ")} — Comparativa de transporte`;
  const description = `Compara ${modes.join(", ")} entre ${corridor.origin.city} y ${corridor.destination.city}. ${corridor.distance} km por carretera, ${formatTime(corridor.driveTime)} en coche${corridor.trainTime ? `, ${formatTime(corridor.trainTime)} en tren` : ""}. Datos reales de DGT, Renfe y CNMC.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/corredores/${slug}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/corredores/${slug}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("es-ES");
}

function formatPrice(n: number, decimals = 2): string {
  return n.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default async function CorredorDetailPage({ params }: Props) {
  const { slug } = await params;
  const corridor = getCorridorBySlug(slug);

  if (!corridor) {
    notFound();
  }

  const hasRail = hasRailConnection(corridor);
  const hasAir = hasAirConnection(corridor);

  // Fetch all data in parallel
  const [fuelPrice, activeIncidents, accidentStats, mobilityData, railways, airports] =
    await Promise.all([
      // Latest CNMC fuel price for origin province
      prisma.cNMCFuelPrice.findFirst({
        where: { province: corridor.origin.province },
        orderBy: { date: "desc" },
        select: {
          date: true,
          provinceName: true,
          priceGasoleoA: true,
          priceGasolina95: true,
        },
      }),

      // Active incidents on corridor roads
      prisma.trafficIncident.findMany({
        where: {
          isActive: true,
          roadNumber: { in: corridor.roads },
        },
        select: {
          id: true,
          roadNumber: true,
          severity: true,
          type: true,
          description: true,
          provinceName: true,
          startedAt: true,
        },
        orderBy: { startedAt: "desc" },
        take: 10,
      }),

      // Accident stats on corridor roads (2019-2023)
      prisma.accidentMicrodata.aggregate({
        where: {
          roadNumber: { in: corridor.roads },
          year: { gte: 2019 },
        },
        _count: true,
        _sum: {
          fatalities: true,
          hospitalized: true,
        },
      }),

      // Mobility flows (last 90 days)
      prisma.mobilityODFlow.findMany({
        where: {
          originProvince: corridor.origin.province,
          destProvince: corridor.destination.province,
        },
        orderBy: { date: "desc" },
        take: 90,
        select: {
          date: true,
          tripCount: true,
          avgDistanceKm: true,
        },
      }),

      // Railway routes
      hasRail
        ? prisma.railwayRoute.findMany({
            where: {
              brand: { in: corridor.trainBrands },
              OR: [
                {
                  originName: {
                    contains: corridor.origin.city,
                    mode: "insensitive",
                  },
                  destName: {
                    contains: corridor.destination.city,
                    mode: "insensitive",
                  },
                },
                {
                  originName: {
                    contains: corridor.destination.city,
                    mode: "insensitive",
                  },
                  destName: {
                    contains: corridor.origin.city,
                    mode: "insensitive",
                  },
                },
              ],
            },
            select: {
              slug: true,
              brand: true,
              originName: true,
              destName: true,
              stopsCount: true,
            },
            take: 10,
          })
        : [],

      // Airports
      hasAir
        ? prisma.airport.findMany({
            where: {
              iata: {
                in: [corridor.origin.iata!, corridor.destination.iata!],
              },
            },
            select: { iata: true, name: true, city: true },
          })
        : [],
    ]);

  // Compute cost estimates
  const gasoleoPrice = fuelPrice?.priceGasoleoA
    ? Number(fuelPrice.priceGasoleoA)
    : 1.45;
  const gasolina95Price = fuelPrice?.priceGasolina95
    ? Number(fuelPrice.priceGasolina95)
    : 1.55;
  const carCost =
    (corridor.distance / 100) * CAR_CONSUMPTION_L_100KM * gasoleoPrice;
  const trainPriceEstimate = TRAIN_PRICE_ESTIMATES[corridor.slug] ?? null;

  // CO2 estimates
  const co2Car = corridor.distance * CO2_FACTORS.car;
  const co2Train = hasRail ? corridor.distance * CO2_FACTORS.train : null;
  const co2Plane = hasAir ? corridor.distance * CO2_FACTORS.plane : null;

  // Severity breakdown
  const severityCounts: Record<string, number> = {};
  for (const inc of activeIncidents) {
    severityCounts[inc.severity] = (severityCounts[inc.severity] || 0) + 1;
  }

  const originAirport = airports.find((a) => a.iata === corridor.origin.iata);
  const destAirport = airports.find(
    (a) => a.iata === corridor.destination.iata
  );

  // Mobility chart data
  const mobilityChartData = mobilityData.map((m) => ({
    date: m.date.toISOString(),
    tripCount: m.tripCount,
    avgDistanceKm: m.avgDistanceKm ? Number(m.avgDistanceKm) : null,
  }));

  // Other corridors from same origin for related links
  const relatedCorridors = CORRIDORS.filter(
    (c) =>
      c.slug !== corridor.slug &&
      (c.origin.city === corridor.origin.city ||
        c.destination.city === corridor.origin.city)
  ).slice(0, 4);

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Corredor ${corridor.name}`,
    description: `Comparativa multimodal de transporte entre ${corridor.origin.city} y ${corridor.destination.city}.`,
    url: `${BASE_URL}/corredores/${slug}`,
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  return (
    <>
      <StructuredData data={webPageSchema} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Corredores", href: "/corredores" },
            { name: corridor.name, href: `/corredores/${slug}` },
          ]}
        />

        {/* 1. Hero */}
        <header className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
            {corridor.name}
          </h1>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-tl-amber-50 dark:bg-tl-amber-900/40 text-tl-amber-700 dark:text-tl-amber-300 border border-tl-amber-200 dark:border-tl-amber-800">
              <Car className="w-4 h-4" />
              Coche
            </span>
            {hasRail && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-tl-50 dark:bg-tl-900/40 text-tl-700 dark:text-tl-300 border border-tl-200 dark:border-tl-800">
                <Train className="w-4 h-4" />
                Tren ({corridor.trainBrands!.join(", ")})
              </span>
            )}
            {hasAir && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-tl-sea-50 dark:bg-tl-sea-900/40 text-tl-sea-700 dark:text-tl-sea-300 border border-tl-sea-200 dark:border-tl-sea-800">
                <Plane className="w-4 h-4" />
                Avion ({corridor.origin.iata} — {corridor.destination.iata})
              </span>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Comparativa de transporte entre{" "}
            <strong>{corridor.origin.city}</strong> y{" "}
            <strong>{corridor.destination.city}</strong>. Carreteras:{" "}
            {corridor.roads.join(", ")}.
          </p>
        </header>

        {/* 2. Modal comparison table */}
        <section
          aria-label="Comparativa por modo de transporte"
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Route className="w-5 h-5 text-tl-500" />
              Comparativa modal
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-5 py-3 text-left text-gray-500 dark:text-gray-400 font-medium" />
                  <th className="px-5 py-3 text-center font-semibold text-gray-900 dark:text-gray-100">
                    <div className="flex items-center justify-center gap-1.5">
                      <Car className="w-4 h-4 text-tl-amber-500" />
                      Coche
                    </div>
                  </th>
                  {hasRail && (
                    <th className="px-5 py-3 text-center font-semibold text-gray-900 dark:text-gray-100">
                      <div className="flex items-center justify-center gap-1.5">
                        <Train className="w-4 h-4 text-tl-500" />
                        Tren
                      </div>
                    </th>
                  )}
                  {hasAir && (
                    <th className="px-5 py-3 text-center font-semibold text-gray-900 dark:text-gray-100">
                      <div className="flex items-center justify-center gap-1.5">
                        <Plane className="w-4 h-4 text-tl-sea-500" />
                        Avion
                      </div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {/* Distance / Time */}
                <tr>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <Ruler className="w-4 h-4" /> Distancia
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                      {formatNumber(corridor.distance)}
                    </span>{" "}
                    <span className="text-gray-500">km</span>
                  </td>
                  {hasRail && (
                    <td className="px-5 py-3 text-center text-gray-400">—</td>
                  )}
                  {hasAir && (
                    <td className="px-5 py-3 text-center">
                      <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                        ~{formatNumber(Math.round(corridor.distance * 0.8))}
                      </span>{" "}
                      <span className="text-gray-500">km</span>
                    </td>
                  )}
                </tr>
                <tr>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Tiempo
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                      {formatTime(corridor.driveTime)}
                    </span>
                  </td>
                  {hasRail && (
                    <td className="px-5 py-3 text-center">
                      <span className="font-mono font-semibold text-tl-600 dark:text-tl-400">
                        {formatTime(corridor.trainTime!)}
                      </span>
                    </td>
                  )}
                  {hasAir && (
                    <td className="px-5 py-3 text-center">
                      <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                        ~1 h 15 min
                      </span>
                      <div className="text-xs text-gray-400 mt-0.5">
                        + embarque
                      </div>
                    </td>
                  )}
                </tr>

                {/* Cost */}
                <tr>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <Fuel className="w-4 h-4" /> Coste est.
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                      {formatPrice(carCost)}
                    </span>{" "}
                    <span className="text-gray-500">EUR</span>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Gasoleo a {formatPrice(gasoleoPrice, 3)} EUR/L
                    </div>
                  </td>
                  {hasRail && (
                    <td className="px-5 py-3 text-center">
                      {trainPriceEstimate ? (
                        <>
                          <span className="text-gray-500">desde </span>
                          <span className="font-mono font-semibold text-tl-600 dark:text-tl-400">
                            {trainPriceEstimate}
                          </span>{" "}
                          <span className="text-gray-500">EUR</span>
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  )}
                  {hasAir && (
                    <td className="px-5 py-3 text-center">
                      <span className="text-gray-500 text-xs">
                        Ver aeropuertos
                      </span>
                    </td>
                  )}
                </tr>

                {/* CO2 */}
                <tr>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <Leaf className="w-4 h-4" /> CO<sub>2</sub>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                      {formatPrice(co2Car, 1)}
                    </span>{" "}
                    <span className="text-gray-500">kg</span>
                  </td>
                  {hasRail && co2Train !== null && (
                    <td className="px-5 py-3 text-center">
                      <span className="font-mono font-semibold text-signal-green">
                        {formatPrice(co2Train, 1)}
                      </span>{" "}
                      <span className="text-gray-500">kg</span>
                      <div className="text-xs text-signal-green mt-0.5">
                        -{Math.round((1 - co2Train / co2Car) * 100)}% vs coche
                      </div>
                    </td>
                  )}
                  {hasAir && co2Plane !== null && (
                    <td className="px-5 py-3 text-center">
                      <span className="font-mono font-semibold text-signal-red">
                        {formatPrice(co2Plane, 1)}
                      </span>{" "}
                      <span className="text-gray-500">kg</span>
                      <div className="text-xs text-signal-red mt-0.5">
                        +{Math.round((co2Plane / co2Car - 1) * 100)}% vs coche
                      </div>
                    </td>
                  )}
                </tr>

                {/* Accident risk */}
                <tr>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" /> Riesgo
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                      {formatNumber(accidentStats._count)}
                    </span>{" "}
                    <span className="text-gray-500 text-xs">
                      accidentes (2019-2023)
                    </span>
                    {(accidentStats._sum.fatalities ?? 0) > 0 && (
                      <div className="text-xs text-signal-red mt-0.5">
                        {accidentStats._sum.fatalities} fallecidos,{" "}
                        {accidentStats._sum.hospitalized ?? 0} hospitalizados
                      </div>
                    )}
                  </td>
                  {hasRail && (
                    <td className="px-5 py-3 text-center text-xs text-signal-green">
                      Riesgo muy bajo
                    </td>
                  )}
                  {hasAir && (
                    <td className="px-5 py-3 text-center text-xs text-signal-green">
                      Riesgo muy bajo
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. Mobility data */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-tl-500" />
            Flujos de movilidad
          </h2>
          <MobilityChart
            data={mobilityChartData}
            originCity={corridor.origin.city}
            destCity={corridor.destination.city}
          />
          <p className="text-xs text-gray-400 mt-3">
            Fuente: Ministerio de Transportes — estudio de movilidad BigData
            (flujos provincia a provincia).
          </p>
        </section>

        {/* 4. Current conditions */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-tl-amber-500" />
            Condiciones actuales
          </h2>

          {activeIncidents.length === 0 ? (
            <div className="flex items-center gap-2 text-signal-green">
              <div className="w-2 h-2 rounded-full bg-signal-green animate-pulse" />
              <span className="text-sm font-medium">
                Sin incidencias activas en {corridor.roads.join(", ")}
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary */}
              <div className="flex flex-wrap gap-3 mb-2">
                <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                  <AlertTriangle className="w-4 h-4 text-signal-amber" />
                  {activeIncidents.length} incidencia
                  {activeIncidents.length !== 1 ? "s" : ""} activa
                  {activeIncidents.length !== 1 ? "s" : ""}
                </span>
                {Object.entries(severityCounts).map(([sev, count]) => (
                  <span
                    key={sev}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      sev === "HIGH" || sev === "VERY_HIGH"
                        ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        : sev === "MEDIUM"
                          ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {sev === "LOW"
                      ? "Baja"
                      : sev === "MEDIUM"
                        ? "Media"
                        : sev === "HIGH"
                          ? "Alta"
                          : "Muy alta"}
                    : {count}
                  </span>
                ))}
              </div>

              {/* Incident list */}
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {activeIncidents.map((inc) => (
                  <div key={inc.id} className="py-2 flex items-start gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        inc.severity === "HIGH" || inc.severity === "VERY_HIGH"
                          ? "bg-signal-red"
                          : inc.severity === "MEDIUM"
                            ? "bg-signal-amber"
                            : "bg-gray-400"
                      }`}
                    />
                    <div>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        <span className="font-mono font-medium">
                          {inc.roadNumber}
                        </span>
                        {inc.provinceName ? ` (${inc.provinceName})` : ""}
                        {" — "}
                        {inc.description || inc.type}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Desde{" "}
                        {new Date(inc.startedAt).toLocaleString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 5. Fuel along route */}
        {fuelPrice && (
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
              <Fuel className="w-5 h-5 text-tl-amber-500" />
              Combustible en origen ({fuelPrice.provinceName ?? corridor.origin.province})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {fuelPrice.priceGasoleoA && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Gasoleo A
                  </p>
                  <p className="font-mono text-xl font-bold text-gray-900 dark:text-gray-100">
                    {formatPrice(Number(fuelPrice.priceGasoleoA), 3)}
                  </p>
                  <p className="text-xs text-gray-400">EUR/L</p>
                </div>
              )}
              {fuelPrice.priceGasolina95 && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Gasolina 95
                  </p>
                  <p className="font-mono text-xl font-bold text-gray-900 dark:text-gray-100">
                    {formatPrice(Number(fuelPrice.priceGasolina95), 3)}
                  </p>
                  <p className="text-xs text-gray-400">EUR/L</p>
                </div>
              )}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Coste trayecto (gasoleo)
                </p>
                <p className="font-mono text-xl font-bold text-tl-amber-600 dark:text-tl-amber-400">
                  {formatPrice(carCost)}
                </p>
                <p className="text-xs text-gray-400">
                  EUR ({corridor.distance} km)
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Coste trayecto (gasolina)
                </p>
                <p className="font-mono text-xl font-bold text-tl-amber-600 dark:text-tl-amber-400">
                  {formatPrice(
                    (corridor.distance / 100) *
                      CAR_CONSUMPTION_L_100KM *
                      gasolina95Price
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  EUR ({corridor.distance} km)
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Fuente: CNMC. Ultimo dato:{" "}
              {new Date(fuelPrice.date).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
              . Consumo estimado: {CAR_CONSUMPTION_L_100KM} L/100km.
            </p>
          </section>
        )}

        {/* 6. Links */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
            <ExternalLink className="w-5 h-5 text-tl-500" />
            Explorar mas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Road links */}
            {corridor.roads.map((road) => (
              <Link
                key={road}
                href={`/carreteras/${road.toLowerCase()}`}
                className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-tl-300 dark:hover:border-tl-700 transition-colors group"
              >
                <Route className="w-4 h-4 text-tl-amber-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-tl-600 dark:group-hover:text-tl-400">
                  Carretera {road}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto" />
              </Link>
            ))}

            {/* Railway links */}
            {railways.slice(0, 3).map((route) => (
              <Link
                key={route.slug ?? route.brand}
                href={route.slug ? `/trenes/linea/${route.slug}` : "/trenes/lineas"}
                className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-tl-300 dark:hover:border-tl-700 transition-colors group"
              >
                <Train className="w-4 h-4 text-tl-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-tl-600 dark:group-hover:text-tl-400 truncate">
                  {route.brand}: {route.originName} — {route.destName}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto flex-shrink-0" />
              </Link>
            ))}

            {/* Airport links */}
            {originAirport && (
              <Link
                href={`/aviacion/aeropuertos/${corridor.origin.iata!.toLowerCase()}`}
                className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-tl-300 dark:hover:border-tl-700 transition-colors group"
              >
                <Plane className="w-4 h-4 text-tl-sea-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-tl-600 dark:group-hover:text-tl-400 truncate">
                  {originAirport.name} ({corridor.origin.iata})
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto flex-shrink-0" />
              </Link>
            )}
            {destAirport && (
              <Link
                href={`/aviacion/aeropuertos/${corridor.destination.iata!.toLowerCase()}`}
                className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-tl-300 dark:hover:border-tl-700 transition-colors group"
              >
                <Plane className="w-4 h-4 text-tl-sea-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-tl-600 dark:group-hover:text-tl-400 truncate">
                  {destAirport.name} ({corridor.destination.iata})
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto flex-shrink-0" />
              </Link>
            )}
          </div>
        </section>

        {/* Related corridors */}
        {relatedCorridors.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Otros corredores desde {corridor.origin.city}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {relatedCorridors.map((rc) => (
                <Link
                  key={rc.slug}
                  href={`/corredores/${rc.slug}`}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md hover:border-tl-300 transition-all group"
                >
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-tl-600 dark:group-hover:text-tl-400 transition-colors">
                    {rc.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="font-mono">{rc.distance}</span> km
                    {" — "}
                    {formatTime(rc.driveTime)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Data attribution */}
        <p className="text-xs text-gray-400 dark:text-gray-600">
          Fuentes: DGT (incidencias, accidentes), CNMC (precios de combustible),
          Renfe (rutas ferroviarias), AENA (aeropuertos), Ministerio de
          Transportes (flujos de movilidad, red viaria). Emisiones de CO
          <sub>2</sub>: EEA/MITECO ({CO2_FACTORS.car} kg/km coche,{" "}
          {CO2_FACTORS.train} kg/km tren, {CO2_FACTORS.plane} kg/km avion).
        </p>
      </main>
    </>
  );
}
