import type { Metadata } from "next";
import { notFound } from "next/navigation";
import dynamicImport from "next/dynamic";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { slugify } from "@/lib/geo/slugify";
import { MapPin, ExternalLink, Info, Navigation, Clock, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ── Mode config ───────────────────────────────────────────────────────────────

const MODE_COLORS: Record<string, string> = {
  metro: "var(--color-mode-metro)",
  bus: "var(--color-mode-bus)",
  tram: "var(--color-mode-tram)",
  rail: "var(--color-mode-rail)",
  funicular: "var(--color-mode-funicular)",
  ferry: "var(--color-mode-maritime)",
};

const MODE_LABELS: Record<string, string> = {
  metro: "Metro",
  bus: "Autobús",
  tram: "Tranvía",
  rail: "Ferrocarril",
  funicular: "Funicular",
  ferry: "Ferry",
};

// GTFS route_type → label
const ROUTE_TYPE_LABEL: Record<number, string> = {
  0:  "Tranvía",
  1:  "Metro",
  2:  "Tren",
  3:  "Autobús",
  4:  "Ferry",
  5:  "Tranvía",
  6:  "Teleférico",
  7:  "Funicular",
  11: "Trolebús",
  12: "Monorraíl",
};

// ── Client components ─────────────────────────────────────────────────────────

const ArrivalsLive = dynamicImport(() => import("./arrivals-live"));

// ── Params ────────────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ operator: string; stopId: string }>;
};

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getStopWithOperator(operatorSlug: string, stopId: string) {
  // Resolve operator (mdbId or slugified name)
  let operator = await prisma.transitOperator.findUnique({
    where: { mdbId: operatorSlug },
  });

  if (!operator) {
    const all = await prisma.transitOperator.findMany({
      select: { id: true, mdbId: true, name: true },
    });
    const match = all.find((op) => slugify(op.name) === operatorSlug);
    if (match) {
      operator = await prisma.transitOperator.findUnique({
        where: { mdbId: match.mdbId },
      });
    }
  }

  if (!operator) return null;

  const stop = await prisma.transitStop.findUnique({
    where: { operatorId_stopId: { operatorId: operator.id, stopId } },
  });

  if (!stop) return null;

  // Routes serving this stop + next scheduled arrivals per route
  const stopTimes = await prisma.transitStopTime.findMany({
    where: { operatorId: operator.id, stopId },
    select: { tripId: true, arrivalTime: true, stopSequence: true },
    take: 500,
  });
  const tripIds = Array.from(new Set(stopTimes.map((s) => s.tripId)));
  const trips = tripIds.length
    ? await prisma.transitTrip.findMany({
        where: { operatorId: operator.id, tripId: { in: tripIds } },
        select: { tripId: true, routeId: true, headsign: true, directionId: true },
      })
    : [];
  const routeIds = Array.from(new Set(trips.map((t) => t.routeId)));
  const routes = routeIds.length
    ? await prisma.transitRoute.findMany({
        where: { operatorId: operator.id, routeId: { in: routeIds } },
        select: {
          routeId: true,
          shortName: true,
          longName: true,
          routeType: true,
          routeColor: true,
        },
        orderBy: [{ routeType: "asc" }, { shortName: "asc" }],
      })
    : [];

  // Build next-arrival per route from GTFS schedule (relative to current time)
  // Only feasible without real-time — show schedule
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Map tripId → routeId + headsign
  const tripToRoute = new Map(trips.map((t) => [t.tripId, t]));

  // For each stop_time entry on this stop, find the next scheduled arrival per route
  type NextArrival = {
    routeId: string;
    headsign: string | null;
    arrivalTime: string;
    minutesAway: number;
  };
  const nextByRoute = new Map<string, NextArrival>();

  for (const st of stopTimes) {
    const trip = tripToRoute.get(st.tripId);
    if (!trip) continue;
    const parts = st.arrivalTime.split(":");
    if (parts.length < 2) continue;
    const arrMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    const minsAway = arrMin - nowMin;
    if (minsAway < -5 || minsAway > 120) continue; // filter old + too far

    const existing = nextByRoute.get(trip.routeId);
    if (!existing || minsAway < existing.minutesAway) {
      nextByRoute.set(trip.routeId, {
        routeId: trip.routeId,
        headsign: trip.headsign,
        arrivalTime: st.arrivalTime,
        minutesAway: minsAway,
      });
    }
  }

  const nextArrivals = Array.from(nextByRoute.values()).sort(
    (a, b) => a.minutesAway - b.minutesAway
  );

  return { operator, stop, routes, nextArrivals };
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { operator: operatorSlug, stopId } = await params;
  const result = await getStopWithOperator(operatorSlug, stopId);

  if (!result) {
    return { title: "Parada no encontrada" };
  }

  const { operator, stop } = result;
  const title = `Parada ${stop.stopName} — ${operator.name} · Próximos buses`;
  const description = `Próximas llegadas y ubicación de la parada ${stop.stopName} de ${operator.name}. ETAs por línea, horarios GTFS y mapa interactivo.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/transporte-publico/${slugify(operator.name)}/parada/${stopId}`,
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/transporte-publico/${slugify(operator.name)}/parada/${stopId}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TransitStopDetailPage({ params }: Props) {
  const { operator: operatorSlug, stopId } = await params;
  const result = await getStopWithOperator(operatorSlug, stopId);

  if (!result) {
    notFound();
  }

  const { operator, stop, routes, nextArrivals } = result;

  const modeColor = MODE_COLORS[operator.mode] ?? "#6b7280";
  const modeLabel = MODE_LABELS[operator.mode] ?? operator.mode;

  const lat = Number(stop.latitude);
  const lon = Number(stop.longitude);

  const operatorHref = `/transporte-publico/${operator.mdbId}`;
  const googleMapsHref = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

  // JSON-LD for the stop
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BusStop",
    name: stop.stopName,
    identifier: stop.stopId,
    geo: {
      "@type": "GeoCoordinates",
      latitude: lat,
      longitude: lon,
    },
    containedInPlace: {
      "@type": "Organization",
      name: operator.name,
      url: `${BASE_URL}${operatorHref}`,
    },
  };

  // Route color lookup
  const routeColorMap = new Map(
    routes.map((r) => [r.routeId, r.routeColor ? `#${r.routeColor}` : modeColor])
  );
  const routeShortNameMap = new Map(routes.map((r) => [r.routeId, r.shortName]));

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Transporte Público", href: "/transporte-publico" },
          { name: operator.name, href: operatorHref },
          { name: stop.stopName, href: `/transporte-publico/${operator.mdbId}/parada/${stopId}` },
        ]}
      />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${modeColor}18` }}
          >
            <MapPin className="w-7 h-7" style={{ color: modeColor }} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 dark:text-gray-100 leading-tight">
                {stop.stopName}
              </h1>
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white shrink-0"
                style={{ backgroundColor: modeColor }}
              >
                {modeLabel}
              </span>
            </div>

            <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 shrink-0" />
              {operator.name}
              {operator.city ? ` · ${operator.city}` : ""}
            </p>
          </div>
        </div>

        {/* Stop metadata row */}
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5 font-mono text-gray-700 dark:text-gray-300 text-xs">
            <span className="text-gray-400">ID</span>
            {stop.stopId}
          </span>

          {lat !== 0 && lon !== 0 && (
            <span className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5 font-mono text-gray-700 dark:text-gray-300 text-xs">
              <MapPin className="w-3 h-3 text-gray-400" />
              {lat.toFixed(5)}, {lon.toFixed(5)}
            </span>
          )}

          {lat !== 0 && lon !== 0 && (
            <a
              href={googleMapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--tl-primary)] hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir en Google Maps
            </a>
          )}
        </div>
      </section>

      {/* ── Next arrivals per route (schedule-based) ───────────────────────── */}
      {nextArrivals.length > 0 && (
        <section aria-label="Próximas llegadas por línea">
          <h2 className="text-base font-heading font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--tl-primary)]" />
            Próximas llegadas
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              Horario programado
            </span>
          </h2>
          <ul className="space-y-2">
            {nextArrivals.slice(0, 8).map((a) => {
              const color = routeColorMap.get(a.routeId) ?? modeColor;
              const shortName = routeShortNameMap.get(a.routeId);
              const minsAway = a.minutesAway;
              const isImminent = minsAway <= 2;
              return (
                <li
                  key={`${a.routeId}-${a.arrivalTime}`}
                  className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3"
                >
                  {/* Line badge */}
                  <span
                    className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-lg text-xs font-bold shrink-0 text-white font-mono"
                    style={{ backgroundColor: color }}
                  >
                    {shortName || "—"}
                  </span>

                  {/* Destination + time */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {a.headsign || ROUTE_TYPE_LABEL[3]}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5 shrink-0" />
                      {a.arrivalTime.slice(0, 5)}
                    </p>
                  </div>

                  {/* Countdown */}
                  <div className="shrink-0 text-right">
                    <span
                      className={`font-mono font-bold text-xl tabular-nums ${
                        isImminent
                          ? "text-green-600 dark:text-green-400 motion-safe:animate-pulse"
                          : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {minsAway <= 0 ? "Ahora" : `${minsAway}′`}
                    </span>
                  </div>

                  {/* Link to route */}
                  <a
                    href={`/transporte-publico/${slugify(operator.name)}/${encodeURIComponent(a.routeId)}`}
                    className="shrink-0 text-gray-400 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
                    aria-label={`Ver línea ${shortName ?? a.routeId}`}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1">
            <Info className="w-3 h-3 shrink-0" />
            Horario estático GTFS. Sin ajuste de retrasos en tiempo real.
          </p>
        </section>
      )}

      {/* ── Lines serving this stop ─────────────────────────────────────────── */}
      {routes.length > 0 && (
        <section aria-label="Líneas que paran aquí">
          <h2 className="text-base font-heading font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-[var(--tl-primary)]" />
            Líneas que paran aquí
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {routes.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {routes.map((r) => {
              const badgeColor = r.routeColor ? `#${r.routeColor}` : modeColor;
              const typeLabel = ROUTE_TYPE_LABEL[r.routeType] ?? "Línea";
              return (
                <a
                  key={r.routeId}
                  href={`/transporte-publico/${slugify(operator.name)}/${encodeURIComponent(r.routeId)}`}
                  className="flex items-center gap-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 hover:border-tl-300 dark:hover:border-tl-700 hover:bg-tl-50/40 dark:hover:bg-tl-900/10 transition-colors"
                >
                  <span
                    className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-lg text-xs font-bold shrink-0 text-white"
                    style={{ backgroundColor: badgeColor }}
                  >
                    {r.shortName || "—"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {r.longName || r.shortName || "Sin nombre"}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{typeLabel}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Map + live arrivals (client bundle) ───────────────────────────── */}
      <ArrivalsLive
        operator={operatorSlug}
        stopId={stopId}
        initialStopLat={lat}
        initialStopLon={lon}
      />

      {/* ── Attribution ───────────────────────────────────────────────────── */}
      <p className="flex items-center gap-1.5 text-[11px] text-gray-400 pb-4">
        <Info className="w-3 h-3 shrink-0" />
        Datos GTFS © {operator.name}. Actualización diaria vía MobilityData.
      </p>
    </main>
  );
}
