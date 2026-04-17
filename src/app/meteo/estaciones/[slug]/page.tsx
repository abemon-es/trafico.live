/**
 * /meteo/estaciones/[slug] — Ficha canónica de estación meteorológica AEMET.
 *
 * Data source: AEMET OpenData (daily records). `slug` maps 1:1 to
 * ClimateStation.stationCode (AEMET indicativo, e.g., "3195" for Madrid Retiro).
 *
 * Replaces the orphan `/clima/estacion/[id]` route — this one is linked from
 * the `/meteo` hub (DATA 08 #6 in the UX audit).
 */

import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Mountain,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { PROVINCE_NAMES } from "@/lib/geo/ine-codes";

export const revalidate = 3600;
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] w-full bg-gray-100 dark:bg-gray-900 animate-pulse rounded-lg" />
    ),
  },
);

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ---------------------------------------------------------------------------
// Static generation
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  try {
    const stations = await prisma.climateStation.findMany({
      where: { isActive: true },
      select: { stationCode: true },
    });
    return stations.map((s) => ({ slug: s.stationCode }));
  } catch (error) {
    console.error("generateStaticParams(/meteo/estaciones) failed:", error);
    return [];
  }
}

/**
 * Sitemap helper: exposes the list of AEMET station codes for sitemap
 * inclusion. Consumed by `src/lib/sitemap-generator.ts`.
 */
export async function getSlugList(): Promise<string[]> {
  try {
    const stations = await prisma.climateStation.findMany({
      where: { isActive: true },
      select: { stationCode: true },
      orderBy: { stationCode: "asc" },
    });
    return stations.map((s) => s.stationCode);
  } catch (error) {
    console.error("getSlugList(/meteo/estaciones) failed:", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const station = await prisma.climateStation.findUnique({
    where: { stationCode: slug },
  });

  if (!station) {
    return { title: "Estación meteorológica no encontrada" };
  }

  const provinceName = station.provinceName || (station.province ? PROVINCE_NAMES[station.province] : "") || "España";
  const title = `Estación AEMET ${station.name} (${station.stationCode}) — Meteorología`;
  const description = `Datos climáticos diarios de la estación AEMET ${station.name} en ${provinceName}. Temperatura, precipitación, viento, humedad y presión.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/meteo/estaciones/${station.stationCode}` },
    openGraph: { title, description },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtNumber(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return Number(value).toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function MeteoStationPage({ params }: PageProps) {
  const { slug } = await params;

  const station = await prisma.climateStation.findUnique({
    where: { stationCode: slug },
  });

  if (!station) {
    notFound();
  }

  // Latest 30 daily records (sparkline + summary)
  const since30d = new Date(Date.now() - 30 * 24 * 3600_000);
  const records = await prisma.climateRecord.findMany({
    where: { stationId: station.id, date: { gte: since30d } },
    orderBy: { date: "desc" },
    take: 30,
  });

  const latest = records[0];

  // Aggregate last 30d
  const valid = records.filter((r) => r.tempAvg != null);
  const avgTemp =
    valid.length > 0
      ? valid.reduce((sum, r) => sum + Number(r.tempAvg!), 0) / valid.length
      : null;
  const totalRain = records.reduce((sum, r) => sum + Number(r.precipitation ?? 0), 0);

  const provinceName =
    station.provinceName || (station.province ? PROVINCE_NAMES[station.province] : "") || "España";
  const lat = Number(station.latitude);
  const lng = Number(station.longitude);

  // -------------------------------------------------------------------------
  // JSON-LD: WeatherStation + Place
  // -------------------------------------------------------------------------

  const weatherStationSchema = {
    "@context": "https://schema.org",
    "@type": "WeatherStation",
    name: station.name,
    identifier: [
      { "@type": "PropertyValue", propertyID: "AEMET indicativo", value: station.stationCode },
    ],
    description: `Estación meteorológica AEMET ${station.name} en ${provinceName}.`,
    url: `${BASE_URL}/meteo/estaciones/${station.stationCode}`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: lat,
      longitude: lng,
      ...(station.altitude != null && {
        elevation: `${station.altitude} m`,
      }),
    },
    ...(station.province && {
      address: {
        "@type": "PostalAddress",
        addressRegion: provinceName,
        addressCountry: "ES",
      },
    }),
    provider: {
      "@type": "GovernmentOrganization",
      name: "AEMET",
      url: "https://www.aemet.es",
    },
  };

  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `Estación AEMET ${station.name}`,
    description: `Ubicación de la estación meteorológica AEMET ${station.name}.`,
    url: `${BASE_URL}/meteo/estaciones/${station.stationCode}`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: lat,
      longitude: lng,
    },
    ...(station.province && {
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: provinceName,
      },
    }),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <StructuredData data={[weatherStationSchema, placeSchema]} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Meteorología", href: "/meteo" },
            { name: "Estaciones", href: "/meteo/estaciones" },
            { name: station.name, href: `/meteo/estaciones/${station.stationCode}` },
          ]}
        />

        {/* Header */}
        <header className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-tl-100 dark:bg-tl-900/30 text-tl-800 dark:text-tl-200 rounded-full text-sm font-medium">
                  Estación AEMET
                </span>
                <span className="font-data text-sm text-gray-600 dark:text-gray-400">
                  {station.stationCode}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {station.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {provinceName}
                {station.altitude != null && (
                  <>
                    <span className="mx-1">·</span>
                    <Mountain className="w-4 h-4" />
                    <span className="font-data">{station.altitude} m</span>
                  </>
                )}
              </p>
            </div>
            <Link
              href="/meteo"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Volver al hub
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Last reading summary */}
          {latest ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
                <Thermometer className="w-5 h-5 mx-auto text-red-600 dark:text-red-400 mb-1" />
                <div className="text-xl font-bold font-data text-gray-900 dark:text-gray-100">
                  {fmtNumber(latest.tempAvg ? Number(latest.tempAvg) : null)}°C
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">T. media (último)</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
                <CloudRain className="w-5 h-5 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
                <div className="text-xl font-bold font-data text-gray-900 dark:text-gray-100">
                  {fmtNumber(totalRain)} mm
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Precipitación 30d</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
                <Thermometer className="w-5 h-5 mx-auto text-orange-600 dark:text-orange-400 mb-1" />
                <div className="text-xl font-bold font-data text-gray-900 dark:text-gray-100">
                  {fmtNumber(avgTemp)}°C
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Media 30d</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
                <Wind className="w-5 h-5 mx-auto text-sky-600 dark:text-sky-400 mb-1" />
                <div className="text-xl font-bold font-data text-gray-900 dark:text-gray-100">
                  {fmtNumber(latest.windSpeed ? Number(latest.windSpeed) : null)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Viento km/h</div>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
              Sin registros recientes en los últimos 30 días.
            </p>
          )}
        </header>

        {/* Map */}
        <section
          aria-label={`Mapa de la estación ${station.name}`}
          className="mb-6 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
        >
          <div className="h-[420px] w-full">
            <TraficoMap
              preset="meteo"
              entity={{ type: "weather-station", id: station.stationCode }}
            />
          </div>
        </section>

        {/* Recent records table */}
        {records.length > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              Últimos 30 días
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                    <th className="py-2 pr-4 font-medium">Fecha</th>
                    <th className="py-2 pr-4 font-medium text-right">Mín</th>
                    <th className="py-2 pr-4 font-medium text-right">Máx</th>
                    <th className="py-2 pr-4 font-medium text-right">Media</th>
                    <th className="py-2 pr-4 font-medium text-right">Precip. mm</th>
                    <th className="py-2 font-medium text-right">Viento km/h</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-gray-100 dark:border-gray-800/60 last:border-0"
                    >
                      <td className="py-2 pr-4 font-data text-gray-700 dark:text-gray-300">
                        {new Date(r.date).toISOString().slice(0, 10)}
                      </td>
                      <td className="py-2 pr-4 text-right font-data text-blue-700 dark:text-blue-300">
                        {fmtNumber(r.tempMin ? Number(r.tempMin) : null)}
                      </td>
                      <td className="py-2 pr-4 text-right font-data text-red-700 dark:text-red-300">
                        {fmtNumber(r.tempMax ? Number(r.tempMax) : null)}
                      </td>
                      <td className="py-2 pr-4 text-right font-data text-gray-900 dark:text-gray-100">
                        {fmtNumber(r.tempAvg ? Number(r.tempAvg) : null)}
                      </td>
                      <td className="py-2 pr-4 text-right font-data text-sky-700 dark:text-sky-300">
                        {fmtNumber(r.precipitation ? Number(r.precipitation) : null)}
                      </td>
                      <td className="py-2 text-right font-data text-gray-700 dark:text-gray-300">
                        {fmtNumber(r.windSpeed ? Number(r.windSpeed) : null)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
