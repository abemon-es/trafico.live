/**
 * /accidentes — Siniestralidad Vial en España
 *
 * Server-side page with DGT accident microdata (2019-2023).
 * Data source: Dirección General de Tráfico (DGT) — microdatos con víctimas.
 * Collector: TASK=accident-microdata (one-shot per year, ~500K records).
 */

import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import {
  AlertTriangle,
  Shield,
  Car,
  MapPin,
  Calendar,
  BarChart3,
  TrendingDown,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Siniestralidad Vial en España 2019-2023 — Accidentes DGT | trafico.live",
  description:
    "Estadísticas de accidentes de tráfico en España con datos DGT 2019-2023. Análisis por severidad, provincia, tipo de vía y evolución anual. Microdatos de siniestralidad vial.",
  alternates: {
    canonical: `${BASE_URL}/accidentes`,
  },
  openGraph: {
    title: "Siniestralidad Vial en España 2019-2023 — Accidentes DGT",
    description:
      "Análisis completo de accidentes de tráfico en España con microdatos DGT 2019-2023. Víctimas, provincias, tipos de vía y tendencias.",
    url: `${BASE_URL}/accidentes`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Province name lookup (INE 2-digit codes)
// ---------------------------------------------------------------------------

const PROVINCE_NAMES: Record<string, string> = {
  "01": "Álava", "02": "Albacete", "03": "Alicante", "04": "Almería",
  "05": "Ávila", "06": "Badajoz", "07": "Baleares", "08": "Barcelona",
  "09": "Burgos", "10": "Cáceres", "11": "Cádiz", "12": "Castellón",
  "13": "Ciudad Real", "14": "Córdoba", "15": "A Coruña", "16": "Cuenca",
  "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Gipuzkoa",
  "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León",
  "25": "Lleida", "26": "La Rioja", "27": "Lugo", "28": "Madrid",
  "29": "Málaga", "30": "Murcia", "31": "Navarra", "32": "Ourense",
  "33": "Asturias", "34": "Palencia", "35": "Las Palmas", "36": "Pontevedra",
  "37": "Salamanca", "38": "S.C. Tenerife", "39": "Cantabria",
  "40": "Segovia", "41": "Sevilla", "42": "Soria", "43": "Tarragona",
  "44": "Teruel", "45": "Toledo", "46": "Valencia", "47": "Valladolid",
  "48": "Bizkaia", "49": "Zamora", "50": "Zaragoza", "51": "Ceuta",
  "52": "Melilla",
};

const MONTHS_ES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const ROAD_TYPE_LABELS: Record<string, string> = {
  AUTOPISTA: "Autopista",
  AUTOVIA: "Autovía",
  NACIONAL: "Nacional",
  COMARCAL: "Comarcal",
  PROVINCIAL: "Provincial",
  URBANA: "Urbana",
  OTHER: "Otras",
};

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getAccidentStats() {
  const [
    totalCount,
    bySeverity,
    byYear,
    byProvince,
    byRoadType,
    byMonth,
  ] = await Promise.all([
    prisma.accidentMicrodata.count(),

    prisma.accidentMicrodata.groupBy({
      by: ["severity"],
      _count: { _all: true },
      _sum: { fatalities: true, hospitalized: true, minorInjury: true },
      orderBy: { _count: { severity: "desc" } },
    }),

    prisma.accidentMicrodata.groupBy({
      by: ["year"],
      _count: { _all: true },
      _sum: { fatalities: true, hospitalized: true, minorInjury: true },
      orderBy: { year: "asc" },
    }),

    prisma.accidentMicrodata.groupBy({
      by: ["province"],
      _count: { _all: true },
      _sum: { fatalities: true },
      orderBy: { _count: { province: "desc" } },
      take: 15,
    }),

    prisma.accidentMicrodata.groupBy({
      by: ["roadType"],
      _count: { _all: true },
      _sum: { fatalities: true },
      orderBy: { _count: { roadType: "desc" } },
    }),

    // Monthly distribution — use `month` derived from `date` via raw aggregation
    // Fall back to groupBy on the `date` field month component
    prisma.accidentMicrodata.groupBy({
      by: ["dayOfWeek"],
      _count: { _all: true },
      orderBy: { dayOfWeek: "asc" },
    }),
  ]);

  // Aggregate totals from bySeverity
  const totalFatalities = bySeverity.reduce(
    (acc, s) => acc + (s._sum.fatalities ?? 0),
    0,
  );
  const totalHospitalized = bySeverity.reduce(
    (acc, s) => acc + (s._sum.hospitalized ?? 0),
    0,
  );
  const totalMinorInjury = bySeverity.reduce(
    (acc, s) => acc + (s._sum.minorInjury ?? 0),
    0,
  );

  // Distinct years covered
  const years = byYear.map((r) => r.year).filter(Boolean) as number[];
  const yearMin = years.length ? Math.min(...years) : 2019;
  const yearMax = years.length ? Math.max(...years) : 2023;
  const yearsCount = years.length;

  // Distinct provinces in results
  const provincesCount = byProvince.filter((p) => p.province).length;

  // Build severity breakdown as typed structure
  const severityMap: Record<
    string,
    { count: number; fatalities: number; hospitalized: number; minorInjury: number }
  > = {};
  for (const row of bySeverity) {
    const key = row.severity ?? "unknown";
    severityMap[key] = {
      count: row._count._all,
      fatalities: row._sum.fatalities ?? 0,
      hospitalized: row._sum.hospitalized ?? 0,
      minorInjury: row._sum.minorInjury ?? 0,
    };
  }

  return {
    totalCount,
    totalFatalities,
    totalHospitalized,
    totalMinorInjury,
    yearMin,
    yearMax,
    yearsCount,
    provincesCount,
    bySeverity: severityMap,
    byYear,
    byProvince,
    byRoadType,
    byDayOfWeek: byMonth, // reusing field — actually dayOfWeek
  };
}

// Monthly data via a separate raw-style groupBy on date
async function getMonthlyDistribution() {
  // Group by month number extracted from `date` — Prisma doesn't have date_part
  // so we fetch a representative sample and aggregate in-process
  try {
    const rows = await prisma.accidentMicrodata.groupBy({
      by: ["year"],
      _count: { _all: true },
      orderBy: { year: "asc" },
    });
    // We'll return a placeholder — actual month grouping needs raw SQL
    // For now return empty array so page renders without crashing
    return rows;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("es-ES");
}

function pct(part: number, total: number): string {
  if (!total) return "0,0%";
  return ((part / total) * 100).toFixed(1).replace(".", ",") + "%";
}

// ---------------------------------------------------------------------------
// Severity config
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG = {
  fatal: {
    label: "Accidentes mortales",
    badge: "Mortal",
    description: "Al menos una víctima mortal",
    colorStyle: { color: "var(--tl-danger)" },
    bgStyle: { background: "rgba(220,38,38,0.08)", borderColor: "rgba(220,38,38,0.25)" },
    badgeStyle: { background: "rgba(220,38,38,0.1)", color: "var(--tl-danger)", border: "1px solid rgba(220,38,38,0.3)" },
  },
  hospitalized: {
    label: "Con heridos graves",
    badge: "Grave",
    description: "Al menos un herido hospitalizado",
    colorStyle: { color: "var(--tl-warning)" },
    bgStyle: { background: "rgba(212,129,57,0.08)", borderColor: "rgba(212,129,57,0.25)" },
    badgeStyle: { background: "rgba(212,129,57,0.1)", color: "var(--tl-warning)", border: "1px solid rgba(212,129,57,0.3)" },
  },
  minor: {
    label: "Con heridos leves",
    badge: "Leve",
    description: "Solo heridos leves o ilesos",
    colorStyle: { color: "var(--tl-info)" },
    bgStyle: { background: "rgba(54,108,248,0.08)", borderColor: "rgba(54,108,248,0.25)" },
    badgeStyle: { background: "rgba(54,108,248,0.1)", color: "var(--tl-info)", border: "1px solid rgba(54,108,248,0.3)" },
  },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AccidentesPage() {
  const stats = await getAccidentStats();

  const isEmpty = stats.totalCount === 0;

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Siniestralidad Vial en España 2019-2023",
    description:
      "Estadísticas y análisis de accidentes de tráfico en España con microdatos DGT 2019-2023.",
    url: `${BASE_URL}/accidentes`,
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
    name: "Microdatos de accidentes con víctimas en España (DGT 2019-2023)",
    description:
      "Registro de accidentes de tráfico con víctimas en España. Incluye año, provincia, tipo de vía, severidad, condiciones meteorológicas y de luminosidad.",
    url: `${BASE_URL}/accidentes`,
    keywords: "accidentes tráfico, DGT, siniestralidad vial, víctimas, España",
    temporalCoverage: "2019-01-01/2023-12-31",
    spatialCoverage: "España",
    creator: {
      "@type": "Organization",
      name: "Dirección General de Tráfico (DGT)",
      url: "https://www.dgt.es",
    },
    distribution: [
      {
        "@type": "DataDownload",
        contentUrl: "https://www.dgt.es/menusecundario/dgt-en-cifras/",
        encodingFormat: "application/vnd.ms-excel",
      },
    ],
    license: "https://datos.gob.es/es/licencias",
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
            { name: "Accidentes", href: "/accidentes" },
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
            "linear-gradient(135deg, #0f172a 0%, #1c1917 50%, #7f1d1d 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -bottom-16 -right-16 w-80 h-80 rounded-full opacity-10"
          style={{ background: "var(--tl-danger)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-8 right-48 w-40 h-40 rounded-full opacity-5"
          style={{ background: "var(--color-tl-300)" }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-20">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-10 h-10 text-red-300" />
            <span className="font-heading text-red-300 text-sm font-semibold uppercase tracking-widest">
              trafico.live / Siniestralidad
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Siniestralidad Vial en España
          </h1>
          <p className="text-red-200 text-lg md:text-xl max-w-2xl leading-relaxed">
            Análisis de accidentes con víctimas en España basado en microdatos oficiales de
            la Dirección General de Tráfico (DGT). Datos de 2019 a 2023.
          </p>

          {!isEmpty && (
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2">
                <AlertTriangle className="w-4 h-4 text-red-300" />
                <span className="text-white text-sm font-semibold font-mono">
                  {fmt(stats.totalCount)} accidentes registrados
                </span>
              </div>
              {stats.totalFatalities > 0 && (
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2">
                  <TrendingDown className="w-4 h-4 text-red-300" />
                  <span className="text-white text-sm font-semibold font-mono">
                    {fmt(stats.totalFatalities)} víctimas mortales
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">

        {/* ---------------------------------------------------------------- */}
        {/* Empty state                                                       */}
        {/* ---------------------------------------------------------------- */}
        {isEmpty && (
          <section aria-label="Sin datos">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-[var(--tl-danger)]" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Datos en proceso de carga
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                  El colector DGT procesa 500K+ registros de accidentes. Los datos estarán
                  disponibles una vez completada la importación inicial.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--tl-danger)] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-full px-4 py-1.5">
                <AlertTriangle className="w-3 h-3" />
                Colector TASK=accident-microdata activo en hetzner-prod
              </div>
            </div>
          </section>
        )}

        {!isEmpty && (
          <>
            {/* ------------------------------------------------------------ */}
            {/* Stats strip                                                    */}
            {/* ------------------------------------------------------------ */}
            <section aria-label="Estadísticas globales">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-[var(--tl-danger)]" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Total accidentes
                    </span>
                  </div>
                  <div className="font-mono text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {fmt(stats.totalCount)}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {stats.yearMin}–{stats.yearMax}
                  </div>
                </div>

                <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-5 h-5 text-[var(--tl-danger)]" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Víctimas mortales
                    </span>
                  </div>
                  <div className="font-mono text-3xl font-bold text-[var(--tl-danger)]">
                    {fmt(stats.totalFatalities)}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    fallecidos en accidente
                  </div>
                </div>

                <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-[var(--tl-warning)]" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Heridos graves
                    </span>
                  </div>
                  <div className="font-mono text-3xl font-bold text-[var(--tl-warning)]">
                    {fmt(stats.totalHospitalized)}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    hospitalizados
                  </div>
                </div>

                <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-[var(--tl-info)]" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Periodo
                    </span>
                  </div>
                  <div className="font-mono text-3xl font-bold text-[var(--tl-info)]">
                    {stats.yearsCount}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    años de datos ({stats.yearMin}–{stats.yearMax})
                  </div>
                </div>
              </div>

              {/* Secondary stats */}
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-2.5">
                  <MapPin className="w-4 h-4 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                      {stats.provincesCount}
                    </span>{" "}
                    provincias con datos
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-2.5">
                  <TrendingDown className="w-4 h-4 text-[var(--tl-danger)]" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Tasa mortalidad:{" "}
                    <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                      {pct(stats.totalFatalities, stats.totalCount)}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-2.5">
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Heridos leves:{" "}
                    <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                      {fmt(stats.totalMinorInjury)}
                    </span>
                  </span>
                </div>
              </div>
            </section>

            {/* ------------------------------------------------------------ */}
            {/* Severity breakdown — 3 cards                                  */}
            {/* ------------------------------------------------------------ */}
            <section aria-label="Desglose por severidad">
              <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                <Shield className="w-6 h-6 text-[var(--tl-danger)]" />
                Desglose por gravedad
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["fatal", "hospitalized", "minor"] as const).map((key) => {
                  const cfg = SEVERITY_CONFIG[key];
                  const data = stats.bySeverity[key];
                  const count = data?.count ?? 0;
                  const fatalities = data?.fatalities ?? 0;

                  return (
                    <div
                      key={key}
                      className="rounded-xl border p-6"
                      style={cfg.bgStyle}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                          {cfg.label}
                        </h3>
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={cfg.badgeStyle}
                        >
                          {cfg.badge}
                        </span>
                      </div>
                      <div
                        className="font-mono text-4xl font-bold mb-1"
                        style={cfg.colorStyle}
                      >
                        {fmt(count)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        {pct(count, stats.totalCount)} del total
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {cfg.description}
                      </p>
                      {key === "fatal" && fatalities > 0 && (
                        <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-900/40">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Fallecidos registrados:{" "}
                            <span className="font-mono font-semibold" style={cfg.colorStyle}>
                              {fmt(fatalities)}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ------------------------------------------------------------ */}
            {/* Year-over-year table                                           */}
            {/* ------------------------------------------------------------ */}
            {stats.byYear.length > 0 && (
              <section aria-label="Evolución anual">
                <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                  Evolución anual
                </h2>

                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                  {/* Table header */}
                  <div className="grid grid-cols-5 gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <div>Año</div>
                    <div className="text-right">Accidentes</div>
                    <div className="text-right">Fallecidos</div>
                    <div className="text-right">Hosp.</div>
                    <div className="text-right">Heridos leves</div>
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {stats.byYear.map((row) => (
                      <div
                        key={row.year}
                        className="grid grid-cols-5 gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                      >
                        <div className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                          {row.year}
                        </div>
                        <div className="text-right font-mono text-sm text-gray-700 dark:text-gray-300">
                          {fmt(row._count._all)}
                        </div>
                        <div className="text-right font-mono text-sm text-[var(--tl-danger)]">
                          {fmt(row._sum.fatalities ?? 0)}
                        </div>
                        <div className="text-right font-mono text-sm text-[var(--tl-warning)]">
                          {fmt(row._sum.hospitalized ?? 0)}
                        </div>
                        <div className="text-right font-mono text-sm text-[var(--tl-info)]">
                          {fmt(row._sum.minorInjury ?? 0)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      Fuente: Dirección General de Tráfico (DGT) · Microdatos de accidentes con víctimas
                    </p>
                  </div>
                </div>

                {/* Year bars — CSS-only mini bar chart */}
                {stats.byYear.length >= 2 && (
                  <div className="mt-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <h3 className="font-heading text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">
                      Accidentes por año
                    </h3>
                    <div className="space-y-2">
                      {(() => {
                        const maxCount = Math.max(...stats.byYear.map((r) => r._count._all));
                        return stats.byYear.map((row) => {
                          const widthPct = maxCount > 0 ? (row._count._all / maxCount) * 100 : 0;
                          return (
                            <div key={row.year} className="flex items-center gap-3">
                              <span className="font-mono text-xs text-gray-500 dark:text-gray-400 w-10 flex-shrink-0 text-right">
                                {row.year}
                              </span>
                              <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                                <div
                                  className="h-full rounded transition-all"
                                  style={{
                                    width: `${widthPct}%`,
                                    background: "var(--tl-danger)",
                                    opacity: 0.75,
                                  }}
                                />
                              </div>
                              <span className="font-mono text-xs text-gray-700 dark:text-gray-300 w-20 flex-shrink-0">
                                {fmt(row._count._all)}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ------------------------------------------------------------ */}
            {/* Province ranking — top 15                                      */}
            {/* ------------------------------------------------------------ */}
            {stats.byProvince.length > 0 && (
              <section aria-label="Ranking de provincias">
                <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                  Provincias con más accidentes
                </h2>

                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                  <div className="grid grid-cols-4 gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <div className="col-span-2">Provincia</div>
                    <div className="text-right">Accidentes</div>
                    <div className="text-right">Fallecidos</div>
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {stats.byProvince.map((row, index) => {
                      const code = row.province ?? "";
                      const name = PROVINCE_NAMES[code] ?? (code || "Desconocida");
                      const fatalCount = row._sum.fatalities ?? 0;
                      const totalAccidents = row._count._all;

                      return (
                        <div
                          key={code || index}
                          className="grid grid-cols-4 gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                        >
                          {/* Rank + Province */}
                          <div className="col-span-2 flex items-center gap-3">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono flex-shrink-0"
                              style={{
                                background:
                                  index === 0
                                    ? "var(--tl-danger)"
                                    : index < 3
                                    ? "rgba(220,38,38,0.1)"
                                    : "var(--color-tl-50)",
                                color:
                                  index === 0
                                    ? "white"
                                    : index < 3
                                    ? "var(--tl-danger)"
                                    : "var(--color-tl-600)",
                              }}
                            >
                              {index + 1}
                            </div>
                            <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                              {name}
                            </span>
                          </div>

                          <div className="text-right font-mono text-sm text-gray-700 dark:text-gray-300 flex items-center justify-end">
                            {fmt(totalAccidents)}
                          </div>

                          <div className="text-right font-mono text-sm flex items-center justify-end gap-1">
                            <span className="text-[var(--tl-danger)]">
                              {fmt(fatalCount)}
                            </span>
                            {totalAccidents > 0 && fatalCount > 0 && (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                ({pct(fatalCount, totalAccidents)})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      Top 15 provincias · Periodo {stats.yearMin}–{stats.yearMax} · Fuente: DGT
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* ------------------------------------------------------------ */}
            {/* Road type breakdown                                            */}
            {/* ------------------------------------------------------------ */}
            {stats.byRoadType.length > 0 && (
              <section aria-label="Desglose por tipo de vía">
                <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                  <Car className="w-6 h-6 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                  Accidentes por tipo de vía
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {stats.byRoadType.map((row) => {
                    const type = row.roadType ?? "OTHER";
                    const label = ROAD_TYPE_LABELS[type] ?? type;
                    const count = row._count._all;
                    const fatalCount = row._sum.fatalities ?? 0;
                    const sharePct = pct(count, stats.totalCount);

                    return (
                      <div
                        key={type}
                        className="rounded-xl border p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                      >
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                          {label}
                        </div>
                        <div className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                          {fmt(count)}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                          {sharePct} del total
                        </div>
                        {fatalCount > 0 && (
                          <div
                            className="text-xs font-mono"
                            style={{ color: "var(--tl-danger)" }}
                          >
                            {fmt(fatalCount)} fallecidos
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ------------------------------------------------------------ */}
            {/* Day of week distribution — CSS bar chart                      */}
            {/* ------------------------------------------------------------ */}
            {stats.byDayOfWeek.length > 0 && (
              <section aria-label="Distribución por día de la semana">
                <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                  Accidentes por día de la semana
                </h2>

                {(() => {
                  const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
                  // Map dayOfWeek 1=Mon ... 7=Sun
                  const dayMap: Record<number, number> = {};
                  for (const row of stats.byDayOfWeek) {
                    if (row.dayOfWeek !== null) {
                      dayMap[row.dayOfWeek] = row._count._all;
                    }
                  }
                  const maxCount = Math.max(...Object.values(dayMap), 1);

                  return (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-end gap-2 h-32">
                        {DAY_LABELS.map((label, i) => {
                          const day = i + 1; // 1-7
                          const count = dayMap[day] ?? 0;
                          const heightPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                          const isWeekend = day === 6 || day === 7;

                          return (
                            <div
                              key={label}
                              className="flex-1 flex flex-col items-center gap-1"
                            >
                              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                                {count > 0 ? fmt(count) : "—"}
                              </span>
                              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-t overflow-hidden" style={{ height: "80px" }}>
                                <div
                                  className="w-full rounded-t transition-all"
                                  style={{
                                    height: `${heightPct}%`,
                                    marginTop: `${100 - heightPct}%`,
                                    background: isWeekend
                                      ? "var(--tl-warning)"
                                      : "var(--tl-primary)",
                                    opacity: 0.8,
                                  }}
                                />
                              </div>
                              <span
                                className="text-xs font-semibold"
                                style={{
                                  color: isWeekend
                                    ? "var(--tl-warning)"
                                    : "var(--color-tl-600)",
                                }}
                              >
                                {label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-4">
                        Los fines de semana concentran mayor siniestralidad. Fuente: DGT {stats.yearMin}–{stats.yearMax}.
                      </p>
                    </div>
                  );
                })()}
              </section>
            )}
          </>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* SEO text block                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section
          aria-label="Sobre la siniestralidad vial en España"
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8"
        >
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            La siniestralidad vial en España: contexto y tendencias
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-3">
            <p>
              España ha experimentado una reducción significativa de los accidentes de tráfico con
              víctimas en las últimas décadas, pasando de más de 6.000 fallecidos a principios de
              los años 2000 a menos de 2.000 anuales en el periodo 2019-2023. Este descenso refleja
              las mejoras en infraestructuras viarias, el endurecimiento del código penal de
              tráfico y el avance en los sistemas de seguridad activa y pasiva de los vehículos.
            </p>
            <p>
              Las carreteras convencionales concentran la mayor parte de los accidentes mortales,
              seguidas de las vías urbanas. Las autopistas y autovías, a pesar de concentrar
              un alto volumen de tráfico, registran tasas de mortalidad por kilómetro
              significativamente inferiores gracias a sus características de diseño.
            </p>
            <p>
              Los microdatos DGT recogen información por accidente: ubicación (provincia,
              municipio, carretera y punto kilométrico), tipo de vía, severidad de las
              consecuencias, condiciones meteorológicas y de luminosidad, y los tipos de
              vehículos implicados.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Attribution                                                       */}
        {/* ---------------------------------------------------------------- */}
        <footer
          aria-label="Atribución de datos"
          className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-6"
        >
          <BarChart3 className="w-4 h-4 flex-shrink-0" />
          <span>
            Fuente:{" "}
            <a
              href="https://www.dgt.es/menusecundario/dgt-en-cifras/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Dirección General de Tráfico (DGT)
            </a>
            {" "}· Microdatos de accidentes con víctimas, 2019-2023 ·{" "}
            <span className="font-mono">trafico.live</span> · Datos actualizados anualmente
          </span>
        </footer>

      </div>
    </>
  );
}
