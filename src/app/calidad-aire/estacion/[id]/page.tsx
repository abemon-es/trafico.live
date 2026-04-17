/**
 * /calidad-aire/estacion/[id] — Detalle de estacion de calidad del aire
 *
 * Server component. [id] = MITECO stationId (e.g. "ES1985A").
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
  Gauge,
  AlertTriangle,
  Heart,
  Thermometer,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { IcaTrendChart } from "./IcaTrendChart";

export const revalidate = 300;
export const dynamicParams = true;

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
  description: string;
  healthAdvice: string;
}

const ICA_CONFIG: Record<number, IcaConfig> = {
  1: {
    label: "Buena",
    color: "#059669",
    bgClass: "bg-emerald-50 dark:bg-emerald-900/20",
    textClass: "text-emerald-700 dark:text-emerald-400",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    description: "La calidad del aire es satisfactoria y no supone riesgo para la salud.",
    healthAdvice: "No se requieren precauciones especiales. Ideal para actividades al aire libre.",
  },
  2: {
    label: "Razonablemente buena",
    color: "#84cc16",
    bgClass: "bg-lime-50 dark:bg-lime-900/20",
    textClass: "text-lime-700 dark:text-lime-400",
    borderClass: "border-lime-200 dark:border-lime-800",
    description: "Calidad aceptable. Algunos contaminantes pueden afectar a personas muy sensibles.",
    healthAdvice: "Las personas extremadamente sensibles deben considerar limitar la exposicion prolongada al aire libre.",
  },
  3: {
    label: "Regular",
    color: "#eab308",
    bgClass: "bg-yellow-50 dark:bg-yellow-900/20",
    textClass: "text-yellow-700 dark:text-yellow-400",
    borderClass: "border-yellow-200 dark:border-yellow-800",
    description: "Grupos sensibles pueden experimentar efectos sobre la salud.",
    healthAdvice: "Personas con enfermedades respiratorias o cardiovasculares, ancianos y ninos deben reducir esfuerzos prolongados al aire libre.",
  },
  4: {
    label: "Desfavorable",
    color: "#f97316",
    bgClass: "bg-orange-50 dark:bg-orange-900/20",
    textClass: "text-orange-700 dark:text-orange-400",
    borderClass: "border-orange-200 dark:border-orange-800",
    description: "Puede causar problemas de salud en la poblacion general.",
    healthAdvice: "Todo el mundo debe reducir actividades al aire libre prolongadas o intensas. Grupos sensibles deben evitarlas.",
  },
  5: {
    label: "Muy desfavorable",
    color: "#dc2626",
    bgClass: "bg-red-50 dark:bg-red-900/20",
    textClass: "text-red-700 dark:text-red-400",
    borderClass: "border-red-200 dark:border-red-800",
    description: "Alerta sanitaria. Toda la poblacion puede verse afectada gravemente.",
    healthAdvice: "Se recomienda permanecer en interiores. Evitar cualquier actividad fisica al aire libre.",
  },
};

// Pollutant thresholds (WHO guidelines)
interface PollutantConfig {
  name: string;
  symbol: string;
  unit: string;
  greenMax: number;
  amberMax: number;
}

const POLLUTANT_CONFIG: Record<string, PollutantConfig> = {
  no2: { name: "Dioxido de nitrogeno", symbol: "NO₂", unit: "µg/m³", greenMax: 40, amberMax: 100 },
  pm10: { name: "Particulas PM10", symbol: "PM10", unit: "µg/m³", greenMax: 50, amberMax: 100 },
  pm25: { name: "Particulas PM2.5", symbol: "PM2.5", unit: "µg/m³", greenMax: 25, amberMax: 50 },
  o3: { name: "Ozono troposferico", symbol: "O₃", unit: "µg/m³", greenMax: 100, amberMax: 180 },
  so2: { name: "Dioxido de azufre", symbol: "SO₂", unit: "µg/m³", greenMax: 100, amberMax: 350 },
  co: { name: "Monoxido de carbono", symbol: "CO", unit: "mg/m³", greenMax: 4, amberMax: 10 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getIcaConfig(ica: number | null | undefined): IcaConfig | null {
  if (ica == null) return null;
  return ICA_CONFIG[ica] ?? null;
}

function getPollutantColor(key: string, value: number | null | undefined): string {
  if (value == null) return "text-gray-400 dark:text-gray-500";
  const cfg = POLLUTANT_CONFIG[key];
  if (!cfg) return "text-gray-700 dark:text-gray-300";
  if (value <= cfg.greenMax) return "text-emerald-600 dark:text-emerald-400";
  if (value <= cfg.amberMax) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getPollutantBgColor(key: string, value: number | null | undefined): string {
  if (value == null) return "bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700";
  const cfg = POLLUTANT_CONFIG[key];
  if (!cfg) return "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700";
  if (value <= cfg.greenMax) return "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800";
  if (value <= cfg.amberMax) return "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800";
  return "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800";
}

function getPollutantStatusLabel(key: string, value: number | null | undefined): string {
  if (value == null) return "Sin datos";
  const cfg = POLLUTANT_CONFIG[key];
  if (!cfg) return "";
  if (value <= cfg.greenMax) return "Bueno";
  if (value <= cfg.amberMax) return "Moderado";
  return "Alto";
}

function formatPollutant(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("es-ES", { maximumFractionDigits: 1 });
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
// Static params
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const stations = await prisma.airQualityStation.findMany({
    where: { readings: { some: {} } },
    select: { stationId: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return stations.map((s) => ({ id: s.stationId }));
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
  const station = await prisma.airQualityStation.findUnique({
    where: { stationId: decodeURIComponent(id) },
  });
  if (!station) {
    return { title: "Estacion no encontrada | trafico.live" };
  }

  const provinceName = station.province ? PROVINCE_NAMES[station.province] ?? "" : "";
  const cityStr = station.city ?? provinceName;
  const title = `Calidad del aire en ${station.name}${cityStr ? ` (${cityStr})` : ""} — ICA en tiempo real`;
  const description = `Indice de Calidad del Aire (ICA) en tiempo real en ${station.name}, ${cityStr}. Concentracion de NO₂, PM10, PM2.5, O₃, SO₂ y CO. Red de Vigilancia MITECO.`;

  return {
    title: `${title} | trafico.live`,
    description,
    alternates: {
      canonical: `${BASE_URL}/calidad-aire/estacion/${station.stationId}`,
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/calidad-aire/estacion/${station.stationId}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function StationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const stationId = decodeURIComponent(id);

  // 1. Station
  const station = await prisma.airQualityStation.findUnique({
    where: { stationId },
  });
  if (!station) notFound();

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 2-4. Latest reading, 24h history, nearby stations
  const [latestReading, history, nearbyStations] = await Promise.all([
    prisma.airQualityReading.findFirst({
      where: { stationId: station.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.airQualityReading.findMany({
      where: {
        stationId: station.id,
        createdAt: { gte: twentyFourHoursAgo },
      },
      orderBy: { createdAt: "asc" },
    }),
    station.province
      ? prisma.airQualityStation.findMany({
          where: {
            province: station.province,
            id: { not: station.id },
          },
          include: {
            readings: { orderBy: { createdAt: "desc" }, take: 1 },
          },
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  const icaCfg = getIcaConfig(latestReading?.ica);
  const provinceName = station.province ? PROVINCE_NAMES[station.province] ?? null : null;
  const provinceSlug = station.province ? getProvinceSlug(station.province) : null;
  const communitySlug = station.province ? getCommunitySlug(station.province) : null;

  // Trend data for client chart
  const trendData = history.map((r) => ({
    time: new Date(r.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
    ica: r.ica ?? 0,
    no2: r.no2 ?? null,
    pm10: r.pm10 ?? null,
    pm25: r.pm25 ?? null,
    o3: r.o3 ?? null,
  }));

  // Structured data
  const observationSchema = {
    "@context": "https://schema.org",
    "@type": "Observation",
    name: `Calidad del aire en ${station.name}`,
    description: `Medicion ICA en ${station.name}, ${station.city ?? provinceName ?? "Espana"}`,
    observationDate: latestReading?.createdAt ? new Date(latestReading.createdAt).toISOString() : undefined,
    measuredProperty: {
      "@type": "PropertyValue",
      name: "Indice de Calidad del Aire (ICA)",
      value: latestReading?.ica ?? null,
      unitText: "ICA 1-5",
    },
    observedIn: {
      "@type": "Place",
      name: station.name,
      address: {
        "@type": "PostalAddress",
        addressLocality: station.city ?? undefined,
        addressRegion: provinceName ?? undefined,
        addressCountry: "ES",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: Number(station.latitude),
        longitude: Number(station.longitude),
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
            { name: "Calidad del Aire", href: "/calidad-aire" },
            ...(provinceName && provinceSlug
              ? [{ name: provinceName, href: `/calidad-aire/provincia/${provinceSlug}` }]
              : []),
            { name: station.name, href: `/calidad-aire/estacion/${station.stationId}` },
          ]}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="relative overflow-hidden"
        style={{
          background: icaCfg
            ? `linear-gradient(135deg, #0f172a 0%, ${icaCfg.color}33 60%, ${icaCfg.color}66 100%)`
            : "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        }}
      >
        <div className="pointer-events-none absolute -bottom-16 -right-16 w-80 h-80 rounded-full opacity-10"
          style={{ background: icaCfg?.color ?? "#64748b" }} aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="flex items-center gap-3 mb-4">
            <Wind className="w-8 h-8 text-emerald-300" />
            <span className="font-heading text-emerald-300 text-sm font-semibold uppercase tracking-widest">
              Estacion de calidad del aire
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
                {station.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
                {station.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {station.city}
                  </span>
                )}
                {provinceName && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {provinceName}
                  </span>
                )}
                {station.network && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-white">
                    {station.network}
                  </span>
                )}
              </div>
            </div>

            {/* ICA badge */}
            {icaCfg && latestReading?.ica != null && (
              <div className="flex flex-col items-center gap-1">
                <span
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full text-white font-mono text-3xl font-bold shadow-lg"
                  style={{ backgroundColor: icaCfg.color }}
                >
                  {latestReading.ica}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: icaCfg.color }}
                >
                  {icaCfg.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">

        {/* ---------------------------------------------------------------- */}
        {/* ICA actual                                                        */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="ICA actual">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
            Indice de Calidad del Aire actual
          </h2>

          {icaCfg && latestReading?.ica != null ? (
            <div className={`rounded-2xl border p-6 ${icaCfg.bgClass} ${icaCfg.borderClass}`}>
              <div className="flex items-center gap-4 mb-4">
                <span
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full text-white font-mono text-2xl font-bold"
                  style={{ backgroundColor: icaCfg.color }}
                >
                  {latestReading.ica}
                </span>
                <div>
                  <div className={`font-heading text-2xl font-bold ${icaCfg.textClass}`}>
                    {icaCfg.label}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {icaCfg.description}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 p-4 rounded-xl bg-white/60 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-700/50">
                <Heart className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-0.5">
                    Consejo sanitario
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {icaCfg.healthAdvice}
                  </p>
                </div>
              </div>

              {latestReading.createdAt && (
                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 font-mono">
                  Ultima lectura:{" "}
                  {new Date(latestReading.createdAt).toLocaleString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-8 text-center">
              <AlertTriangle className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No hay lectura ICA reciente para esta estacion. Los datos se actualizan cada hora desde MITECO.
              </p>
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Pollutant breakdown                                               */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Contaminantes">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
            Detalle de contaminantes
          </h2>

          {latestReading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(POLLUTANT_CONFIG).map(([key, cfg]) => {
                const value = latestReading[key as keyof typeof latestReading] as number | null;
                const colorClass = getPollutantColor(key, value);
                const bgColorClass = getPollutantBgColor(key, value);
                const statusLabel = getPollutantStatusLabel(key, value);

                return (
                  <div
                    key={key}
                    className={`rounded-xl border p-4 ${bgColorClass}`}
                  >
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      {cfg.symbol}
                    </div>
                    <div className={`font-mono text-2xl font-bold ${colorClass}`}>
                      {formatPollutant(value)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {cfg.unit}
                    </div>
                    <div className={`text-xs font-medium mt-1 ${colorClass}`}>
                      {statusLabel}
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                      {cfg.name}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              Sin datos de contaminantes disponibles.
            </p>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 24h trend                                                         */}
        {/* ---------------------------------------------------------------- */}
        {trendData.length > 1 && (
          <section aria-label="Evolucion ultimas 24 horas">
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
              Evolucion ICA — ultimas 24 horas
            </h2>
            <IcaTrendChart data={trendData} />
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Station info                                                      */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Informacion de la estacion">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
            Informacion de la estacion
          </h2>

          <div className="rounded-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 overflow-hidden">
            <dl className="divide-y divide-gray-100 dark:divide-gray-800">
              <div className="flex justify-between px-5 py-3">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Codigo MITECO</dt>
                <dd className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">{station.stationId}</dd>
              </div>
              <div className="flex justify-between px-5 py-3">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Red</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">{station.network ?? "No especificada"}</dd>
              </div>
              {station.city && (
                <div className="flex justify-between px-5 py-3">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Municipio</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{station.city}</dd>
                </div>
              )}
              {provinceName && (
                <div className="flex justify-between px-5 py-3">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Provincia</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{provinceName}</dd>
                </div>
              )}
              <div className="flex justify-between px-5 py-3">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Coordenadas</dt>
                <dd className="text-sm font-mono text-gray-900 dark:text-gray-100">
                  {Number(station.latitude).toFixed(6)}, {Number(station.longitude).toFixed(6)}
                </dd>
              </div>
              {station.elevation != null && (
                <div className="flex justify-between px-5 py-3">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Altitud</dt>
                  <dd className="text-sm font-mono text-gray-900 dark:text-gray-100">{station.elevation} m</dd>
                </div>
              )}
              <div className="flex justify-between px-5 py-3">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Ultima actualizacion</dt>
                <dd className="text-sm font-mono text-gray-900 dark:text-gray-100">
                  {new Date(station.updatedAt).toLocaleString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Nearby stations                                                   */}
        {/* ---------------------------------------------------------------- */}
        {nearbyStations.length > 0 && (
          <section aria-label="Estaciones cercanas">
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
              Estaciones cercanas en {provinceName}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {nearbyStations.map((ns) => {
                const nsReading = ns.readings[0] ?? null;
                const nsIca = getIcaConfig(nsReading?.ica);

                return (
                  <Link
                    key={ns.id}
                    href={`/calidad-aire/estacion/${ns.stationId}`}
                    className="group rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-[var(--tl-primary)] transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-[var(--tl-primary)] transition-colors leading-tight">
                        {ns.name}
                      </div>
                      {nsIca && nsReading?.ica != null ? (
                        <span
                          className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: nsIca.color }}
                        >
                          {nsReading.ica} {nsIca.label}
                        </span>
                      ) : (
                        <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                          Sin datos
                        </span>
                      )}
                    </div>
                    {ns.city && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {ns.city}
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
        {/* Province + Spain links                                            */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Enlaces relacionados">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Paginas relacionadas
          </h2>
          <div className="flex flex-wrap gap-3">
            {provinceSlug && (
              <Link
                href={`/calidad-aire/provincia/${provinceSlug}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)] transition-all"
              >
                <Wind className="w-4 h-4" />
                Calidad del aire en {provinceName}
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
              href="/calidad-aire"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)] transition-all"
            >
              <Activity className="w-4 h-4" />
              Todas las estaciones
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
