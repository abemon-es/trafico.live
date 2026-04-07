/**
 * /calidad-aire/provincia/[slug] — Calidad del aire por provincia
 *
 * Server component. [slug] = province name slugified (e.g. "madrid", "barcelona").
 * Data source: MITECO — Indice de Calidad del Aire (ICA)
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PROVINCE_NAMES, PROVINCES } from "@/lib/geo/ine-codes";
import { slugify } from "@/lib/geo/slugify";
import {
  Wind,
  MapPin,
  Activity,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";

export const revalidate = 600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// ICA config
// ---------------------------------------------------------------------------

interface IcaConfig {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

const ICA_CONFIG: Record<number, IcaConfig> = {
  1: {
    label: "Buena",
    color: "#059669",
    bgClass: "bg-emerald-50 dark:bg-emerald-900/20",
    textClass: "text-emerald-700 dark:text-emerald-400",
    borderClass: "border-emerald-200 dark:border-emerald-800",
  },
  2: {
    label: "Razonablemente buena",
    color: "#84cc16",
    bgClass: "bg-lime-50 dark:bg-lime-900/20",
    textClass: "text-lime-700 dark:text-lime-400",
    borderClass: "border-lime-200 dark:border-lime-800",
  },
  3: {
    label: "Regular",
    color: "#eab308",
    bgClass: "bg-yellow-50 dark:bg-yellow-900/20",
    textClass: "text-yellow-700 dark:text-yellow-400",
    borderClass: "border-yellow-200 dark:border-yellow-800",
  },
  4: {
    label: "Desfavorable",
    color: "#f97316",
    bgClass: "bg-orange-50 dark:bg-orange-900/20",
    textClass: "text-orange-700 dark:text-orange-400",
    borderClass: "border-orange-200 dark:border-orange-800",
  },
  5: {
    label: "Muy desfavorable",
    color: "#dc2626",
    bgClass: "bg-red-50 dark:bg-red-900/20",
    textClass: "text-red-700 dark:text-red-400",
    borderClass: "border-red-200 dark:border-red-800",
  },
};

function getIcaConfig(ica: number | null | undefined): IcaConfig | null {
  if (ica == null) return null;
  return ICA_CONFIG[ica] ?? null;
}

function formatPollutant(value: number | null | undefined): string {
  if (value == null) return "\u2014";
  return value.toLocaleString("es-ES", { maximumFractionDigits: 1 });
}

// ---------------------------------------------------------------------------
// Province lookup helpers
// ---------------------------------------------------------------------------

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
  // Find provinces that have AQ stations
  const provinces = await prisma.airQualityStation.groupBy({
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
  if (!prov) return { title: "Provincia no encontrada | trafico.live" };

  const title = `Calidad del aire en ${prov.name} \u2014 ICA por estacion en tiempo real`;
  const description = `Indice de Calidad del Aire (ICA) en ${prov.name}. Ranking de estaciones, NO\u2082, PM10, PM2.5 y O\u2083. Datos MITECO actualizados cada hora.`;

  return {
    title: `${title} | trafico.live`,
    description,
    alternates: {
      canonical: `${BASE_URL}/calidad-aire/provincia/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/calidad-aire/provincia/${slug}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProvinceAirQualityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const prov = findProvinceBySlug(slug);
  if (!prov) notFound();

  // All stations in province with latest reading
  const stations = await prisma.airQualityStation.findMany({
    where: { province: prov.code },
    include: {
      readings: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  if (stations.length === 0) notFound();

  // Compute stats
  const stationsWithIca = stations
    .map((s) => ({
      id: s.id,
      stationId: s.stationId,
      name: s.name,
      city: s.city,
      latitude: Number(s.latitude),
      longitude: Number(s.longitude),
      reading: s.readings[0] ?? null,
      ica: s.readings[0]?.ica ?? null,
    }))
    .sort((a, b) => {
      // Worst ICA first, null last
      if (a.ica == null && b.ica == null) return 0;
      if (a.ica == null) return 1;
      if (b.ica == null) return -1;
      return b.ica - a.ica;
    });

  const withIca = stationsWithIca.filter((s) => s.ica != null);
  const avgIca =
    withIca.length > 0
      ? Math.round(withIca.reduce((sum, s) => sum + (s.ica ?? 0), 0) / withIca.length)
      : null;
  const bestStation = [...stationsWithIca].filter((s) => s.ica != null).sort((a, b) => (a.ica ?? 99) - (b.ica ?? 99))[0] ?? null;
  const worstStation = stationsWithIca.filter((s) => s.ica != null)[0] ?? null;
  const goodCount = withIca.filter((s) => (s.ica ?? 99) <= 2).length;
  const badCount = withIca.filter((s) => (s.ica ?? 0) >= 4).length;

  const avgIcaCfg = getIcaConfig(avgIca);
  const communitySlug = getCommunitySlug(prov.code);
  const provinceSlug = slug;

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Calidad del aire en ${prov.name}`,
    description: `Estaciones de calidad del aire en ${prov.name} con indice ICA en tiempo real.`,
    url: `${BASE_URL}/calidad-aire/provincia/${slug}`,
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
            { name: "Calidad del Aire", href: "/calidad-aire" },
            { name: prov.name, href: `/calidad-aire/provincia/${slug}` },
          ]}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="relative overflow-hidden"
        style={{
          background: avgIcaCfg
            ? `linear-gradient(135deg, #0f172a 0%, ${avgIcaCfg.color}33 60%, ${avgIcaCfg.color}66 100%)`
            : "linear-gradient(135deg, #0f2817 0%, #0d4a2e 40%, #0a7a4f 80%, #059669 100%)",
        }}
      >
        <div className="pointer-events-none absolute -bottom-16 -right-16 w-80 h-80 rounded-full opacity-10"
          style={{ background: avgIcaCfg?.color ?? "#34d399" }} aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="flex items-center gap-3 mb-4">
            <Wind className="w-8 h-8 text-emerald-300" />
            <span className="font-heading text-emerald-300 text-sm font-semibold uppercase tracking-widest">
              Calidad del Aire por Provincia
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
                Calidad del aire en {prov.name}
              </h1>
              <p className="text-emerald-100 text-lg max-w-xl">
                {stations.length} estacion{stations.length !== 1 ? "es" : ""} de la Red de Vigilancia MITECO
                con indice ICA en tiempo real.
              </p>
            </div>

            {/* Average ICA badge */}
            {avgIcaCfg && avgIca != null && (
              <div className="flex flex-col items-center gap-1">
                <span
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full text-white font-mono text-3xl font-bold shadow-lg"
                  style={{ backgroundColor: avgIcaCfg.color }}
                >
                  {avgIca}
                </span>
                <span className="text-sm font-semibold text-white">
                  ICA medio
                </span>
                <span className="text-xs" style={{ color: avgIcaCfg.color }}>
                  {avgIcaCfg.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">

        {/* ---------------------------------------------------------------- */}
        {/* Stats strip                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Resumen de calidad del aire">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Estaciones</span>
              </div>
              <div className="font-mono text-3xl font-bold text-[var(--tl-primary)] dark:text-[var(--tl-info)]">
                {stations.length}
              </div>
            </div>

            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-[var(--tl-success)]" />
                <span className="text-sm text-gray-500 dark:text-gray-400">ICA buena</span>
              </div>
              <div className="font-mono text-3xl font-bold text-[var(--tl-success)]">
                {goodCount}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                ICA &le; 2
              </div>
            </div>

            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-[var(--tl-danger)]" />
                <span className="text-sm text-gray-500 dark:text-gray-400">ICA mala</span>
              </div>
              <div className="font-mono text-3xl font-bold text-[var(--tl-danger)]">
                {badCount}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                ICA &ge; 4
              </div>
            </div>

            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Con datos</span>
              </div>
              <div className="font-mono text-3xl font-bold text-[var(--tl-primary)] dark:text-[var(--tl-info)]">
                {withIca.length}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                de {stations.length}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Best / worst highlights                                           */}
        {/* ---------------------------------------------------------------- */}
        {(bestStation || worstStation) && (
          <section aria-label="Mejor y peor estacion">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bestStation && bestStation.ica != null && (
                <Link
                  href={`/calidad-aire/estacion/${bestStation.stationId}`}
                  className="group rounded-2xl border bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 p-5 hover:shadow-md transition-all"
                >
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">
                    Mejor calidad del aire
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-heading font-bold text-gray-900 dark:text-gray-100 group-hover:text-[var(--tl-primary)] transition-colors">
                        {bestStation.name}
                      </div>
                      {bestStation.city && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">{bestStation.city}</div>
                      )}
                    </div>
                    <span
                      className="inline-flex items-center justify-center w-12 h-12 rounded-full text-white font-mono text-xl font-bold"
                      style={{ backgroundColor: getIcaConfig(bestStation.ica)?.color ?? "#059669" }}
                    >
                      {bestStation.ica}
                    </span>
                  </div>
                </Link>
              )}

              {worstStation && worstStation.ica != null && worstStation.stationId !== bestStation?.stationId && (
                <Link
                  href={`/calidad-aire/estacion/${worstStation.stationId}`}
                  className="group rounded-2xl border bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 p-5 hover:shadow-md transition-all"
                >
                  <div className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-2">
                    Peor calidad del aire
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-heading font-bold text-gray-900 dark:text-gray-100 group-hover:text-[var(--tl-primary)] transition-colors">
                        {worstStation.name}
                      </div>
                      {worstStation.city && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">{worstStation.city}</div>
                      )}
                    </div>
                    <span
                      className="inline-flex items-center justify-center w-12 h-12 rounded-full text-white font-mono text-xl font-bold"
                      style={{ backgroundColor: getIcaConfig(worstStation.ica)?.color ?? "#dc2626" }}
                    >
                      {worstStation.ica}
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Station ranking                                                   */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Ranking de estaciones">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
            <Wind className="w-6 h-6 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
            Estaciones en {prov.name}
          </h2>

          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">Estacion</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-700 dark:text-gray-300">Municipio</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-700 dark:text-gray-300">ICA</th>
                  <th className="text-right px-3 py-3 font-semibold text-gray-700 dark:text-gray-300 font-mono">NO&#x2082;</th>
                  <th className="text-right px-3 py-3 font-semibold text-gray-700 dark:text-gray-300 font-mono">PM10</th>
                  <th className="text-right px-3 py-3 font-semibold text-gray-700 dark:text-gray-300 font-mono">PM2.5</th>
                  <th className="text-right px-3 py-3 font-semibold text-gray-700 dark:text-gray-300 font-mono">O&#x2083;</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {stationsWithIca.map((s) => {
                  const icaCfg = getIcaConfig(s.ica);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-3">
                        <Link
                          href={`/calidad-aire/estacion/${s.stationId}`}
                          className="font-medium text-gray-900 dark:text-gray-100 hover:text-[var(--tl-primary)] transition-colors"
                        >
                          {s.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                        {s.city ?? "\u2014"}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {icaCfg && s.ica != null ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: icaCfg.color }}
                          >
                            {s.ica} {icaCfg.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">Sin datos</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-gray-700 dark:text-gray-300">
                        {formatPollutant(s.reading?.no2)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-gray-700 dark:text-gray-300">
                        {formatPollutant(s.reading?.pm10)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-gray-700 dark:text-gray-300">
                        {formatPollutant(s.reading?.pm25)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-gray-700 dark:text-gray-300">
                        {formatPollutant(s.reading?.o3)}
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-gray-400 dark:text-gray-500 font-mono">
                        {s.reading?.createdAt
                          ? new Date(s.reading.createdAt).toLocaleTimeString("es-ES", {
                              hour: "2-digit",
                              minute: "2-digit",
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
            {stationsWithIca.map((s) => {
              const icaCfg = getIcaConfig(s.ica);
              return (
                <Link
                  key={s.id}
                  href={`/calidad-aire/estacion/${s.stationId}`}
                  className="block rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight">
                        {s.name}
                      </div>
                      {s.city && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.city}</div>
                      )}
                    </div>
                    {icaCfg && s.ica != null ? (
                      <span
                        className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: icaCfg.color }}
                      >
                        {s.ica} {icaCfg.label}
                      </span>
                    ) : (
                      <span className="flex-shrink-0 text-xs text-gray-400">Sin datos</span>
                    )}
                  </div>

                  {s.reading && (
                    <dl className="grid grid-cols-4 gap-2 mt-2">
                      <div>
                        <dt className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">NO&#x2082;</dt>
                        <dd className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {formatPollutant(s.reading.no2)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">PM10</dt>
                        <dd className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {formatPollutant(s.reading.pm10)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">PM2.5</dt>
                        <dd className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {formatPollutant(s.reading.pm25)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">O&#x2083;</dt>
                        <dd className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {formatPollutant(s.reading.o3)}
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
        {/* Station coordinates                                               */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Coordenadas de estaciones">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
            Ubicacion de las estaciones
          </h2>
          <div className="rounded-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/80">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-gray-600 dark:text-gray-400">Estacion</th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-600 dark:text-gray-400">Latitud</th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-600 dark:text-gray-400">Longitud</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {stationsWithIca.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-1.5 text-gray-700 dark:text-gray-300">{s.name}</td>
                      <td className="px-4 py-1.5 text-right font-mono text-gray-500 dark:text-gray-400">
                        {s.latitude.toFixed(6)}
                      </td>
                      <td className="px-4 py-1.5 text-right font-mono text-gray-500 dark:text-gray-400">
                        {s.longitude.toFixed(6)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Related links                                                     */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Enlaces relacionados">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Paginas relacionadas
          </h2>
          <div className="flex flex-wrap gap-3">
            {communitySlug && (
              <Link
                href={`/espana/${communitySlug}/${provinceSlug}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)] transition-all"
              >
                <MapPin className="w-4 h-4" />
                Trafico en {prov.name}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            <Link
              href="/calidad-aire"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)] transition-all"
            >
              <Wind className="w-4 h-4" />
              Calidad del aire en toda Espana
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Attribution */}
        <footer className="pt-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
            <ExternalLink className="w-3 h-3" />
            Fuente: MITECO — Indice de Calidad del Aire (ICA). Datos actualizados cada hora.
          </p>
        </footer>
      </div>
    </>
  );
}
