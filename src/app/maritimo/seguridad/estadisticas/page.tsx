/**
 * /maritimo/seguridad/estadisticas — SASEMAR rescue statistics
 *
 * Surfaces the MaritimeEmergency table (sasemar-arcgis collector,
 * ~30K events 2019-2024 with lat/lng/zone/province/persons-saved).
 * The parent /maritimo/seguridad page is the static safety guide;
 * this sub-page is the data view that page should have been from
 * the start.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { StructuredData } from "@/components/seo/StructuredData";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  LifeBuoy,
  AlertTriangle,
  Anchor,
  MapPin,
  TrendingUp,
  Users,
  Heart,
  Compass,
  Calendar,
  BarChart3,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 21600; // 6h ISR — historical data, low churn

const TYPE_LABELS: Record<string, string> = {
  RESCUE: "Rescate",
  ASSISTANCE: "Asistencia",
  MEDICAL: "Evacuación médica",
  POLLUTION: "Contaminación",
  SEARCH: "Búsqueda",
  ALERT: "Alerta",
  OTHER: "Otra",
};

const ZONE_LABELS: Record<string, string> = {
  "ESTRECHO": "Estrecho de Gibraltar",
  "ATLÁNTICO NORTE": "Atlántico Norte",
  "ATLÁNTICO SUR": "Atlántico Sur",
  "MEDITERRÁNEO": "Mediterráneo",
  "CANARIAS": "Canarias",
  "CANTÁBRICO": "Cantábrico",
};

function zoneLabel(z: string | null): string {
  if (!z) return "Sin zona";
  return ZONE_LABELS[z.toUpperCase()] ?? z;
}

function typeLabel(t: string | null): string {
  if (!t) return "Otra";
  return TYPE_LABELS[t.toUpperCase()] ?? t;
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("es-ES");
}

function pct(part: number, total: number): string {
  if (!total) return "0%";
  const v = (part / total) * 100;
  return (v < 0.1 ? "<0,1" : v.toFixed(1).replace(".", ",")) + "%";
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getStats() {
  const [
    totalCount,
    byYear,
    byType,
    byZone,
    byProvince,
    bySeverity,
    rescueAgg,
  ] = await Promise.all([
    prisma.maritimeEmergency.count(),

    prisma.maritimeEmergency.groupBy({
      by: ["year"],
      _count: { _all: true },
      _sum: { personsSaved: true, personsMissing: true, personsDeceased: true },
      orderBy: { year: "asc" },
    }),

    prisma.maritimeEmergency.groupBy({
      by: ["type"],
      _count: { _all: true },
      orderBy: { _count: { type: "desc" } },
    }),

    prisma.maritimeEmergency.groupBy({
      by: ["zone"],
      where: { zone: { not: null } },
      _count: { _all: true },
      _sum: { personsSaved: true },
      orderBy: { _count: { zone: "desc" } },
      take: 10,
    }),

    prisma.maritimeEmergency.groupBy({
      by: ["provinceName"],
      where: { provinceName: { not: null } },
      _count: { _all: true },
      _sum: { personsSaved: true, personsMissing: true, personsDeceased: true },
      orderBy: { _count: { provinceName: "desc" } },
      take: 15,
    }),

    prisma.maritimeEmergency.groupBy({
      by: ["severity"],
      where: { severity: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { severity: "desc" } },
      take: 6,
    }),

    prisma.maritimeEmergency.aggregate({
      _sum: { personsSaved: true, personsMissing: true, personsDeceased: true, personsInvolved: true },
    }),
  ]);

  const years = byYear.map((r) => r.year).filter(Boolean);
  const yearMin = years.length ? Math.min(...years) : 2019;
  const yearMax = years.length ? Math.max(...years) : 2024;

  return {
    totalCount,
    yearMin,
    yearMax,
    byYear,
    byType,
    byZone,
    byProvince,
    bySeverity,
    totals: {
      saved: rescueAgg._sum.personsSaved ?? 0,
      missing: rescueAgg._sum.personsMissing ?? 0,
      deceased: rescueAgg._sum.personsDeceased ?? 0,
      involved: rescueAgg._sum.personsInvolved ?? 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Estadísticas SASEMAR — Rescates marítimos en España 2019-2024",
  description:
    "Análisis de rescates marítimos de SASEMAR (Salvamento Marítimo) en España: 30.000+ emergencias 2019-2024 por zona, tipo, provincia costera, personas rescatadas, fallecidas y desaparecidas.",
  alternates: {
    canonical: `${BASE_URL}/maritimo/seguridad/estadisticas`,
  },
  openGraph: {
    title: "Estadísticas SASEMAR — Rescates marítimos en España",
    description:
      "30.000+ operaciones de salvamento marítimo en aguas españolas 2019-2024. Datos por zona (Estrecho, Cantábrico, Mediterráneo, Canarias), tipo de emergencia y persona involucradas.",
    url: `${BASE_URL}/maritimo/seguridad/estadisticas`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function MaritimoSeguridadEstadisticasPage() {
  const stats = await getStats();
  const isEmpty = stats.totalCount === 0;

  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Rescates marítimos SASEMAR ${stats.yearMin}-${stats.yearMax}`,
    description:
      "Registro de emergencias atendidas por SASEMAR (Sociedad de Salvamento y Seguridad " +
      "Marítima) en aguas españolas. Incluye tipo, zona, severidad, provincia costera y " +
      "personas rescatadas / desaparecidas / fallecidas.",
    url: `${BASE_URL}/maritimo/seguridad/estadisticas`,
    keywords: "SASEMAR, rescates marítimos, salvamento, España, Estrecho, Mediterráneo, Cantábrico",
    temporalCoverage: `${stats.yearMin}-01-01/${stats.yearMax}-12-31`,
    spatialCoverage: { "@type": "Place", name: "Aguas territoriales y SAR españolas" },
    creator: {
      "@type": "Organization",
      name: "Sociedad de Salvamento y Seguridad Marítima (SASEMAR)",
      url: "https://www.salvamentomaritimo.es",
    },
    license: "https://datos.gob.es/es/licencias",
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Marítimo", item: `${BASE_URL}/maritimo` },
      { "@type": "ListItem", position: 3, name: "Seguridad", item: `${BASE_URL}/maritimo/seguridad` },
      {
        "@type": "ListItem",
        position: 4,
        name: "Estadísticas",
        item: `${BASE_URL}/maritimo/seguridad/estadisticas`,
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
            { name: "Marítimo", href: "/maritimo" },
            { name: "Seguridad", href: "/maritimo/seguridad" },
            { name: "Estadísticas", href: "/maritimo/seguridad/estadisticas" },
          ]}
        />
      </div>

      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #1c4e80 50%, #2563eb 100%)",
        }}
      >
        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
          <Link
            href="/maritimo/seguridad"
            className="inline-flex items-center gap-1.5 text-xs text-blue-200 hover:text-white mb-4 transition-colors"
          >
            <LifeBuoy className="w-3 h-3" />
            Guía de seguridad marítima
          </Link>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
            Rescates marítimos en España
          </h1>
          <p className="text-blue-200 text-lg max-w-2xl leading-relaxed">
            Estadísticas de operaciones de salvamento de SASEMAR
            {!isEmpty && (
              <>
                {" "}— {fmt(stats.totalCount)} emergencias entre {stats.yearMin} y {stats.yearMax}
              </>
            )}
            .
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">

        {isEmpty ? (
          <section
            aria-label="Sin datos"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center"
          >
            <AlertTriangle className="w-10 h-10 mx-auto text-[var(--tl-warning)] mb-3" />
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Sin datos disponibles
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              El colector SASEMAR ArcGIS aún no ha completado la carga. Las estadísticas
              estarán disponibles tras la primera ingesta.
            </p>
          </section>
        ) : (
          <>
            {/* Rescue totals */}
            <section aria-label="Totales humanos">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Tile
                  icon={Heart}
                  label="Personas rescatadas"
                  value={fmt(stats.totals.saved)}
                  sub="con vida"
                  accent="success"
                />
                <Tile
                  icon={AlertTriangle}
                  label="Desaparecidas"
                  value={fmt(stats.totals.missing)}
                  sub="reportadas"
                  accent="warning"
                />
                <Tile
                  icon={Users}
                  label="Fallecidas"
                  value={fmt(stats.totals.deceased)}
                  sub="confirmadas"
                  accent="danger"
                />
                <Tile
                  icon={LifeBuoy}
                  label="Operaciones"
                  value={fmt(stats.totalCount)}
                  sub={`${stats.yearMin}–${stats.yearMax}`}
                  accent="info"
                />
              </div>
            </section>

            {/* Year evolution */}
            {stats.byYear.length > 0 && (
              <section aria-label="Evolución anual">
                <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-[var(--tl-info)]" />
                  Evolución anual
                </h2>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="grid grid-cols-5 gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <div>Año</div>
                    <div className="text-right">Emergencias</div>
                    <div className="text-right">Rescatados</div>
                    <div className="text-right">Desaparecidos</div>
                    <div className="text-right">Fallecidos</div>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {stats.byYear.map((r) => (
                      <div key={r.year} className="grid grid-cols-5 gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <div className="font-mono font-semibold text-gray-900 dark:text-gray-100">{r.year}</div>
                        <div className="text-right font-mono text-sm text-gray-700 dark:text-gray-300">{fmt(r._count._all)}</div>
                        <div className="text-right font-mono text-sm text-[var(--tl-success)]">{fmt(r._sum.personsSaved ?? 0)}</div>
                        <div className="text-right font-mono text-sm text-[var(--tl-warning)]">{fmt(r._sum.personsMissing ?? 0)}</div>
                        <div className="text-right font-mono text-sm text-[var(--tl-danger)]">{fmt(r._sum.personsDeceased ?? 0)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* By type */}
            {stats.byType.length > 0 && (
              <section aria-label="Tipos de emergencia">
                <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <LifeBuoy className="w-6 h-6 text-[var(--tl-info)]" />
                  Por tipo de emergencia
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {stats.byType.map((r) => (
                    <div key={r.type ?? "OTHER"} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        {typeLabel(r.type)}
                      </div>
                      <div className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {fmt(r._count._all)}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {pct(r._count._all, stats.totalCount)} del total
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* By zone */}
            {stats.byZone.length > 0 && (
              <section aria-label="Por zona SAR">
                <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Compass className="w-6 h-6 text-[var(--tl-info)]" />
                  Por zona SAR
                </h2>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="grid grid-cols-4 gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <div className="col-span-2">Zona</div>
                    <div className="text-right">Emergencias</div>
                    <div className="text-right">Rescatados</div>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {stats.byZone.map((r) => (
                      <div key={r.zone ?? ""} className="grid grid-cols-4 gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <div className="col-span-2 text-sm text-gray-900 dark:text-gray-100 font-medium">{zoneLabel(r.zone)}</div>
                        <div className="text-right font-mono text-sm text-gray-700 dark:text-gray-300">{fmt(r._count._all)}</div>
                        <div className="text-right font-mono text-sm text-[var(--tl-success)]">{fmt(r._sum.personsSaved ?? 0)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* By province */}
            {stats.byProvince.length > 0 && (
              <section aria-label="Por provincia costera">
                <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-[var(--tl-info)]" />
                  Provincias costeras con más operaciones
                </h2>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="grid grid-cols-5 gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <div className="col-span-2">Provincia</div>
                    <div className="text-right">Emergencias</div>
                    <div className="text-right">Rescatados</div>
                    <div className="text-right">Fallecidos</div>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {stats.byProvince.map((r, i) => (
                      <div key={r.provinceName ?? ""} className="grid grid-cols-5 gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <div className="col-span-2 flex items-center gap-3">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold font-mono"
                            style={{
                              background: i === 0 ? "var(--tl-info)" : "var(--color-tl-50)",
                              color: i === 0 ? "white" : "var(--color-tl-600)",
                            }}
                          >
                            {i + 1}
                          </div>
                          <span className="text-sm text-gray-900 dark:text-gray-100">{r.provinceName}</span>
                        </div>
                        <div className="text-right font-mono text-sm text-gray-700 dark:text-gray-300">{fmt(r._count._all)}</div>
                        <div className="text-right font-mono text-sm text-[var(--tl-success)]">{fmt(r._sum.personsSaved ?? 0)}</div>
                        <div className="text-right font-mono text-sm text-[var(--tl-danger)]">{fmt(r._sum.personsDeceased ?? 0)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {/* SEO body */}
        <section
          aria-label="Sobre SASEMAR"
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8"
        >
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Anchor className="w-5 h-5 text-[var(--tl-info)]" />
            Sobre SASEMAR
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-3">
            <p>
              La Sociedad de Salvamento y Seguridad Marítima (SASEMAR) es la entidad pública
              responsable del salvamento de vida humana en la mar, la prevención y lucha
              contra la contaminación marina, la seguridad del tráfico marítimo y la
              navegación en aguas españolas.
            </p>
            <p>
              España gestiona cuatro zonas SAR principales: Atlántico Norte (Cantábrico),
              Atlántico Sur (Cádiz y Estrecho), Mediterráneo (Almería, Valencia, Cataluña,
              Baleares) y Canarias. El Estrecho de Gibraltar concentra históricamente el
              mayor volumen de operaciones por su tráfico denso y la actividad migratoria
              irregular.
            </p>
            <p>
              Los datos de esta página proceden del visor abierto de SASEMAR. Para más
              información sobre cómo solicitar ayuda en el mar (canal 16 VHF, 900 202 202),
              consulta la{" "}
              <Link href="/maritimo/seguridad" className="underline">guía de seguridad marítima</Link>.
            </p>
          </div>
        </section>

        {/* Attribution */}
        <footer className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-6">
          <BarChart3 className="w-4 h-4 flex-shrink-0" />
          <span>
            Fuente:{" "}
            <a
              href="https://www.salvamentomaritimo.es"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-600 dark:hover:text-gray-300"
            >
              SASEMAR
            </a>
            {" "}· Visor ArcGIS de emergencias atendidas, {stats.yearMin}–{stats.yearMax}
          </span>
        </footer>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------

function Tile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof LifeBuoy;
  label: string;
  value: string;
  sub: string;
  accent: "success" | "warning" | "danger" | "info";
}) {
  const colorVar =
    accent === "success" ? "var(--tl-success)"
    : accent === "warning" ? "var(--tl-warning)"
    : accent === "danger" ? "var(--tl-danger)"
    : "var(--tl-info)";

  return (
    <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5" style={{ color: colorVar }} />
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="font-mono text-3xl font-bold" style={{ color: colorVar }}>
        {value}
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</div>
    </div>
  );
}
