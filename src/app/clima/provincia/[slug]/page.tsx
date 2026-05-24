/**
 * /clima/provincia/[slug] — Clima por provincia
 *
 * Server component. [slug] = province name slugified (e.g. "madrid", "barcelona").
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
  MapPin,
  Mountain,
  ArrowRight,
  ExternalLink,
  CloudRain,
  BarChart3,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";

export const revalidate = 3600;

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

function formatTemp(value: number | null | undefined): string {
  if (value == null) return "\u2014";
  return Number(value).toFixed(1);
}

function formatDecimal(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "\u2014";
  return Number(value).toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Find the INE province code from a URL slug. */
function findProvinceBySlug(slug: string): { code: string; name: string } | null {
  for (const [code, name] of Object.entries(PROVINCE_NAMES)) {
    if (slugify(name) === slug) return { code, name };
  }
  return null;
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
// Static params
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const provinces = await prisma.climateStation.groupBy({
    by: ["province"],
    where: { province: { not: null } },
  });

  return provinces
    .filter((p) => p.province != null)
    .map((p) => {
      const name = PROVINCE_NAMES[p.province!];
      return name ? { slug: slugify(name) } : null;
    })
    .filter(Boolean) as { slug: string }[];
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const prov = findProvinceBySlug(slug);
  if (!prov) return { title: "Provincia no encontrada" };

  const title = `Clima en ${prov.name} — Temperatura y Precipitacion por estacion`;
  const description = `Estaciones climaticas AEMET en ${prov.name}. Temperatura, precipitacion, viento y horas de sol. Datos diarios actualizados desde 2000.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/clima/provincia/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/clima/provincia/${slug}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProvinceClimatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const prov = findProvinceBySlug(slug);
  if (!prov) notFound();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // All stations in province
  const stations = await prisma.climateStation.findMany({
    where: { province: prov.code },
    orderBy: { name: "asc" },
  });

  if (stations.length === 0) notFound();

  // Get latest record per station
  const stationsWithLatest = await Promise.all(
    stations.map(async (s) => {
      const latest = await prisma.climateRecord.findFirst({
        where: { stationId: s.id },
        orderBy: { date: "desc" },
        select: {
          tempMin: true,
          tempMax: true,
          tempAvg: true,
          precipitation: true,
          windSpeed: true,
          sunHours: true,
          date: true,
        },
      });
      return {
        id: s.id,
        stationCode: s.stationCode,
        name: s.name,
        altitude: s.altitude,
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
        isActive: s.isActive,
        latest,
      };
    })
  );

  // Province-wide averages (last 30 days)
  const stationIds = stations.map((s) => s.id);
  const provinceAvg = await prisma.$queryRaw<Array<{
    avg_min: number | null;
    avg_max: number | null;
    avg_avg: number | null;
    total_precip: number | null;
    avg_wind: number | null;
    avg_sun: number | null;
    record_count: number;
    abs_min: number | null;
    abs_max: number | null;
  }>>`
    SELECT
      AVG("tempMin"::numeric) as avg_min,
      AVG("tempMax"::numeric) as avg_max,
      AVG("tempAvg"::numeric) as avg_avg,
      SUM(precipitation::numeric) / NULLIF(COUNT(DISTINCT "stationId"), 0) as total_precip,
      AVG("windSpeed"::numeric) as avg_wind,
      AVG("sunHours"::numeric) as avg_sun,
      COUNT(*)::int as record_count,
      MIN("tempMin"::numeric) as abs_min,
      MAX("tempMax"::numeric) as abs_max
    FROM "ClimateRecord"
    WHERE "stationId" = ANY(${stationIds})
      AND date >= ${thirtyDaysAgo}
  `;

  const avg = provinceAvg[0] ?? null;
  const heroTemp = avg?.avg_avg != null ? Number(avg.avg_avg) : null;
  const communitySlug = getCommunitySlug(prov.code);

  // Sort stations: active first, then by latest temp desc
  const sortedStations = [...stationsWithLatest].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    const aTemp = a.latest?.tempAvg != null ? Number(a.latest.tempAvg) : -999;
    const bTemp = b.latest?.tempAvg != null ? Number(b.latest.tempAvg) : -999;
    return bTemp - aTemp;
  });

  // Find extremes
  const stationsWithTemp = stationsWithLatest.filter(
    (s) => s.latest?.tempAvg != null
  );
  const hottestStation = stationsWithTemp.length > 0
    ? stationsWithTemp.reduce((a, b) =>
        Number(a.latest!.tempMax ?? -999) > Number(b.latest!.tempMax ?? -999) ? a : b
      )
    : null;
  const coldestStation = stationsWithTemp.length > 0
    ? stationsWithTemp.reduce((a, b) =>
        Number(a.latest!.tempMin ?? 999) < Number(b.latest!.tempMin ?? 999) ? a : b
      )
    : null;

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Clima en ${prov.name}`,
    description: `Estaciones climaticas AEMET en ${prov.name} con datos de temperatura y precipitacion.`,
    url: `${BASE_URL}/clima/provincia/${slug}`,
    inLanguage: "es",
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  return (
    <>
      <StructuredData data={webPageSchema} />

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Clima", href: "/clima" },
            { name: prov.name, href: `/clima/provincia/${slug}` },
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
                : "linear-gradient(135deg, #0f172a 0%, #0e749933 60%, #06b6d433 100%)"
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
              Clima por Provincia
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
                Clima en {prov.name}
              </h1>
              <p className="text-amber-100 text-lg max-w-xl">
                {stations.length} estacion{stations.length !== 1 ? "es" : ""} climatica{stations.length !== 1 ? "s" : ""} AEMET
                {avg?.record_count ? ` con datos actualizados diariamente` : ""}.
              </p>
            </div>

            {/* Temperature badge */}
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
                <span className="text-xs text-gray-300">
                  ultimos 30 dias
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">

        {/* ---------------------------------------------------------------- */}
        {/* Province summary                                                 */}
        {/* ---------------------------------------------------------------- */}
        {avg && (
          <section aria-label="Resumen provincial">
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
              Resumen provincial — ultimos 30 dias
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Temp. min. media</span>
                </div>
                <div className="font-mono text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {avg.avg_min != null ? `${Number(avg.avg_min).toFixed(1)}°` : "\u2014"}
                </div>
                {avg.abs_min != null && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                    Min. absoluto: {Number(avg.abs_min).toFixed(1)}°C
                  </div>
                )}
              </div>

              <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Temp. max. media</span>
                </div>
                <div className="font-mono text-3xl font-bold text-red-600 dark:text-red-400">
                  {avg.avg_max != null ? `${Number(avg.avg_max).toFixed(1)}°` : "\u2014"}
                </div>
                {avg.abs_max != null && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                    Max. absoluto: {Number(avg.abs_max).toFixed(1)}°C
                  </div>
                )}
              </div>

              <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-5 h-5 text-cyan-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Precipitacion media</span>
                </div>
                <div className="font-mono text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                  {avg.total_precip != null ? `${Number(avg.total_precip).toFixed(1)}` : "\u2014"}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">mm por estacion</div>
              </div>

              <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Estaciones</span>
                </div>
                <div className="font-mono text-3xl font-bold text-[var(--tl-primary)] dark:text-[var(--tl-info)]">
                  {stations.length}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {stations.filter((s) => s.isActive).length} activas
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Hottest / Coldest highlights                                     */}
        {/* ---------------------------------------------------------------- */}
        {(hottestStation || coldestStation) && (
          <section aria-label="Estaciones extremas">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hottestStation && hottestStation.latest?.tempMax != null && (
                <Link
                  href={`/clima/estacion/${hottestStation.stationCode}`}
                  className="group rounded-2xl border bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 p-5 hover:shadow-md transition-all"
                >
                  <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2">
                    Mayor temperatura
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-heading font-bold text-gray-900 dark:text-gray-100 group-hover:text-[var(--tl-primary)] transition-colors">
                        {hottestStation.name}
                      </div>
                      {hottestStation.altitude != null && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Mountain className="w-3 h-3" />
                          {hottestStation.altitude} m
                        </div>
                      )}
                    </div>
                    <span className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {Number(hottestStation.latest.tempMax).toFixed(1)}°C
                    </span>
                  </div>
                </Link>
              )}

              {coldestStation && coldestStation.latest?.tempMin != null &&
               coldestStation.stationCode !== hottestStation?.stationCode && (
                <Link
                  href={`/clima/estacion/${coldestStation.stationCode}`}
                  className="group rounded-2xl border bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 p-5 hover:shadow-md transition-all"
                >
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">
                    Menor temperatura
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-heading font-bold text-gray-900 dark:text-gray-100 group-hover:text-[var(--tl-primary)] transition-colors">
                        {coldestStation.name}
                      </div>
                      {coldestStation.altitude != null && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Mountain className="w-3 h-3" />
                          {coldestStation.altitude} m
                        </div>
                      )}
                    </div>
                    <span className="font-mono text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {Number(coldestStation.latest.tempMin).toFixed(1)}°C
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Station list                                                     */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Estaciones climaticas">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
            <Thermometer className="w-6 h-6 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
            Estaciones en {prov.name}
          </h2>

          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">Estacion</th>
                  <th className="text-right px-3 py-3 font-semibold text-gray-700 dark:text-gray-300">Altitud</th>
                  <th className="text-right px-3 py-3 font-semibold text-gray-700 dark:text-gray-300 font-mono">T.min</th>
                  <th className="text-right px-3 py-3 font-semibold text-gray-700 dark:text-gray-300 font-mono">T.max</th>
                  <th className="text-right px-3 py-3 font-semibold text-gray-700 dark:text-gray-300 font-mono">T.media</th>
                  <th className="text-right px-3 py-3 font-semibold text-gray-700 dark:text-gray-300 font-mono">Lluvia</th>
                  <th className="text-right px-3 py-3 font-semibold text-gray-700 dark:text-gray-300 font-mono">Viento</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {sortedStations.map((s) => {
                  const tempAvg = s.latest?.tempAvg != null ? Number(s.latest.tempAvg) : null;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-3">
                        <Link
                          href={`/clima/estacion/${s.stationCode}`}
                          className="font-medium text-gray-900 dark:text-gray-100 hover:text-[var(--tl-primary)] transition-colors"
                        >
                          {s.name}
                        </Link>
                        {!s.isActive && (
                          <span className="ml-2 text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            Inactiva
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-gray-500 dark:text-gray-400">
                        {s.altitude != null ? `${s.altitude} m` : "\u2014"}
                      </td>
                      <td className={`px-3 py-3 text-right font-mono text-xs font-semibold ${
                        s.latest?.tempMin != null ? getTempColor(Number(s.latest.tempMin)) : "text-gray-400"
                      }`}>
                        {formatTemp(s.latest?.tempMin ? Number(s.latest.tempMin) : null)}
                        {s.latest?.tempMin != null && "°"}
                      </td>
                      <td className={`px-3 py-3 text-right font-mono text-xs font-semibold ${
                        s.latest?.tempMax != null ? getTempColor(Number(s.latest.tempMax)) : "text-gray-400"
                      }`}>
                        {formatTemp(s.latest?.tempMax ? Number(s.latest.tempMax) : null)}
                        {s.latest?.tempMax != null && "°"}
                      </td>
                      <td className={`px-3 py-3 text-right font-mono text-xs font-semibold ${
                        tempAvg != null ? getTempColor(tempAvg) : "text-gray-400"
                      }`}>
                        {formatTemp(tempAvg)}
                        {tempAvg != null && "°"}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-cyan-600 dark:text-cyan-400">
                        {s.latest?.precipitation != null
                          ? `${formatDecimal(Number(s.latest.precipitation))} mm`
                          : "\u2014"}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-gray-700 dark:text-gray-300">
                        {s.latest?.windSpeed != null
                          ? `${formatDecimal(Number(s.latest.windSpeed))} km/h`
                          : "\u2014"}
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-gray-400 dark:text-gray-500 font-mono">
                        {s.latest?.date
                          ? new Date(s.latest.date).toLocaleDateString("es-ES", {
                              day: "2-digit",
                              month: "short",
                            })
                          : "\u2014"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {sortedStations.map((s) => {
              const tempAvg = s.latest?.tempAvg != null ? Number(s.latest.tempAvg) : null;
              return (
                <Link
                  key={s.id}
                  href={`/clima/estacion/${s.stationCode}`}
                  className="block rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight">
                        {s.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {s.altitude != null && (
                          <span className="flex items-center gap-0.5">
                            <Mountain className="w-3 h-3" /> {s.altitude} m
                          </span>
                        )}
                        {!s.isActive && (
                          <span className="text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px]">
                            Inactiva
                          </span>
                        )}
                      </div>
                    </div>
                    {tempAvg != null ? (
                      <span className={`flex-shrink-0 font-mono text-lg font-bold ${getTempColor(tempAvg)}`}>
                        {tempAvg.toFixed(1)}°C
                      </span>
                    ) : (
                      <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                        Sin datos
                      </span>
                    )}
                  </div>

                  {s.latest && (
                    <dl className="grid grid-cols-4 gap-2 mt-2">
                      <div>
                        <dt className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">T.min</dt>
                        <dd className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {formatTemp(s.latest.tempMin ? Number(s.latest.tempMin) : null)}{s.latest.tempMin != null && "°"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">T.max</dt>
                        <dd className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {formatTemp(s.latest.tempMax ? Number(s.latest.tempMax) : null)}{s.latest.tempMax != null && "°"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Lluvia</dt>
                        <dd className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                          {s.latest.precipitation != null ? `${formatDecimal(Number(s.latest.precipitation))} mm` : "\u2014"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Viento</dt>
                        <dd className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {s.latest.windSpeed != null ? `${formatDecimal(Number(s.latest.windSpeed))}` : "\u2014"}
                        </dd>
                      </div>
                    </dl>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Related links                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Paginas relacionadas">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Paginas relacionadas
          </h2>
          <div className="flex flex-wrap gap-3">
            {communitySlug && (
              <Link
                href={`/espana/${communitySlug}/${slug}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)] transition-all"
              >
                <MapPin className="w-4 h-4" />
                Trafico en {prov.name}
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
