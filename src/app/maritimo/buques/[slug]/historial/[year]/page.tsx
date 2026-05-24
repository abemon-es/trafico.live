/**
 * /maritimo/buques/[slug]/historial/[year]
 *
 * Yearly archive page for a specific vessel.
 * Surfaces all PortCall + Voyage rows for that vessel in {year}.
 *
 * SEO play: each vessel × each year = its own indexable page.
 * Gives Google a crawlable archive for "buque X en 2024", "escalas 2023", etc.
 *
 * generateStaticParams: top 200 vessels × last 5 years with data = up to 1000 pages.
 * Others rendered on demand via dynamicParams = true.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { vesselSlug, parseVesselSlug } from "@/lib/vessel-utils";
import {
  Ship,
  Anchor,
  ArrowRight,
  ArrowLeft,
  Navigation,
  Clock,
  Calendar,
  BarChart3,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ISR: hourly (data will only change if AIS voyage-detector picks up new PortCalls)
export const revalidate = 3600;
export const dynamicParams = true;

// ---------------------------------------------------------------------------
// generateStaticParams: top 200 vessels × last 5 years with PortCall data
// ---------------------------------------------------------------------------

const CURRENT_YEAR = new Date().getFullYear();
const PAST_YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export async function generateStaticParams() {
  try {
    // Get top 200 vessels that have voyages (proven active)
    const topVessels = await prisma.voyage.findMany({
      distinct: ["mmsi"],
      select: { mmsi: true },
      take: 200,
    });

    if (topVessels.length === 0) return [];

    const mmsis = topVessels.map((v) => v.mmsi);

    const namedVessels = await prisma.vessel.findMany({
      where: {
        mmsi: { in: mmsis },
        name: { not: null },
      },
      select: { mmsi: true, name: true },
    });

    const params: { slug: string; year: string }[] = [];

    for (const vessel of namedVessels) {
      const slug = vesselSlug(vessel.mmsi, vessel.name);
      if (!slug.includes("-")) continue;

      for (const year of PAST_YEARS) {
        params.push({ slug, year: String(year) });
      }
    }

    return params;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Data fetchers
// ---------------------------------------------------------------------------

const getVessel = cache(async (mmsi: number) =>
  prisma.vessel.findUnique({ where: { mmsi } })
);

const getYearVoyages = cache(async (mmsi: number, year: number) => {
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  return prisma.voyage.findMany({
    where: {
      mmsi,
      departedAt: { gte: start, lt: end },
    },
    select: {
      id: true,
      departurePort: true,
      arrivalPort: true,
      departedAt: true,
      arrivedAt: true,
      durationH: true,
      distanceNm: true,
      avgSpeedKn: true,
      status: true,
      positionCount: true,
    },
    orderBy: { departedAt: "desc" },
  });
});

const getYearPortCalls = cache(async (mmsi: number, year: number) => {
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  return prisma.portCall.findMany({
    where: {
      mmsi,
      arrivedAt: { gte: start, lt: end },
    },
    select: {
      id: true,
      portName: true,
      portCode: true,
      arrivedAt: true,
      departedAt: true,
      durationH: true,
    },
    orderBy: { arrivedAt: "desc" },
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtTime(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(h: number | null | undefined): string {
  if (h == null || !isFinite(h)) return "—";
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) return `${h.toFixed(1).replace(".", ",")} h`;
  const days = Math.floor(h / 24);
  const rem = Math.round(h - days * 24);
  return rem > 0 ? `${days} d ${rem} h` : `${days} d`;
}

function fmtNm(nm: number | null | undefined): string {
  if (nm == null) return "—";
  return `${nm.toFixed(0)} nm`;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ slug: string; year: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, year } = await params;
  const yearNum = parseInt(year, 10);
  const { mmsi } = parseVesselSlug(slug);
  if (!mmsi || isNaN(yearNum)) return { title: "Archivo no encontrado" };

  const vessel = await getVessel(mmsi);
  if (!vessel) return { title: "Archivo no encontrado" };

  const name = vessel.name ?? `MMSI ${mmsi}`;

  return {
    title: `${name} — Historial ${yearNum} | Escalas y viajes anuales`,
    description:
      `Archivo completo del buque ${name} (MMSI ${mmsi}) en ${yearNum}: ` +
      `todos los viajes realizados, escalas en puertos espanoles, distancias y tiempos de navegacion. Datos AIS.`,
    alternates: {
      canonical: `${BASE_URL}/maritimo/buques/${slug}/historial/${yearNum}`,
    },
    openGraph: {
      title: `${name} en ${yearNum} — Viajes y escalas`,
      description: `Archivo ${yearNum} de ${name}: viajes, escalas en puertos espanoles, velocidades y distancias. Fuente AIS.`,
      url: `${BASE_URL}/maritimo/buques/${slug}/historial/${yearNum}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function VesselYearArchivePage({ params }: PageProps) {
  const { slug, year } = await params;
  const yearNum = parseInt(year, 10);
  const { mmsi } = parseVesselSlug(slug);

  // Validate
  if (!mmsi || isNaN(yearNum) || yearNum < 2019 || yearNum > CURRENT_YEAR) {
    notFound();
  }

  const vessel = await getVessel(mmsi);
  if (!vessel) notFound();

  const canonicalSlug = vesselSlug(mmsi, vessel.name);
  const name = vessel.name ?? `MMSI ${mmsi}`;

  const [voyages, portCalls] = await Promise.all([
    getYearVoyages(mmsi, yearNum),
    getYearPortCalls(mmsi, yearNum),
  ]);

  // Quality gate: no data for this year
  if (voyages.length === 0 && portCalls.length === 0) {
    notFound();
  }

  // Aggregate stats
  const totalNm = voyages.reduce((a, v) => a + (v.distanceNm ?? 0), 0);
  const totalH = voyages.reduce((a, v) => a + (v.durationH ?? 0), 0);
  const avgSpeed =
    voyages.filter((v) => v.avgSpeedKn != null).length > 0
      ? voyages.reduce((a, v) => a + (v.avgSpeedKn ?? 0), 0) /
        voyages.filter((v) => v.avgSpeedKn != null).length
      : null;

  // Year nav: adjacent years
  const prevYear = yearNum - 1;
  const nextYear = yearNum + 1;
  const showPrev = prevYear >= 2019;
  const showNext = nextYear <= CURRENT_YEAR;

  // JSON-LD: ItemList of voyages
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Viajes del buque ${name} en ${yearNum}`,
    description: `${voyages.length} viajes registrados via AIS para ${name} durante ${yearNum}.`,
    url: `${BASE_URL}/maritimo/buques/${canonicalSlug}/historial/${yearNum}`,
    numberOfItems: voyages.length,
    itemListElement: voyages.slice(0, 10).map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${v.departurePort ?? "Origen"} → ${v.arrivalPort ?? "Destino"}`,
      description: [
        v.departedAt ? `Salida: ${new Date(v.departedAt).toISOString()}` : null,
        v.arrivedAt ? `Llegada: ${new Date(v.arrivedAt).toISOString()}` : null,
        v.distanceNm ? `Distancia: ${v.distanceNm.toFixed(0)} nm` : null,
      ]
        .filter(Boolean)
        .join(". "),
    })),
  };

  return (
    <>
      <StructuredData data={itemListSchema} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Maritimo", href: "/maritimo" },
              { name: "Buques", href: "/maritimo/buques" },
              { name, href: `/maritimo/buques/${canonicalSlug}` },
              { name: `Historial ${yearNum}`, href: `/maritimo/buques/${canonicalSlug}/historial/${yearNum}` },
            ]}
          />
        </div>

        {/* Hero */}
        <section
          className="relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1c4e80 50%, #0891b2 100%)" }}
        >
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <Link
              href={`/maritimo/buques/${canonicalSlug}`}
              className="inline-flex items-center gap-1.5 text-xs text-cyan-200 hover:text-white mb-3 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Ficha del buque
            </Link>

            <div className="flex items-center gap-3 mb-2">
              <Ship className="w-7 h-7 text-white/90" />
              <span className="font-heading text-white/85 text-xs font-semibold uppercase tracking-widest">
                Archivo anual
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-white border border-white/20">
                {yearNum}
              </span>
            </div>

            <h1 className="font-heading text-3xl md:text-4xl font-bold text-white leading-tight">
              {name}
            </h1>
            <p className="mt-2 text-cyan-100 text-sm font-mono">
              MMSI {mmsi}
              {vessel.imo ? ` · IMO ${vessel.imo}` : ""}
              {vessel.callsign ? ` · ${vessel.callsign}` : ""}
            </p>

            {/* Year navigation */}
            <div className="flex items-center gap-3 mt-6">
              {showPrev ? (
                <Link
                  href={`/maritimo/buques/${canonicalSlug}/historial/${prevYear}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-semibold transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  {prevYear}
                </Link>
              ) : (
                <span />
              )}

              <span className="px-4 py-1.5 rounded-lg bg-white/20 border border-white/30 text-white text-sm font-bold">
                {yearNum}
              </span>

              {showNext && nextYear <= CURRENT_YEAR ? (
                <Link
                  href={`/maritimo/buques/${canonicalSlug}/historial/${nextYear}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-semibold transition-colors"
                >
                  {nextYear}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

          {/* Annual summary stats */}
          <section
            aria-label={`Resumen de actividad ${yearNum}`}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <AnnualStat
              icon={Navigation}
              label="Viajes"
              value={String(voyages.length)}
              sub={`en ${yearNum}`}
            />
            <AnnualStat
              icon={BarChart3}
              label="Distancia total"
              value={totalNm > 0 ? `${Math.round(totalNm).toLocaleString("es-ES")} nm` : "N/D"}
              sub="recorrida"
            />
            <AnnualStat
              icon={Clock}
              label="Tiempo navegando"
              value={totalH > 0 ? fmtDuration(totalH) : "N/D"}
              sub="acumulado"
            />
            <AnnualStat
              icon={Anchor}
              label="Escalas"
              value={String(portCalls.length)}
              sub="en puertos"
            />
          </section>

          {/* Voyages table */}
          {voyages.length > 0 && (
            <section
              aria-label={`Viajes ${yearNum}`}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-tl-sea-500" />
                  Viajes en {yearNum}
                  <span className="ml-auto text-xs text-gray-400 font-normal">
                    {voyages.length} registrados
                  </span>
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Ruta
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Salida
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                        Llegada
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 hidden md:table-cell">
                        Duracion
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 hidden md:table-cell">
                        Distancia
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {voyages.map((v) => (
                      <tr
                        key={v.id}
                        className="hover:bg-tl-sea-50/20 dark:hover:bg-tl-sea-900/10 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100">
                            <span className="truncate max-w-[100px]">
                              {v.departurePort ?? "—"}
                            </span>
                            <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="truncate max-w-[100px]">
                              {v.arrivalPort ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {v.departedAt ? fmtDate(new Date(v.departedAt)) : "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap hidden sm:table-cell">
                          {v.arrivedAt ? fmtDate(new Date(v.arrivedAt)) : "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300 hidden md:table-cell">
                          {fmtDuration(v.durationH)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300 hidden md:table-cell">
                          {fmtNm(v.distanceNm)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Port calls */}
          {portCalls.length > 0 && (
            <section
              aria-label={`Escalas ${yearNum}`}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Anchor className="w-4 h-4 text-tl-sea-500" />
                  Escalas en {yearNum}
                  <span className="ml-auto text-xs text-gray-400 font-normal">
                    {portCalls.length} registradas
                  </span>
                </h2>
              </div>
              <ol className="divide-y divide-gray-100 dark:divide-gray-800">
                {portCalls.map((pc) => {
                  const isOpen = pc.departedAt === null;
                  return (
                    <li
                      key={pc.id}
                      className="flex items-start gap-4 px-5 py-4 hover:bg-tl-sea-50/20 dark:hover:bg-tl-sea-900/10 transition-colors"
                    >
                      <span
                        className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          isOpen
                            ? "bg-cyan-500 ring-4 ring-cyan-200 dark:ring-cyan-900/40"
                            : "bg-gray-400 dark:bg-gray-600"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {pc.portName ?? pc.portCode ?? "Puerto desconocido"}
                          {isOpen && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-cyan-600 dark:text-cyan-400">
                              En puerto
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                          {fmtDate(pc.arrivedAt)} {fmtTime(pc.arrivedAt)}
                          {pc.departedAt && (
                            <>
                              {" → "}
                              {fmtDate(pc.departedAt)} {fmtTime(pc.departedAt)}
                            </>
                          )}
                        </p>
                      </div>
                      {pc.durationH != null && (
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {fmtDuration(pc.durationH)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {/* Year navigation bottom */}
          <div className="flex justify-between items-center pt-2">
            {showPrev ? (
              <Link
                href={`/maritimo/buques/${canonicalSlug}/historial/${prevYear}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-tl-sea-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Historial {prevYear}
              </Link>
            ) : (
              <span />
            )}
            <Link
              href={`/maritimo/buques/${canonicalSlug}`}
              className="inline-flex items-center gap-2 text-sm text-tl-sea-600 dark:text-tl-sea-400 hover:underline"
            >
              <Ship className="w-4 h-4" />
              Ficha del buque
            </Link>
            {showNext && nextYear <= CURRENT_YEAR ? (
              <Link
                href={`/maritimo/buques/${canonicalSlug}/historial/${nextYear}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-tl-sea-400 transition-colors"
              >
                Historial {nextYear}
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <span />
            )}
          </div>

          <footer className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500 pt-2">
            <Ship className="w-4 h-4 flex-shrink-0" />
            <span>
              Datos derivados de la senal AIS recibida via aisstream.io. Los viajes y escalas
              se detectan automaticamente a partir de posiciones consecutivas y puertos espanoles
              cercanos (10 nm). Archivo del ano {yearNum}.
            </span>
          </footer>
        </main>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// AnnualStat tile
// ---------------------------------------------------------------------------

function AnnualStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Ship;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-tl-sea-500" />
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100 [font-family:var(--font-jetbrains-mono)]">
        {value}
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</div>
    </div>
  );
}
