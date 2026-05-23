/**
 * /transporte-publico/[operator]/[route] — per-route entity page.
 *
 * One page per public-transport route: line name, color, mode, full
 * stop sequence per direction with arrival schedules, operator info,
 * map link. Pulls from the same GTFS tables that already feed
 * /transporte-publico/[operator] (TransitRoute + TransitTrip +
 * TransitStopTime + TransitStop) so no new collection is needed —
 * this surfaces data that was loaded but never rendered.
 *
 * Matches the user vision: any bus / metro / tram line gets a real
 * landing with stops, hours, map, and cross-links.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { slugify } from "@/lib/geo/slugify";
import {
  Bus,
  TrainFront,
  Tram,
  Ship,
  ArrowRight,
  MapPin,
  Clock,
  Building2,
  ChevronRight,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 86400;
export const dynamicParams = true;

// GTFS route_type → spanish label + icon component name + Schema.org type
const ROUTE_TYPE: Record<number, { label: string; icon: typeof Bus; schema: string }> = {
  0: { label: "Tranvía",       icon: Tram,       schema: "TouristTrip" },
  1: { label: "Metro",         icon: TrainFront, schema: "TouristTrip" },
  2: { label: "Tren",          icon: TrainFront, schema: "TrainTrip" },
  3: { label: "Autobús",       icon: Bus,        schema: "BusTrip" },
  4: { label: "Ferry",         icon: Ship,       schema: "TouristTrip" },
  5: { label: "Tranvía",       icon: Tram,       schema: "TouristTrip" },
  6: { label: "Teleférico",    icon: Tram,       schema: "TouristTrip" },
  7: { label: "Funicular",     icon: Tram,       schema: "TouristTrip" },
  11: { label: "Trolebús",     icon: Bus,        schema: "BusTrip" },
  12: { label: "Monorraíl",    icon: TrainFront, schema: "TrainTrip" },
};

type Props = { params: Promise<{ operator: string; route: string }> };

// ---------------------------------------------------------------------------
// Resolver — same pattern as the parent /[operator] page
// ---------------------------------------------------------------------------

async function resolveOperator(slug: string) {
  let op = await prisma.transitOperator.findUnique({
    where: { mdbId: slug },
    select: { id: true, mdbId: true, name: true, city: true, province: true, mode: true },
  });
  if (!op) {
    const all = await prisma.transitOperator.findMany({
      select: { id: true, mdbId: true, name: true, city: true, province: true, mode: true },
    });
    const match = all.find((o) => slugify(o.name) === slug);
    if (match) op = match;
  }
  return op;
}

async function getRouteData(operatorId: string, routeId: string) {
  const route = await prisma.transitRoute.findUnique({
    where: { operatorId_routeId: { operatorId, routeId } },
  });
  if (!route) return null;

  // Pull a representative trip per direction. Some feeds don't use
  // directionId — accept that and just render whatever trips exist.
  const trips = await prisma.transitTrip.findMany({
    where: { operatorId, routeId },
    take: 200,
    select: { tripId: true, headsign: true, directionId: true, shapeId: true },
  });

  // Pick at most one trip per direction (0, 1, null)
  const seenDirections = new Set<string>();
  const picked: typeof trips = [];
  for (const t of trips) {
    const key = String(t.directionId ?? "none");
    if (!seenDirections.has(key)) {
      seenDirections.add(key);
      picked.push(t);
      if (picked.length >= 2) break;
    }
  }
  if (picked.length === 0) return { route, directions: [] as DirectionDetail[] };

  // Fetch stop_times for picked trips, join stops by stopId
  const stopTimes = await prisma.transitStopTime.findMany({
    where: {
      operatorId,
      tripId: { in: picked.map((p) => p.tripId) },
    },
    orderBy: [{ tripId: "asc" }, { stopSequence: "asc" }],
    select: { tripId: true, stopId: true, arrivalTime: true, stopSequence: true },
  });

  const allStopIds = Array.from(new Set(stopTimes.map((s) => s.stopId)));
  const stops = await prisma.transitStop.findMany({
    where: { operatorId, stopId: { in: allStopIds } },
    select: { stopId: true, stopName: true, latitude: true, longitude: true },
  });
  const stopMap = new Map(stops.map((s) => [s.stopId, s]));

  const directions: DirectionDetail[] = picked.map((t) => {
    const seq = stopTimes
      .filter((st) => st.tripId === t.tripId)
      .sort((a, b) => a.stopSequence - b.stopSequence)
      .map((st) => {
        const stop = stopMap.get(st.stopId);
        return {
          stopId: st.stopId,
          name: stop?.stopName ?? st.stopId,
          time: st.arrivalTime,
        };
      });
    return {
      directionId: t.directionId,
      headsign: t.headsign,
      stops: seq,
    };
  });

  return { route, directions };
}

interface DirectionDetail {
  directionId: number | null;
  headsign: string | null;
  stops: Array<{ stopId: string; name: string; time: string }>;
}

// ---------------------------------------------------------------------------
// Static params — pre-generate top 200 routes (by ingested operator order)
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const routes = await prisma.transitRoute.findMany({
    select: {
      routeId: true,
      operator: { select: { mdbId: true, name: true } },
    },
    take: 200,
    orderBy: { id: "asc" },
  });
  return routes.map((r) => ({
    operator: slugify(r.operator.name),
    route: r.routeId,
  }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { operator, route } = await params;
  const op = await resolveOperator(operator);
  if (!op) return { title: "Operador no encontrado" };
  const data = await getRouteData(op.id, route);
  if (!data) return { title: "Línea no encontrada" };
  const { route: r } = data;

  const rt = ROUTE_TYPE[r.routeType] ?? ROUTE_TYPE[3];
  const name = r.shortName ?? r.longName ?? route;
  const longName = r.longName ?? "";
  const title = `${rt.label} ${name}${longName && longName !== name ? ` — ${longName}` : ""} · ${op.name}`;
  const description =
    `Línea ${name} de ${op.name}${op.city ? ` en ${op.city}` : ""}. ` +
    `Recorrido completo, paradas, horarios y conexiones del ${rt.label.toLowerCase()}.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/transporte-publico/${slugify(op.name)}/${encodeURIComponent(route)}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/transporte-publico/${slugify(op.name)}/${encodeURIComponent(route)}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TransitRoutePage({ params }: Props) {
  const { operator, route } = await params;
  const op = await resolveOperator(operator);
  if (!op) notFound();
  const data = await getRouteData(op.id, route);
  if (!data) notFound();
  const { route: r, directions } = data;

  const rt = ROUTE_TYPE[r.routeType] ?? ROUTE_TYPE[3];
  const Icon = rt.icon;
  const heroColor = r.routeColor ? `#${r.routeColor}` : "#1e40af";
  const shortName = r.shortName ?? "";
  const longName = r.longName ?? "";
  const displayName = shortName || longName || route;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Transporte público", item: `${BASE_URL}/transporte-publico` },
      {
        "@type": "ListItem",
        position: 3,
        name: op.name,
        item: `${BASE_URL}/transporte-publico/${slugify(op.name)}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: `${rt.label} ${displayName}`,
        item: `${BASE_URL}/transporte-publico/${slugify(op.name)}/${encodeURIComponent(route)}`,
      },
    ],
  };

  const tripSchema = {
    "@context": "https://schema.org",
    "@type": rt.schema,
    name: `${rt.label} ${displayName} — ${op.name}`,
    description:
      `Recorrido y paradas de la línea ${displayName} del operador ${op.name}` +
      (op.city ? ` en ${op.city}` : "") +
      ".",
    provider: { "@type": "Organization", name: op.name },
    ...(directions[0]?.stops?.length && {
      itinerary: directions[0].stops.map((s, idx) => ({
        "@type": "Place",
        name: s.name,
        position: idx + 1,
      })),
    }),
  };

  return (
    <>
      <StructuredData data={[breadcrumbSchema, tripSchema]} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Transporte público", href: "/transporte-publico" },
              { name: op.name, href: `/transporte-publico/${slugify(op.name)}` },
              {
                name: `${rt.label} ${displayName}`,
                href: `/transporte-publico/${slugify(op.name)}/${encodeURIComponent(route)}`,
              },
            ]}
          />
        </div>

        <section
          className="relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, #0f172a 0%, ${heroColor}dd 100%)`,
          }}
        >
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <Link
              href={`/transporte-publico/${slugify(op.name)}`}
              className="inline-flex items-center gap-1.5 text-xs text-white/85 hover:text-white mb-3 transition-colors"
            >
              <Building2 className="w-3 h-3" />
              {op.name}
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <Icon className="w-7 h-7 text-white/90" />
              <span className="font-heading text-white/85 text-xs font-semibold uppercase tracking-widest">
                {rt.label}
              </span>
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-white leading-tight">
              {displayName}
            </h1>
            {longName && longName !== displayName && (
              <p className="mt-2 text-white/90 text-base sm:text-lg">{longName}</p>
            )}
            {op.city && (
              <p className="mt-3 text-white/75 text-sm flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {op.city}
                {op.province && op.province !== op.city && <span>· {op.province}</span>}
              </p>
            )}
          </div>
        </section>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

          {directions.length === 0 ? (
            <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
              <Bus className="w-8 h-8 mx-auto text-gray-400 mb-3" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Sin viajes en el feed GTFS de este operador
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                La línea está registrada pero no hay trips ingestados. Esto pasa cuando el feed
                publica el catálogo de líneas antes que los horarios.
              </p>
            </section>
          ) : (
            directions.map((d, i) => (
              <section
                key={`${d.directionId ?? "none"}-${i}`}
                aria-label={`Sentido ${i + 1}`}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                    {d.headsign
                      ? `Sentido ${d.headsign}`
                      : d.directionId === null
                      ? "Recorrido"
                      : `Sentido ${d.directionId === 0 ? "ida" : "vuelta"}`}
                  </h2>
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    {d.stops.length} paradas
                  </span>
                </div>

                <ol className="space-y-0.5">
                  {d.stops.map((s, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === d.stops.length - 1;
                    return (
                      <li key={`${s.stopId}-${idx}`} className="flex items-start gap-3 relative pb-2">
                        <div className="flex flex-col items-center flex-shrink-0 pt-1.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isFirst || isLast
                                ? "bg-tl-600 dark:bg-tl-400"
                                : "bg-gray-300 dark:bg-gray-700"
                            }`}
                            aria-hidden="true"
                          />
                          {!isLast && (
                            <span
                              className="w-px flex-1 mt-1 bg-gray-200 dark:bg-gray-700"
                              style={{ minHeight: "16px" }}
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <div className="flex-1 flex items-center justify-between gap-3 min-w-0 -mt-0.5">
                          <Link
                            href={`/transporte-publico/${slugify(op.name)}/parada/${encodeURIComponent(s.stopId)}`}
                            className={`text-sm hover:underline truncate block ${
                              isFirst || isLast
                                ? "font-semibold text-gray-900 dark:text-gray-100"
                                : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {s.name}
                          </Link>
                          {s.time && (
                            <span className="font-mono text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {s.time.slice(0, 5)}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))
          )}

          {/* Cross-links */}
          <section
            aria-label="Operador"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Más sobre {op.name}
            </h2>
            <Link
              href={`/transporte-publico/${slugify(op.name)}`}
              className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    Todas las líneas
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Operador {op.name}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          </section>

          {/* Attribution */}
          <footer className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500 pt-2">
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>
              Fuente: GTFS estático de {op.name} (catálogo MobilityData). Horarios programados;
              el servicio en vivo puede diferir.
            </span>
          </footer>
        </main>
      </div>
    </>
  );
}
