/**
 * /calidad-aire/estaciones/[slug] — Ficha de estación de calidad del aire MITECO.
 *
 * Data source: MITECO ICA (`ica.miteco.es`) + CCAA air-quality networks.
 * `slug` = AirQualityStation.stationId (MITECO code).
 *
 * Full SSG for all 565 stations. JSON-LD: Place + AirQualityReading.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Wind, MapPin, Mountain, ArrowRight, AlertTriangle } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { PROVINCE_NAMES } from "@/lib/geo/ine-codes";

export const revalidate = 3600;
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

import { TraficoMap } from "@/components/map/TraficoMapClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ---------------------------------------------------------------------------
// ICA color scale — aligned with MITECO official levels (1..6)
// ---------------------------------------------------------------------------

const ICA_LEVELS: Record<number, { label: string; bg: string; text: string; border: string }> = {
  1: {
    label: "Buena",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-800 dark:text-emerald-200",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  2: {
    label: "Razonablemente buena",
    bg: "bg-lime-50 dark:bg-lime-900/20",
    text: "text-lime-800 dark:text-lime-200",
    border: "border-lime-200 dark:border-lime-800",
  },
  3: {
    label: "Regular",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-800 dark:text-amber-200",
    border: "border-amber-200 dark:border-amber-800",
  },
  4: {
    label: "Desfavorable",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    text: "text-orange-800 dark:text-orange-200",
    border: "border-orange-200 dark:border-orange-800",
  },
  5: {
    label: "Muy desfavorable",
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-800 dark:text-red-200",
    border: "border-red-200 dark:border-red-800",
  },
  6: {
    label: "Extremadamente desfavorable",
    bg: "bg-fuchsia-50 dark:bg-fuchsia-900/20",
    text: "text-fuchsia-800 dark:text-fuchsia-200",
    border: "border-fuchsia-200 dark:border-fuchsia-800",
  },
};

function fmt(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return Number(value).toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ---------------------------------------------------------------------------
// Static generation
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  try {
    const stations = await prisma.airQualityStation.findMany({
      select: { stationId: true },
    });
    return stations.map((s) => ({ slug: s.stationId }));
  } catch (error) {
    console.error("generateStaticParams(/calidad-aire/estaciones) failed:", error);
    return [];
  }
}

/**
 * Sitemap helper: exposes station codes for sitemap inclusion.
 */
export async function getSlugList(): Promise<string[]> {
  try {
    const stations = await prisma.airQualityStation.findMany({
      select: { stationId: true },
      orderBy: { stationId: "asc" },
    });
    return stations.map((s) => s.stationId);
  } catch (error) {
    console.error("getSlugList(/calidad-aire/estaciones) failed:", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const station = await prisma.airQualityStation.findUnique({
    where: { stationId: slug },
  });

  if (!station) {
    return { title: "Estación de calidad del aire no encontrada" };
  }

  const locationParts = [station.city, station.province ? PROVINCE_NAMES[station.province] : null]
    .filter(Boolean)
    .join(", ");
  const title = `Calidad del aire en ${station.name}${locationParts ? ` (${locationParts})` : ""}`;
  const description = `ICA, NO₂, PM10, PM2.5, O₃ y SO₂ en tiempo real en la estación ${station.name}. Datos MITECO.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/calidad-aire/estaciones/${station.stationId}` },
    openGraph: { title, description },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AirQualityStationPage({ params }: PageProps) {
  const { slug } = await params;

  const station = await prisma.airQualityStation.findUnique({
    where: { stationId: slug },
  });

  if (!station) {
    notFound();
  }

  // Latest reading + last 24h series
  const since24h = new Date(Date.now() - 24 * 3600_000);
  const readings = await prisma.airQualityReading.findMany({
    where: { stationId: station.id, createdAt: { gte: since24h } },
    orderBy: { createdAt: "desc" },
    take: 48,
  });
  const latest = readings[0];

  const provinceName =
    station.province ? PROVINCE_NAMES[station.province] ?? station.province : "España";
  const lat = Number(station.latitude);
  const lng = Number(station.longitude);
  const icaLevel = latest?.ica != null ? ICA_LEVELS[latest.ica] : null;

  // -------------------------------------------------------------------------
  // JSON-LD: Place + AirQualityReading (Observation-shaped)
  // -------------------------------------------------------------------------

  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `Estación calidad del aire ${station.name}`,
    description: `Estación de medición de calidad del aire en ${station.city || provinceName}.`,
    url: `${BASE_URL}/calidad-aire/estaciones/${station.stationId}`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: lat,
      longitude: lng,
      ...(station.elevation != null && { elevation: `${station.elevation} m` }),
    },
    ...(station.province && {
      address: {
        "@type": "PostalAddress",
        addressLocality: station.city || undefined,
        addressRegion: provinceName,
        addressCountry: "ES",
      },
    }),
    additionalProperty: [
      { "@type": "PropertyValue", propertyID: "MITECO station id", value: station.stationId },
      ...(station.network
        ? [{ "@type": "PropertyValue", propertyID: "network", value: station.network }]
        : []),
    ],
  };

  // Schema.org doesn't have a native AirQualityReading type; we use a
  // generic Observation node (the same pattern used by existing pages) and
  // tag it with aqIndex / observedProperty entries.
  const observationSchema =
    latest != null
      ? {
          "@context": "https://schema.org",
          "@type": "Observation",
          name: `Medición calidad del aire — ${station.name}`,
          observationDate: new Date(latest.createdAt).toISOString(),
          observationAbout: { "@id": `${BASE_URL}/calidad-aire/estaciones/${station.stationId}` },
          ...(latest.ica != null && {
            variableMeasured: [
              {
                "@type": "PropertyValue",
                name: "ICA",
                value: latest.ica,
                description: latest.icaLabel || ICA_LEVELS[latest.ica]?.label,
              },
              ...(latest.no2 != null
                ? [
                    {
                      "@type": "PropertyValue",
                      name: "NO2",
                      value: latest.no2,
                      unitText: "µg/m³",
                    },
                  ]
                : []),
              ...(latest.pm10 != null
                ? [
                    {
                      "@type": "PropertyValue",
                      name: "PM10",
                      value: latest.pm10,
                      unitText: "µg/m³",
                    },
                  ]
                : []),
              ...(latest.pm25 != null
                ? [
                    {
                      "@type": "PropertyValue",
                      name: "PM2.5",
                      value: latest.pm25,
                      unitText: "µg/m³",
                    },
                  ]
                : []),
              ...(latest.o3 != null
                ? [
                    {
                      "@type": "PropertyValue",
                      name: "O3",
                      value: latest.o3,
                      unitText: "µg/m³",
                    },
                  ]
                : []),
              ...(latest.so2 != null
                ? [
                    {
                      "@type": "PropertyValue",
                      name: "SO2",
                      value: latest.so2,
                      unitText: "µg/m³",
                    },
                  ]
                : []),
              ...(latest.co != null
                ? [
                    {
                      "@type": "PropertyValue",
                      name: "CO",
                      value: latest.co,
                      unitText: "mg/m³",
                    },
                  ]
                : []),
            ],
          }),
        }
      : null;

  const structuredData = observationSchema ? [placeSchema, observationSchema] : placeSchema;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <StructuredData data={structuredData} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Calidad del aire", href: "/calidad-aire" },
            { name: "Estaciones", href: "/calidad-aire/estaciones" },
            { name: station.name, href: `/calidad-aire/estaciones/${station.stationId}` },
          ]}
        />

        {/* Header */}
        <header
          className={`rounded-lg border p-6 mb-6 ${icaLevel?.bg ?? "bg-white dark:bg-gray-900"} ${icaLevel?.border ?? "border-gray-200 dark:border-gray-800"}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-white/70 dark:bg-black/30 text-gray-800 dark:text-gray-200 rounded-full text-sm font-medium">
                  MITECO
                </span>
                <span className="font-data text-sm text-gray-600 dark:text-gray-400">
                  {station.stationId}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {station.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {[station.city, provinceName].filter(Boolean).join(", ")}
                {station.elevation != null && (
                  <>
                    <span className="mx-1">·</span>
                    <Mountain className="w-4 h-4" />
                    <span className="font-data">{station.elevation} m</span>
                  </>
                )}
              </p>
              {icaLevel && (
                <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 ${icaLevel.text} bg-white/80 dark:bg-black/30 border ${icaLevel.border}`}>
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">ICA: {icaLevel.label}</span>
                </div>
              )}
            </div>
            <Link
              href="/calidad-aire"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Volver al hub
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {latest && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-6">
              <Metric label="NO₂" value={latest.no2} unit="µg/m³" />
              <Metric label="PM10" value={latest.pm10} unit="µg/m³" />
              <Metric label="PM2.5" value={latest.pm25} unit="µg/m³" />
              <Metric label="O₃" value={latest.o3} unit="µg/m³" />
              <Metric label="SO₂" value={latest.so2} unit="µg/m³" />
              <Metric label="CO" value={latest.co} unit="mg/m³" />
            </div>
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
              entity={{ type: "aq-station", id: station.stationId }}
            />
          </div>
        </section>

        {/* Recent readings */}
        {readings.length > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Wind className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              Últimas mediciones
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                    <th className="py-2 pr-4 font-medium">Fecha/hora</th>
                    <th className="py-2 pr-4 font-medium text-right">ICA</th>
                    <th className="py-2 pr-4 font-medium text-right">NO₂</th>
                    <th className="py-2 pr-4 font-medium text-right">PM10</th>
                    <th className="py-2 pr-4 font-medium text-right">PM2.5</th>
                    <th className="py-2 pr-4 font-medium text-right">O₃</th>
                    <th className="py-2 font-medium text-right">SO₂</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-gray-100 dark:border-gray-800/60 last:border-0"
                    >
                      <td className="py-2 pr-4 font-data text-gray-700 dark:text-gray-300">
                        {new Date(r.createdAt).toLocaleString("es-ES", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2 pr-4 text-right font-data">
                        {r.ica != null ? (ICA_LEVELS[r.ica]?.label ?? r.ica) : "—"}
                      </td>
                      <td className="py-2 pr-4 text-right font-data">{fmt(r.no2)}</td>
                      <td className="py-2 pr-4 text-right font-data">{fmt(r.pm10)}</td>
                      <td className="py-2 pr-4 text-right font-data">{fmt(r.pm25)}</td>
                      <td className="py-2 pr-4 text-right font-data">{fmt(r.o3)}</td>
                      <td className="py-2 text-right font-data">{fmt(r.so2)}</td>
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

function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null | undefined;
  unit: string;
}) {
  return (
    <div className="text-center p-3 rounded-lg bg-white/70 dark:bg-black/30 border border-gray-200 dark:border-gray-800">
      <div className="text-xs text-gray-600 dark:text-gray-400">{label}</div>
      <div className="text-lg font-bold font-data text-gray-900 dark:text-gray-100">
        {fmt(value)}
      </div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400 font-data">{unit}</div>
    </div>
  );
}
