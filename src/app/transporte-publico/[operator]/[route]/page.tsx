/**
 * /transporte-publico/[operator]/[route] — per-route entity page.
 *
 * Enrichments (iter-9):
 * - Live vehicle positions map (RouteVehicleMap)
 * - Full stops timeline per direction (StopsTimeline)
 * - "Frecuencia de paso" computed from GTFS schedules
 * - "Próximo bus en esta parada" for the first stop (NextBusCard)
 * - Punctuality placeholder (graceful empty-state until Agent B collects RT data)
 *
 * ISR: revalidate=60. index,follow (these are public routes worth indexing).
 */

import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { slugify } from "@/lib/geo/slugify";
import { getRouteHeadway } from "@/lib/transit/punctuality";
import {
  Bus,
  TrainFront,
  TramFront,
  Ship,
  ArrowRight,
  MapPin,
  Clock,
  Building2,
  ChevronRight,
  Timer,
} from "lucide-react";
import type { TimelineStop } from "@/components/trenes/StopsTimeline";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 60;
export const dynamicParams = true;

// GTFS route_type → label + icon + Schema.org type
const ROUTE_TYPE: Record<number, { label: string; icon: typeof Bus; schema: string }> = {
  0:  { label: "Tranvía",    icon: TramFront,  schema: "TouristTrip" },
  1:  { label: "Metro",      icon: TrainFront, schema: "TouristTrip" },
  2:  { label: "Tren",       icon: TrainFront, schema: "TrainTrip" },
  3:  { label: "Autobús",    icon: Bus,        schema: "BusTrip" },
  4:  { label: "Ferry",      icon: Ship,       schema: "TouristTrip" },
  5:  { label: "Tranvía",    icon: TramFront,  schema: "TouristTrip" },
  6:  { label: "Teleférico", icon: TramFront,  schema: "TouristTrip" },
  7:  { label: "Funicular",  icon: TramFront,  schema: "TouristTrip" },
  11: { label: "Trolebús",   icon: Bus,        schema: "BusTrip" },
  12: { label: "Monorraíl",  icon: TrainFront, schema: "TrainTrip" },
};

type Props = { params: Promise<{ operator: string; route: string }> };

// ---------------------------------------------------------------------------
// Lazy-loaded client components
// ---------------------------------------------------------------------------

const RouteVehicleMap = dynamic(
  () => import("@/components/transit/RouteVehicleMap"),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
        style={{ height: 320 }}
        aria-hidden="true"
      />
    ),
  }
);

const StopsTimeline = dynamic(() => import("@/components/trenes/StopsTimeline"), {
  ssr: false,
  loading: () => (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      ))}
    </div>
  ),
});

const NextBusCard = dynamic(() => import("@/components/transit/NextBusCard"), {
  ssr: false,
});

// ---------------------------------------------------------------------------
// Data loading
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

interface DirectionDetail {
  directionId: number | null;
  headsign: string | null;
  stops: Array<{ stopId: string; name: string; time: string }>;
}

async function getRouteData(operatorId: string, routeId: string) {
  const route = await prisma.transitRoute.findUnique({
    where: { operatorId_routeId: { operatorId, routeId } },
  });
  if (!route) return null;

  // Pick one representative trip per direction
  const trips = await prisma.transitTrip.findMany({
    where: { operatorId, routeId },
    take: 200,
    select: { tripId: true, headsign: true, directionId: true, shapeId: true },
  });

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
  if (picked.length === 0) return { route, directions: [] as DirectionDetail[], firstStopId: null as string | null };

  // Fetch stop_times + stops
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
        return { stopId: st.stopId, name: stop?.stopName ?? st.stopId, time: st.arrivalTime };
      });
    return { directionId: t.directionId, headsign: t.headsign, stops: seq };
  });

  // First stop of direction 0 (for NextBusCard)
  const firstStopId = directions[0]?.stops[0]?.stopId ?? null;

  return { route, directions, firstStopId };
}

// Haversine distance in metres between consecutive stops for timeline
function haversineM(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Static params
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
    `Recorrido completo, paradas, horarios, vehículos en tiempo real y frecuencia de paso del ${rt.label.toLowerCase()}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/transporte-publico/${slugify(op.name)}/${encodeURIComponent(route)}`,
    },
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
  const { route: r, directions, firstStopId } = data;

  const rt = ROUTE_TYPE[r.routeType] ?? ROUTE_TYPE[3];
  const Icon = rt.icon;
  const heroColor = r.routeColor ? `#${r.routeColor}` : "#1e40af";
  const shortName = r.shortName ?? "";
  const longName = r.longName ?? "";
  const displayName = shortName || longName || route;

  // Compute headway from GTFS schedule
  const headwayMin = await getRouteHeadway(op.id, route);

  // Build TimelineStop arrays for each direction
  // We need stop coordinates to compute distances
  const allStopIds = directions.flatMap((d) => d.stops.map((s) => s.stopId));
  const stopCoords = await prisma.transitStop.findMany({
    where: { operatorId: op.id, stopId: { in: [...new Set(allStopIds)] } },
    select: { stopId: true, latitude: true, longitude: true },
  });
  const coordMap = new Map(
    stopCoords.map((s) => [s.stopId, { lat: Number(s.latitude), lon: Number(s.longitude) }])
  );

  const timelinesByDirection: TimelineStop[][] = directions.map((d) =>
    d.stops.map((s, idx) => {
      const prev = idx > 0 ? d.stops[idx - 1] : null;
      let distanceFromPrevM: number | null = null;
      if (prev) {
        const prevCoord = coordMap.get(prev.stopId);
        const currCoord = coordMap.get(s.stopId);
        if (prevCoord && currCoord) {
          distanceFromPrevM = Math.round(
            haversineM(prevCoord.lat, prevCoord.lon, currCoord.lat, currCoord.lon)
          );
        }
      }
      return {
        id: `${s.stopId}-${idx}`,
        name: s.name,
        href: `/transporte-publico/${slugify(op.name)}/parada/${encodeURIComponent(s.stopId)}`,
        scheduledTime: s.time || null,
        state: "neutral" as const,
        isFirst: idx === 0,
        isLast: idx === d.stops.length - 1,
        distanceFromPrevM,
      };
    })
  );

  // Structured data
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

  // First stop name for NextBusCard
  const firstStopName = directions[0]?.stops[0]?.name ?? "";

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

        {/* Hero */}
        <section
          className="relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, #0f172a 0%, ${heroColor}dd 100%)` }}
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
              {headwayMin !== null && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-white border border-white/20">
                  <Timer className="w-3 h-3" />
                  Cada ~{headwayMin} min
                </span>
              )}
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

          {/* Live vehicles + next bus */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Map — wider column */}
            <section
              aria-label="Vehículos en tiempo real"
              className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
            >
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Icon className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                Vehículos en ruta
              </h2>
              <RouteVehicleMap
                operatorSlug={op.mdbId}
                routeId={route}
                routeGeometry={
                  r.geometry && typeof r.geometry === "object"
                    ? (r.geometry as object)
                    : null
                }
                routeColor={heroColor}
              />
            </section>

            {/* Next bus + frequency — narrower column */}
            <div className="space-y-4">
              {/* Next bus card */}
              {firstStopId && (
                <section aria-label="Próximo bus">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-tl-600 dark:text-tl-400" />
                    Próximo paso
                  </h2>
                  <NextBusCard
                    operatorSlug={op.mdbId}
                    stopId={firstStopId}
                    stopName={firstStopName}
                    routeId={route}
                    routeColor={heroColor}
                  />
                </section>
              )}

              {/* Frequency card */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" />
                  Frecuencia de paso
                </p>
                {headwayMin !== null ? (
                  <>
                    <p className="font-mono text-3xl font-bold text-tl-600 dark:text-tl-400">
                      ~{headwayMin} min
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Intervalo mediano entre servicios (horario programado)
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    No disponible en el feed GTFS
                  </p>
                )}
              </div>

              {/* Route summary */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-2 text-sm">
                {directions[0]?.stops[0] && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: heroColor }} />
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {directions[0].stops[0].name}
                    </span>
                  </div>
                )}
                {directions[0]?.stops && directions[0].stops.length > 1 && (
                  <>
                    <div className="flex items-center gap-2 pl-1 text-xs text-gray-400">
                      <span className="font-mono">
                        {directions[0].stops.length} paradas
                      </span>
                      {directions[0].stops[0]?.time && directions[0].stops[directions[0].stops.length - 1]?.time && (
                        <span>
                          ·{" "}
                          {directions[0].stops[0].time.slice(0, 5)} →{" "}
                          {directions[0].stops[directions[0].stops.length - 1].time.slice(0, 5)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3 h-3 shrink-0 text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {directions[0].stops[directions[0].stops.length - 1].name}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* No trips empty state */}
          {directions.length === 0 && (
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
          )}

          {/* Stops timelines per direction */}
          {directions.map((d, i) => (
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

              <StopsTimeline
                stops={timelinesByDirection[i] ?? []}
                showDistances={true}
              />
            </section>
          ))}

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
              el servicio en vivo puede diferir. Posiciones de vehículos vía GTFS-RT cuando disponible.
            </span>
          </footer>
        </main>
      </div>
    </>
  );
}
