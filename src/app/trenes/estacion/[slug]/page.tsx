import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { TrackEntityView } from "@/components/analytics/TrackEntityView";
import { slugify } from "@/lib/geo/slugify";
import {
  Train,
  MapPin,
  Route,
  AlertTriangle,
  Clock,
  Accessibility,
  Navigation,
  ArrowRight,
} from "lucide-react";
import type { RailwayServiceType } from "@prisma/client";
import { StationEntityMap } from "./entity-map";
import { LiveTrainsAtStation } from "./LiveTrainsAtStation";

export const revalidate = 300;
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

/* ---------- helpers ---------- */

const SERVICE_TYPE_LABELS: Record<string, string> = {
  CERCANIAS: "Cercanias",
  AVE: "AVE",
  AVLO: "AVLO",
  ALVIA: "Alvia",
  AVANT: "Avant",
  EUROMED: "Euromed",
  LARGA_DISTANCIA: "Larga Distancia",
  MEDIA_DISTANCIA: "Media Distancia",
  REGIONAL: "Regional",
  REGIONAL_EXPRESS: "Reg. Exp.",
  PROXIMIDAD: "Proximidad",
  INTERCITY: "Intercity",
  TRENHOTEL: "Trenhotel",
  TRENCELTA: "Trencelta",
  FEVE: "FEVE",
  RODALIES: "Rodalies",
};

const SERVICE_TYPE_COLORS: Record<string, string> = {
  AVE: "bg-red-600 text-white",
  AVLO: "bg-purple-600 text-white",
  CERCANIAS: "bg-tl-600 text-white dark:bg-tl-500",
  ALVIA: "bg-tl-amber-500 text-white",
  AVANT: "bg-emerald-600 text-white",
  EUROMED: "bg-sky-600 text-white",
  LARGA_DISTANCIA: "bg-red-700 text-white",
  MEDIA_DISTANCIA: "bg-orange-600 text-white",
  REGIONAL: "bg-green-700 text-white",
  REGIONAL_EXPRESS: "bg-green-600 text-white",
  PROXIMIDAD: "bg-teal-600 text-white",
  INTERCITY: "bg-indigo-600 text-white",
  TRENHOTEL: "bg-gray-800 text-white",
  TRENCELTA: "bg-cyan-700 text-white",
  FEVE: "bg-yellow-600 text-black",
  RODALIES: "bg-orange-500 text-white",
};

const ALERT_EFFECT_LABELS: Record<string, string> = {
  NO_SERVICE: "Sin servicio",
  REDUCED_SERVICE: "Servicio reducido",
  SIGNIFICANT_DELAYS: "Retrasos significativos",
  DETOUR: "Desvio",
  ADDITIONAL_SERVICE: "Servicio adicional",
  MODIFIED_SERVICE: "Servicio modificado",
  STOP_MOVED: "Parada trasladada",
  OTHER_EFFECT: "Otro efecto",
  UNKNOWN_EFFECT: "Efecto desconocido",
};

const ALERT_EFFECT_COLORS: Record<string, string> = {
  NO_SERVICE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  REDUCED_SERVICE: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  SIGNIFICANT_DELAYS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  DETOUR: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  ADDITIONAL_SERVICE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  MODIFIED_SERVICE: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  STOP_MOVED: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  OTHER_EFFECT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  UNKNOWN_EFFECT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ---------- data fetching ---------- */

async function getStation(slug: string) {
  const station = await prisma.railwayStation.findUnique({
    where: { slug },
  });
  if (!station) return null;
  return station;
}

/* ---------- static params / slug catalog ---------- */

/**
 * Full slug catalog for sitemaps and `/ir` resolver (HS10 consumer T1.9).
 * Returns every station with a slug — 2,154 entries.
 */
export async function getSlugList(): Promise<string[]> {
  const stations = await prisma.railwayStation.findMany({
    where: { slug: { not: null } },
    select: { slug: true },
    orderBy: { name: "asc" },
  });
  return stations
    .map((s) => s.slug)
    .filter((s): s is string => s != null);
}

export async function generateStaticParams() {
  const slugs = await getSlugList();
  return slugs.map((slug) => ({ slug }));
}

/* ---------- metadata ---------- */

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const station = await getStation(slug);

  if (!station) {
    return { title: "Estacion no encontrada" };
  }

  const serviceLabels = station.serviceTypes
    .map((st) => SERVICE_TYPE_LABELS[st] || st)
    .join(", ");
  const provinceText = station.provinceName ? ` en ${station.provinceName}` : "";

  return {
    title: `Estacion de ${station.name} — Lineas, horarios y servicios`,
    description: `Estacion de ${station.name}${provinceText}. Servicios: ${serviceLabels}. Lineas, alertas activas y estaciones cercanas.`,
    keywords: [
      station.name,
      `estacion ${station.name}`,
      `tren ${station.name}`,
      ...(station.provinceName ? [`trenes ${station.provinceName}`] : []),
      ...(station.network ? [`Cercanias ${station.network}`] : []),
    ],
    alternates: {
      canonical: `${BASE_URL}/trenes/estacion/${slug}`,
    },
    openGraph: {
      title: `Estacion de ${station.name} — Lineas y servicios`,
      description: `Informacion completa de la estacion de ${station.name}${provinceText}. ${serviceLabels}.`,
      url: `${BASE_URL}/trenes/estacion/${slug}`,
      images: [`${BASE_URL}/og-image.webp`],
    },
  };
}

/* ---------- page ---------- */

export default async function EstacionDetallePage({ params }: Props) {
  const { slug } = await params;
  const station = await getStation(slug);

  if (!station) {
    notFound();
  }

  const stationLat = Number(station.latitude);
  const stationLng = Number(station.longitude);

  // Parallel queries: routes, alerts, nearby
  const [routes, alerts, nearbyRaw] = await Promise.all([
    prisma.railwayRoute.findMany({
      where: { stopNames: { has: station.name } },
      select: {
        id: true,
        routeId: true,
        slug: true,
        shortName: true,
        longName: true,
        brand: true,
        serviceType: true,
        color: true,
        originName: true,
        destName: true,
        network: true,
        stopsCount: true,
        tripCount: true,
      },
      orderBy: [{ serviceType: "asc" }, { shortName: "asc" }],
    }),
    prisma.railwayAlert.findMany({
      where: {
        isActive: true,
        stopIds: { has: station.stopId },
      },
      orderBy: { activePeriodStart: "desc" },
      take: 20,
    }),
    prisma.railwayStation.findMany({
      where: {
        id: { not: station.id },
        slug: { not: null },
        latitude: {
          gte: stationLat - 0.045,
          lte: stationLat + 0.045,
        },
        longitude: {
          gte: stationLng - 0.06,
          lte: stationLng + 0.06,
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        latitude: true,
        longitude: true,
        serviceTypes: true,
        network: true,
        provinceName: true,
      },
      orderBy: { name: "asc" },
      take: 15,
    }),
  ]);

  // Compute distances and sort
  const nearby = nearbyRaw
    .map((s) => ({
      ...s,
      distanceKm:
        Math.round(
          haversineKm(stationLat, stationLng, Number(s.latitude), Number(s.longitude)) * 10
        ) / 10,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 10);

  // Group routes by brand
  const routesByBrand = new Map<string, typeof routes>();
  for (const route of routes) {
    const brand = route.brand || "Otros";
    if (!routesByBrand.has(brand)) routesByBrand.set(brand, []);
    routesByBrand.get(brand)!.push(route);
  }

  // Province link
  let provinceHref: string | null = null;
  if (station.communityName && station.provinceName) {
    const cSlug = slugify(station.communityName);
    const pSlug = slugify(station.provinceName);
    provinceHref = `/espana/${cSlug}/${pSlug}`;
  }

  // Network slug for cercanias link
  const networkSlug = station.network ? slugify(station.network) : null;

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      <TrackEntityView entityType="railway_station" entityId={slug} />
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Red Ferroviaria", href: "/trenes" },
          { name: "Estaciones", href: "/trenes/estaciones" },
          { name: station.name, href: `/trenes/estacion/${slug}` },
        ]}
      />

      {/* --- Hero Section --- */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-tl-100 dark:bg-tl-900/40">
                <Train className="w-6 h-6 text-tl-600 dark:text-tl-400" />
              </div>
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-50">
                Estacion de {station.name}
              </h1>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="font-body text-sm">
                {[station.municipality, station.provinceName, station.communityName]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {station.network && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-tl-100 text-tl-700 dark:bg-tl-900/30 dark:text-tl-300">
                  <Route className="w-3.5 h-3.5" />
                  Cercanias {station.network}
                </span>
              )}
              {station.serviceTypes.map((st) => (
                <span
                  key={st}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${SERVICE_TYPE_COLORS[st] || "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}`}
                >
                  {SERVICE_TYPE_LABELS[st] || st}
                </span>
              ))}
              {station.wheelchair === 1 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  <Accessibility className="w-3.5 h-3.5" />
                  Accesible
                </span>
              )}
            </div>
          </div>

          {/* Coordinates */}
          <div className="text-right text-xs text-gray-400 dark:text-gray-500 font-mono space-y-0.5 flex-shrink-0">
            <div>{stationLat.toFixed(6)}N</div>
            <div>{stationLng.toFixed(6)}W</div>
            {station.code && (
              <div className="mt-1 text-gray-500 dark:text-gray-400">
                Cod. {station.code}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- Map Section --- */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-heading text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            Ubicacion y trenes en vivo
          </h2>
        </div>
        <div className="h-[320px] md:h-[420px] bg-gray-100 dark:bg-gray-800 relative">
          <p className="sr-only">Mapa interactivo de la red ferroviaria centrado en {station.name}</p>
          <StationEntityMap stationId={station.id} center={[stationLng, stationLat]} />
        </div>
      </section>

      {/* --- Live trains at this station (Renfe LD) --- */}
      <LiveTrainsAtStation
        stationCode={station.code}
        resolveStationName={(c) => {
          // Two known: this station + nearby. The component falls back to
          // the raw code when a name is unknown, which is acceptable for
          // intermediate stops mid-journey.
          if (c === station.code) return station.name;
          return undefined;
        }}
      />

      {/* --- Active Alerts --- */}
      {alerts.length > 0 && (
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-4">
          <h2 className="font-heading text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[var(--tl-warning)]" />
            Alertas activas
            <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {alerts.length}
            </span>
          </h2>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl border border-yellow-200 dark:border-yellow-800/40 bg-yellow-50/50 dark:bg-yellow-900/10 p-4 space-y-2"
              >
                <div className="flex flex-wrap items-start gap-2">
                  {alert.headerText && (
                    <p className="font-body font-semibold text-sm text-gray-900 dark:text-gray-100 flex-1">
                      {alert.headerText}
                    </p>
                  )}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${ALERT_EFFECT_COLORS[alert.effect] || ALERT_EFFECT_COLORS.UNKNOWN_EFFECT}`}
                  >
                    {ALERT_EFFECT_LABELS[alert.effect] || alert.effect}
                  </span>
                </div>
                {alert.description && (
                  <p className="font-body text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                    {alert.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                  {alert.activePeriodStart && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(alert.activePeriodStart).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  {alert.cause && (
                    <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {alert.cause}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- Routes --- */}
      {routes.length > 0 && (
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-4">
          <h2 className="font-heading text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
            <Route className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            Lineas que pasan por esta estacion
            <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded-full bg-tl-100 text-tl-700 dark:bg-tl-900/30 dark:text-tl-300">
              {routes.length}
            </span>
          </h2>

          <div className="space-y-6">
            {Array.from(routesByBrand.entries()).map(([brand, brandRoutes]) => (
              <div key={brand} className="space-y-3">
                <h3 className="font-heading text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  {brand}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {brandRoutes.map((route) => {
                    const inner = (
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-tl-300 dark:hover:border-tl-700 hover:bg-tl-50/50 dark:hover:bg-tl-900/10 transition-colors group overflow-hidden">
                        {/* Line badge */}
                        <span
                          className="inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-lg text-xs font-bold font-mono flex-shrink-0"
                          style={{
                            backgroundColor: route.color ? `#${route.color}` : undefined,
                            color: route.color ? "#fff" : undefined,
                          }}
                        >
                          {route.shortName || route.serviceType}
                        </span>

                        {/* Origin -> Dest */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-gray-100 overflow-hidden">
                            <span className="truncate font-body min-w-0">
                              {route.originName || "—"}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate font-body min-w-0">
                              {route.destName || "—"}
                            </span>
                          </div>
                          {route.stopsCount != null && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                              {route.stopsCount} paradas
                              {route.tripCount ? ` · ${route.tripCount} servicios/dia` : ""}
                            </p>
                          )}
                        </div>

                        {/* Service type badge */}
                        <span
                          className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${SERVICE_TYPE_COLORS[route.serviceType] || "bg-gray-200 text-gray-800"}`}
                        >
                          {SERVICE_TYPE_LABELS[route.serviceType] || route.serviceType}
                        </span>

                        {route.slug && (
                          <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-tl-500 transition-colors flex-shrink-0" />
                        )}
                      </div>
                    );

                    return route.slug ? (
                      <Link key={route.id} href={`/trenes/linea/${route.slug}`}>
                        {inner}
                      </Link>
                    ) : (
                      <div key={route.id}>{inner}</div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- Nearby Stations --- */}
      {nearby.length > 0 && (
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-4">
          <h2 className="font-heading text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            Estaciones cercanas
          </h2>

          <div className="grid gap-2 sm:grid-cols-2">
            {nearby.map((s) => (
              <Link
                key={s.id}
                href={`/trenes/estacion/${s.slug}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-tl-300 dark:hover:border-tl-700 hover:bg-tl-50/50 dark:hover:bg-tl-900/10 transition-colors"
              >
                <Train className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {s.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {s.serviceTypes
                      .slice(0, 3)
                      .map((st: RailwayServiceType) => SERVICE_TYPE_LABELS[st] || st)
                      .join(", ")}
                  </p>
                </div>
                <span className="font-mono text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {s.distanceKm} km
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* --- Links --- */}
      <div className="flex flex-wrap gap-3">
        {provinceHref && station.provinceName && (
          <Link
            href={provinceHref}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-body text-gray-700 dark:text-gray-300 hover:border-tl-400 dark:hover:border-tl-600 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            {station.provinceName}
          </Link>
        )}
        {networkSlug && station.network && (
          <Link
            href={`/trenes/cercanias/${networkSlug}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-body text-gray-700 dark:text-gray-300 hover:border-tl-400 dark:hover:border-tl-600 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
          >
            <Route className="w-4 h-4" />
            Cercanias {station.network}
          </Link>
        )}
        <Link
          href="/trenes/estaciones"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-body text-gray-700 dark:text-gray-300 hover:border-tl-400 dark:hover:border-tl-600 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
        >
          <Train className="w-4 h-4" />
          Todas las estaciones
        </Link>
      </div>

      {/* --- JSON-LD (TrainStation is a Place subtype; adds TravelAction) --- */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": ["TrainStation", "Place"],
                "@id": `${BASE_URL}/trenes/estacion/${slug}#place`,
                name: station.name,
                description: `Estacion de tren ${station.name}${station.provinceName ? ` en ${station.provinceName}` : ""}`,
                url: `${BASE_URL}/trenes/estacion/${slug}`,
                geo: {
                  "@type": "GeoCoordinates",
                  latitude: stationLat,
                  longitude: stationLng,
                },
                address: {
                  "@type": "PostalAddress",
                  addressLocality: station.municipality || undefined,
                  addressRegion: station.provinceName || undefined,
                  addressCountry: "ES",
                },
                ...(station.wheelchair === 1
                  ? { amenityFeature: { "@type": "LocationFeatureSpecification", name: "Accesibilidad para silla de ruedas", value: true } }
                  : {}),
                isAccessibleForFree: true,
                publicAccess: true,
                publisher: {
                  "@type": "Organization",
                  name: "trafico.live",
                  url: BASE_URL,
                },
              },
              {
                "@type": "TravelAction",
                name: `Viajar en tren hacia ${station.name}`,
                fromLocation: { "@type": "TrainStation", name: "Estacion de origen" },
                toLocation: { "@id": `${BASE_URL}/trenes/estacion/${slug}#place` },
                provider: {
                  "@type": "Organization",
                  name: "Renfe Operadora",
                  url: "https://www.renfe.com",
                },
              },
            ],
          }),
        }}
      />

      {/* Source attribution */}
      <p className="text-xs text-gray-400 dark:text-gray-600 font-body">
        Datos: Renfe GTFS / ADIF. Actualizacion cada 5 minutos.
      </p>
    </main>
  );
}
