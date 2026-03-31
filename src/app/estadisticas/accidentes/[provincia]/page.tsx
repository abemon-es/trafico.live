import { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle, Users, Activity, TrendingDown, TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PROVINCES } from "@/lib/geo/ine-codes";
import { provinceSlug } from "@/lib/geo/slugify";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { AccidentChart } from "./AccidentChart";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ─── Slug → Province mapping ──────────────────────────────────────────────────

/**
 * Build a bidirectional map from URL slug → Province entry.
 * Handles bilingual names (e.g. "Alicante/Alacant" → "alicante-alacant")
 * by generating the slug from the full PROVINCES entry name.
 */
const SLUG_TO_PROVINCE = new Map(
  PROVINCES.map((p) => [provinceSlug(p.name), p])
);

function getProvinceBySlug(slug: string) {
  return SLUG_TO_PROVINCE.get(slug);
}

// ─── generateStaticParams ─────────────────────────────────────────────────────

export async function generateStaticParams() {
  return PROVINCES.map((p) => ({ provincia: provinceSlug(p.name) }));
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ provincia: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { provincia } = await params;
  const province = getProvinceBySlug(provincia);

  if (!province) {
    return { title: "Provincia no encontrada" };
  }

  const displayName = getDisplayName(province.name);

  return {
    title: `Accidentes de Tráfico en ${displayName} — Estadísticas 2011-2024`,
    description:
      `Estadísticas históricas de accidentes de tráfico en ${displayName} por año. ` +
      `Víctimas mortales, heridos hospitalizados y evolución de la siniestralidad vial desde 2011. ` +
      `Datos oficiales de la DGT.`,
    alternates: {
      canonical: `${BASE_URL}/estadisticas/accidentes/${provincia}`,
    },
    openGraph: {
      title: `Accidentes en ${displayName} — Estadísticas Históricas`,
      description: `Evolución de la siniestralidad vial en ${displayName} con datos oficiales de la DGT (2011-2024).`,
      url: `${BASE_URL}/estadisticas/accidentes/${provincia}`,
      type: "website",
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strip bilingual suffixes — show "Alicante" instead of "Alicante/Alacant".
 */
function getDisplayName(name: string): string {
  return name.split("/")[0].trim();
}

function formatNumber(n: number): string {
  return n.toLocaleString("es-ES");
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchProvinceAccidents(provinceCode: string) {
  // All years for this province (all road types aggregated together)
  const rows = await prisma.historicalAccidents.groupBy({
    by: ["year"],
    where: { province: provinceCode },
    _sum: {
      accidents: true,
      fatalities: true,
      hospitalized: true,
    },
    orderBy: { year: "asc" },
  });

  const yearly = rows.map((r) => ({
    year: r.year,
    accidents: r._sum.accidents ?? 0,
    fatalities: r._sum.fatalities ?? 0,
    hospitalized: r._sum.hospitalized ?? 0,
  }));

  if (yearly.length === 0) return null;

  const latestYear = yearly[yearly.length - 1].year;
  const earliestYear = yearly[0].year;
  const totals = yearly[yearly.length - 1];
  const prevYearRow = yearly.length >= 2 ? yearly[yearly.length - 2] : null;

  const yoyAccidents =
    prevYearRow && prevYearRow.accidents > 0
      ? (((totals.accidents - prevYearRow.accidents) / prevYearRow.accidents) * 100).toFixed(1)
      : null;

  const yoyFatalities =
    prevYearRow && prevYearRow.fatalities > 0
      ? (((totals.fatalities - prevYearRow.fatalities) / prevYearRow.fatalities) * 100).toFixed(1)
      : null;

  const fatalityRate =
    totals.accidents > 0
      ? ((totals.fatalities / totals.accidents) * 100).toFixed(2)
      : "0.00";

  // National totals for the latest year (for comparison)
  const nationalRow = await prisma.historicalAccidents.groupBy({
    by: ["year"],
    where: { year: latestYear },
    _sum: { accidents: true, fatalities: true },
  });

  const nationalTotals =
    nationalRow.length > 0
      ? {
          accidents: nationalRow[0]._sum.accidents ?? 0,
          fatalities: nationalRow[0]._sum.fatalities ?? 0,
        }
      : null;

  const nationalFatalityRate =
    nationalTotals && nationalTotals.accidents > 0
      ? ((nationalTotals.fatalities / nationalTotals.accidents) * 100).toFixed(2)
      : null;

  return {
    yearly,
    totals,
    latestYear,
    earliestYear,
    yoyAccidents,
    yoyFatalities,
    fatalityRate,
    nationalTotals,
    nationalFatalityRate,
  };
}

// ─── Sub-components (server-renderable) ───────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
  trendLabel,
  accentColor = "tl",
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  accentColor?: "tl" | "red" | "amber";
}) {
  const iconBg =
    accentColor === "red"
      ? "bg-red-50 dark:bg-red-900/20"
      : accentColor === "amber"
      ? "bg-tl-amber-50 dark:bg-tl-amber-900/20"
      : "bg-tl-50 dark:bg-tl-900/20";
  const iconColor =
    accentColor === "red"
      ? "text-red-600 dark:text-red-400"
      : accentColor === "amber"
      ? "text-tl-amber-600 dark:text-tl-amber-400"
      : "text-tl-600 dark:text-tl-400";

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-data font-bold text-gray-900 dark:text-gray-50 tabular-nums">
            {value}
          </p>
          {sub && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ml-3 ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      {trendLabel && (
        <div
          className={`mt-3 flex items-center gap-1 text-xs font-medium ${
            trend === "down"
              ? "text-emerald-600 dark:text-emerald-400"
              : trend === "up"
              ? "text-red-600 dark:text-red-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {trend === "down" ? (
            <TrendingDown className="w-3.5 h-3.5" />
          ) : trend === "up" ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : null}
          {trendLabel}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProvinciaAccidentesPage({ params }: PageProps) {
  const { provincia } = await params;
  const province = getProvinceBySlug(provincia);

  if (!province) notFound();

  const data = await fetchProvinceAccidents(province.code);

  // If we have no data at all for this province, show a graceful empty state
  // rather than 404 — the province is valid, just may not have data yet.
  const displayName = getDisplayName(province.name);

  // JSON-LD FAQPage
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `¿Cuántos accidentes de tráfico ocurren en ${displayName} al año?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: data
            ? `En ${data.latestYear}, la provincia de ${displayName} registró ${formatNumber(data.totals.accidents)} accidentes con víctimas, con ${formatNumber(data.totals.fatalities)} fallecidos y ${formatNumber(data.totals.hospitalized)} heridos hospitalizados según datos de la DGT.`
            : `Los datos de accidentes en ${displayName} se obtienen de la Dirección General de Tráfico (DGT) y se actualizan anualmente.`,
        },
      },
      {
        "@type": "Question",
        name: `¿Cómo ha evolucionado la siniestralidad vial en ${displayName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: data
            ? `La serie histórica de ${displayName} abarca desde ${data.earliestYear} hasta ${data.latestYear}. La tasa de mortalidad en ${data.latestYear} fue del ${data.fatalityRate}% (fallecidos por cada 100 accidentes con víctimas). Fuente: DGT en Cifras.`
            : `La DGT publica estadísticas anuales de siniestralidad vial por provincia desde 2011. Consulta este portal para ver la evolución histórica de ${displayName}.`,
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Estadísticas", href: "/estadisticas" },
              { name: "Accidentes", href: "/estadisticas/accidentes" },
              { name: displayName, href: `/estadisticas/accidentes/${provincia}` },
            ]}
          />

          {/* Header */}
          <div className="mb-8">
            <Link
              href="/estadisticas/accidentes"
              className="inline-flex items-center gap-1.5 text-sm text-tl-600 dark:text-tl-400 hover:underline mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a accidentes en España
            </Link>

            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-gray-900 dark:text-gray-50 leading-tight">
              Accidentes de Tráfico en {displayName}
              <span className="block text-xl sm:text-2xl font-normal text-gray-500 dark:text-gray-400 mt-1">
                Estadísticas Históricas{data ? ` ${data.earliestYear}–${data.latestYear}` : ""}
              </span>
            </h1>
            <p className="mt-3 text-base text-gray-600 dark:text-gray-400 max-w-3xl">
              Serie histórica de siniestralidad vial en la provincia de {displayName}.
              Datos oficiales procedentes de{" "}
              <a
                href="https://www.dgt.es"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tl-600 dark:text-tl-400 hover:underline"
              >
                DGT en Cifras
              </a>
              , actualizados anualmente.
            </p>
          </div>

          {/* ── No data state ─────────────────────────────────────────────── */}
          {!data ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
              <AlertTriangle className="w-10 h-10 text-tl-amber-500 mx-auto mb-4" />
              <p className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Sin datos disponibles
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                No hay estadísticas de accidentes registradas para {displayName} todavía.
                Los datos de la DGT se importan anualmente.
              </p>
              <Link
                href="/estadisticas/accidentes"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-tl-600 dark:text-tl-400 hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                Ver estadísticas nacionales
              </Link>
            </div>
          ) : (
            <div className="space-y-10">

              {/* ── 1. Key stats — latest year ──────────────────────────── */}
              <section aria-labelledby="stats-heading">
                <h2
                  id="stats-heading"
                  className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4"
                >
                  Cifras del año {data.latestYear}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    title="Accidentes con víctimas"
                    value={formatNumber(data.totals.accidents)}
                    sub={`Año ${data.latestYear}`}
                    icon={AlertTriangle}
                    trend={
                      data.yoyAccidents === null
                        ? "neutral"
                        : parseFloat(data.yoyAccidents) < 0
                        ? "down"
                        : "up"
                    }
                    trendLabel={
                      data.yoyAccidents !== null
                        ? `${parseFloat(data.yoyAccidents) > 0 ? "+" : ""}${data.yoyAccidents}% vs ${data.latestYear - 1}`
                        : undefined
                    }
                  />
                  <StatCard
                    title="Víctimas mortales"
                    value={formatNumber(data.totals.fatalities)}
                    sub="Fallecidos en 30 días o en el acto"
                    icon={Users}
                    accentColor="red"
                    trend={
                      data.yoyFatalities === null
                        ? "neutral"
                        : parseFloat(data.yoyFatalities) < 0
                        ? "down"
                        : "up"
                    }
                    trendLabel={
                      data.yoyFatalities !== null
                        ? `${parseFloat(data.yoyFatalities) > 0 ? "+" : ""}${data.yoyFatalities}% vs ${data.latestYear - 1}`
                        : undefined
                    }
                  />
                  <StatCard
                    title="Heridos hospitalizados"
                    value={formatNumber(data.totals.hospitalized)}
                    sub="Ingreso hospitalario"
                    icon={Activity}
                    accentColor="amber"
                  />
                  <StatCard
                    title="Tasa de mortalidad"
                    value={`${data.fatalityRate}%`}
                    sub="Fallecidos por cada 100 accidentes"
                    icon={TrendingDown}
                  />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Fuente: DGT en Cifras · Datos anuales consolidados
                </p>
              </section>

              {/* ── 2. Time series bar chart ─────────────────────────────── */}
              <section aria-labelledby="evolucion-heading">
                <h2
                  id="evolucion-heading"
                  className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4"
                >
                  Evolución histórica en {displayName}
                </h2>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <AccidentChart yearly={data.yearly} />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-right">
                    Fuente: DGT en Cifras · Eje izquierdo: accidentes · Eje derecho: fallecidos
                  </p>
                </div>
              </section>

              {/* ── 3. National comparison ───────────────────────────────── */}
              {data.nationalTotals && data.nationalFatalityRate && (
                <section aria-labelledby="comparativa-heading">
                  <h2
                    id="comparativa-heading"
                    className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4"
                  >
                    Comparativa con la media nacional — {data.latestYear}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Province card */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-tl-200 dark:border-tl-800 p-5">
                      <p className="text-xs font-semibold text-tl-600 dark:text-tl-400 uppercase tracking-wider mb-3">
                        {displayName}
                      </p>
                      <div className="space-y-3">
                        <CompareRow
                          label="Accidentes"
                          value={formatNumber(data.totals.accidents)}
                        />
                        <CompareRow
                          label="Fallecidos"
                          value={formatNumber(data.totals.fatalities)}
                        />
                        <CompareRow
                          label="Tasa mortalidad"
                          value={`${data.fatalityRate}%`}
                          highlight={
                            parseFloat(data.fatalityRate) >
                            parseFloat(data.nationalFatalityRate)
                              ? "worse"
                              : "better"
                          }
                        />
                      </div>
                    </div>

                    {/* National card */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                        España (total nacional)
                      </p>
                      <div className="space-y-3">
                        <CompareRow
                          label="Accidentes"
                          value={formatNumber(data.nationalTotals.accidents)}
                        />
                        <CompareRow
                          label="Fallecidos"
                          value={formatNumber(data.nationalTotals.fatalities)}
                        />
                        <CompareRow
                          label="Tasa mortalidad"
                          value={`${data.nationalFatalityRate}%`}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    La tasa de mortalidad es el porcentaje de fallecidos respecto al total de accidentes con víctimas.
                    Fuente: DGT en Cifras.
                  </p>
                </section>
              )}

              {/* ── 4. Historical data table ──────────────────────────────── */}
              <section aria-labelledby="tabla-heading">
                <h2
                  id="tabla-heading"
                  className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4"
                >
                  Datos por año
                </h2>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Año
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Accidentes
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Fallecidos
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Heridos hosp.
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Tasa mortalidad
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {[...data.yearly].reverse().map((row) => {
                          const rate =
                            row.accidents > 0
                              ? ((row.fatalities / row.accidents) * 100).toFixed(2)
                              : "0.00";
                          const isLatest = row.year === data.latestYear;
                          return (
                            <tr
                              key={row.year}
                              className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                                isLatest ? "bg-tl-50/50 dark:bg-tl-900/10" : ""
                              }`}
                            >
                              <td className="px-4 py-3 font-data font-semibold text-gray-900 dark:text-gray-100">
                                {row.year}
                                {isLatest && (
                                  <span className="ml-2 text-xs text-tl-600 dark:text-tl-400 font-normal">
                                    último
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-data tabular-nums text-gray-700 dark:text-gray-300">
                                {formatNumber(row.accidents)}
                              </td>
                              <td className="px-4 py-3 text-right font-data tabular-nums text-red-600 dark:text-red-400 font-semibold">
                                {formatNumber(row.fatalities)}
                              </td>
                              <td className="px-4 py-3 text-right font-data tabular-nums text-tl-amber-600 dark:text-tl-amber-400">
                                {formatNumber(row.hospitalized)}
                              </td>
                              <td className="px-4 py-3 text-right font-data tabular-nums text-gray-600 dark:text-gray-400">
                                {rate}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Fuente: DGT en Cifras · Tasa de mortalidad = fallecidos / accidentes × 100 ·
                      Todos los tipos de vía agregados
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Compare row helper ───────────────────────────────────────────────────────

function CompareRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "better" | "worse";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span
        className={`font-data font-semibold tabular-nums text-sm ${
          highlight === "worse"
            ? "text-red-600 dark:text-red-400"
            : highlight === "better"
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

