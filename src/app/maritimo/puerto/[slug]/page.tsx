/**
 * /maritimo/puerto/[slug] — página de detalle de puerto español.
 *
 * Muestra información del puerto, estadísticas de llegadas/salidas de
 * los últimos 7 días, tipos de buques más frecuentes y rutas conectadas.
 *
 * Fuente: Puertos del Estado + AIS (aisstream.io). 197 puertos españoles.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  Anchor,
  MapPin,
  Ship,
  ArrowRight,
  ArrowRightLeft,
  Calendar,
  Globe,
  Route,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 3600;
export const dynamicParams = true;

// ---------------------------------------------------------------------------
// Port type labels
// ---------------------------------------------------------------------------

const PORT_TYPE_LABELS: Record<string, string> = {
  COMMERCIAL: "Puerto comercial",
  FISHING: "Puerto pesquero",
  SPORTS: "Puerto deportivo",
  MIXED: "Puerto mixto",
  INDUSTRIAL: "Puerto industrial",
  FERRY: "Terminal de ferries",
};

const COASTAL_ZONE_LABELS: Record<string, string> = {
  galicia: "Galicia",
  "cantabrico-occidental": "Cantábrico Occidental",
  "cantabrico-oriental": "Cantábrico Oriental",
  "catalano-balear": "Catalano-Balear",
  valencia: "Valencia",
  alboran: "Alborán",
  estrecho: "Estrecho de Gibraltar",
  canarias: "Canarias",
};

// ---------------------------------------------------------------------------
// Static params — all 197 ports
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  try {
    const ports = await prisma.spanishPort.findMany({
      select: { slug: true },
      orderBy: { slug: "asc" },
    });
    return ports.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getData(slug: string) {
  const port = await prisma.spanishPort.findUnique({ where: { slug } });
  if (!port) return null;

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Port calls in last 7 days — use portName matching since SpanishPort doesn't
  // have a direct PortCall relation (PortCall.portCode → Port.id, not SpanishPort)
  const [recentCalls, ferryRoutes] = await Promise.all([
    prisma.portCall.findMany({
      where: {
        portName: { contains: port.name.split(" ")[0], mode: "insensitive" },
        arrivedAt: { gte: since7d },
      },
      orderBy: { arrivedAt: "desc" },
      take: 20,
      select: {
        id: true,
        mmsi: true,
        arrivedAt: true,
        departedAt: true,
        durationH: true,
        portName: true,
      },
    }),
    // Ferry routes that stop at this port (by port name in stop names)
    prisma.ferryRoute.findMany({
      where: {
        stops: {
          some: {
            stopName: { contains: port.name.split(" ")[0], mode: "insensitive" },
          },
        },
      },
      select: {
        id: true,
        operator: true,
        routeName: true,
        routeId: true,
        stops: {
          select: { stopName: true },
          take: 10,
        },
      },
      take: 5,
    }),
  ]);

  // Arrivals vs departures
  const arrivals = recentCalls.filter((c) => c.arrivedAt >= since7d).length;
  const departures = recentCalls.filter((c) => c.departedAt !== null).length;

  return {
    port,
    recentCalls,
    ferryRoutes,
    arrivals,
    departures,
  };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const port = await prisma.spanishPort.findUnique({
    where: { slug },
    select: { name: true, provinceName: true, type: true },
  });
  if (!port) return { title: "Puerto no encontrado" };

  const typeLabel = PORT_TYPE_LABELS[port.type] ?? "Puerto";
  const title = `${port.name} — ${typeLabel}${port.provinceName ? ` · ${port.provinceName}` : ""}`;
  const description = `Información del ${typeLabel.toLowerCase()} de ${port.name}${port.provinceName ? ` (${port.provinceName})` : ""}. Estadísticas de tráfico marítimo, escalas recientes y rutas de ferry conectadas.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/maritimo/puerto/${slug}` },
    openGraph: { title, description },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PortDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getData(slug);
  if (!data) notFound();

  const { port, recentCalls, ferryRoutes, arrivals, departures } = data;

  const typeLabel = PORT_TYPE_LABELS[port.type] ?? "Puerto";
  const coastalLabel = port.coastalZone
    ? (COASTAL_ZONE_LABELS[port.coastalZone] ?? port.coastalZone)
    : null;

  // JSON-LD
  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: port.name,
    description: `${typeLabel} de ${port.name}${port.provinceName ? ` en ${port.provinceName}` : ""}, España.`,
    url: `${BASE_URL}/maritimo/puerto/${slug}`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: Number(port.latitude),
      longitude: Number(port.longitude),
    },
    ...(port.provinceName
      ? {
          address: {
            "@type": "PostalAddress",
            addressRegion: port.provinceName,
            addressCountry: "ES",
          },
        }
      : {}),
  };

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${Number(port.latitude)},${Number(port.longitude)}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <StructuredData data={placeSchema} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Marítimo", href: "/maritimo" },
            ...(port.provinceName
              ? [{ name: port.provinceName, href: `/maritimo/puertos` }]
              : []),
            { name: port.name, href: `/maritimo/puerto/${slug}` },
          ]}
        />
      </div>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #0c4a6e 100%)" }}
      >
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <Anchor className="w-7 h-7 text-white/90" />
            <span className="font-heading text-white/80 text-xs font-semibold uppercase tracking-widest">
              {typeLabel}
            </span>
            {coastalLabel && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white/70 border border-white/20">
                {coastalLabel}
              </span>
            )}
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-white leading-tight">
            Puerto de {port.name}
          </h1>
          {port.provinceName && (
            <p className="mt-2 text-white/70 text-base flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {port.provinceName}
            </p>
          )}
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Stats row */}
        <section aria-label="Estadísticas 7 días" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-2">
              <ArrowRight className="w-3.5 h-3.5" />
              Llegadas (7d)
            </p>
            <p className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100">
              {arrivals}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-2">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Salidas (7d)
            </p>
            <p className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100">
              {departures}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-2">
              <Ship className="w-3.5 h-3.5" />
              Rutas ferry
            </p>
            <p className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100">
              {ferryRoutes.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-2">
              <Globe className="w-3.5 h-3.5" />
              Estaciones AIS
            </p>
            <p className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100">
              {port.stationCount}
            </p>
          </div>
        </section>

        {/* Port info */}
        <section
          aria-label="Información del puerto"
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Anchor className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Información del puerto
            </h2>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-tl-600 dark:text-tl-400 hover:underline"
            >
              Ver en Google Maps
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Tipo</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{typeLabel}</dd>
            </div>
            {port.provinceName && (
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Provincia</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{port.provinceName}</dd>
              </div>
            )}
            {coastalLabel && (
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Zona costera</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{coastalLabel}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Latitud</dt>
              <dd className="font-mono text-gray-900 dark:text-gray-100">
                {Number(port.latitude).toFixed(5)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Longitud</dt>
              <dd className="font-mono text-gray-900 dark:text-gray-100">
                {Number(port.longitude).toFixed(5)}
              </dd>
            </div>
          </dl>
        </section>

        {/* Recent port calls */}
        {recentCalls.length > 0 && (
          <section
            aria-label="Escalas recientes"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Escalas recientes (últimos 7 días)
            </h2>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left pb-2 text-xs text-gray-500 dark:text-gray-400 font-normal pr-4">
                      MMSI
                    </th>
                    <th className="text-left pb-2 text-xs text-gray-500 dark:text-gray-400 font-normal pr-4">
                      Llegada
                    </th>
                    <th className="text-left pb-2 text-xs text-gray-500 dark:text-gray-400 font-normal pr-4">
                      Salida
                    </th>
                    <th className="text-right pb-2 text-xs text-gray-500 dark:text-gray-400 font-normal">
                      Duración
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {recentCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-gray-50 dark:hover:bg-gray-950/50">
                      <td className="py-2 pr-4 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {call.mmsi}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {call.arrivedAt.toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {call.departedAt
                          ? call.departedAt.toLocaleDateString("es-ES", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="py-2 text-right font-mono text-xs text-gray-700 dark:text-gray-300">
                        {call.durationH !== null ? `${call.durationH.toFixed(1)}h` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3">
              Escalas detectadas por el sistema AIS basado en posicionamiento de buques.
            </p>
          </section>
        )}

        {/* Ferry routes */}
        {ferryRoutes.length > 0 && (
          <section
            aria-label="Rutas de ferry"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Route className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Rutas de ferry que conectan este puerto
            </h2>
            <div className="space-y-3">
              {ferryRoutes.map((route) => (
                <div
                  key={route.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-950"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {route.routeName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {route.operator}
                      {route.stops.length > 0 && (
                        <> · {route.stops.map((s) => s.stopName).join(" → ")}</>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-3" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* No activity */}
        {recentCalls.length === 0 && ferryRoutes.length === 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 text-center">
            <Ship className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sin actividad registrada en los últimos 7 días en este puerto.
            </p>
          </section>
        )}

        {/* Cross-links */}
        <section
          aria-label="Más sobre marítimo"
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
        >
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Más sobre el tráfico marítimo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link
              href="/maritimo"
              className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-sm text-gray-700 dark:text-gray-300"
            >
              <Anchor className="w-4 h-4 text-tl-600 dark:text-tl-400 flex-shrink-0" />
              Mapa marítimo en vivo
            </Link>
            <Link
              href="/maritimo/ferries"
              className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-sm text-gray-700 dark:text-gray-300"
            >
              <Ship className="w-4 h-4 text-tl-600 dark:text-tl-400 flex-shrink-0" />
              Rutas de ferry
            </Link>
            <Link
              href="/maritimo/buques"
              className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-sm text-gray-700 dark:text-gray-300"
            >
              <Ship className="w-4 h-4 text-tl-600 dark:text-tl-400 flex-shrink-0" />
              Directorio de buques
            </Link>
            <Link
              href="/maritimo/zonas"
              className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-sm text-gray-700 dark:text-gray-300"
            >
              <Globe className="w-4 h-4 text-tl-600 dark:text-tl-400 flex-shrink-0" />
              Zonas marítimas
            </Link>
          </div>
        </section>

        {/* Attribution */}
        <footer className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500 pt-2">
          <Anchor className="w-4 h-4 flex-shrink-0" />
          <span>
            Datos: Puertos del Estado (MITMA), AIS via aisstream.io, MobilityData GTFS.
            Escalas detectadas automáticamente por posicionamiento AIS.
          </span>
        </footer>
      </main>
    </div>
  );
}
