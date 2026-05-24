import type { Metadata } from "next";
import { notFound } from "next/navigation";
import dynamicImport from "next/dynamic";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { slugify } from "@/lib/geo/slugify";
import { MapPin, ExternalLink, Info, Navigation } from "lucide-react";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ── Mode config (replicated from sibling files — not importing to avoid touching them) ──

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

// ── Client components ─────────────────────────────────────────────────────────

// ArrivalsLive owns both the SWR-polling table and the mini-map.
// The component already has "use client" so we don't need ssr:false — and
// Next.js 16 App Router rejects ssr:false in server components at build time.
const ArrivalsLive = dynamicImport(() => import("./arrivals-live"));

// ── Params ────────────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ operator: string; stopId: string }>;
};

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getStopWithOperator(operatorSlug: string, stopId: string) {
  // Resolve operator (mdbId or slugified name — mirrors [operator]/page.tsx logic)
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

  // Routes that serve this stop. StopTime → Trip → Route. Distinct on
  // routeId because a stop is hit by many trips of the same route every
  // day. Cap at the 30 most-used trips to keep the query bounded for
  // mega-stops (Atocha, Sants).
  const stopTimes = await prisma.transitStopTime.findMany({
    where: { operatorId: operator.id, stopId },
    select: { tripId: true },
    take: 200,
  });
  const tripIds = Array.from(new Set(stopTimes.map((s) => s.tripId)));
  const trips = tripIds.length
    ? await prisma.transitTrip.findMany({
        where: { operatorId: operator.id, tripId: { in: tripIds } },
        select: { routeId: true },
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

  return { operator, stop, routes };
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { operator: operatorSlug, stopId } = await params;
  const result = await getStopWithOperator(operatorSlug, stopId);

  if (!result) {
    return { title: "Parada no encontrada" };
  }

  const { operator, stop } = result;
  const title = `Parada ${stop.stopName} — ${operator.name}`;
  const description = `Próximas llegadas y ubicación de la parada ${stop.stopName} de ${operator.name}. Horarios GTFS en tiempo real.`;

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

  const { operator, stop, routes } = result;

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
          {/* Stop icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${modeColor}18` }}
          >
            <MapPin className="w-7 h-7" style={{ color: modeColor }} />
          </div>

          <div className="min-w-0 flex-1">
            {/* Mode badge */}
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

            {/* Operator */}
            <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 shrink-0" />
              {operator.name}
              {operator.city ? ` · ${operator.city}` : ""}
            </p>
          </div>
        </div>

        {/* Stop metadata row */}
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          {/* Stop ID */}
          <span className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5 font-mono text-gray-700 dark:text-gray-300 text-xs">
            <span className="text-gray-400">ID</span>
            {stop.stopId}
          </span>

          {/* Coordinates */}
          {lat !== 0 && lon !== 0 && (
            <span className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5 font-mono text-gray-700 dark:text-gray-300 text-xs">
              <MapPin className="w-3 h-3 text-gray-400" />
              {lat.toFixed(5)}, {lon.toFixed(5)}
            </span>
          )}

          {/* Google Maps link */}
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

      {/* ── Lines serving this stop ─────────────────────────────────────── */}
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
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                    {r.longName || r.shortName || "Sin nombre"}
                  </span>
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
