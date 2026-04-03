/**
 * /calidad-aire — Calidad del Aire en España
 *
 * Server-side page with real data from AirQualityStation + AirQualityReading models.
 * Data source: Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO)
 */

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  Wind,
  MapPin,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Activity,
  ArrowRight,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";

export const revalidate = 300; // 5 minutes

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Calidad del Aire en España — Índice ICA en tiempo real | trafico.live",
  description:
    "Índice de Calidad del Aire (ICA) por provincia. NO₂, PM10, PM2.5, O₃, SO₂ en tiempo real. Datos de la Red de Vigilancia del Ministerio para la Transición Ecológica (MITECO).",
  alternates: {
    canonical: `${BASE_URL}/calidad-aire`,
  },
  openGraph: {
    title: "Calidad del Aire en España — Índice ICA",
    description:
      "Contaminación atmosférica en tiempo real. Estaciones MITECO con índice ICA, NO₂, PM10, PM2.5 y O₃ por provincia.",
    url: `${BASE_URL}/calidad-aire`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// ICA helpers
// ---------------------------------------------------------------------------

interface IcaConfig {
  label: string;
  color: string; // CSS color used inline (no tl-* token exists for these env colors)
  bgClass: string;
  textClass: string;
  borderClass: string;
  description: string;
}

const ICA_CONFIG: Record<number, IcaConfig> = {
  1: {
    label: "Buena",
    color: "#059669",
    bgClass: "bg-emerald-50 dark:bg-emerald-900/20",
    textClass: "text-emerald-700 dark:text-emerald-400",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    description: "La calidad del aire es satisfactoria.",
  },
  2: {
    label: "Razonable",
    color: "#d97706",
    bgClass: "bg-amber-50 dark:bg-amber-900/20",
    textClass: "text-amber-700 dark:text-amber-400",
    borderClass: "border-amber-200 dark:border-amber-800",
    description: "Calidad aceptable. Puede afectar a personas sensibles.",
  },
  3: {
    label: "Moderada",
    color: "#ea580c",
    bgClass: "bg-orange-50 dark:bg-orange-900/20",
    textClass: "text-orange-700 dark:text-orange-400",
    borderClass: "border-orange-200 dark:border-orange-800",
    description: "Grupos sensibles pueden experimentar efectos.",
  },
  4: {
    label: "Mala",
    color: "#dc2626",
    bgClass: "bg-red-50 dark:bg-red-900/20",
    textClass: "text-red-700 dark:text-red-400",
    borderClass: "border-red-200 dark:border-red-800",
    description: "Puede causar problemas de salud en toda la población.",
  },
  5: {
    label: "Muy mala",
    color: "#7c3aed",
    bgClass: "bg-purple-50 dark:bg-purple-900/20",
    textClass: "text-purple-700 dark:text-purple-400",
    borderClass: "border-purple-200 dark:border-purple-800",
    description: "Aviso sanitario. Toda la población puede verse afectada.",
  },
};

const PROVINCE_NAMES: Record<string, string> = {
  "01": "Álava",
  "02": "Albacete",
  "03": "Alicante",
  "04": "Almería",
  "05": "Ávila",
  "06": "Badajoz",
  "07": "Baleares",
  "08": "Barcelona",
  "09": "Burgos",
  "10": "Cáceres",
  "11": "Cádiz",
  "12": "Castellón",
  "13": "Ciudad Real",
  "14": "Córdoba",
  "15": "A Coruña",
  "16": "Cuenca",
  "17": "Girona",
  "18": "Granada",
  "19": "Guadalajara",
  "20": "Gipuzkoa",
  "21": "Huelva",
  "22": "Huesca",
  "23": "Jaén",
  "24": "León",
  "25": "Lleida",
  "26": "La Rioja",
  "27": "Lugo",
  "28": "Madrid",
  "29": "Málaga",
  "30": "Murcia",
  "31": "Navarra",
  "32": "Ourense",
  "33": "Asturias",
  "34": "Palencia",
  "35": "Las Palmas",
  "36": "Pontevedra",
  "37": "Salamanca",
  "38": "Santa Cruz de Tenerife",
  "39": "Cantabria",
  "40": "Segovia",
  "41": "Sevilla",
  "42": "Soria",
  "43": "Tarragona",
  "44": "Teruel",
  "45": "Toledo",
  "46": "Valencia",
  "47": "Valladolid",
  "48": "Bizkaia",
  "49": "Zamora",
  "50": "Zaragoza",
  "51": "Ceuta",
  "52": "Melilla",
};

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getStationsWithReadings() {
  const stations = await prisma.airQualityStation.findMany({
    include: {
      readings: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ province: "asc" }, { name: "asc" }],
  });

  return stations.map((s) => ({
    id: s.id,
    stationId: s.stationId,
    name: s.name,
    city: s.city,
    province: s.province,
    network: s.network,
    latitude: Number(s.latitude),
    longitude: Number(s.longitude),
    latestReading: s.readings[0] ?? null,
  }));
}

async function getPageStats(
  stations: Awaited<ReturnType<typeof getStationsWithReadings>>
) {
  const total = stations.length;
  const withReading = stations.filter((s) => s.latestReading !== null).length;
  const goodIca = stations.filter(
    (s) => s.latestReading?.ica !== null && s.latestReading?.ica !== undefined && s.latestReading.ica <= 2
  ).length;
  const badIca = stations.filter(
    (s) => s.latestReading?.ica !== null && s.latestReading?.ica !== undefined && s.latestReading.ica >= 4
  ).length;
  const provinces = new Set(
    stations.map((s) => s.province).filter(Boolean)
  ).size;

  // Count per ICA level (1-5)
  const byIca: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const s of stations) {
    const level = s.latestReading?.ica;
    if (level != null && level >= 1 && level <= 5) {
      byIca[level] = (byIca[level] ?? 0) + 1;
    }
  }

  return { total, withReading, goodIca, badIca, provinces, byIca };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPollutant(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString("es-ES", { maximumFractionDigits: 1 })} ${unit}`;
}

function getIcaConfig(ica: number | null | undefined): IcaConfig | null {
  if (ica === null || ica === undefined) return null;
  return ICA_CONFIG[ica] ?? null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CalidadAirePage() {
  const stations = await getStationsWithReadings();
  const stats = await getPageStats(stations);

  // Group stations by province
  const byProvince: Record<string, typeof stations> = {};
  for (const s of stations) {
    const prov = s.province ?? "XX";
    if (!byProvince[prov]) byProvince[prov] = [];
    byProvince[prov].push(s);
  }
  const sortedProvinces = Object.keys(byProvince).sort((a, b) => {
    const nameA = PROVINCE_NAMES[a] ?? a;
    const nameB = PROVINCE_NAMES[b] ?? b;
    return nameA.localeCompare(nameB, "es");
  });

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Calidad del Aire en España — Índice ICA en tiempo real",
    description:
      "Portal de calidad del aire con índice ICA, NO₂, PM10, PM2.5 y O₃ por provincia. Datos MITECO.",
    url: `${BASE_URL}/calidad-aire`,
    inLanguage: "es",
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Red de Vigilancia de la Calidad del Aire — España",
    description:
      "Lecturas del Índice de Calidad del Aire (ICA) de estaciones MITECO: NO₂, PM10, PM2.5, O₃, SO₂, CO.",
    url: `${BASE_URL}/calidad-aire`,
    keywords:
      "calidad del aire, ICA, contaminación, NO2, PM10, PM2.5, ozono, España, MITECO",
    spatialCoverage: "España",
    creator: {
      "@type": "Organization",
      name: "Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO)",
      url: "https://www.miteco.gob.es",
    },
    license: "https://www.miteco.gob.es/es/ministerio/transparencia-y-participacion-publica/reutilizacion-de-la-informacion.html",
  };

  return (
    <>
      <StructuredData data={webPageSchema} />
      <StructuredData data={datasetSchema} />

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Calidad del Aire", href: "/calidad-aire" },
          ]}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0f2817 0%, #0d4a2e 40%, #0a7a4f 80%, #059669 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -bottom-16 -right-16 w-80 h-80 rounded-full opacity-10"
          style={{ background: "#34d399" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-6 right-28 w-40 h-40 rounded-full opacity-5"
          style={{ background: "#6ee7b7" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-20 left-1/3 w-24 h-24 rounded-full opacity-5"
          style={{ background: "#a7f3d0" }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-20">
          <div className="flex items-center gap-3 mb-4">
            <Wind className="w-10 h-10 text-emerald-300" />
            <span className="font-heading text-emerald-300 text-sm font-semibold uppercase tracking-widest">
              trafico.live / Calidad del Aire
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Calidad del Aire en España
          </h1>
          <p className="text-emerald-100 text-lg md:text-xl max-w-2xl leading-relaxed">
            Índice de Calidad del Aire (ICA) en tiempo real. Concentración de
            NO₂, PM10, PM2.5 y O₃ por provincia. Red de Vigilancia MITECO,
            actualización cada hora.
          </p>

          {stats.total > 0 && (
            <div className="mt-6 inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white text-sm font-semibold font-mono">
                {stats.withReading.toLocaleString("es-ES")} estaciones con datos ahora
              </span>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">

        {/* ---------------------------------------------------------------- */}
        {/* Stats strip                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Estadísticas de calidad del aire">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            {/* Total estaciones */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Estaciones
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-[var(--tl-primary)] dark:text-[var(--tl-info)]">
                {stats.total.toLocaleString("es-ES")}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                en red MITECO
              </div>
            </div>

            {/* ICA buena/razonable */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-[var(--tl-success)]" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ICA buena/razonable
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-[var(--tl-success)]">
                {stats.goodIca.toLocaleString("es-ES")}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                estaciones con ICA ≤ 2
              </div>
            </div>

            {/* ICA mala/muy mala */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-[var(--tl-danger)]" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ICA mala/muy mala
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-[var(--tl-danger)]">
                {stats.badIca.toLocaleString("es-ES")}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                estaciones con ICA ≥ 4
              </div>
            </div>

            {/* Provincias */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Provincias
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-[var(--tl-primary)] dark:text-[var(--tl-info)]">
                {stats.provinces.toLocaleString("es-ES")}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                con medición activa
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* ICA distribution bar                                              */}
        {/* ---------------------------------------------------------------- */}
        {stats.withReading > 0 && (
          <section aria-label="Distribución del índice ICA">
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
              Distribución ICA — {stats.withReading.toLocaleString("es-ES")} estaciones con datos
            </h2>

            {/* Stacked bar */}
            <div className="flex h-8 w-full rounded-lg overflow-hidden" role="img" aria-label="Barra de distribución ICA">
              {Object.entries(ICA_CONFIG).map(([level, cfg]) => {
                const count = stats.byIca[Number(level)] ?? 0;
                const pct = stats.withReading > 0 ? (count / stats.withReading) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={level}
                    style={{ width: `${pct.toFixed(1)}%`, backgroundColor: cfg.color }}
                    title={`ICA ${level} ${cfg.label}: ${count} estaciones (${pct.toFixed(1)}%)`}
                    className="transition-all"
                  />
                );
              })}
            </div>

            {/* Legend row with percentages */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {Object.entries(ICA_CONFIG).map(([level, cfg]) => {
                const count = stats.byIca[Number(level)] ?? 0;
                const pct = stats.withReading > 0 ? (count / stats.withReading) * 100 : 0;
                return (
                  <div key={level} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: cfg.color }}
                      aria-hidden="true"
                    />
                    <span className="font-medium">{cfg.label}</span>
                    <span className="font-mono text-gray-500 dark:text-gray-500">
                      {count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                );
              })}
              {(() => {
                const noData = stats.total - stats.withReading;
                return noData > 0 ? (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
                    <span>Sin datos</span>
                    <span className="font-mono">{noData}</span>
                  </div>
                ) : null;
              })()}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* ICA legend                                                        */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Leyenda del índice ICA">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
            Índice de Calidad del Aire (ICA)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(ICA_CONFIG).map(([level, cfg]) => (
              <div
                key={level}
                className={`rounded-xl border p-4 ${cfg.bgClass} ${cfg.borderClass}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cfg.color }}
                    aria-hidden="true"
                  />
                  <span className={`font-heading font-bold text-sm ${cfg.textClass}`}>
                    {level} — {cfg.label}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {cfg.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Station grid by province                                          */}
        {/* ---------------------------------------------------------------- */}
        {stations.length === 0 ? (
          /* Empty state */
          <section
            className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-12 text-center"
            aria-label="Sin datos disponibles"
          >
            <Wind className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="font-heading text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Datos en proceso de carga
            </h2>
            <p className="text-gray-500 dark:text-gray-500 max-w-md mx-auto text-sm">
              El colector MITECO actualiza cada hora. Los datos estarán disponibles
              en breve. Si el problema persiste, consulta el estado del servicio.
            </p>
          </section>
        ) : (
          <section aria-label="Estaciones por provincia">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
              <Wind className="w-6 h-6 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
              Estaciones por provincia
            </h2>

            <div className="space-y-8">
              {sortedProvinces.map((prov) => {
                const provStations = byProvince[prov];
                const provinceName = PROVINCE_NAMES[prov] ?? `Provincia ${prov}`;

                return (
                  <div key={prov}>
                    {/* Province header */}
                    <div className="flex items-center gap-3 mb-3">
                      <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      <h3 className="font-heading font-semibold text-gray-800 dark:text-gray-200">
                        {provinceName}
                      </h3>
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                        {provStations.length} estaciones
                      </span>
                    </div>

                    {/* Station cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {provStations.map((station) => {
                        const reading = station.latestReading;
                        const icaCfg = getIcaConfig(reading?.ica);

                        return (
                          <div
                            key={station.id}
                            className="rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                          >
                            {/* Station name + ICA badge */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div>
                                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight">
                                  {station.name}
                                </div>
                                {station.city && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {station.city}
                                  </div>
                                )}
                              </div>
                              {icaCfg ? (
                                <span
                                  className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${icaCfg.bgClass} ${icaCfg.textClass} ${icaCfg.borderClass}`}
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: icaCfg.color }}
                                    aria-hidden="true"
                                  />
                                  {icaCfg.label}
                                </span>
                              ) : (
                                <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                  Sin datos
                                </span>
                              )}
                            </div>

                            {/* Pollutant values */}
                            {reading ? (
                              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                <div>
                                  <dt className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                                    NO₂
                                  </dt>
                                  <dd className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    {formatPollutant(reading.no2, "µg/m³")}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                                    PM10
                                  </dt>
                                  <dd className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    {formatPollutant(reading.pm10, "µg/m³")}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                                    PM2.5
                                  </dt>
                                  <dd className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    {formatPollutant(reading.pm25, "µg/m³")}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                                    O₃
                                  </dt>
                                  <dd className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    {formatPollutant(reading.o3, "µg/m³")}
                                  </dd>
                                </div>
                              </dl>
                            ) : (
                              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                                Sin lectura reciente
                              </p>
                            )}

                            {/* Timestamp */}
                            {reading?.createdAt && (
                              <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 dark:text-gray-600 font-mono">
                                {new Date(reading.createdAt).toLocaleString("es-ES", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Related pages nav cards                                           */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Páginas relacionadas">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-5">
            Más datos ambientales y de tráfico
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            <div className="group flex flex-col gap-4 p-6 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-[var(--tl-primary)] hover:shadow-md transition-all">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: "var(--tl-primary-bg)" }}
              >
                <Wind className="w-6 h-6 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  API Calidad del Aire
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Datos ICA de {stats.total} estaciones en formato JSON y GeoJSON
                </p>
              </div>
              <a
                href="/api/calidad-aire"
                target="_blank"
                rel="noopener"
                className="flex items-center gap-1 text-[var(--tl-primary)] dark:text-[var(--tl-info)] text-sm font-medium group-hover:gap-2 transition-all"
              >
                Ver datos JSON <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="group flex flex-col gap-4 p-6 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-[var(--tl-primary)] hover:shadow-md transition-all">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: "var(--tl-primary-bg)" }}
              >
                <Activity className="w-6 h-6 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Incidencias de tráfico
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Accidentes, obras y retenciones en carreteras españolas en tiempo real
                </p>
              </div>
              <Link
                href="/incidencias"
                className="flex items-center gap-1 text-[var(--tl-primary)] dark:text-[var(--tl-info)] text-sm font-medium group-hover:gap-2 transition-all"
              >
                Ver incidencias <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="group flex flex-col gap-4 p-6 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-[var(--tl-primary)] hover:shadow-md transition-all">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: "var(--tl-primary-bg)" }}
              >
                <MapPin className="w-6 h-6 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Estaciones de aforo
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  14.400+ estaciones de conteo de tráfico con datos IMD por carretera
                </p>
              </div>
              <Link
                href="/estaciones-aforo"
                className="flex items-center gap-1 text-[var(--tl-primary)] dark:text-[var(--tl-info)] text-sm font-medium group-hover:gap-2 transition-all"
              >
                Ver estaciones <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* SEO text                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section
          className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-8"
          aria-label="Información sobre la calidad del aire en España"
        >
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Calidad del Aire en España
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-3">
            <p>
              La <strong>Red de Vigilancia de la Calidad del Aire</strong> del Ministerio para
              la Transición Ecológica y el Reto Demográfico (MITECO) monitoriza en tiempo real
              los principales contaminantes atmosféricos en todo el territorio español. Con más
              de 565 estaciones distribuidas por las 52 provincias, la red proporciona datos
              horarios de dióxido de nitrógeno (NO₂), partículas PM10 y PM2.5, ozono troposférico
              (O₃), dióxido de azufre (SO₂) y monóxido de carbono (CO).
            </p>
            <p>
              El <strong>Índice de Calidad del Aire (ICA)</strong> es un indicador sintético que
              resume el estado de la contaminación atmosférica en una escala de 1 a 5, desde
              «Buena» hasta «Muy mala». Se calcula a partir de las concentraciones individuales
              de cada contaminante y toma el valor más desfavorable. Los umbrales de los
              contaminantes siguen la normativa europea de calidad del aire (Directiva
              2008/50/CE) y la metodología establecida por el MITECO.
            </p>
            <p>
              La contaminación atmosférica es especialmente relevante en las grandes áreas
              metropolitanas. <strong>Madrid</strong> y <strong>Barcelona</strong> concentran
              el mayor número de estaciones de vigilancia, dado el peso del tráfico rodado,
              la actividad industrial y la densidad de población. Las zonas costeras
              mediterráneas y las cuencas fluviales del interior también presentan episodios
              recurrentes de contaminación por ozono en verano, principalmente por la reacción
              fotoquímica de los precursores emitidos por el tráfico y la industria.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Fuente: Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO) —
              Red de Vigilancia de la Calidad del Aire. Datos actualizados cada hora. Los valores
              mostrados son orientativos; para decisiones sanitarias, consulte siempre las fuentes
              oficiales del MITECO.
            </p>
          </div>
        </section>

        {/* Attribution footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-400 dark:text-gray-500 pb-2">
          <div className="flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            <span>
              Datos: © MITECO — Red de Vigilancia de la Calidad del Aire · Actualización horaria
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/incidencias"
              className="flex items-center gap-1 hover:text-[var(--tl-primary)] transition-colors"
            >
              Incidencias <ChevronRight className="w-3 h-3" />
            </Link>
            <Link
              href="/estaciones-aforo"
              className="flex items-center gap-1 hover:text-[var(--tl-primary)] transition-colors"
            >
              Estaciones de aforo <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

      </div>
    </>
  );
}
