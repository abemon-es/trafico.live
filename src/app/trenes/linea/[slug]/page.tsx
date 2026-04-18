import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  Train,
  Route,
  MapPin,
  AlertTriangle,
  Clock,
  ArrowRight,
  Circle,
  Info,
  ExternalLink,
} from "lucide-react";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

import RouteMap from "./route-map-wrapper";

// ──────────────────────────────────────────────────────────────
// Brand configuration (colors + labels)
// ──────────────────────────────────────────────────────────────

const BRAND_DEFAULTS: Record<string, { color: string; textColor: string; label: string }> = {
  AVE: { color: "#6b21a8", textColor: "#ffffff", label: "AVE" },
  AVLO: { color: "#7c3aed", textColor: "#ffffff", label: "AVLO" },
  Alvia: { color: "#d48139", textColor: "#ffffff", label: "Alvia" },
  Avant: { color: "#7c3aed", textColor: "#ffffff", label: "Avant" },
  Euromed: { color: "#0891b2", textColor: "#ffffff", label: "Euromed" },
  Intercity: { color: "#4b5563", textColor: "#ffffff", label: "Intercity" },
  "Larga Distancia": { color: "#374151", textColor: "#ffffff", label: "Larga Distancia" },
  "Media Distancia": { color: "#366cf8", textColor: "#ffffff", label: "Media Distancia" },
  Regional: { color: "#6b7280", textColor: "#ffffff", label: "Regional" },
  "Cercanías": { color: "#059669", textColor: "#ffffff", label: "Cercanías" },
  Rodalies: { color: "#059669", textColor: "#ffffff", label: "Rodalies" },
  TrenHotel: { color: "#1e3a5f", textColor: "#ffffff", label: "TrenHotel" },
  "Tren Celta": { color: "#065f46", textColor: "#ffffff", label: "Tren Celta" },
  FEVE: { color: "#92400e", textColor: "#ffffff", label: "FEVE" },
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  CERCANIAS: "Cercanías",
  AVE: "AVE",
  AVLO: "AVLO",
  ALVIA: "Alvia",
  AVANT: "Avant",
  EUROMED: "Euromed",
  LARGA_DISTANCIA: "Larga Distancia",
  MEDIA_DISTANCIA: "Media Distancia",
  REGIONAL: "Regional",
  REGIONAL_EXPRESS: "Regional Express",
  PROXIMIDAD: "Proximidad",
  INTERCITY: "Intercity",
  TRENHOTEL: "TrenHotel",
  TRENCELTA: "Tren Celta",
  FEVE: "FEVE",
};

const ALERT_EFFECT_LABELS: Record<string, string> = {
  NO_SERVICE: "Sin servicio",
  REDUCED_SERVICE: "Servicio reducido",
  SIGNIFICANT_DELAYS: "Retrasos significativos",
  DETOUR: "Desvío de ruta",
  ADDITIONAL_SERVICE: "Servicio adicional",
  MODIFIED_SERVICE: "Servicio modificado",
  STOP_MOVED: "Parada trasladada",
  OTHER_EFFECT: "Otro efecto",
  UNKNOWN_EFFECT: "Alerta activa",
};

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function resolveBrandColor(brand: string | null, routeColor: string | null): string {
  if (routeColor) return `#${routeColor.replace("#", "")}`;
  if (brand) {
    for (const [key, cfg] of Object.entries(BRAND_DEFAULTS)) {
      if (key.toLowerCase() === brand.toLowerCase()) return cfg.color;
    }
  }
  return "#6b7280";
}

function resolveBrandTextColor(brand: string | null, routeTextColor: string | null): string {
  if (routeTextColor) return `#${routeTextColor.replace("#", "")}`;
  if (brand) {
    for (const [key, cfg] of Object.entries(BRAND_DEFAULTS)) {
      if (key.toLowerCase() === brand.toLowerCase()) return cfg.textColor;
    }
  }
  return "#ffffff";
}

function resolveBrandLabel(brand: string | null): string {
  if (!brand) return "Renfe";
  for (const [key, cfg] of Object.entries(BRAND_DEFAULTS)) {
    if (key.toLowerCase() === brand.toLowerCase()) return cfg.label;
  }
  return brand;
}

function routeDisplayName(
  shortName: string | null,
  longName: string | null,
  originName: string | null,
  destName: string | null
): string {
  if (shortName?.trim()) return shortName;
  if (originName && destName) return `${originName} — ${destName}`;
  if (longName?.trim()) return longName;
  return "Línea";
}

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ slug: string }>;
};

// ──────────────────────────────────────────────────────────────
// Static params + slug catalog (HS10 consumer T1.9)
// ──────────────────────────────────────────────────────────────

/**
 * Full slug catalog for sitemaps and `/ir` resolver.
 * Returns every route with a slug — 1,248 entries.
 */
export async function getSlugList(): Promise<string[]> {
  const routes = await prisma.railwayRoute.findMany({
    where: { slug: { not: null } },
    select: { slug: true },
    orderBy: { tripCount: "desc" },
  });
  return routes
    .map((r) => r.slug)
    .filter((s): s is string => s != null);
}

export async function generateStaticParams() {
  const slugs = await getSlugList();
  return slugs.map((slug) => ({ slug }));
}

// ──────────────────────────────────────────────────────────────
// Metadata
// ──────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const route = await prisma.railwayRoute.findFirst({
    where: { slug },
    select: {
      shortName: true,
      longName: true,
      brand: true,
      originName: true,
      destName: true,
      serviceType: true,
    },
  });

  if (!route) {
    return { title: "Línea no encontrada" };
  }

  const brandLabel = resolveBrandLabel(route.brand);
  const origin = route.originName || "";
  const dest = route.destName || "";
  const displayName = routeDisplayName(route.shortName, route.longName, origin, dest);

  const title = origin && dest
    ? `${brandLabel} ${displayName}: ${origin} — ${dest}`
    : `${brandLabel} ${displayName}`;

  const description = origin && dest
    ? `Línea ${brandLabel} ${displayName} de ${origin} a ${dest}: paradas, mapa del recorrido, alertas activas y horarios. Datos actualizados de Renfe.`
    : `Línea ${brandLabel} ${displayName}: paradas, mapa del recorrido y alertas activas. Datos actualizados de Renfe.`;

  return {
    title,
    description,
    keywords: [
      `${brandLabel} ${displayName}`,
      `tren ${origin} ${dest}`,
      `línea ${displayName}`,
      `Renfe ${brandLabel}`,
      `paradas ${displayName}`,
      "horarios tren",
      "alertas Renfe",
    ].filter(Boolean),
    alternates: {
      canonical: `${BASE_URL}/trenes/linea/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/trenes/linea/${slug}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

// ──────────────────────────────────────────────────────────────
// Page component
// ──────────────────────────────────────────────────────────────

export default async function LineaDetailPage({ params }: Props) {
  const { slug } = await params;

  // Fetch route
  const route = await prisma.railwayRoute.findFirst({
    where: { slug },
  });

  if (!route) {
    notFound();
  }

  // Fetch matched stations
  const stations =
    route.stopIds.length > 0
      ? await prisma.railwayStation.findMany({
          where: { stopId: { in: route.stopIds } },
          select: {
            stopId: true,
            name: true,
            slug: true,
            latitude: true,
            longitude: true,
            province: true,
            provinceName: true,
          },
        })
      : [];

  const stationMap = new Map(stations.map((s) => [s.stopId, s]));

  // Ordered station list
  const orderedStations = route.stopIds
    .map((id) => stationMap.get(id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  // Active alerts
  const alerts = await prisma.railwayAlert.findMany({
    where: {
      isActive: true,
      routeIds: { has: route.routeId },
    },
    select: {
      id: true,
      headerText: true,
      description: true,
      cause: true,
      effect: true,
      activePeriodStart: true,
      activePeriodEnd: true,
      url: true,
    },
    orderBy: { activePeriodStart: "desc" },
    take: 20,
  });

  // Related routes (same brand)
  const relatedRoutes = route.brand
    ? await prisma.railwayRoute.findMany({
        where: {
          brand: route.brand,
          id: { not: route.id },
          slug: { not: null },
        },
        select: {
          slug: true,
          shortName: true,
          longName: true,
          brand: true,
          color: true,
          originName: true,
          destName: true,
          stopsCount: true,
        },
        orderBy: { shortName: "asc" },
        take: 6,
      })
    : [];

  // Resolve display values
  const brandLabel = resolveBrandLabel(route.brand);
  const brandColor = resolveBrandColor(route.brand, route.color);
  const brandTextColor = resolveBrandTextColor(route.brand, route.textColor);
  const displayName = routeDisplayName(route.shortName, route.longName, route.originName, route.destName);
  const serviceLabel = SERVICE_TYPE_LABELS[route.serviceType] || route.serviceType.replace(/_/g, " ");

  // Prepare map data — bounds from stop coordinates
  const mapStops = orderedStations
    .filter((s) => s.latitude && s.longitude)
    .map((s) => ({
      name: s.name,
      lng: Number(s.longitude),
      lat: Number(s.latitude),
    }));
  const hasMap = mapStops.length > 0;

  // Breadcrumbs
  const breadcrumbs = [
    { name: "Inicio", href: "/" },
    { name: "Red Ferroviaria", href: "/trenes" },
    { name: "Lineas", href: "/trenes/lineas" },
    { name: brandLabel, href: `/trenes/lineas?brand=${encodeURIComponent(brandLabel)}` },
    { name: displayName, href: `/trenes/linea/${slug}` },
  ];

  // JSON-LD: TrainTrip (Trip subtype for train travel) + TravelAction
  const tripId = `${BASE_URL}/trenes/linea/${slug}#trip`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["TrainTrip", "Trip"],
        "@id": tripId,
        name: `${brandLabel} ${displayName}`,
        description:
          route.originName && route.destName
            ? `Línea ${brandLabel} ${displayName} de ${route.originName} a ${route.destName}`
            : `Línea ${brandLabel} ${displayName}`,
        url: `${BASE_URL}/trenes/linea/${slug}`,
        provider: {
          "@type": "Organization",
          name: "Renfe Operadora",
          url: "https://www.renfe.com",
        },
        trainName: route.shortName || displayName,
        trainNumber: route.shortName || undefined,
        ...(route.originName && {
          departureStation: {
            "@type": "TrainStation",
            name: route.originName,
          },
        }),
        ...(route.destName && {
          arrivalStation: {
            "@type": "TrainStation",
            name: route.destName,
          },
        }),
        ...(route.originName && {
          itinerary: {
            "@type": "ItemList",
            numberOfItems: route.stopsCount || orderedStations.length,
            itemListElement: orderedStations.slice(0, 30).map((s, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: s.name,
              ...(s.latitude && s.longitude && {
                item: {
                  "@type": "TrainStation",
                  name: s.name,
                  geo: {
                    "@type": "GeoCoordinates",
                    latitude: Number(s.latitude),
                    longitude: Number(s.longitude),
                  },
                },
              }),
            })),
          },
        }),
      },
      {
        "@type": "TravelAction",
        name: `Viajar en ${brandLabel} ${displayName}`,
        ...(route.originName && {
          fromLocation: { "@type": "TrainStation", name: route.originName },
        }),
        ...(route.destName && {
          toLocation: { "@type": "TrainStation", name: route.destName },
        }),
        provider: {
          "@type": "Organization",
          name: "Renfe Operadora",
          url: "https://www.renfe.com",
        },
        instrument: { "@id": tripId },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Breadcrumbs items={breadcrumbs} />

        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Brand badge */}
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold"
              style={{ backgroundColor: brandColor, color: brandTextColor }}
            >
              <Train className="w-4 h-4" />
              {brandLabel}
            </span>

            {/* Service type */}
            <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {serviceLabel}
            </span>

            {/* Network badge (if Cercanias) */}
            {route.network && (
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                Red {route.network}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-gray-900 dark:text-gray-100">
            {route.originName && route.destName
              ? `${route.originName} — ${route.destName}`
              : displayName}
          </h1>

          {route.originName && route.destName && (
            <p className="flex items-center gap-2 text-lg text-gray-600 dark:text-gray-400">
              <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: brandColor }} />
              <span className="font-medium text-gray-900 dark:text-gray-100">{displayName}</span>
            </p>
          )}
        </section>

        {/* ── Route map ──────────────────────────────────────── */}
        {hasMap && (
          <section>
            <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 text-lg mb-3 flex items-center gap-2">
              <Route className="w-5 h-5" style={{ color: brandColor }} />
              Mapa del recorrido y trenes en vivo
            </h2>
            <p className="sr-only">Mapa interactivo de la red ferroviaria con la linea {displayName}</p>
            <RouteMap stops={mapStops} color={brandColor} />
          </section>
        )}

        {/* ── Active alerts ───────────────────────────────────── */}
        {alerts.length > 0 && (
          <section>
            <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 text-lg mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Alertas activas
              <span className="font-mono text-sm font-normal text-gray-500">({alerts.length})</span>
            </h2>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        {alert.headerText && (
                          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                            {alert.headerText}
                          </p>
                        )}
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {alert.description}
                        </p>
                      </div>
                    </div>
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 whitespace-nowrap flex-shrink-0">
                      {ALERT_EFFECT_LABELS[alert.effect] || alert.effect}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Desde {new Date(alert.activePeriodStart).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {alert.activePeriodEnd && (
                      <span>
                        hasta {new Date(alert.activePeriodEnd).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                    {alert.url && (
                      <a
                        href={alert.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-tl-600 dark:text-tl-400 hover:underline ml-auto"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Mas info
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Stop sequence ───────────────────────────────────── */}
        {orderedStations.length > 0 && (
          <section>
            <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 text-lg mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" style={{ color: brandColor }} />
              Paradas
              <span className="font-mono text-sm font-normal text-gray-500">
                ({orderedStations.length})
              </span>
            </h2>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="relative pl-8 sm:pl-10">
                {/* Vertical timeline line */}
                <div
                  className="absolute left-[18px] sm:left-[22px] top-4 bottom-4 w-0.5"
                  style={{ backgroundColor: brandColor, opacity: 0.3 }}
                />

                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {orderedStations.map((station, index) => {
                    const isFirst = index === 0;
                    const isLast = index === orderedStations.length - 1;
                    const isEndpoint = isFirst || isLast;

                    return (
                      <li
                        key={station.stopId}
                        className="relative flex items-center gap-3 py-3 px-4 sm:px-5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        {/* Timeline dot */}
                        <div
                          className="absolute left-[-14px] sm:left-[-16px] flex items-center justify-center"
                        >
                          {isEndpoint ? (
                            <div
                              className="w-3.5 h-3.5 rounded-full border-[3px]"
                              style={{
                                borderColor: brandColor,
                                backgroundColor: isFirst ? brandColor : "#ffffff",
                              }}
                            />
                          ) : (
                            <Circle
                              className="w-2.5 h-2.5"
                              style={{ color: brandColor }}
                              fill={brandColor}
                              fillOpacity={0.4}
                            />
                          )}
                        </div>

                        {/* Station info */}
                        <div className="flex-1 min-w-0">
                          {station.slug ? (
                            <Link
                              href={`/trenes/estacion/${station.slug}`}
                              className="font-medium text-sm text-gray-900 dark:text-gray-100 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
                            >
                              {station.name}
                            </Link>
                          ) : (
                            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                              {station.name}
                            </span>
                          )}
                          {station.provinceName && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              {station.provinceName}
                            </span>
                          )}
                        </div>

                        {/* Endpoint labels */}
                        {isFirst && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            Origen
                          </span>
                        )}
                        {isLast && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            Destino
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* ── Route info ──────────────────────────────────────── */}
        <section>
          <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 text-lg mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-gray-400" />
            Informacion de la linea
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InfoCard label="Marca" value={brandLabel} color={brandColor} />
            <InfoCard label="Tipo de servicio" value={serviceLabel} />
            <InfoCard
              label="Paradas"
              value={
                route.stopsCount != null
                  ? route.stopsCount.toLocaleString("es-ES")
                  : orderedStations.length > 0
                    ? orderedStations.length.toLocaleString("es-ES")
                    : "—"
              }
              mono
            />
            <InfoCard
              label="Trenes/dia"
              value={route.tripCount != null ? route.tripCount.toLocaleString("es-ES") : "—"}
              mono
            />
          </div>
        </section>

        {/* ── Related routes ──────────────────────────────────── */}
        {relatedRoutes.length > 0 && (
          <section>
            <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 text-lg mb-3 flex items-center gap-2">
              <Train className="w-5 h-5" style={{ color: brandColor }} />
              Otras lineas {brandLabel}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {relatedRoutes.map((r) => {
                const rColor = resolveBrandColor(r.brand, r.color);
                const rName = r.shortName?.trim() || r.longName?.trim() || "Linea";

                return (
                  <Link
                    key={r.slug}
                    href={`/trenes/linea/${r.slug}`}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold text-white"
                        style={{ backgroundColor: rColor }}
                      >
                        {rName}
                      </span>
                      {r.stopsCount != null && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {r.stopsCount} paradas
                        </span>
                      )}
                    </div>
                    {r.originName && r.destName ? (
                      <p className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                        <span className="truncate">{r.originName}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{r.destName}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic truncate">
                        {r.longName || "—"}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Attribution ─────────────────────────────────────── */}
        <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Info className="w-3 h-3 flex-shrink-0" />
          Fuente: Renfe Operadora (GTFS, CC-BY 4.0). Datos actualizados semanalmente.
        </p>

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────

function InfoCard({
  label,
  value,
  color,
  mono,
}: {
  label: string;
  value: string;
  color?: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p
        className={`font-heading font-bold text-lg text-gray-900 dark:text-gray-100 ${mono ? "font-mono" : ""}`}
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </div>
  );
}
