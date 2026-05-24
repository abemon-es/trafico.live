/**
 * /accidentes/carretera/[road] — per-road accident analysis.
 *
 * Renders SEO-targeted long-tail pages of the form
 * "accidentes en la A-7", "accidentes mortales N-340", etc., backed by
 * the DGT AccidentMicrodata (2019-2023, ~500K records). The road match
 * is case-insensitive and tolerant of "AP-7", "ap7", "Ap 7" variants.
 *
 * Hub: /accidentes
 * API: /api/accidentes/microdata?road=<road>
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { StructuredData } from "@/components/seo/StructuredData";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calendar,
  CloudRain,
  MapPin,
  Shield,
  TrendingDown,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Pre-generated road set — DGT's primary network.
// Top 30 covers the keyword volume in this vertical without inflating
// the SSG surface beyond what makes sense for ~500K records.
// ---------------------------------------------------------------------------

// Top 80 roads by accident count in DGT microdata 2019-2023 — every entry
// has ≥276 records so the per-road page renders rich content for SEO.
// State + regional + insular networks all represented.
const PREGEN_ROADS = [
  // State autopistas
  "AP-1", "AP-2", "AP-4", "AP-6", "AP-7", "AP-8", "AP-9", "AP-68",
  // State autovías
  "A-1", "A-2", "A-3", "A-4", "A-5", "A-6", "A-7", "A-8",
  "A-23", "A-30", "A-31", "A-42", "A-44", "A-49", "A-52", "A-55",
  "A-62", "A-66", "A-67", "A-70", "A-92",
  // State nacionales (top by accident count)
  "N-I", "N-II", "N-III", "N-IV", "N-V", "N-VI",
  "N-1", "N-2",
  "N-120", "N-232", "N-240", "N-260", "N-330", "N-332", "N-340", "N-340a",
  "N-401", "N-420", "N-432", "N-550", "N-630", "N-634", "N-637",
  // Cataluña (C-*)
  "C-12", "C-14", "C-15", "C-16", "C-17", "C-25", "C-31", "C-32",
  "C-35", "C-55", "C-58", "C-59", "C-63", "C-66",
  // Barcelona ring + access (B-*)
  "B-10", "B-20", "B-23", "B-30",
  // Madrid ring + radials (M-*)
  "M-40", "M-45", "M-50", "M-506", "M-607",
  // Sevilla ring
  "SE-30",
  // Tarragona, Girona, Valencia, Galicia, Asturias
  "T-11", "V-30", "V-31", "CV-35", "AC-552",
  // Canarias (TF-*, GC-*)
  "TF-1", "TF-5", "GC-1", "GC-3",
  // Baleares (Ma-*)
  "Ma-13", "Ma-19", "Ma-20",
  // País Vasco
  "GI-636",
];

export const dynamic = "force-static";
export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams() {
  return PREGEN_ROADS.map((road) => ({ road }));
}

// ---------------------------------------------------------------------------
// Road normalization — accept "AP-7", "ap7", "Ap 7" → query as "AP-7"
// ---------------------------------------------------------------------------

function normalizeRoad(raw: string): string {
  return decodeURIComponent(raw).toUpperCase().replace(/[\s_]/g, "-").replace(/--+/g, "-");
}

function roadTypeLabel(road: string): string {
  if (/^AP-?\d/i.test(road)) return "Autopista";
  if (/^A-?\d/i.test(road)) return "Autovía";
  if (/^N-/i.test(road)) return "Nacional";
  return "Carretera";
}

// ---------------------------------------------------------------------------
// Data fetching — single road, all microdata aggregations
// ---------------------------------------------------------------------------

async function getRoadStats(road: string) {
  // Use `contains` like the API does — DGT's source data sometimes has
  // trailing direction codes ("A-7 km 134 ESTE") that an `equals` would
  // miss.
  const where = {
    roadNumber: { contains: road, mode: "insensitive" as const },
  };

  const [
    totalCount,
    bySeverity,
    byYear,
    byKm,
    byWeather,
    byDayOfWeek,
    byProvince,
  ] = await Promise.all([
    prisma.accidentMicrodata.count({ where }),

    prisma.accidentMicrodata.groupBy({
      by: ["severity"],
      where,
      _count: { _all: true },
      _sum: { fatalities: true, hospitalized: true, minorInjury: true },
    }),

    prisma.accidentMicrodata.groupBy({
      by: ["year"],
      where,
      _count: { _all: true },
      _sum: { fatalities: true, hospitalized: true, minorInjury: true },
      orderBy: { year: "asc" },
    }),

    // KM hotspots — group on the integer floor of km so neighbouring
    // accidents on the same kilometre cluster correctly. We use the
    // floored Decimal directly; Prisma rounds at the column level so
    // we pull a small subset and bucket in-memory.
    prisma.accidentMicrodata.findMany({
      where: { ...where, km: { not: null } },
      select: { km: true, fatalities: true, severity: true },
    }),

    prisma.accidentMicrodata.groupBy({
      by: ["weatherCondition"],
      where: { ...where, weatherCondition: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { weatherCondition: "desc" } },
      take: 6,
    }),

    prisma.accidentMicrodata.groupBy({
      by: ["dayOfWeek"],
      where: { ...where, dayOfWeek: { not: null } },
      _count: { _all: true },
      orderBy: { dayOfWeek: "asc" },
    }),

    prisma.accidentMicrodata.groupBy({
      by: ["provinceName"],
      where: { ...where, provinceName: { not: null } },
      _count: { _all: true },
      _sum: { fatalities: true },
      orderBy: { _count: { provinceName: "desc" } },
      take: 8,
    }),
  ]);

  const totalFatalities = bySeverity.reduce((a, s) => a + (s._sum.fatalities ?? 0), 0);
  const totalHospitalized = bySeverity.reduce((a, s) => a + (s._sum.hospitalized ?? 0), 0);
  const totalMinorInjury = bySeverity.reduce((a, s) => a + (s._sum.minorInjury ?? 0), 0);

  // KM hotspot bucket
  const kmBuckets = new Map<number, { count: number; fatalities: number }>();
  for (const row of byKm) {
    if (!row.km) continue;
    const km = Math.floor(Number(row.km));
    const bucket = kmBuckets.get(km) ?? { count: 0, fatalities: 0 };
    bucket.count += 1;
    bucket.fatalities += row.fatalities ?? 0;
    kmBuckets.set(km, bucket);
  }
  const kmHotspots = Array.from(kmBuckets.entries())
    .map(([km, v]) => ({ km, ...v }))
    .sort((a, b) => b.fatalities - a.fatalities || b.count - a.count)
    .slice(0, 10);

  const years = byYear.map((r) => r.year).filter(Boolean) as number[];
  const yearMin = years.length ? Math.min(...years) : 2019;
  const yearMax = years.length ? Math.max(...years) : 2023;

  return {
    totalCount,
    totalFatalities,
    totalHospitalized,
    totalMinorInjury,
    yearMin,
    yearMax,
    bySeverity,
    byYear,
    kmHotspots,
    byWeather,
    byDayOfWeek,
    byProvince,
  };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(
  { params }: { params: Promise<{ road: string }> },
): Promise<Metadata> {
  const { road: rawRoad } = await params;
  const road = normalizeRoad(rawRoad);
  const stats = await getRoadStats(road).catch(() => null);

  if (!stats || stats.totalCount === 0) {
    return {
      title: `Accidentes en la ${road}`,
      description: `Datos de siniestralidad vial para la ${road} en España. No hay registros DGT recientes.`,
      alternates: { canonical: `${BASE_URL}/accidentes/carretera/${encodeURIComponent(road)}` },
    };
  }

  const fatalities = stats.totalFatalities;
  return {
    title: `Accidentes en la ${road} (${stats.yearMin}-${stats.yearMax}) — DGT`,
    description:
      `${stats.totalCount.toLocaleString("es-ES")} accidentes registrados en la ${road} ` +
      `entre ${stats.yearMin} y ${stats.yearMax}` +
      (fatalities > 0 ? `, con ${fatalities.toLocaleString("es-ES")} víctimas mortales. ` : ". ") +
      `Puntos kilométricos con mayor siniestralidad, evolución anual y desglose por gravedad.`,
    alternates: { canonical: `${BASE_URL}/accidentes/carretera/${encodeURIComponent(road)}` },
    openGraph: {
      title: `Accidentes en la ${road} — DGT ${stats.yearMin}-${stats.yearMax}`,
      description:
        `${stats.totalCount.toLocaleString("es-ES")} accidentes y ` +
        `${fatalities.toLocaleString("es-ES")} víctimas mortales en la ${road}. ` +
        `Análisis de puntos negros, condiciones meteorológicas y días de mayor riesgo.`,
      url: `${BASE_URL}/accidentes/carretera/${encodeURIComponent(road)}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
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

const SEVERITY_LABEL: Record<string, string> = {
  fatal: "Mortales",
  hospitalized: "Heridos graves",
  minor: "Heridos leves",
};

const WEATHER_LABEL: Record<string, string> = {
  clear: "Despejado",
  cloudy: "Nublado",
  rain: "Lluvia",
  heavy_rain: "Lluvia intensa",
  fog: "Niebla",
  snow: "Nieve",
  ice: "Hielo",
  wind: "Viento",
  other: "Otra",
};

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function RoadAccidentesPage(
  { params }: { params: Promise<{ road: string }> },
) {
  const { road: rawRoad } = await params;
  const road = normalizeRoad(rawRoad);
  const stats = await getRoadStats(road);

  // If a non-pregenerated road is requested and we have zero rows, 404
  // so Google doesn't index empty pages. Pre-generated roads always render.
  if (stats.totalCount === 0 && !PREGEN_ROADS.includes(road)) {
    notFound();
  }

  const roadType = roadTypeLabel(road);
  const fatalCount = stats.bySeverity.find((s) => s.severity === "fatal")?._count._all ?? 0;
  const hospCount = stats.bySeverity.find((s) => s.severity === "hospitalized")?._count._all ?? 0;
  const minorCount = stats.bySeverity.find((s) => s.severity === "minor")?._count._all ?? 0;

  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Accidentes en la ${road} (${stats.yearMin}-${stats.yearMax})`,
    description:
      `Registro de accidentes con víctimas en la ${road}, ${stats.totalCount.toLocaleString("es-ES")} ` +
      `casos entre ${stats.yearMin} y ${stats.yearMax}. Fuente: DGT.`,
    url: `${BASE_URL}/accidentes/carretera/${encodeURIComponent(road)}`,
    keywords: `accidentes ${road}, siniestralidad ${road}, DGT, víctimas`,
    temporalCoverage: `${stats.yearMin}-01-01/${stats.yearMax}-12-31`,
    spatialCoverage: { "@type": "Place", name: "España" },
    creator: {
      "@type": "Organization",
      name: "Dirección General de Tráfico (DGT)",
      url: "https://www.dgt.es",
    },
    isBasedOn: `${BASE_URL}/accidentes`,
    license: "https://datos.gob.es/es/licencias",
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Accidentes", item: `${BASE_URL}/accidentes` },
      {
        "@type": "ListItem",
        position: 3,
        name: `Accidentes en la ${road}`,
        item: `${BASE_URL}/accidentes/carretera/${encodeURIComponent(road)}`,
      },
    ],
  };

  return (
    <>
      <StructuredData data={[datasetSchema, breadcrumbSchema]} />

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Accidentes", href: "/accidentes" },
            { name: `Carretera ${road}`, href: `/accidentes/carretera/${encodeURIComponent(road)}` },
          ]}
        />
      </div>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1c1917 50%, #7f1d1d 100%)" }}
      >
        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
          <Link
            href="/accidentes"
            className="inline-flex items-center gap-1.5 text-xs text-red-200 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Hub de siniestralidad
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-9 h-9 text-red-300" />
            <span className="font-heading text-red-300 text-sm font-semibold uppercase tracking-widest">
              {roadType}
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-4 leading-tight font-mono">
            Accidentes en la {road}
          </h1>
          <p className="text-red-200 text-lg max-w-2xl leading-relaxed">
            Datos DGT {stats.yearMin}–{stats.yearMax}. Análisis por punto kilométrico, severidad,
            condiciones meteorológicas y días de mayor riesgo.
          </p>

          {stats.totalCount > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2">
                <AlertTriangle className="w-4 h-4 text-red-300" />
                <span className="text-white text-sm font-semibold font-mono">
                  {fmt(stats.totalCount)} accidentes
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

        {stats.totalCount === 0 ? (
          <section
            aria-label="Sin datos"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center"
          >
            <AlertTriangle className="w-10 h-10 mx-auto text-[var(--tl-warning)] mb-3" />
            <h2 className="font-heading text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Sin registros para la {road}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              No se han encontrado accidentes con víctimas para esta carretera en los microdatos
              DGT {stats.yearMin}–{stats.yearMax}. Esto puede deberse a que la carretera no
              concentra siniestralidad o a que su denominación en los datos oficiales difiere
              ligeramente.
            </p>
          </section>
        ) : (
          <>
            {/* Severity strip */}
            <section aria-label="Estadísticas">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat icon={AlertTriangle} label="Total" value={fmt(stats.totalCount)} sub={`${stats.yearMin}–${stats.yearMax}`} />
                <Stat icon={TrendingDown} label="Mortales" value={fmt(fatalCount)} sub={pct(fatalCount, stats.totalCount)} accent="danger" />
                <Stat icon={Shield} label="Graves" value={fmt(hospCount)} sub={pct(hospCount, stats.totalCount)} accent="warning" />
                <Stat icon={BarChart3} label="Leves" value={fmt(minorCount)} sub={pct(minorCount, stats.totalCount)} accent="info" />
              </div>
            </section>

            {/* Year evolution */}
            {stats.byYear.length > 0 && (
              <section aria-label="Evolución anual">
                <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                  Evolución anual
                </h2>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="grid grid-cols-5 gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <div>Año</div>
                    <div className="text-right">Accidentes</div>
                    <div className="text-right">Mortales</div>
                    <div className="text-right">Graves</div>
                    <div className="text-right">Leves</div>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {stats.byYear.map((r) => (
                      <div key={r.year} className="grid grid-cols-5 gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <div className="font-mono font-semibold text-gray-900 dark:text-gray-100">{r.year}</div>
                        <div className="text-right font-mono text-sm text-gray-700 dark:text-gray-300">{fmt(r._count._all)}</div>
                        <div className="text-right font-mono text-sm text-[var(--tl-danger)]">{fmt(r._sum.fatalities ?? 0)}</div>
                        <div className="text-right font-mono text-sm text-[var(--tl-warning)]">{fmt(r._sum.hospitalized ?? 0)}</div>
                        <div className="text-right font-mono text-sm text-[var(--tl-info)]">{fmt(r._sum.minorInjury ?? 0)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* KM hotspots */}
            {stats.kmHotspots.length > 0 && (
              <section aria-label="Puntos kilométricos">
                <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[var(--tl-danger)]" />
                  Puntos kilométricos con mayor siniestralidad
                </h2>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="grid grid-cols-4 gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <div>Punto km</div>
                    <div className="text-right">Accidentes</div>
                    <div className="text-right">Fallecidos</div>
                    <div className="text-right">Mort/Acc</div>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {stats.kmHotspots.map((h) => (
                      <div key={h.km} className="grid grid-cols-4 gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <div className="font-mono font-semibold text-gray-900 dark:text-gray-100">km {h.km}</div>
                        <div className="text-right font-mono text-sm text-gray-700 dark:text-gray-300">{fmt(h.count)}</div>
                        <div className="text-right font-mono text-sm text-[var(--tl-danger)]">{fmt(h.fatalities)}</div>
                        <div className="text-right font-mono text-sm text-gray-500 dark:text-gray-400">{pct(h.fatalities, h.count)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      Top 10 km ordenados por víctimas mortales, después por nº de accidentes
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Provinces crossed */}
            {stats.byProvince.length > 1 && (
              <section aria-label="Provincias atravesadas">
                <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                  Reparto por provincia
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {stats.byProvince.map((p) => (
                    <div key={p.provinceName ?? ""} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                        {p.provinceName}
                      </div>
                      <div className="font-mono text-xl font-bold text-gray-900 dark:text-gray-100">
                        {fmt(p._count._all)}
                      </div>
                      {(p._sum.fatalities ?? 0) > 0 && (
                        <div className="text-xs font-mono text-[var(--tl-danger)] mt-1">
                          {fmt(p._sum.fatalities ?? 0)} fallecidos
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Day of week */}
            {stats.byDayOfWeek.length > 0 && (
              <section aria-label="Día de la semana">
                <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                  Día de la semana
                </h2>
                {(() => {
                  const dayMap: Record<number, number> = {};
                  for (const r of stats.byDayOfWeek) {
                    if (r.dayOfWeek !== null) dayMap[r.dayOfWeek] = r._count._all;
                  }
                  const max = Math.max(...Object.values(dayMap), 1);
                  return (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-end gap-2 h-32">
                        {DAY_LABELS.map((label, i) => {
                          const day = i + 1;
                          const count = dayMap[day] ?? 0;
                          const h = max > 0 ? (count / max) * 100 : 0;
                          const weekend = day === 6 || day === 7;
                          return (
                            <div key={label} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                                {count > 0 ? fmt(count) : "—"}
                              </span>
                              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-t" style={{ height: "80px" }}>
                                <div
                                  className="w-full rounded-t"
                                  style={{
                                    height: `${h}%`,
                                    marginTop: `${100 - h}%`,
                                    background: weekend ? "var(--tl-warning)" : "var(--tl-primary)",
                                    opacity: 0.8,
                                  }}
                                />
                              </div>
                              <span className="text-xs font-semibold" style={{ color: weekend ? "var(--tl-warning)" : "var(--color-tl-600)" }}>
                                {label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </section>
            )}

            {/* Weather */}
            {stats.byWeather.length > 0 && (
              <section aria-label="Condiciones meteorológicas">
                <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <CloudRain className="w-5 h-5 text-[var(--tl-info)]" />
                  Condiciones meteorológicas
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {stats.byWeather.map((w) => (
                    <div key={w.weatherCondition ?? ""} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                        {WEATHER_LABEL[w.weatherCondition ?? ""] ?? w.weatherCondition}
                      </div>
                      <div className="font-mono text-xl font-bold text-gray-900 dark:text-gray-100">
                        {fmt(w._count._all)}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {pct(w._count._all, stats.totalCount)} del total
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* SEO body */}
        <section
          aria-label="Sobre la siniestralidad en la carretera"
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8"
        >
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
            Sobre los accidentes en la {road}
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-3">
            <p>
              La {roadType.toLowerCase()} {road} forma parte de la red estatal de carreteras
              gestionada por la Dirección General de Tráfico. Las cifras de esta página agregan
              microdatos oficiales de accidentes con víctimas publicados por la DGT para los
              años {stats.yearMin} a {stats.yearMax}.
            </p>
            <p>
              Los puntos kilométricos resaltados corresponden a tramos con mayor número de
              víctimas mortales. Estos clústeres suelen coincidir con incorporaciones, cambios
              de pendiente, intersecciones u otros elementos geométricos del trazado, además de
              factores meteorológicos y de iluminación recogidos también en los datos.
            </p>
            <p>
              Para conocer las cámaras y paneles de aviso activos en este eje, consulta{" "}
              <Link href={`/camaras/carretera/${encodeURIComponent(road)}`} className="underline">
                cámaras en la {road}
              </Link>
              {" "}o el{" "}
              <Link href={`/radares/${encodeURIComponent(road)}`} className="underline">
                listado de radares
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Attribution */}
        <footer className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-6">
          <BarChart3 className="w-4 h-4 flex-shrink-0" />
          <span>
            Fuente:{" "}
            <a
              href="https://www.dgt.es/menusecundario/dgt-en-cifras/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-600 dark:hover:text-gray-300"
            >
              Dirección General de Tráfico (DGT)
            </a>
            {" "}· Microdatos de accidentes con víctimas {stats.yearMin}–{stats.yearMax}
          </span>
        </footer>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: string;
  sub: string;
  accent?: "danger" | "warning" | "info";
}) {
  const colorVar =
    accent === "danger" ? "var(--tl-danger)"
    : accent === "warning" ? "var(--tl-warning)"
    : accent === "info" ? "var(--tl-info)"
    : "var(--color-tl-600)";

  return (
    <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5" style={{ color: colorVar }} />
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="font-mono text-3xl font-bold" style={{ color: accent ? colorVar : undefined }}>
        {value}
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</div>
    </div>
  );
}
