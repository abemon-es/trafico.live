/**
 * /clima/estacion/[id] — Detalle de estacion climatica AEMET
 *
 * Server component. [id] = stationCode (AEMET indicativo).
 * Data source: AEMET — Registros climaticos diarios
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PROVINCE_NAMES, PROVINCES } from "@/lib/geo/ine-codes";
import { slugify } from "@/lib/geo/slugify";
import {
  Thermometer,
  Droplets,
  Wind,
  Sun,
  CloudRain,
  Snowflake,
  Gauge,
  MapPin,
  Mountain,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  Calendar,
  BarChart3,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { ClimateChart, type MonthlyDataPoint } from "./climate-chart";

export const revalidate = 3600;
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTempColor(temp: number): string {
  if (temp < 0) return "text-blue-600 dark:text-blue-400";
  if (temp < 15) return "text-teal-600 dark:text-teal-400";
  if (temp < 25) return "text-emerald-600 dark:text-emerald-400";
  if (temp < 35) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getTempBg(temp: number): string {
  if (temp < 0) return "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800";
  if (temp < 15) return "bg-teal-50 dark:bg-teal-900/10 border-teal-200 dark:border-teal-800";
  if (temp < 25) return "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800";
  if (temp < 35) return "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800";
  return "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800";
}

function formatTemp(value: number | null | undefined): string {
  if (value == null) return "\u2014";
  return `${Number(value).toFixed(1)}`;
}

function formatDecimal(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "\u2014";
  return Number(value).toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function getProvinceSlug(provinceCode: string): string {
  const name = PROVINCE_NAMES[provinceCode];
  return name ? slugify(name) : provinceCode;
}

function getCommunitySlug(provinceCode: string): string {
  const province = PROVINCES.find((p) => p.code === provinceCode);
  if (!province) return "";
  const communityMap: Record<string, string> = {
    "01": "andalucia", "02": "aragon", "03": "principado-de-asturias",
    "04": "illes-balears", "05": "canarias", "06": "cantabria",
    "07": "castilla-y-leon", "08": "castilla-la-mancha", "09": "cataluna",
    "10": "comunitat-valenciana", "11": "extremadura", "12": "galicia",
    "13": "comunidad-de-madrid", "14": "region-de-murcia",
    "15": "comunidad-foral-de-navarra", "16": "pais-vasco",
    "17": "la-rioja", "18": "ceuta", "19": "melilla",
  };
  return communityMap[province.communityCode] ?? "";
}

// ---------------------------------------------------------------------------
// Static params — top 200 active stations
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const stations = await prisma.climateStation.findMany({
    where: { isActive: true },
    select: { stationCode: true },
    orderBy: { stationCode: "asc" },
    take: 200,
  });
  return stations.map((s) => ({ id: s.stationCode }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const station = await prisma.climateStation.findUnique({
    where: { stationCode: decodeURIComponent(id) },
  });
  if (!station) {
    return { title: "Estacion no encontrada" };
  }

  const provinceName = station.provinceName ?? (station.province ? PROVINCE_NAMES[station.province] : null);
  const locationStr = provinceName ?? "Espana";
  const title = `Estacion climatica ${station.name}${provinceName ? ` (${provinceName})` : ""} — Temperatura y Precipitacion`;
  const description = `Datos climaticos diarios de la estacion AEMET ${station.name} en ${locationStr}. Temperatura minima y maxima, precipitacion, viento y horas de sol. Registros historicos desde 2000.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/clima/estacion/${station.stationCode}`,
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/clima/estacion/${station.stationCode}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface MonthlyRow {
  month: Date;
  avg_min: number | null;
  avg_max: number | null;
  total_precip: number | null;
  avg_wind: number | null;
  avg_sun: number | null;
}

export default async function ClimateStationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const stationCode = decodeURIComponent(id);

  // 1. Station
  const station = await prisma.climateStation.findUnique({
    where: { stationCode },
  });
  if (!station) notFound();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // 2-5. Parallel data fetching
  const [recentRecords, monthlyRaw, nearbyStations, historicalAvg] = await Promise.all([
    // Last 30 days records
    prisma.climateRecord.findMany({
      where: {
        stationId: station.id,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: "desc" },
    }),
    // Monthly averages (last 12 months)
    prisma.$queryRaw<MonthlyRow[]>`
      SELECT DATE_TRUNC('month', date) as month,
        AVG("tempMin"::numeric) as avg_min,
        AVG("tempMax"::numeric) as avg_max,
        SUM(precipitation::numeric) as total_precip,
        AVG("windSpeed"::numeric) as avg_wind,
        AVG("sunHours"::numeric) as avg_sun
      FROM "ClimateRecord"
      WHERE "stationId" = ${station.id}
        AND date >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month
    `,
    // Nearby stations (same province)
    station.province
      ? prisma.climateStation.findMany({
          where: {
            province: station.province,
            id: { not: station.id },
            isActive: true,
          },
          take: 5,
        })
      : Promise.resolve([]),
    // Historical average (all-time)
    prisma.$queryRaw<Array<{
      avg_temp: number | null;
      total_precip: number | null;
      record_count: number;
      min_date: Date | null;
      max_date: Date | null;
    }>>`
      SELECT
        AVG("tempAvg"::numeric) as avg_temp,
        SUM(precipitation::numeric) / NULLIF(COUNT(DISTINCT DATE_TRUNC('year', date)), 0) as total_precip,
        COUNT(*)::int as record_count,
        MIN(date) as min_date,
        MAX(date) as max_date
      FROM "ClimateRecord"
      WHERE "stationId" = ${station.id}
    `,
  ]);

  // Get latest record per nearby station for comparison
  const nearbyWithLatest = await Promise.all(
    nearbyStations.map(async (ns) => {
      const latest = await prisma.climateRecord.findFirst({
        where: { stationId: ns.id },
        orderBy: { date: "desc" },
        select: { tempMin: true, tempMax: true, tempAvg: true, precipitation: true, date: true },
      });
      return { ...ns, latest };
    })
  );

  const latestRecord = recentRecords[0] ?? null;
  const provinceName = station.provinceName ?? (station.province ? PROVINCE_NAMES[station.province] : null);
  const provinceSlug = station.province ? getProvinceSlug(station.province) : null;
  const communitySlug = station.province ? getCommunitySlug(station.province) : null;

  // Compute 30-day summary
  const validTemps = recentRecords.filter((r) => r.tempMin != null && r.tempMax != null);
  const tempMinAbsolute = validTemps.length > 0 ? Math.min(...validTemps.map((r) => Number(r.tempMin))) : null;
  const tempMaxAbsolute = validTemps.length > 0 ? Math.max(...validTemps.map((r) => Number(r.tempMax))) : null;
  const totalPrecip30d = recentRecords.reduce((sum, r) => sum + (r.precipitation ? Number(r.precipitation) : 0), 0);
  const avgWind30d = recentRecords.filter((r) => r.windSpeed != null).length > 0
    ? recentRecords.filter((r) => r.windSpeed != null).reduce((sum, r) => sum + Number(r.windSpeed), 0) /
      recentRecords.filter((r) => r.windSpeed != null).length
    : null;
  const sunnyDays30d = recentRecords.filter((r) => r.sunHours != null && Number(r.sunHours) >= 6).length;

  // Monthly chart data
  const monthlyData: MonthlyDataPoint[] = monthlyRaw.map((m) => ({
    month: new Date(m.month).toISOString(),
    avgMin: m.avg_min != null ? Number(m.avg_min) : null,
    avgMax: m.avg_max != null ? Number(m.avg_max) : null,
    totalPrecip: m.total_precip != null ? Number(m.total_precip) : null,
    avgWind: m.avg_wind != null ? Number(m.avg_wind) : null,
    avgSun: m.avg_sun != null ? Number(m.avg_sun) : null,
  }));

  // Historical context
  const histData = historicalAvg[0] ?? null;
  const heroTemp = latestRecord?.tempAvg != null ? Number(latestRecord.tempAvg) : null;

  // Structured data
  const observationSchema = {
    "@context": "https://schema.org",
    "@type": "Observation",
    name: `Clima en ${station.name}`,
    description: `Registro climatico en ${station.name}, ${provinceName ?? "Espana"}`,
    observationDate: latestRecord?.date ? new Date(latestRecord.date).toISOString() : undefined,
    measuredProperty: [
      {
        "@type": "PropertyValue",
        name: "Temperatura media",
        value: latestRecord?.tempAvg != null ? Number(latestRecord.tempAvg) : null,
        unitText: "°C",
      },
      {
        "@type": "PropertyValue",
        name: "Precipitacion",
        value: latestRecord?.precipitation != null ? Number(latestRecord.precipitation) : null,
        unitText: "mm",
      },
    ],
    observedIn: {
      "@type": "Place",
      name: station.name,
      address: {
        "@type": "PostalAddress",
        addressRegion: provinceName ?? undefined,
        addressCountry: "ES",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: Number(station.latitude),
        longitude: Number(station.longitude),
        ...(station.altitude != null && { elevation: station.altitude }),
      },
    },
  };

  return (
    <>
      <StructuredData data={observationSchema} />

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Clima", href: "/clima" },
            ...(provinceName && provinceSlug
              ? [{ name: provinceName, href: `/clima/provincia/${provinceSlug}` }]
              : []),
            { name: station.name, href: `/clima/estacion/${station.stationCode}` },
          ]}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="relative overflow-hidden"
        style={{
          background: heroTemp != null
            ? heroTemp >= 25
              ? "linear-gradient(135deg, #0f172a 0%, #92400e33 60%, #f59e0b33 100%)"
              : heroTemp >= 15
                ? "linear-gradient(135deg, #0f172a 0%, #065f4633 60%, #10b98133 100%)"
                : heroTemp >= 0
                  ? "linear-gradient(135deg, #0f172a 0%, #0e749933 60%, #06b6d433 100%)"
                  : "linear-gradient(135deg, #0f172a 0%, #1e3a5f33 60%, #3b82f633 100%)"
            : "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -bottom-16 -right-16 w-80 h-80 rounded-full opacity-10"
          style={{ background: heroTemp != null && heroTemp >= 25 ? "#f59e0b" : "#06b6d4" }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="flex items-center gap-3 mb-4">
            <Thermometer className="w-8 h-8 text-amber-300" />
            <span className="font-heading text-amber-300 text-sm font-semibold uppercase tracking-widest">
              Estacion climatica AEMET
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
                {station.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
                {provinceName && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {provinceName}
                  </span>
                )}
                {station.altitude != null && (
                  <span className="flex items-center gap-1">
                    <Mountain className="w-4 h-4" />
                    {station.altitude} m
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-white font-mono">
                  {station.stationCode}
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-400 font-mono">
                {Number(station.latitude).toFixed(6)}, {Number(station.longitude).toFixed(6)}
              </div>
            </div>

            {/* Latest temperature badge */}
            {heroTemp != null && (
              <div className="flex flex-col items-center gap-1">
                <span className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-white font-mono text-2xl font-bold shadow-lg ${
                  heroTemp >= 35 ? "bg-red-500" :
                  heroTemp >= 25 ? "bg-amber-500" :
                  heroTemp >= 15 ? "bg-emerald-500" :
                  heroTemp >= 0 ? "bg-teal-500" : "bg-blue-500"
                }`}>
                  {heroTemp.toFixed(1)}°
                </span>
                <span className="text-sm font-semibold text-white">
                  Temp. media
                </span>
                {latestRecord?.date && (
                  <span className="text-xs text-gray-400 font-mono">
                    {new Date(latestRecord.date).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">

        {/* ---------------------------------------------------------------- */}
        {/* Latest conditions                                                */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Condiciones recientes">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
            Ultimo registro
          </h2>

          {latestRecord ? (
            <>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-3">
                Fecha: {new Date(latestRecord.date).toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Temp Min */}
                <div className={`rounded-2xl border p-4 ${
                  latestRecord.tempMin != null
                    ? getTempBg(Number(latestRecord.tempMin))
                    : "bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700"
                }`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Thermometer className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Temp. minima
                    </span>
                  </div>
                  <div className={`font-mono text-3xl font-bold ${
                    latestRecord.tempMin != null ? getTempColor(Number(latestRecord.tempMin)) : "text-gray-400"
                  }`}>
                    {formatTemp(latestRecord.tempMin ? Number(latestRecord.tempMin) : null)}
                    {latestRecord.tempMin != null && <span className="text-lg">°C</span>}
                  </div>
                </div>

                {/* Temp Max */}
                <div className={`rounded-2xl border p-4 ${
                  latestRecord.tempMax != null
                    ? getTempBg(Number(latestRecord.tempMax))
                    : "bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700"
                }`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Thermometer className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Temp. maxima
                    </span>
                  </div>
                  <div className={`font-mono text-3xl font-bold ${
                    latestRecord.tempMax != null ? getTempColor(Number(latestRecord.tempMax)) : "text-gray-400"
                  }`}>
                    {formatTemp(latestRecord.tempMax ? Number(latestRecord.tempMax) : null)}
                    {latestRecord.tempMax != null && <span className="text-lg">°C</span>}
                  </div>
                </div>

                {/* Temp Avg */}
                <div className={`rounded-2xl border p-4 ${
                  latestRecord.tempAvg != null
                    ? getTempBg(Number(latestRecord.tempAvg))
                    : "bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700"
                }`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Thermometer className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Temp. media
                    </span>
                  </div>
                  <div className={`font-mono text-3xl font-bold ${
                    latestRecord.tempAvg != null ? getTempColor(Number(latestRecord.tempAvg)) : "text-gray-400"
                  }`}>
                    {formatTemp(latestRecord.tempAvg ? Number(latestRecord.tempAvg) : null)}
                    {latestRecord.tempAvg != null && <span className="text-lg">°C</span>}
                  </div>
                </div>

                {/* Precipitation */}
                <div className="rounded-2xl border p-4 bg-cyan-50 dark:bg-cyan-900/10 border-cyan-200 dark:border-cyan-800">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Droplets className="w-4 h-4 text-cyan-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Precipitacion
                    </span>
                  </div>
                  <div className="font-mono text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                    {latestRecord.precipitation != null ? formatDecimal(Number(latestRecord.precipitation)) : "\u2014"}
                    {latestRecord.precipitation != null && <span className="text-lg"> mm</span>}
                  </div>
                </div>

                {/* Wind */}
                <div className="rounded-2xl border p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Wind className="w-4 h-4 text-gray-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Viento medio
                    </span>
                  </div>
                  <div className="font-mono text-3xl font-bold text-gray-700 dark:text-gray-300">
                    {latestRecord.windSpeed != null ? formatDecimal(Number(latestRecord.windSpeed)) : "\u2014"}
                    {latestRecord.windSpeed != null && <span className="text-lg"> km/h</span>}
                  </div>
                  {latestRecord.windGust != null && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                      Racha: {formatDecimal(Number(latestRecord.windGust))} km/h
                    </div>
                  )}
                </div>

                {/* Sun hours */}
                <div className="rounded-2xl border p-4 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sun className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Horas de sol
                    </span>
                  </div>
                  <div className="font-mono text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                    {latestRecord.sunHours != null ? formatDecimal(Number(latestRecord.sunHours)) : "\u2014"}
                    {latestRecord.sunHours != null && <span className="text-lg"> h</span>}
                  </div>
                </div>

                {/* Humidity */}
                <div className="rounded-2xl border p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Droplets className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Humedad
                    </span>
                  </div>
                  <div className="font-mono text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    {latestRecord.humidity != null ? latestRecord.humidity : "\u2014"}
                    {latestRecord.humidity != null && <span className="text-lg">%</span>}
                  </div>
                </div>

                {/* Pressure */}
                <div className="rounded-2xl border p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Gauge className="w-4 h-4 text-gray-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Presion
                    </span>
                  </div>
                  <div className="font-mono text-3xl font-bold text-gray-700 dark:text-gray-300">
                    {latestRecord.pressure != null ? formatDecimal(Number(latestRecord.pressure), 0) : "\u2014"}
                    {latestRecord.pressure != null && <span className="text-lg"> hPa</span>}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-8 text-center">
              <AlertTriangle className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No hay registros climaticos recientes para esta estacion. Los datos se actualizan diariamente desde AEMET.
              </p>
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 30-day summary                                                   */}
        {/* ---------------------------------------------------------------- */}
        {recentRecords.length > 0 && (
          <section aria-label="Resumen ultimos 30 dias">
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
              Resumen — ultimos 30 dias
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded-xl border p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rango de temperatura</div>
                <div className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
                  {tempMinAbsolute != null && tempMaxAbsolute != null
                    ? `${tempMinAbsolute.toFixed(1)}° a ${tempMaxAbsolute.toFixed(1)}°C`
                    : "\u2014"}
                </div>
              </div>

              <div className="rounded-xl border p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Precipitacion total</div>
                <div className="font-mono text-lg font-bold text-cyan-600 dark:text-cyan-400">
                  {totalPrecip30d.toFixed(1)} mm
                </div>
              </div>

              <div className="rounded-xl border p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Viento medio</div>
                <div className="font-mono text-lg font-bold text-gray-700 dark:text-gray-300">
                  {avgWind30d != null ? `${avgWind30d.toFixed(1)} km/h` : "\u2014"}
                </div>
              </div>

              <div className="rounded-xl border p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Dias soleados (&ge;6h)</div>
                <div className="font-mono text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {sunnyDays30d} dias
                </div>
              </div>

              <div className="rounded-xl border p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Registros</div>
                <div className="font-mono text-lg font-bold text-[var(--tl-primary)] dark:text-[var(--tl-info)]">
                  {recentRecords.length}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Monthly chart                                                    */}
        {/* ---------------------------------------------------------------- */}
        {monthlyData.length > 1 && (
          <section aria-label="Evolucion mensual">
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
              Evolucion mensual — ultimos 12 meses
            </h2>
            <ClimateChart data={monthlyData} />
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Historical context                                               */}
        {/* ---------------------------------------------------------------- */}
        {histData && histData.record_count > 365 && (
          <section aria-label="Contexto historico">
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
              Contexto historico
            </h2>

            <div className="rounded-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 p-6">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                En esta estacion, la <strong>temperatura media anual</strong> es de{" "}
                <span className="font-mono font-bold">
                  {histData.avg_temp != null ? `${Number(histData.avg_temp).toFixed(1)} °C` : "N/D"}
                </span>
                , con una <strong>precipitacion media anual</strong> de{" "}
                <span className="font-mono font-bold">
                  {histData.total_precip != null ? `${Number(histData.total_precip).toFixed(0)} mm` : "N/D"}
                </span>
                .
              </p>
              <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-mono">
                  {histData.record_count.toLocaleString("es-ES")} registros
                </span>
                {histData.min_date && histData.max_date && (
                  <span className="font-mono">
                    Desde {new Date(histData.min_date).toLocaleDateString("es-ES", { month: "short", year: "numeric" })}
                    {" "}hasta{" "}
                    {new Date(histData.max_date).toLocaleDateString("es-ES", { month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Station info                                                     */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Informacion de la estacion">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
            Informacion de la estacion
          </h2>

          <div className="rounded-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 overflow-hidden">
            <dl className="divide-y divide-gray-100 dark:divide-gray-800">
              <div className="flex justify-between px-5 py-3">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Indicativo AEMET</dt>
                <dd className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">{station.stationCode}</dd>
              </div>
              {provinceName && (
                <div className="flex justify-between px-5 py-3">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Provincia</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{provinceName}</dd>
                </div>
              )}
              {station.altitude != null && (
                <div className="flex justify-between px-5 py-3">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Altitud</dt>
                  <dd className="text-sm font-mono text-gray-900 dark:text-gray-100">{station.altitude} m</dd>
                </div>
              )}
              <div className="flex justify-between px-5 py-3">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Coordenadas</dt>
                <dd className="text-sm font-mono text-gray-900 dark:text-gray-100">
                  {Number(station.latitude).toFixed(6)}, {Number(station.longitude).toFixed(6)}
                </dd>
              </div>
              <div className="flex justify-between px-5 py-3">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Estado</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">
                  {station.isActive ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      Activa
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-gray-400 dark:text-gray-500">
                      Inactiva
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Nearby stations                                                  */}
        {/* ---------------------------------------------------------------- */}
        {nearbyWithLatest.length > 0 && (
          <section aria-label="Estaciones cercanas">
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
              Estaciones cercanas en {provinceName}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {nearbyWithLatest.map((ns) => {
                const nsTemp = ns.latest?.tempAvg != null ? Number(ns.latest.tempAvg) : null;
                return (
                  <Link
                    key={ns.id}
                    href={`/clima/estacion/${ns.stationCode}`}
                    className="group rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-[var(--tl-primary)] transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-[var(--tl-primary)] transition-colors leading-tight">
                        {ns.name}
                      </div>
                      {nsTemp != null ? (
                        <span className={`flex-shrink-0 font-mono text-sm font-bold ${getTempColor(nsTemp)}`}>
                          {nsTemp.toFixed(1)}°C
                        </span>
                      ) : (
                        <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                          Sin datos
                        </span>
                      )}
                    </div>
                    {ns.altitude != null && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Mountain className="w-3 h-3" />
                        {ns.altitude} m
                      </div>
                    )}
                    {ns.latest?.precipitation != null && Number(ns.latest.precipitation) > 0 && (
                      <div className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-1 mt-1">
                        <CloudRain className="w-3 h-3" />
                        {Number(ns.latest.precipitation).toFixed(1)} mm
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-1 text-xs text-[var(--tl-primary)] dark:text-[var(--tl-info)] font-medium group-hover:underline">
                      Ver detalle <ArrowRight className="w-3 h-3" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Related links                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Paginas relacionadas">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Paginas relacionadas
          </h2>
          <div className="flex flex-wrap gap-3">
            {provinceSlug && (
              <Link
                href={`/clima/provincia/${provinceSlug}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)] transition-all"
              >
                <Thermometer className="w-4 h-4" />
                Clima en {provinceName}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            {provinceSlug && communitySlug && (
              <Link
                href={`/espana/${communitySlug}/${provinceSlug}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)] transition-all"
              >
                <MapPin className="w-4 h-4" />
                Trafico en {provinceName}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            <Link
              href="/clima"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)] transition-all"
            >
              <Thermometer className="w-4 h-4" />
              Todas las estaciones climaticas
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Attribution */}
        <footer className="pt-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
            <ExternalLink className="w-3 h-3" />
            Fuente: AEMET — Registros climaticos diarios. Datos actualizados diariamente.
          </p>
        </footer>
      </div>
    </>
  );
}
