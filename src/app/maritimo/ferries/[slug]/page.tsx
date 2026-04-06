import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import {
  Ship,
  Anchor,
  Clock,
  Calendar,
  MapPin,
  Navigation,
  ArrowRight,
  Waves,
  ChevronRight,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Slug helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------------------------------------------------------------------------
// Data fetching (cached per request)
// ---------------------------------------------------------------------------

const getAllRoutes = cache(async () => {
  return prisma.ferryRoute.findMany({
    select: {
      id: true,
      operator: true,
      routeName: true,
      routeColor: true,
    },
  });
});

const getRouteBySlug = cache(async (slug: string) => {
  const allRoutes = await getAllRoutes();
  const matched = allRoutes.find(
    (r) => `${slugify(r.operator)}-${slugify(r.routeName)}` === slug
  );

  if (!matched) {
    // Fallback: try slug as cuid
    const byId = await prisma.ferryRoute.findUnique({
      where: { id: slug },
      include: {
        stops: { orderBy: { stopName: "asc" } },
        trips: { orderBy: [{ serviceDay: "asc" }, { departsAt: "asc" }] },
      },
    });
    return byId;
  }

  return prisma.ferryRoute.findUnique({
    where: { id: matched.id },
    include: {
      stops: { orderBy: { stopName: "asc" } },
      trips: { orderBy: [{ serviceDay: "asc" }, { departsAt: "asc" }] },
    },
  });
});

/**
 * Try to match a FerryStop name to a SpanishPort slug for linking.
 */
const getPortSlugs = cache(async () => {
  const ports = await prisma.spanishPort.findMany({
    select: { slug: true, name: true },
  });
  const map = new Map<string, string>();
  for (const p of ports) {
    map.set(p.name.toLowerCase(), p.slug);
  }
  return map;
});

// ---------------------------------------------------------------------------
// Static params
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const routes = await getAllRoutes();
  return routes.map((r) => ({
    slug: `${slugify(r.operator)}-${slugify(r.routeName)}`,
  }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const route = await getRouteBySlug(slug);

  if (!route) {
    return { title: "Ruta de ferry no encontrada" };
  }

  const title = `Ferry ${route.operator} ${route.routeName} — Horarios y paradas`;
  const description = `Horarios, paradas y mapa de la ruta de ferry ${route.routeName} operada por ${route.operator}. ${route.stops.length} paradas, ${route.trips.length} servicios programados.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/maritimo/ferries/${slug}`,
    },
    openGraph: {
      title: `${title} | trafico.live`,
      description,
      url: `${BASE_URL}/maritimo/ferries/${slug}`,
      type: "website",
      locale: "es_ES",
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse routeName into origin/destination if it has a separator */
function parseOriginDestination(routeName: string): {
  origin: string;
  destination: string;
} | null {
  // Common separators: " - ", " – ", " → ", " > "
  const separators = [" - ", " – ", " — ", " → ", " > "];
  for (const sep of separators) {
    if (routeName.includes(sep)) {
      const parts = routeName.split(sep);
      if (parts.length >= 2) {
        return {
          origin: parts[0].trim(),
          destination: parts.slice(1).join(sep).trim(),
        };
      }
    }
  }
  return null;
}

/** Group trips by serviceDay */
function groupTripsByDay(
  trips: { tripId: string; headsign: string | null; departsAt: string | null; arrivesAt: string | null; serviceDay: string | null }[]
): Map<string, typeof trips> {
  const map = new Map<string, typeof trips>();
  for (const trip of trips) {
    const day = trip.serviceDay || "Sin especificar";
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(trip);
  }
  return map;
}

/** Format a serviceDay code into a human-readable label */
function formatServiceDay(day: string): string {
  const labels: Record<string, string> = {
    monday: "Lunes",
    tuesday: "Martes",
    wednesday: "Miércoles",
    thursday: "Jueves",
    friday: "Viernes",
    saturday: "Sábado",
    sunday: "Domingo",
    weekdays: "Lunes a viernes",
    weekends: "Fines de semana",
    daily: "Todos los días",
    "Sin especificar": "Horario general",
  };
  // Try lowercase match
  const lower = day.toLowerCase();
  if (labels[lower]) return labels[lower];
  // If it looks like a date (YYYYMMDD or YYYY-MM-DD), format it
  const dateMatch = day.match(/^(\d{4})-?(\d{2})-?(\d{2})$/);
  if (dateMatch) {
    const [, y, m, d] = dateMatch;
    return new Date(`${y}-${m}-${d}`).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return day;
}

/** Try to find a SpanishPort slug that matches a stop name */
function findPortSlug(
  stopName: string,
  portMap: Map<string, string>
): string | null {
  const lower = stopName.toLowerCase();
  // Exact match
  if (portMap.has(lower)) return portMap.get(lower)!;
  // Try removing "puerto de " prefix
  const cleaned = lower.replace(/^puerto\s+de\s+/i, "");
  if (portMap.has(cleaned)) return portMap.get(cleaned)!;
  // Partial match — if stopName contains a port name
  for (const [portName, portSlug] of portMap) {
    if (lower.includes(portName) || portName.includes(lower)) {
      return portSlug;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function FerryRouteDetailPage({ params }: Props) {
  const { slug } = await params;
  const route = await getRouteBySlug(slug);

  if (!route) {
    notFound();
  }

  const portMap = await getPortSlugs();
  const allRoutes = await getAllRoutes();

  // Count routes by same operator
  const operatorRouteCount = allRoutes.filter(
    (r) => r.operator === route.operator
  ).length;

  const parsed = parseOriginDestination(route.routeName);
  const displayName = parsed
    ? `${parsed.origin} \u2192 ${parsed.destination}`
    : route.routeName;

  const tripsByDay = groupTripsByDay(route.trips);

  // Compute bounding box from stops for potential map reference
  const stopsWithCoords = route.stops.map((s) => ({
    ...s,
    lat: Number(s.latitude),
    lon: Number(s.longitude),
  }));

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BusTrip",
    name: `Ferry ${route.operator} ${route.routeName}`,
    description: `Ruta de ferry ${route.routeName} operada por ${route.operator}`,
    provider: {
      "@type": "Organization",
      name: route.operator,
    },
    ...(parsed && {
      departureStation: {
        "@type": "BusStation",
        name: parsed.origin,
      },
      arrivalStation: {
        "@type": "BusStation",
        name: parsed.destination,
      },
    }),
    ...(stopsWithCoords.length > 0 && {
      itinerary: {
        "@type": "ItemList",
        itemListElement: stopsWithCoords.map((s, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Place",
            name: s.stopName,
            geo: {
              "@type": "GeoCoordinates",
              latitude: s.lat,
              longitude: s.lon,
            },
          },
        })),
      },
    }),
    url: `${BASE_URL}/maritimo/ferries/${slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* ================================================================ */}
        {/* Hero                                                             */}
        {/* ================================================================ */}
        <div className="bg-gradient-to-br from-tl-sea-700 via-tl-sea-600 to-tl-sea-500 text-white">
          <div className="max-w-5xl mx-auto px-4 py-10 sm:py-12">
            <Breadcrumbs
              items={[
                { name: "Inicio", href: "/" },
                { name: "Marítimo", href: "/maritimo" },
                { name: "Ferries", href: "/maritimo/ferries" },
                { name: route.operator, href: `/maritimo/ferries?operator=${slugify(route.operator)}` },
                { name: route.routeName, href: `/maritimo/ferries/${slug}` },
              ]}
            />

            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Ship className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {route.routeColor && (
                      <span
                        className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: `#${route.routeColor.replace("#", "")}` }}
                      />
                    )}
                    <span className="text-sm font-medium text-tl-sea-200">
                      {route.operator}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-heading font-bold">
                    {displayName}
                  </h1>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/10 rounded-xl p-3.5">
                <div className="text-xs text-tl-sea-100">Operador</div>
                <div className="font-heading font-bold text-lg mt-0.5 truncate">
                  {route.operator}
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3.5">
                <div className="text-xs text-tl-sea-100">Paradas</div>
                <div className="font-data font-bold text-lg tabular-nums mt-0.5">
                  {route.stops.length}
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3.5">
                <div className="text-xs text-tl-sea-100">Servicios</div>
                <div className="font-data font-bold text-lg tabular-nums mt-0.5">
                  {route.trips.length}
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3.5">
                <div className="text-xs text-tl-sea-100">Días de servicio</div>
                <div className="font-data font-bold text-lg tabular-nums mt-0.5">
                  {tripsByDay.size}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
          {/* ============================================================== */}
          {/* Route Map (static representation)                              */}
          {/* ============================================================== */}
          {route.geometry && stopsWithCoords.length > 0 && (
            <section aria-label="Mapa de la ruta">
              <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-tl-sea-500" />
                Mapa de la ruta
              </h2>
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                  {route.routeColor && (
                    <span
                      className="inline-block w-4 h-1.5 rounded-full"
                      style={{ backgroundColor: `#${route.routeColor.replace("#", "")}` }}
                    />
                  )}
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Recorrido con {stopsWithCoords.length} parada{stopsWithCoords.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-2">
                  {stopsWithCoords.map((stop, index) => {
                    const portSlug = findPortSlug(stop.stopName, portMap);
                    const isFirst = index === 0;
                    const isLast = index === stopsWithCoords.length - 1;

                    return (
                      <div key={stop.stopId} className="flex items-start gap-3">
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                          <div
                            className={`w-3 h-3 rounded-full border-2 ${
                              isFirst || isLast
                                ? "bg-tl-sea-500 border-tl-sea-500"
                                : "bg-white dark:bg-gray-900 border-tl-sea-400"
                            }`}
                          />
                          {!isLast && (
                            <div className="w-0.5 h-6 bg-tl-sea-200 dark:bg-tl-sea-800 mt-0.5" />
                          )}
                        </div>
                        {/* Stop info */}
                        <div className="min-w-0 pb-2">
                          {portSlug ? (
                            <Link
                              href={`/maritimo/puertos/${portSlug}`}
                              className="font-semibold text-gray-900 dark:text-gray-100 hover:text-tl-sea-600 dark:hover:text-tl-sea-400 transition-colors"
                            >
                              {stop.stopName}
                            </Link>
                          ) : (
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {stop.stopName}
                            </span>
                          )}
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            <span className="font-mono tabular-nums">
                              {stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* ============================================================== */}
          {/* Stops (if no geometry, show stops standalone)                   */}
          {/* ============================================================== */}
          {!route.geometry && stopsWithCoords.length > 0 && (
            <section aria-label="Paradas">
              <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Anchor className="w-5 h-5 text-tl-sea-500" />
                Paradas
              </h2>
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                {stopsWithCoords.map((stop) => {
                  const portSlug = findPortSlug(stop.stopName, portMap);
                  return (
                    <div
                      key={stop.stopId}
                      className="flex items-center justify-between gap-3 px-5 py-4"
                    >
                      <div className="min-w-0">
                        {portSlug ? (
                          <Link
                            href={`/maritimo/puertos/${portSlug}`}
                            className="font-semibold text-gray-900 dark:text-gray-100 hover:text-tl-sea-600 dark:hover:text-tl-sea-400 transition-colors"
                          >
                            {stop.stopName}
                          </Link>
                        ) : (
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {stop.stopName}
                          </span>
                        )}
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span className="font-mono tabular-nums">
                            {stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
                          </span>
                        </div>
                      </div>
                      {portSlug && (
                        <Link
                          href={`/maritimo/puertos/${portSlug}`}
                          className="flex items-center gap-1 text-sm text-tl-sea-600 dark:text-tl-sea-400 hover:underline flex-shrink-0"
                        >
                          Ver puerto <ChevronRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ============================================================== */}
          {/* Schedule table                                                  */}
          {/* ============================================================== */}
          {route.trips.length > 0 && (
            <section aria-label="Horarios">
              <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-tl-sea-500" />
                Horarios
              </h2>

              <div className="space-y-6">
                {Array.from(tripsByDay.entries()).map(([day, trips]) => (
                  <div key={day}>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-tl-sea-400" />
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        {formatServiceDay(day)}
                      </h3>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        ({trips.length} servicio{trips.length !== 1 ? "s" : ""})
                      </span>
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50">
                              <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                                Salida
                              </th>
                              <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                                Llegada
                              </th>
                              {trips.some((t) => t.headsign) && (
                                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                                  Destino
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {trips.map((trip) => (
                              <tr
                                key={trip.tripId}
                                className="hover:bg-tl-sea-50 dark:hover:bg-tl-sea-900/20 transition-colors"
                              >
                                <td className="px-4 py-3">
                                  <span className="font-mono font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                                    {trip.departsAt ?? "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="font-mono font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                                    {trip.arrivesAt ?? "—"}
                                  </span>
                                </td>
                                {trips.some((t) => t.headsign) && (
                                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                    {trip.headsign ?? "—"}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {route.trips.length === 0 && (
            <section aria-label="Horarios">
              <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-tl-sea-500" />
                Horarios
              </h2>
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center">
                <Calendar className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No hay horarios programados disponibles para esta ruta.
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Consulta directamente con {route.operator} para horarios actualizados.
                </p>
              </div>
            </section>
          )}

          {/* ============================================================== */}
          {/* Operator info                                                   */}
          {/* ============================================================== */}
          <section aria-label="Operador">
            <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Ship className="w-5 h-5 text-tl-sea-500" />
              Operador
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--color-tl-sea-100)" }}
                >
                  <Ship className="w-6 h-6 text-tl-sea-600 dark:text-tl-sea-400" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-gray-900 dark:text-gray-100 text-lg">
                    {route.operator}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {operatorRouteCount} ruta{operatorRouteCount !== 1 ? "s" : ""} disponible{operatorRouteCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* Other routes by same operator */}
              {operatorRouteCount > 1 && (
                <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Otras rutas de {route.operator}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {allRoutes
                      .filter(
                        (r) =>
                          r.operator === route.operator && r.id !== route.id
                      )
                      .slice(0, 8)
                      .map((r) => {
                        const rSlug = `${slugify(r.operator)}-${slugify(r.routeName)}`;
                        return (
                          <Link
                            key={r.id}
                            href={`/maritimo/ferries/${rSlug}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tl-sea-50 dark:bg-tl-sea-900/30 text-tl-sea-700 dark:text-tl-sea-300 text-sm font-medium hover:bg-tl-sea-100 dark:hover:bg-tl-sea-900/50 transition-colors"
                          >
                            {r.routeColor && (
                              <span
                                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: `#${r.routeColor.replace("#", "")}` }}
                              />
                            )}
                            {r.routeName}
                          </Link>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ============================================================== */}
          {/* Maritime weather link                                           */}
          {/* ============================================================== */}
          {stopsWithCoords.length > 0 && (
            <section aria-label="Meteorología marítima">
              <div className="bg-gradient-to-r from-tl-sea-50 to-tl-sea-100 dark:from-tl-sea-900/30 dark:to-tl-sea-800/20 rounded-2xl border border-tl-sea-200 dark:border-tl-sea-800 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-tl-sea-200 dark:bg-tl-sea-800 flex items-center justify-center flex-shrink-0">
                    <Waves className="w-6 h-6 text-tl-sea-700 dark:text-tl-sea-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold text-gray-900 dark:text-gray-100 text-lg">
                      Meteorología costera
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Consulta las previsiones de viento, oleaje y visibilidad en las zonas
                      costeras cercanas a las paradas de esta ruta antes de embarcar.
                    </p>
                    <Link
                      href="/maritimo/meteorologia"
                      className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-tl-sea-600 hover:bg-tl-sea-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Waves className="w-4 h-4" />
                      Ver meteorología costera
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Data attribution */}
          <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
            Datos de horarios y paradas obtenidos de fuentes GTFS públicas ({route.operator}).
            Horarios orientativos — confirma con la naviera antes de embarcar.
          </p>

          {/* Back link */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <Link
              href="/maritimo"
              className="inline-flex items-center gap-2 text-tl-sea-600 dark:text-tl-sea-400 hover:text-tl-sea-700 dark:hover:text-tl-sea-300 text-sm font-medium transition-colors"
            >
              <Anchor className="w-4 h-4" />
              Volver al portal marítimo
            </Link>
          </div>

          <RelatedLinks
            links={[
              {
                title: "Puertos de España",
                description:
                  "Directorio de puertos comerciales, deportivos y pesqueros",
                href: "/maritimo/puertos",
                icon: <Anchor className="w-5 h-5" />,
              },
              {
                title: "Mapa marítimo",
                description:
                  "Visualización de buques, estaciones y puertos en tiempo real",
                href: "/maritimo/mapa",
                icon: <MapPin className="w-5 h-5" />,
              },
              {
                title: "Meteorología costera",
                description:
                  "Previsiones meteorológicas para navegación costera",
                href: "/maritimo/meteorologia",
                icon: <Waves className="w-5 h-5" />,
              },
              {
                title: "Combustible marítimo",
                description:
                  "Precios de combustible náutico en puertos españoles",
                href: "/maritimo/combustible",
                icon: <Ship className="w-5 h-5" />,
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
