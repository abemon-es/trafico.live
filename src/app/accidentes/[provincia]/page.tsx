/**
 * /accidentes/[provincia] — Hub de siniestralidad vial por provincia.
 *
 * 52 provincias generadas estáticamente. Datos: AccidentMicrodata DGT
 * 2019-2023 (~500K registros). Filtrado por provinceName.
 *
 * Hub: /accidentes
 * Carreteras: /accidentes/carretera/[road]
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { StructuredData } from "@/components/seo/StructuredData";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { slugify } from "@/lib/geo/slugify";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calendar,
  Car,
  MapPin,
  Shield,
  TrendingDown,
  Users,
  Route,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Province registry — 52 provincias con nombre canónico DGT y slug INE
// ---------------------------------------------------------------------------

interface ProvinceConfig {
  name: string;         // Display name (es-ES)
  dbName: string;       // provinceName as stored in AccidentMicrodata
  slug: string;         // URL slug
  community: string;    // Comunidad autónoma
  article: string;      // "en" | "en la" | "en el" (grammatical)
}

const PROVINCES: ProvinceConfig[] = [
  // Andalucía
  { name: "Almería", dbName: "Almería", slug: "almeria", community: "Andalucía", article: "en" },
  { name: "Cádiz", dbName: "Cádiz", slug: "cadiz", community: "Andalucía", article: "en" },
  { name: "Córdoba", dbName: "Córdoba", slug: "cordoba", community: "Andalucía", article: "en" },
  { name: "Granada", dbName: "Granada", slug: "granada", community: "Andalucía", article: "en" },
  { name: "Huelva", dbName: "Huelva", slug: "huelva", community: "Andalucía", article: "en" },
  { name: "Jaén", dbName: "Jaén", slug: "jaen", community: "Andalucía", article: "en" },
  { name: "Málaga", dbName: "Málaga", slug: "malaga", community: "Andalucía", article: "en" },
  { name: "Sevilla", dbName: "Sevilla", slug: "sevilla", community: "Andalucía", article: "en" },
  // Aragón
  { name: "Huesca", dbName: "Huesca", slug: "huesca", community: "Aragón", article: "en" },
  { name: "Teruel", dbName: "Teruel", slug: "teruel", community: "Aragón", article: "en" },
  { name: "Zaragoza", dbName: "Zaragoza", slug: "zaragoza", community: "Aragón", article: "en" },
  // Asturias
  { name: "Asturias", dbName: "Asturias", slug: "asturias", community: "Asturias", article: "en" },
  // Baleares
  { name: "Baleares", dbName: "Baleares", slug: "baleares", community: "Illes Balears", article: "en" },
  // Canarias
  { name: "Las Palmas", dbName: "Las Palmas", slug: "las-palmas", community: "Canarias", article: "en" },
  { name: "Santa Cruz de Tenerife", dbName: "Santa Cruz de Tenerife", slug: "santa-cruz-de-tenerife", community: "Canarias", article: "en" },
  // Cantabria
  { name: "Cantabria", dbName: "Cantabria", slug: "cantabria", community: "Cantabria", article: "en" },
  // Castilla y León
  { name: "Ávila", dbName: "Ávila", slug: "avila", community: "Castilla y León", article: "en" },
  { name: "Burgos", dbName: "Burgos", slug: "burgos", community: "Castilla y León", article: "en" },
  { name: "León", dbName: "León", slug: "leon", community: "Castilla y León", article: "en" },
  { name: "Palencia", dbName: "Palencia", slug: "palencia", community: "Castilla y León", article: "en" },
  { name: "Salamanca", dbName: "Salamanca", slug: "salamanca", community: "Castilla y León", article: "en" },
  { name: "Segovia", dbName: "Segovia", slug: "segovia", community: "Castilla y León", article: "en" },
  { name: "Soria", dbName: "Soria", slug: "soria", community: "Castilla y León", article: "en" },
  { name: "Valladolid", dbName: "Valladolid", slug: "valladolid", community: "Castilla y León", article: "en" },
  { name: "Zamora", dbName: "Zamora", slug: "zamora", community: "Castilla y León", article: "en" },
  // Castilla-La Mancha
  { name: "Albacete", dbName: "Albacete", slug: "albacete", community: "Castilla-La Mancha", article: "en" },
  { name: "Ciudad Real", dbName: "Ciudad Real", slug: "ciudad-real", community: "Castilla-La Mancha", article: "en" },
  { name: "Cuenca", dbName: "Cuenca", slug: "cuenca", community: "Castilla-La Mancha", article: "en" },
  { name: "Guadalajara", dbName: "Guadalajara", slug: "guadalajara", community: "Castilla-La Mancha", article: "en" },
  { name: "Toledo", dbName: "Toledo", slug: "toledo", community: "Castilla-La Mancha", article: "en" },
  // Cataluña
  { name: "Barcelona", dbName: "Barcelona", slug: "barcelona", community: "Cataluña", article: "en" },
  { name: "Girona", dbName: "Girona", slug: "girona", community: "Cataluña", article: "en" },
  { name: "Lleida", dbName: "Lleida", slug: "lleida", community: "Cataluña", article: "en" },
  { name: "Tarragona", dbName: "Tarragona", slug: "tarragona", community: "Cataluña", article: "en" },
  // Comunitat Valenciana
  { name: "Alicante", dbName: "Alicante", slug: "alicante", community: "Comunitat Valenciana", article: "en" },
  { name: "Castellón", dbName: "Castellón", slug: "castellon", community: "Comunitat Valenciana", article: "en" },
  { name: "Valencia", dbName: "Valencia", slug: "valencia", community: "Comunitat Valenciana", article: "en" },
  // Extremadura
  { name: "Badajoz", dbName: "Badajoz", slug: "badajoz", community: "Extremadura", article: "en" },
  { name: "Cáceres", dbName: "Cáceres", slug: "caceres", community: "Extremadura", article: "en" },
  // Galicia
  { name: "A Coruña", dbName: "A Coruña", slug: "a-coruna", community: "Galicia", article: "en" },
  { name: "Lugo", dbName: "Lugo", slug: "lugo", community: "Galicia", article: "en" },
  { name: "Ourense", dbName: "Ourense", slug: "ourense", community: "Galicia", article: "en" },
  { name: "Pontevedra", dbName: "Pontevedra", slug: "pontevedra", community: "Galicia", article: "en" },
  // Madrid
  { name: "Madrid", dbName: "Madrid", slug: "madrid", community: "Comunidad de Madrid", article: "en" },
  // Murcia
  { name: "Murcia", dbName: "Murcia", slug: "murcia", community: "Región de Murcia", article: "en" },
  // Navarra
  { name: "Navarra", dbName: "Navarra", slug: "navarra", community: "Navarra", article: "en" },
  // País Vasco
  { name: "Álava", dbName: "Álava", slug: "alava", community: "País Vasco", article: "en" },
  { name: "Bizkaia", dbName: "Bizkaia", slug: "bizkaia", community: "País Vasco", article: "en" },
  { name: "Gipuzkoa", dbName: "Gipuzkoa", slug: "gipuzkoa", community: "País Vasco", article: "en" },
  // La Rioja
  { name: "La Rioja", dbName: "La Rioja", slug: "la-rioja", community: "La Rioja", article: "en" },
  // Ceuta y Melilla
  { name: "Ceuta", dbName: "Ceuta", slug: "ceuta", community: "Ceuta", article: "en" },
  { name: "Melilla", dbName: "Melilla", slug: "melilla", community: "Melilla", article: "en" },
];

// Slug → config lookup map
const PROVINCE_MAP = new Map<string, ProvinceConfig>(
  PROVINCES.map((p) => [p.slug, p])
);

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 86400; // 24h — DGT microdata updated annually

export function generateStaticParams() {
  return PROVINCES.map((p) => ({ provincia: p.slug }));
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getProvinceStats(dbName: string) {
  const where = {
    provinceName: { contains: dbName, mode: "insensitive" as const },
  };

  const [
    totalCount,
    bySeverity,
    byYear,
    byMunicipality,
    byRoad,
    byDayOfWeek,
    byHour,
    byWeather,
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

    // Top 10 municipios por nº de accidentes
    prisma.accidentMicrodata.groupBy({
      by: ["municipality"],
      where: { ...where, municipality: { not: null } },
      _count: { _all: true },
      _sum: { fatalities: true },
      orderBy: { _count: { municipality: "desc" } },
      take: 10,
    }),

    // Top 10 carreteras
    prisma.accidentMicrodata.groupBy({
      by: ["roadNumber"],
      where: { ...where, roadNumber: { not: null } },
      _count: { _all: true },
      _sum: { fatalities: true },
      orderBy: { _count: { roadNumber: "desc" } },
      take: 10,
    }),

    // Día de la semana
    prisma.accidentMicrodata.groupBy({
      by: ["dayOfWeek"],
      where: { ...where, dayOfWeek: { not: null } },
      _count: { _all: true },
      orderBy: { dayOfWeek: "asc" },
    }),

    // Hora del día
    prisma.accidentMicrodata.groupBy({
      by: ["hour"],
      where: { ...where, hour: { not: null } },
      _count: { _all: true },
      orderBy: { hour: "asc" },
    }),

    // Condiciones meteorológicas (top 6)
    prisma.accidentMicrodata.groupBy({
      by: ["weatherCondition"],
      where: { ...where, weatherCondition: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { weatherCondition: "desc" } },
      take: 6,
    }),
  ]);

  const totalFatalities = bySeverity.reduce((a, s) => a + (s._sum.fatalities ?? 0), 0);
  const totalHospitalized = bySeverity.reduce((a, s) => a + (s._sum.hospitalized ?? 0), 0);
  const totalMinorInjury = bySeverity.reduce((a, s) => a + (s._sum.minorInjury ?? 0), 0);
  const fatalPct = totalCount > 0 ? ((totalFatalities / totalCount) * 100).toFixed(1) : "0,0";

  const years = byYear.map((r) => r.year).filter(Boolean) as number[];
  const yearMin = years.length ? Math.min(...years) : 2019;
  const yearMax = years.length ? Math.max(...years) : 2023;

  const topRoad = byRoad[0]?.roadNumber ?? null;
  const topMunicipality = byMunicipality[0]?.municipality ?? null;

  return {
    totalCount,
    totalFatalities,
    totalHospitalized,
    totalMinorInjury,
    fatalPct,
    yearMin,
    yearMax,
    topRoad,
    topMunicipality,
    bySeverity,
    byYear,
    byMunicipality,
    byRoad,
    byDayOfWeek,
    byHour,
    byWeather,
  };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(
  { params }: { params: Promise<{ provincia: string }> },
): Promise<Metadata> {
  const { provincia } = await params;
  const config = PROVINCE_MAP.get(provincia);
  if (!config) return { title: "Provincia no encontrada" };

  const stats = await getProvinceStats(config.dbName).catch(() => null);
  const total = stats?.totalCount ?? 0;

  return {
    title: `Accidentes de tráfico ${config.article} ${config.name} (2019-2023) — DGT`,
    description:
      `${total > 0 ? `${total.toLocaleString("es-ES")} accidentes con víctimas registrados` : "Datos de siniestralidad vial"} ${config.article} ${config.name} ` +
      `entre 2019 y 2023. Puntos negros, municipios más afectados, evolución anual y condiciones meteorológicas. Fuente: DGT.`,
    alternates: { canonical: `${BASE_URL}/accidentes/${provincia}` },
    openGraph: {
      title: `Accidentes ${config.article} ${config.name} — DGT 2019-2023`,
      description:
        `Análisis de siniestralidad vial ${config.article} ${config.name}: ` +
        `${total > 0 ? `${total.toLocaleString("es-ES")} accidentes, ` : ""}municipios y carreteras más peligrosas, tendencia anual.`,
      url: `${BASE_URL}/accidentes/${provincia}`,
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

// Known road slugs that have a dedicated /accidentes/carretera/[road] page.
// We link to them when available; otherwise plain text.
const PREGEN_ROADS = new Set([
  "AP-1","AP-2","AP-4","AP-6","AP-7","AP-8","AP-9","AP-68",
  "A-1","A-2","A-3","A-4","A-5","A-6","A-7","A-8",
  "A-23","A-30","A-31","A-42","A-44","A-49","A-52","A-55",
  "A-62","A-66","A-67","A-70","A-92",
  "N-I","N-II","N-III","N-IV","N-V","N-VI","N-1","N-2",
  "N-120","N-232","N-240","N-260","N-330","N-332","N-340","N-340a",
  "N-401","N-420","N-432","N-550","N-630","N-634","N-637",
  "C-12","C-14","C-15","C-16","C-17","C-25","C-31","C-32",
  "C-35","C-55","C-58","C-59","C-63","C-66",
  "B-10","B-20","B-23","B-30",
  "M-40","M-45","M-50","M-506","M-607",
  "SE-30","T-11","V-30","V-31","CV-35","AC-552",
  "TF-1","TF-5","GC-1","GC-3",
  "Ma-13","Ma-19","Ma-20","GI-636",
]);

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------

function StatCard({
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProvinciaAccidentesPage(
  { params }: { params: Promise<{ provincia: string }> },
) {
  const { provincia } = await params;
  const config = PROVINCE_MAP.get(provincia);
  if (!config) notFound();

  const stats = await getProvinceStats(config.dbName);

  const fatalCount = stats.bySeverity.find((s) => s.severity === "fatal")?._count._all ?? 0;
  const hospCount = stats.bySeverity.find((s) => s.severity === "hospitalized")?._count._all ?? 0;
  const minorCount = stats.bySeverity.find((s) => s.severity === "minor")?._count._all ?? 0;

  // JSON-LD
  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Accidentes de tráfico ${config.article} ${config.name} (${stats.yearMin}-${stats.yearMax})`,
    description:
      `Registro de accidentes con víctimas ${config.article} ${config.name}, ` +
      `${stats.totalCount.toLocaleString("es-ES")} casos entre ${stats.yearMin} y ${stats.yearMax}. Fuente: DGT.`,
    url: `${BASE_URL}/accidentes/${provincia}`,
    keywords: `accidentes ${config.name}, siniestralidad ${config.name}, DGT, víctimas, ${config.community}`,
    temporalCoverage: `${stats.yearMin}-01-01/${stats.yearMax}-12-31`,
    spatialCoverage: {
      "@type": "Place",
      name: config.name,
      containedInPlace: { "@type": "AdministrativeArea", name: config.community },
    },
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
        name: `Accidentes ${config.article} ${config.name}`,
        item: `${BASE_URL}/accidentes/${provincia}`,
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
            { name: config.name, href: `/accidentes/${provincia}` },
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
            <MapPin className="w-9 h-9 text-red-300" />
            <span className="font-heading text-red-300 text-sm font-semibold uppercase tracking-widest">
              {config.community}
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Accidentes de tráfico {config.article} {config.name}
          </h1>
          <p className="text-red-200 text-lg max-w-2xl leading-relaxed">
            Datos DGT {stats.yearMin}–{stats.yearMax}. Evolución anual, municipios más afectados,
            carreteras más peligrosas y análisis por hora y día de la semana.
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
              {stats.topRoad && (
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2">
                  <Route className="w-4 h-4 text-red-300" />
                  <span className="text-white text-sm font-semibold font-mono">
                    Carretera más peligrosa: {stats.topRoad}
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
              Sin registros para {config.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              No se han encontrado accidentes con víctimas para esta provincia en los microdatos
              DGT {stats.yearMin}–{stats.yearMax}. Puede deberse a que la denominación de la
              provincia en los datos oficiales difiere ligeramente.
            </p>
          </section>
        ) : (
          <>
            {/* 4 stat cards */}
            <section aria-label="Estadísticas generales">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={AlertTriangle}
                  label="Total accidentes"
                  value={fmt(stats.totalCount)}
                  sub={`${stats.yearMin}–${stats.yearMax}`}
                />
                <StatCard
                  icon={TrendingDown}
                  label="% mortalidad"
                  value={`${stats.fatalPct.replace(".", ",")}%`}
                  sub={`${fmt(stats.totalFatalities)} víctimas mortales`}
                  accent="danger"
                />
                <StatCard
                  icon={Route}
                  label="Carretera principal"
                  value={stats.topRoad ?? "—"}
                  sub="mayor siniestralidad"
                  accent="warning"
                />
                <StatCard
                  icon={Users}
                  label="Municipio más afectado"
                  value={stats.topMunicipality ?? "—"}
                  sub="más accidentes"
                  accent="info"
                />
              </div>
            </section>

            {/* Evolución anual */}
            {stats.byYear.length > 0 && (
              <section aria-label="Evolución anual">
                <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                  Evolución anual {config.article} {config.name}
                </h2>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Bar chart */}
                  <div className="px-5 pt-5 pb-2">
                    {(() => {
                      const maxCount = Math.max(...stats.byYear.map((r) => r._count._all), 1);
                      return (
                        <div className="flex items-end gap-3 h-28">
                          {stats.byYear.map((r) => {
                            const h = (r._count._all / maxCount) * 100;
                            return (
                              <div key={r.year} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[10px] font-mono text-gray-400">
                                  {fmt(r._count._all)}
                                </span>
                                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-t" style={{ height: "80px" }}>
                                  <div
                                    className="w-full rounded-t"
                                    style={{
                                      height: `${h}%`,
                                      marginTop: `${100 - h}%`,
                                      background: "var(--tl-danger)",
                                      opacity: 0.75,
                                    }}
                                  />
                                </div>
                                <span className="text-xs font-semibold font-mono text-gray-500 dark:text-gray-400">
                                  {r.year}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                  {/* Tabla resumen */}
                  <div className="grid grid-cols-5 gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
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

            {/* Desglose por gravedad */}
            <section aria-label="Desglose por gravedad">
              <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[var(--tl-warning)]" />
                Desglose por gravedad
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: "fatal", count: fatalCount, color: "var(--tl-danger)", label: "Mortales" },
                  { key: "hospitalized", count: hospCount, color: "var(--tl-warning)", label: "Heridos graves" },
                  { key: "minor", count: minorCount, color: "var(--tl-info)", label: "Heridos leves" },
                ].map(({ key, count, color, label }) => {
                  const ratio = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0;
                  return (
                    <div key={key} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{label}</div>
                      <div className="font-mono text-3xl font-bold mb-2" style={{ color }}>
                        {fmt(count)}
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{ width: `${ratio}%`, background: color }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                        {pct(count, stats.totalCount)} del total
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Día de la semana + Hora del día */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Día de la semana */}
              {stats.byDayOfWeek.length > 0 && (
                <section aria-label="Día de la semana">
                  <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                    Por día de la semana
                  </h2>
                  {(() => {
                    const dayMap: Record<number, number> = {};
                    for (const r of stats.byDayOfWeek) {
                      if (r.dayOfWeek !== null) dayMap[r.dayOfWeek] = r._count._all;
                    }
                    const max = Math.max(...Object.values(dayMap), 1);
                    return (
                      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <div className="flex items-end gap-2 h-24">
                          {DAY_LABELS.map((label, i) => {
                            const day = i + 1;
                            const count = dayMap[day] ?? 0;
                            const h = max > 0 ? (count / max) * 100 : 0;
                            const weekend = day === 6 || day === 7;
                            return (
                              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[9px] font-mono text-gray-400">
                                  {count > 0 ? fmt(count) : "—"}
                                </span>
                                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-t" style={{ height: "64px" }}>
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
                                <span
                                  className="text-xs font-semibold"
                                  style={{ color: weekend ? "var(--tl-warning)" : "var(--color-tl-600)" }}
                                >
                                  {label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-3">
                          Sábado y domingo en amarillo — mayor incidencia en fin de semana
                        </p>
                      </div>
                    );
                  })()}
                </section>
              )}

              {/* Hora del día */}
              {stats.byHour.length > 0 && (
                <section aria-label="Hora del día">
                  <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[var(--tl-danger)]" />
                    Por hora del día
                  </h2>
                  {(() => {
                    const hourMap: Record<number, number> = {};
                    for (const r of stats.byHour) {
                      if (r.hour !== null) hourMap[r.hour] = r._count._all;
                    }
                    const max = Math.max(...Object.values(hourMap), 1);
                    return (
                      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <div className="flex items-end gap-0.5 h-24">
                          {Array.from({ length: 24 }, (_, h) => {
                            const count = hourMap[h] ?? 0;
                            const heightPct = max > 0 ? (count / max) * 100 : 0;
                            const isRush = (h >= 7 && h <= 9) || (h >= 17 && h <= 20);
                            return (
                              <div key={h} className="flex-1 flex flex-col items-center" title={`${String(h).padStart(2, "0")}:00 — ${count} acc.`}>
                                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-t" style={{ height: "64px" }}>
                                  <div
                                    className="w-full rounded-t"
                                    style={{
                                      height: `${heightPct}%`,
                                      marginTop: `${100 - heightPct}%`,
                                      background: isRush ? "var(--tl-danger)" : "var(--tl-primary)",
                                      opacity: 0.75,
                                    }}
                                  />
                                </div>
                                {h % 6 === 0 && (
                                  <span className="text-[8px] font-mono text-gray-400 mt-0.5">
                                    {String(h).padStart(2, "0")}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-3">
                          Franjas hora punta (7-9h, 17-20h) en rojo intenso
                        </p>
                      </div>
                    );
                  })()}
                </section>
              )}
            </div>

            {/* Top 10 carreteras */}
            {stats.byRoad.length > 0 && (
              <section aria-label="Carreteras más peligrosas">
                <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Route className="w-5 h-5 text-[var(--tl-danger)]" />
                  Carreteras con mayor siniestralidad {config.article} {config.name}
                </h2>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="grid grid-cols-4 gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <div>Carretera</div>
                    <div className="text-right">Accidentes</div>
                    <div className="text-right">Fallecidos</div>
                    <div className="text-right">% total prov.</div>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {stats.byRoad.map((r) => {
                      const road = r.roadNumber ?? "";
                      const hasPage = PREGEN_ROADS.has(road.toUpperCase());
                      return (
                        <div key={road} className="grid grid-cols-4 gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                          <div className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                            {hasPage ? (
                              <Link
                                href={`/accidentes/carretera/${encodeURIComponent(road.toUpperCase())}`}
                                className="text-[var(--tl-primary)] hover:underline"
                              >
                                {road}
                              </Link>
                            ) : road}
                          </div>
                          <div className="text-right font-mono text-sm text-gray-700 dark:text-gray-300">{fmt(r._count._all)}</div>
                          <div className="text-right font-mono text-sm text-[var(--tl-danger)]">{fmt(r._sum.fatalities ?? 0)}</div>
                          <div className="text-right font-mono text-sm text-gray-500 dark:text-gray-400">{pct(r._count._all, stats.totalCount)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                    <p className="text-[11px] text-gray-400">
                      Top 10 carreteras por nº de accidentes {stats.yearMin}–{stats.yearMax}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Top 10 municipios */}
            {stats.byMunicipality.length > 0 && (
              <section aria-label="Municipios más afectados">
                <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                  Municipios con más accidentes {config.article} {config.name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stats.byMunicipality.map((m, idx) => (
                    <div
                      key={m.municipality ?? idx}
                      className="flex items-center gap-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3"
                    >
                      <span className="font-mono text-sm text-gray-400 w-5 text-right flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {m.municipality}
                        </p>
                        {(m._sum.fatalities ?? 0) > 0 && (
                          <p className="text-xs font-mono text-[var(--tl-danger)]">
                            {fmt(m._sum.fatalities ?? 0)} fallecidos
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100 flex-shrink-0">
                        {fmt(m._count._all)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Condiciones meteorológicas */}
            {stats.byWeather.length > 0 && (
              <section aria-label="Condiciones meteorológicas">
                <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Car className="w-5 h-5 text-[var(--tl-info)]" />
                  Condiciones meteorológicas en accidentes
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

        {/* Texto SEO */}
        <section
          aria-label="Sobre la siniestralidad en la provincia"
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8"
        >
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
            Sobre los accidentes de tráfico {config.article} {config.name}
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-3">
            <p>
              Las cifras de esta página agregan microdatos oficiales de accidentes con víctimas
              publicados por la Dirección General de Tráfico (DGT) para los años {stats.yearMin}
              {" "}a {stats.yearMax}{stats.totalCount > 0 ? `, con un total de ${stats.totalCount.toLocaleString("es-ES")} siniestros registrados ${config.article} ${config.name}` : ""}.
            </p>
            {stats.topRoad && (
              <p>
                La carretera con mayor número de accidentes en el periodo es la{" "}
                <strong>{stats.topRoad}</strong>
                {PREGEN_ROADS.has(stats.topRoad.toUpperCase()) ? (
                  <>
                    {", para la que puedes consultar el "}
                    <Link
                      href={`/accidentes/carretera/${encodeURIComponent(stats.topRoad.toUpperCase())}`}
                      className="underline"
                    >
                      análisis detallado por kilómetro
                    </Link>
                    .
                  </>
                ) : "."}
              </p>
            )}
            <p>
              Para una visión global de la siniestralidad en España consulta{" "}
              <Link href="/accidentes" className="underline">
                el hub de accidentes
              </Link>
              {" "}o compara con{" "}
              <Link href="/espana" className="underline">
                el análisis por comunidad autónoma
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
