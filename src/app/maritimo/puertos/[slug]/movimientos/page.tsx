import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { StructuredData } from "@/components/seo/StructuredData";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  Ship,
  Anchor,
  TrendingUp,
  Clock,
  Flag,
  BarChart3,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";

export const revalidate = 300; // ISR 5 min

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

const getSpanishPort = cache(async (slug: string) => {
  return prisma.spanishPort.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      type: true,
      latitude: true,
      longitude: true,
      province: true,
      provinceName: true,
    },
  });
});

/** Get PortCalls for this port (by name, last 24h) */
const getPortCalls24h = cache(async (portName: string) => {
  const since = new Date(Date.now() - 24 * 3600_000);
  return prisma.portCall.findMany({
    where: {
      arrivedAt: { gte: since },
      portName: { contains: portName, mode: "insensitive" },
    },
    orderBy: { arrivedAt: "desc" },
    take: 100,
  });
});

/** Get vessels currently near the port (last 2h, bounding box ~5km) */
const getCurrentVessels = cache(async (lat: number, lng: number) => {
  const delta = 0.045; // ~5 km
  const since = new Date(Date.now() - 2 * 3600_000);

  return prisma.vesselPosition.findMany({
    where: {
      latitude: { gte: lat - delta, lte: lat + delta },
      longitude: { gte: lng - delta, lte: lng + delta },
      createdAt: { gte: since },
    },
    include: {
      vessel: {
        select: {
          mmsi: true,
          name: true,
          shipType: true,
          flag: true,
          length: true,
          destination: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    distinct: ["mmsi"],
    take: 80,
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shipTypeCategory(shipType: number | null): string {
  if (shipType == null) return "Desconocido";
  if (shipType >= 70 && shipType <= 79) return "Carga";
  if (shipType >= 80 && shipType <= 89) return "Petrolero";
  if (shipType >= 60 && shipType <= 69) return "Pasajeros";
  if (shipType === 30) return "Pesca";
  if (shipType >= 31 && shipType <= 32) return "Remolcador";
  if (shipType >= 36 && shipType <= 37) return "Velero";
  return "Otro";
}

function shipTypeCategoryColor(cat: string): string {
  const map: Record<string, string> = {
    Carga: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    Petrolero: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    Pasajeros: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    Pesca: "bg-tl-sea-100 text-tl-sea-700 dark:bg-tl-sea-900/40 dark:text-tl-sea-300",
    Remolcador: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    Velero: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    Otro: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    Desconocido: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
  };
  return map[cat] ?? map.Otro;
}

function flagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.floor(mins / 60);
  return `hace ${h}h`;
}

/** Compute vessel slug from MMSI + name for linking */
function vesselSlugSimple(mmsi: number, name: string | null): string {
  const n = name
    ? name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    : "";
  return n ? `${n}-${mmsi}` : String(mmsi);
}

// ---------------------------------------------------------------------------
// Static params (generate for all Spanish ports)
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  try {
    const ports = await prisma.spanishPort.findMany({
      select: { slug: true },
    });
    return ports.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const port = await getSpanishPort(slug);
  if (!port) return { title: "Puerto no encontrado" };

  const title = `Barcos en el puerto de ${port.name} ahora — Movimientos AIS | trafico.live`;
  const description = `¿Qué barcos hay en el puerto de ${port.name} ahora mismo? Entradas y salidas en las últimas 24h, tráfico AIS en tiempo real, estadísticas de buques por tipo y bandera.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/maritimo/puertos/${slug}/movimientos`,
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/maritimo/puertos/${slug}/movimientos`,
      type: "website",
      locale: "es_ES",
      siteName: "trafico.live",
    },
  };
}

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

function buildJsonLd(
  port: { name: string; slug: string; latitude: unknown; longitude: unknown; provinceName: string | null },
  vessels: Awaited<ReturnType<typeof getCurrentVessels>>,
  portCalls: Awaited<ReturnType<typeof getPortCalls24h>>
) {
  const lat = Number(port.latitude);
  const lng = Number(port.longitude);

  const placeNode = {
    "@type": "SeaPort",
    "@id": `${BASE_URL}/maritimo/puertos/${port.slug}#seaport`,
    name: `Puerto de ${port.name}`,
    url: `${BASE_URL}/maritimo/puertos/${port.slug}`,
    ...(port.provinceName && {
      address: { "@type": "PostalAddress", addressLocality: port.provinceName, addressCountry: "ES" },
    }),
    geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng },
  };

  const datasetNode = {
    "@type": "Dataset",
    name: `Movimientos de buques en el Puerto de ${port.name}`,
    description: `Registro AIS de entradas, salidas y presencia actual de buques en el Puerto de ${port.name}. Últimas 24 horas.`,
    url: `${BASE_URL}/maritimo/puertos/${port.slug}/movimientos`,
    license: "https://creativecommons.org/licenses/by/4.0/",
    temporalCoverage: "últimas 24h",
    spatialCoverage: {
      "@type": "Place",
      name: `Puerto de ${port.name}`,
      geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng },
    },
    creator: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    variableMeasured: [
      { "@type": "PropertyValue", name: "Buques actualmente en puerto", value: vessels.length },
      { "@type": "PropertyValue", name: "Escalas últimas 24h", value: portCalls.length },
    ],
  };

  const itemListNode = vessels.length > 0
    ? {
        "@type": "ItemList",
        name: `Buques en el Puerto de ${port.name} ahora`,
        numberOfItems: vessels.length,
        itemListElement: vessels.slice(0, 10).map((v, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Vehicle",
            name: v.vessel?.name ?? `MMSI ${v.mmsi}`,
            identifier: { "@type": "PropertyValue", propertyID: "MMSI", value: v.mmsi },
            ...(v.vessel?.flag && {
              countryOfOrigin: { "@type": "Country", name: v.vessel.flag },
            }),
          },
        })),
      }
    : null;

  const nodes = itemListNode
    ? [placeNode, datasetNode, itemListNode]
    : [placeNode, datasetNode];

  return { "@context": "https://schema.org", "@graph": nodes };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PortMovimientosPage({ params }: Props) {
  const { slug } = await params;
  const port = await getSpanishPort(slug);
  if (!port) notFound();

  const lat = Number(port.latitude);
  const lng = Number(port.longitude);

  const [vessels, portCalls] = await Promise.all([
    getCurrentVessels(lat, lng),
    getPortCalls24h(port.name),
  ]);

  // ---- Aggregations ----

  // Type breakdown for current vessels
  const byType: Record<string, number> = {};
  for (const v of vessels) {
    const cat = shipTypeCategory(v.vessel?.shipType ?? null);
    byType[cat] = (byType[cat] ?? 0) + 1;
  }
  const typeEntries = Object.entries(byType).sort(([, a], [, b]) => b - a);

  // Flag breakdown
  const byFlag: Record<string, number> = {};
  for (const v of vessels) {
    const f = v.vessel?.flag ?? "??";
    byFlag[f] = (byFlag[f] ?? 0) + 1;
  }
  const topFlags = Object.entries(byFlag)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Average length
  const lengths = vessels
    .map((v) => v.vessel?.length)
    .filter((l): l is number => l != null && l > 0);
  const avgLength = lengths.length > 0
    ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
    : null;

  // Port calls: split arrivals vs departures
  const arrivals = portCalls.filter((pc) => pc.arrivedAt);
  const departures24h = portCalls.filter((pc) => pc.departedAt);

  return (
    <>
      <StructuredData data={buildJsonLd(port, vessels, portCalls)} />

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-gradient-to-br from-tl-sea-700 via-tl-sea-600 to-tl-sea-500 text-white">
        <div className="max-w-5xl mx-auto px-4 py-10 sm:py-12">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Marítimo", href: "/maritimo" },
              { name: "Puertos", href: "/maritimo/puertos" },
              { name: port.name, href: `/maritimo/puertos/${slug}` },
              { name: "Movimientos", href: `/maritimo/puertos/${slug}/movimientos` },
            ]}
          />

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <Anchor className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="text-tl-sea-200 text-sm font-medium">Puerto de {port.name}</div>
                <h1 className="text-2xl sm:text-3xl font-heading font-bold">
                  Barcos en tiempo real
                </h1>
                <p className="text-tl-sea-100 text-sm mt-0.5">
                  Qué hay ahora mismo en el puerto · Entradas y salidas 24h
                </p>
              </div>
            </div>

            <Link
              href={`/maritimo/puertos/${slug}`}
              className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-colors"
            >
              <Anchor className="w-4 h-4" />
              Info del puerto
            </Link>
          </div>

          {/* Stats bar */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 rounded-xl p-3.5">
              <div className="text-xs text-tl-sea-100">Buques ahora</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                </span>
                <span className="font-mono font-bold text-lg tabular-nums">{vessels.length}</span>
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-3.5">
              <div className="text-xs text-tl-sea-100">Escalas 24h</div>
              <div className="font-mono font-bold text-lg tabular-nums mt-0.5">{portCalls.length}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3.5">
              <div className="text-xs text-tl-sea-100">Salidas 24h</div>
              <div className="font-mono font-bold text-lg tabular-nums mt-0.5">{departures24h.length}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3.5">
              <div className="text-xs text-tl-sea-100">Eslora media</div>
              <div className="font-mono font-bold text-lg tabular-nums mt-0.5">
                {avgLength ? `${avgLength} m` : "N/D"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* ================================================================= */}
        {/* SECTION: Type + flag stats                                        */}
        {/* ================================================================= */}
        {(typeEntries.length > 0 || topFlags.length > 0) && (
          <section>
            <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-tl-sea-500" />
              Composición actual de la flota
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* By type */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Por tipo de buque
                </div>
                <div className="space-y-2">
                  {typeEntries.map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${shipTypeCategoryColor(cat)}`}>
                        {cat}
                      </span>
                      <span className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* By flag */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Banderas más frecuentes
                </div>
                <div className="space-y-2">
                  {topFlags.map(([flag, count]) => (
                    <div key={flag} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                        <span className="text-lg">{flagEmoji(flag)}</span>
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{flag}</span>
                      </span>
                      <span className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* SECTION: Current vessels                                          */}
        {/* ================================================================= */}
        <section>
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Ship className="w-5 h-5 text-tl-sea-500" />
            Buques en el puerto ahora
            {vessels.length > 0 && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                ({vessels.length})
              </span>
            )}
          </h2>

          {vessels.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
              <Ship className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
              <p>Sin señal AIS reciente en la zona del puerto.</p>
              <p className="text-xs mt-1">El radio de cobertura es de ~5 km desde el centro del puerto.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {vessels.map((v) => {
                const cat = shipTypeCategory(v.vessel?.shipType ?? null);
                const vslug = vesselSlugSimple(v.mmsi, v.vessel?.name ?? null);
                return (
                  <Link
                    key={v.mmsi}
                    href={`/maritimo/buques/${vslug}`}
                    className="group flex flex-wrap items-center gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 hover:border-tl-sea-400 dark:hover:border-tl-sea-600 hover:shadow-sm transition-all"
                  >
                    {v.vessel?.flag && (
                      <span className="text-xl flex-shrink-0" title={v.vessel.flag}>
                        {flagEmoji(v.vessel.flag)}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate group-hover:text-tl-sea-700 dark:group-hover:text-tl-sea-300 transition-colors">
                        {v.vessel?.name ?? `MMSI ${v.mmsi}`}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${shipTypeCategoryColor(cat)}`}>
                          {cat}
                        </span>
                        {v.vessel?.length && (
                          <span className="font-mono text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                            {v.vessel.length} m
                          </span>
                        )}
                        {v.vessel?.destination && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-0.5 truncate">
                            <Flag className="w-2.5 h-2.5 flex-shrink-0" />
                            {v.vessel.destination}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                      <span className="font-mono tabular-nums">{timeAgo(v.createdAt)}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-tl-sea-500 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {vessels.length > 0 && (
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-600">
              Posiciones AIS en las últimas 2 horas. Radio ~5 km del centro del puerto. Fuente: aisstream.io
            </p>
          )}
        </section>

        {/* ================================================================= */}
        {/* SECTION: Last 24h Port Calls                                      */}
        {/* ================================================================= */}
        <section>
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-tl-sea-500" />
            Escalas en las últimas 24h
            {portCalls.length > 0 && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                ({portCalls.length})
              </span>
            )}
          </h2>

          {portCalls.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
              <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
              <p>Sin escalas registradas en las últimas 24 horas.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        Tipo
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        MMSI
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        Llegada
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        Salida
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        Duración
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {portCalls.slice(0, 40).map((pc) => {
                      const isArrival = !pc.departedAt;
                      return (
                        <tr
                          key={pc.id}
                          className="hover:bg-tl-sea-50/50 dark:hover:bg-tl-sea-900/10 transition-colors"
                        >
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${isArrival ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                              {isArrival ? (
                                <><ArrowDownLeft className="w-3 h-3" /> Escala</>
                              ) : (
                                <><ArrowUpRight className="w-3 h-3" /> Completada</>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <Link
                              href={`/maritimo/buques/${pc.mmsi}`}
                              className="font-mono text-xs text-tl-sea-600 dark:text-tl-sea-400 hover:underline tabular-nums"
                            >
                              {pc.mmsi}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-700 dark:text-gray-300 tabular-nums whitespace-nowrap">
                            {pc.arrivedAt
                              ? pc.arrivedAt.toLocaleTimeString("es-ES", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: "Europe/Madrid",
                                })
                              : "—"}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-700 dark:text-gray-300 tabular-nums whitespace-nowrap">
                            {pc.departedAt
                              ? pc.departedAt.toLocaleTimeString("es-ES", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: "Europe/Madrid",
                                })
                              : <span className="text-green-600 dark:text-green-400">En puerto</span>}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                            {pc.durationH != null
                              ? pc.durationH < 1
                                ? `${Math.round(pc.durationH * 60)} min`
                                : `${pc.durationH.toFixed(1)} h`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {portCalls.length > 40 && (
                <div className="px-4 py-3 text-xs text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-800/30 text-center">
                  Mostrando 40 de {portCalls.length} escalas
                </div>
              )}
            </div>
          )}
        </section>

        {/* ================================================================= */}
        {/* Attribution + nav                                                 */}
        {/* ================================================================= */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/maritimo/puertos/${slug}`}
            className="inline-flex items-center gap-2 text-tl-sea-600 dark:text-tl-sea-400 hover:text-tl-sea-700 dark:hover:text-tl-sea-300 text-sm font-medium transition-colors"
          >
            <Anchor className="w-4 h-4" />
            Puerto de {port.name}
          </Link>
          <Link
            href="/maritimo/mapa"
            className="inline-flex items-center gap-2 text-tl-sea-600 dark:text-tl-sea-400 hover:text-tl-sea-700 dark:hover:text-tl-sea-300 text-sm font-medium transition-colors"
          >
            <Ship className="w-4 h-4" />
            Radar AIS global
          </Link>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
          Datos AIS vía aisstream.io. Escalas detectadas por voyage-detector (radio 10 nm).
          Actualización cada 5 minutos.
        </p>
      </div>
    </>
  );
}
