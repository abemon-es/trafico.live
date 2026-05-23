/**
 * /maritimo/buques/[slug]/recorrido — vessel voyage history
 *
 * Surfaces the Voyage + PortCall tables (493K voyages, 746K port calls
 * already populated by the hourly voyage-detector collector) that the
 * existing /maritimo/buques/[slug] entity page does not render — it
 * only shows the current vessel/position. This sub-page is the
 * durable artifact: every named vessel gets a voyage history.
 *
 * The VesselPosition table will be aggressively purged (72h TTL per
 * iter-2's cleanup-realtime) so the only long-term record of a vessel's
 * past movement lives in Voyage + PortCall. This page is therefore the
 * authoritative "where has this ship been" surface.
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
  Clock,
  MapPin,
  Navigation,
  Compass,
  Calendar,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 3600; // hourly — matches the voyage-detector cadence
export const dynamicParams = true;

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const getVessel = cache(async (mmsi: number) =>
  prisma.vessel.findUnique({ where: { mmsi } }),
);

const getRecentVoyages = cache(async (mmsi: number) =>
  prisma.voyage.findMany({
    where: { mmsi },
    orderBy: { departedAt: "desc" },
    take: 25,
    select: {
      id: true,
      departurePort: true,
      departedAt: true,
      arrivalPort: true,
      arrivedAt: true,
      distanceNm: true,
      durationH: true,
      avgSpeedKn: true,
      status: true,
      positionCount: true,
    },
  }),
);

const getRecentPortCalls = cache(async (mmsi: number) =>
  prisma.portCall.findMany({
    where: { mmsi },
    orderBy: { arrivedAt: "desc" },
    take: 30,
    select: {
      id: true,
      portName: true,
      portCode: true,
      arrivedAt: true,
      departedAt: true,
      durationH: true,
    },
  }),
);

// ---------------------------------------------------------------------------
// Pre-generated set — top 200 vessels with a Voyage row (= proven activity)
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const vessels = await prisma.voyage.findMany({
    distinct: ["mmsi"],
    select: { mmsi: true },
    take: 200,
  });
  if (vessels.length === 0) return [];

  const named = await prisma.vessel.findMany({
    where: { mmsi: { in: vessels.map((v) => v.mmsi) }, name: { not: null } },
    select: { mmsi: true, name: true },
  });
  return named
    .map((v) => vesselSlug(v.mmsi, v.name))
    .filter((s) => s.includes("-"))
    .map((slug) => ({ slug }));
}

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

function fmtKn(kn: number | null | undefined): string {
  if (kn == null) return "—";
  return `${kn.toFixed(1).replace(".", ",")} kn`;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const mmsi = parseVesselSlug(slug);
  if (!mmsi) return { title: "Buque no encontrado" };
  const vessel = await getVessel(mmsi);
  if (!vessel) return { title: "Buque no encontrado" };

  const name = vessel.name ?? `MMSI ${mmsi}`;
  return {
    title: `Recorrido del buque ${name} — Historial de viajes y escalas`,
    description:
      `Historial completo de ${name} (MMSI ${mmsi}): últimos viajes con puertos de salida y llegada, ` +
      `escalas, distancia recorrida, duración y velocidad media. Fuente AIS.`,
    alternates: { canonical: `${BASE_URL}/maritimo/buques/${slug}/recorrido` },
    openGraph: {
      title: `Recorrido de ${name} — Viajes y escalas`,
      description: `Historial AIS de ${name}: viajes con duración, distancia, velocidad y puertos.`,
      url: `${BASE_URL}/maritimo/buques/${slug}/recorrido`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function VesselRecorridoPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const mmsi = parseVesselSlug(slug);
  if (!mmsi) notFound();

  const vessel = await getVessel(mmsi);
  if (!vessel) notFound();

  const [voyages, portCalls] = await Promise.all([
    getRecentVoyages(mmsi),
    getRecentPortCalls(mmsi),
  ]);

  const name = vessel.name ?? `MMSI ${mmsi}`;
  const canonicalSlug = vesselSlug(mmsi, vessel.name);

  // Sum stats across the recent voyage window
  const totalNm = voyages.reduce((a, v) => a + (v.distanceNm ?? 0), 0);
  const totalH = voyages.reduce((a, v) => a + (v.durationH ?? 0), 0);
  const inTransit = voyages.find((v) => v.status === "IN_TRANSIT");

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Marítimo", item: `${BASE_URL}/maritimo` },
      { "@type": "ListItem", position: 3, name: "Buques", item: `${BASE_URL}/maritimo/buques` },
      {
        "@type": "ListItem",
        position: 4,
        name,
        item: `${BASE_URL}/maritimo/buques/${canonicalSlug}`,
      },
      {
        "@type": "ListItem",
        position: 5,
        name: "Recorrido",
        item: `${BASE_URL}/maritimo/buques/${canonicalSlug}/recorrido`,
      },
    ],
  };

  const shipSchema = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    additionalType: "Ship",
    name,
    identifier: String(mmsi),
    ...(vessel.imo && { vehicleIdentificationNumber: String(vessel.imo) }),
    ...(vessel.flag && { fuelType: undefined, brand: { "@type": "Brand", name: vessel.flag } }),
    description:
      `Historial AIS de ${name}: ${voyages.length} viajes registrados, ` +
      `${portCalls.length} escalas portuarias.`,
    url: `${BASE_URL}/maritimo/buques/${canonicalSlug}/recorrido`,
  };

  return (
    <>
      <StructuredData data={[breadcrumbSchema, shipSchema]} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Marítimo", href: "/maritimo" },
              { name: "Buques", href: "/maritimo/buques" },
              { name, href: `/maritimo/buques/${canonicalSlug}` },
              { name: "Recorrido", href: `/maritimo/buques/${canonicalSlug}/recorrido` },
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
                Recorrido AIS
              </span>
              {vessel.flag && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-white border border-white/20">
                  {vessel.flag}
                </span>
              )}
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-white leading-tight">
              {name}
            </h1>
            <p className="mt-2 text-cyan-100 text-sm font-mono">
              MMSI {mmsi}
              {vessel.imo ? ` · IMO ${vessel.imo}` : ""}
              {vessel.callsign ? ` · ${vessel.callsign}` : ""}
            </p>
          </div>
        </section>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

          {/* Summary stats */}
          {voyages.length > 0 && (
            <section
              aria-label="Resumen del recorrido"
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <Stat label="Viajes" value={String(voyages.length)} sub="registrados" icon={Compass} />
              <Stat
                label="Distancia"
                value={fmtNm(totalNm)}
                sub={`en ${voyages.length} viajes`}
                icon={Navigation}
              />
              <Stat label="Tiempo navegado" value={fmtDuration(totalH)} sub="acumulado" icon={Clock} />
              <Stat
                label="Escalas"
                value={String(portCalls.length)}
                sub="recientes"
                icon={Anchor}
              />
            </section>
          )}

          {/* Current voyage banner */}
          {inTransit && (
            <section
              aria-label="Viaje en curso"
              className="rounded-xl border border-cyan-200 bg-cyan-50 dark:bg-cyan-900/10 dark:border-cyan-900/40 p-5"
            >
              <div className="flex items-start gap-3">
                <span className="relative flex h-3 w-3 mt-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
                </span>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide font-semibold text-cyan-700 dark:text-cyan-300">
                    En navegación
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">
                    <span className="font-semibold">{inTransit.departurePort ?? "Origen desconocido"}</span>
                    <ArrowRight className="w-4 h-4 inline mx-1.5 text-cyan-600" />
                    <span className="font-semibold">{inTransit.arrivalPort ?? "Destino aún sin determinar"}</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                    Salida {fmtDate(inTransit.departedAt)} {fmtTime(inTransit.departedAt)}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Voyages */}
          <section
            aria-label="Viajes recientes"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Viajes recientes
            </h2>
            {voyages.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sin viajes detectados aún por la pipeline AIS. Los viajes se calculan a partir
                de las posiciones AIS recibidas; este buque puede no haber atracado en un puerto
                español reciente o estar fuera del bbox español.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {voyages.map((v) => (
                  <li key={v.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        <span>{v.departurePort ?? "—"}</span>
                        <ArrowRight className="w-3 h-3 inline mx-1.5 text-gray-400" />
                        <span>{v.arrivalPort ?? "—"}</span>
                      </p>
                      <span
                        className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full ${
                          v.status === "IN_TRANSIT"
                            ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {v.status === "IN_TRANSIT" ? "En curso" : "Llegado"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-mono">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {fmtDate(v.departedAt)} → {fmtDate(v.arrivedAt)}
                      </span>
                      <span className="font-mono">{fmtDuration(v.durationH)}</span>
                      <span className="font-mono">{fmtNm(v.distanceNm)}</span>
                      <span className="font-mono">{fmtKn(v.avgSpeedKn)}</span>
                      <span className="font-mono text-gray-400 dark:text-gray-500">
                        {v.positionCount} pos
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Port calls */}
          {portCalls.length > 0 && (
            <section
              aria-label="Escalas portuarias"
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
            >
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Anchor className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                Escalas recientes
              </h2>
              <ol className="space-y-0.5">
                {portCalls.map((pc, idx) => {
                  const isOpen = pc.departedAt === null;
                  return (
                    <li key={pc.id} className="flex items-start gap-3 relative pb-3">
                      <div className="flex flex-col items-center flex-shrink-0 pt-1">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isOpen
                              ? "bg-cyan-500 ring-4 ring-cyan-200 dark:ring-cyan-900/40"
                              : "bg-gray-400 dark:bg-gray-600"
                          }`}
                          aria-hidden="true"
                        />
                        {idx < portCalls.length - 1 && (
                          <span
                            className="w-px flex-1 mt-1 bg-gray-200 dark:bg-gray-700"
                            style={{ minHeight: "16px" }}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3 min-w-0 -mt-0.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {pc.portName ?? pc.portCode ?? "Puerto desconocido"}
                            {isOpen && (
                              <span className="ml-2 text-[10px] uppercase tracking-wide text-cyan-600 dark:text-cyan-400">
                                En puerto
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                            {fmtDate(pc.arrivedAt)} {fmtTime(pc.arrivedAt)}
                            {pc.departedAt && (
                              <>
                                {" → "}
                                {fmtDate(pc.departedAt)} {fmtTime(pc.departedAt)}
                              </>
                            )}
                          </p>
                        </div>
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {fmtDuration(pc.durationH)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {/* Cross-links */}
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Más sobre este buque y la red marítima
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Link
                href={`/maritimo/buques/${canonicalSlug}`}
                className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors text-sm"
              >
                <Ship className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                Ficha del buque
              </Link>
              <Link
                href="/maritimo"
                className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors text-sm"
              >
                <MapPin className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                Tráfico marítimo en vivo
              </Link>
              <Link
                href="/maritimo/puertos"
                className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors text-sm"
              >
                <Anchor className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                Puertos
              </Link>
            </div>
          </section>

          <footer className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500 pt-2">
            <Ship className="w-4 h-4 flex-shrink-0" />
            <span>
              Datos derivados de la señal AIS recibida desde aisstream.io. Los viajes y escalas
              se detectan automáticamente cada hora a partir de las posiciones consecutivas y
              los puertos españoles cercanos (≤10 nm).
            </span>
          </footer>
        </main>
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
}: {
  icon: typeof Ship;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-tl-600 dark:text-tl-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</div>
    </div>
  );
}
