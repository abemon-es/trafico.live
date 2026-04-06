import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import {
  Anchor,
  MapPin,
  Fuel,
  Navigation,
  Ship,
  Cloud,
  ShieldCheck,
  Train,
  Plane,
  Waves,
  Flag,
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

/** Return all unique port names from the DB */
const getAllPorts = cache(async () => {
  return prisma.maritimeStation.findMany({
    where: { port: { not: null } },
    select: { port: true },
    distinct: ["port"],
  });
});

/** Find all stations for a port slug */
const getPortStations = cache(async (slug: string) => {
  const allPorts = await getAllPorts();
  const matched = allPorts.find((p) => p.port != null && slugify(p.port) === slug);
  if (!matched?.port) return null;

  const stations = await prisma.maritimeStation.findMany({
    where: { port: matched.port },
    orderBy: [{ priceGasoleoA: "asc" }],
  });

  return { portName: matched.port, stations };
});

/** Find SpanishPort by slug for coordinates + metadata */
const getSpanishPort = cache(async (slug: string) => {
  return prisma.spanishPort.findUnique({
    where: { slug },
    select: {
      name: true,
      type: true,
      latitude: true,
      longitude: true,
      province: true,
      provinceName: true,
      coastalZone: true,
      stationCount: true,
    },
  });
});

/** Get vessels near port coordinates (bounding box, last 2h) */
const getPortVessels = cache(async (lat: number, lng: number) => {
  const latDelta = 0.045; // ~5km
  const lngDelta = 0.06;
  const since = new Date(Date.now() - 2 * 3600_000);

  const positions = await prisma.vesselPosition.findMany({
    where: {
      latitude: { gte: lat - latDelta, lte: lat + latDelta },
      longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
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
    take: 100,
  });

  return positions;
});

/** Get ferry stops near port coordinates (~10km) */
const getPortFerries = cache(async (lat: number, lng: number) => {
  const latDelta = 0.09; // ~10km
  const lngDelta = 0.12;

  const stops = await prisma.ferryStop.findMany({
    where: {
      latitude: { gte: lat - latDelta, lte: lat + latDelta },
      longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
    },
    include: {
      route: {
        select: {
          id: true,
          operator: true,
          routeName: true,
        },
      },
    },
    distinct: ["routeId"],
  });

  return stops;
});

/** Get nearest railway station within ~20km */
const getNearestRailway = cache(async (lat: number, lng: number) => {
  const latDelta = 0.18; // ~20km
  const lngDelta = 0.24;

  const stations = await prisma.railwayStation.findMany({
    where: {
      latitude: { gte: lat - latDelta, lte: lat + latDelta },
      longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
      locationType: { in: [0, 1] },
      parentId: null,
    },
    select: {
      name: true,
      slug: true,
      latitude: true,
      longitude: true,
    },
    take: 5,
  });

  // Calculate distance and return closest
  return stations
    .map((s) => ({
      ...s,
      distance: haversineKm(lat, lng, Number(s.latitude), Number(s.longitude)),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);
});

/** Get nearest airport within ~40km */
const getNearestAirport = cache(async (lat: number, lng: number) => {
  const latDelta = 0.36; // ~40km
  const lngDelta = 0.48;

  const airports = await prisma.airport.findMany({
    where: {
      latitude: { gte: lat - latDelta, lte: lat + latDelta },
      longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
    },
    select: {
      name: true,
      iata: true,
      latitude: true,
      longitude: true,
    },
    take: 5,
  });

  return airports
    .map((a) => ({
      ...a,
      distance: haversineKm(lat, lng, Number(a.latitude), Number(a.longitude)),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);
});

// ---------------------------------------------------------------------------
// Haversine distance (km)
// ---------------------------------------------------------------------------

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
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
// Ship type helpers
// ---------------------------------------------------------------------------

function getShipCategory(shipType: number | null): string {
  if (shipType == null) return "DESCONOCIDO";
  if (shipType >= 70 && shipType <= 79) return "CARGO";
  if (shipType >= 80 && shipType <= 89) return "TANKER";
  if (shipType === 31 || shipType === 32) return "TUG";
  if (shipType === 36 || shipType === 37) return "SAILING";
  if (shipType >= 30 && shipType <= 39) return "FISHING";
  if (shipType >= 60 && shipType <= 69) return "PASSENGER";
  return "OTRO";
}

function getShipCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    CARGO: "Carga",
    TANKER: "Petrolero",
    FISHING: "Pesca",
    PASSENGER: "Pasaje",
    TUG: "Remolcador",
    SAILING: "Velero",
    OTRO: "Otro",
    DESCONOCIDO: "Desconocido",
  };
  return labels[category] || category;
}

function getShipCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    CARGO: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    TANKER: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    FISHING: "bg-tl-sea-100 text-tl-sea-700 dark:bg-tl-sea-900/40 dark:text-tl-sea-300",
    PASSENGER: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    TUG: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    SAILING: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    OTRO: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    DESCONOCIDO: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
  };
  return colors[category] || colors.OTRO;
}

function getNavStatusLabel(navStatus: number | null): string {
  switch (navStatus) {
    case 0: return "En navegacion";
    case 1: return "Fondeado";
    case 5: return "Amarrado";
    case 7: return "Pescando";
    case 8: return "A vela";
    default: return null as unknown as string;
  }
}

function getNavStatusBadge(navStatus: number | null): string | null {
  switch (navStatus) {
    case 1: return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300";
    case 5: return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
    case 0: return "bg-tl-sea-100 text-tl-sea-700 dark:bg-tl-sea-900/40 dark:text-tl-sea-300";
    default: return null;
  }
}

/** Country code to flag emoji */
function flagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return "";
  const offset = 0x1f1e6 - 65; // 'A' = 65
  return String.fromCodePoint(
    code.charCodeAt(0) + offset,
    code.charCodeAt(1) + offset
  );
}

/** Port type label in Spanish */
function portTypeLabel(type: string | null): string | null {
  const labels: Record<string, string> = {
    COMMERCIAL: "Comercial",
    FISHING: "Pesquero",
    SPORTS: "Deportivo",
    MIXED: "Mixto",
  };
  return type ? labels[type] || null : null;
}

// ---------------------------------------------------------------------------
// Static params
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const ports = await getAllPorts();
  return ports
    .filter((p) => p.port != null)
    .map((p) => ({ slug: slugify(p.port as string) }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPortStations(slug);

  if (!result) {
    return { title: "Puerto no encontrado" };
  }

  const { portName, stations } = result;
  const province = stations[0]?.provinceName ?? null;
  const cheapestGasoleoA = stations
    .map((s) => (s.priceGasoleoA != null ? Number(s.priceGasoleoA) : null))
    .filter((p): p is number => p != null)
    .sort((a, b) => a - b)[0];

  return {
    title: `Puerto de ${portName}`,
    description: `Estaciones de combustible nautico en el Puerto de ${portName}${province ? `, ${province}` : ""}. ${cheapestGasoleoA != null ? `Gasoleo A desde ${cheapestGasoleoA.toFixed(3)} EUR/L.` : ""} ${stations.length} estaciones disponibles. Trafico de buques en tiempo real.`,
    alternates: {
      canonical: `${BASE_URL}/maritimo/puertos/${slug}`,
    },
    openGraph: {
      title: `Puerto de ${portName} — Combustible Nautico y Trafico de Buques | trafico.live`,
      description: `Precios de combustible nautico y trafico maritimo en tiempo real en el Puerto de ${portName}. ${stations.length} estaciones disponibles con datos del MITERD.`,
      url: `${BASE_URL}/maritimo/puertos/${slug}`,
      type: "website",
      locale: "es_ES",
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(value: unknown): string {
  if (value == null) return "N/D";
  const num = typeof value === "object" && value !== null && "toNumber" in value
    ? (value as { toNumber: () => number }).toNumber()
    : Number(value);
  return `${num.toFixed(3)} €`;
}

function toNum(value: unknown): number | null {
  if (value == null) return null;
  const num = typeof value === "object" && value !== null && "toNumber" in value
    ? (value as { toNumber: () => number }).toNumber()
    : Number(value);
  return isNaN(num) ? null : num;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PortDetailPage({ params }: Props) {
  const { slug } = await params;
  const result = await getPortStations(slug);

  if (!result) {
    notFound();
  }

  const { portName, stations } = result;

  // Try SpanishPort for authoritative coordinates + metadata
  const spanishPort = await getSpanishPort(slug);

  const province = spanishPort?.provinceName ?? stations[0]?.provinceName ?? null;
  const lat = spanishPort
    ? Number(spanishPort.latitude)
    : stations[0]
      ? toNum(stations[0].latitude)
      : null;
  const lon = spanishPort
    ? Number(spanishPort.longitude)
    : stations[0]
      ? toNum(stations[0].longitude)
      : null;

  // Fetch live data in parallel (only if we have coordinates)
  const [vessels, ferryStops, nearbyRailway, nearbyAirports] =
    lat != null && lon != null
      ? await Promise.all([
          getPortVessels(lat, lon),
          getPortFerries(lat, lon),
          getNearestRailway(lat, lon),
          getNearestAirport(lat, lon),
        ])
      : [[], [], [], []];

  // Vessel category grouping
  const vesselsByCategory: Record<string, typeof vessels> = {};
  for (const v of vessels) {
    const cat = getShipCategory(v.vessel.shipType);
    if (!vesselsByCategory[cat]) vesselsByCategory[cat] = [];
    vesselsByCategory[cat].push(v);
  }

  // Unique ferry routes
  const ferryRoutes = ferryStops.map((s) => s.route);
  const uniqueFerryRoutes = Array.from(
    new Map(ferryRoutes.map((r) => [r.id, r])).values()
  );

  // Cheapest prices across the port
  const gasoleoAPrices = stations
    .map((s) => toNum(s.priceGasoleoA))
    .filter((p): p is number => p != null);
  const gasolina95Prices = stations
    .map((s) => toNum(s.priceGasolina95E5))
    .filter((p): p is number => p != null);
  const gasoleoAPrices_sorted = [...gasoleoAPrices].sort((a, b) => a - b);
  const gasolina95Prices_sorted = [...gasolina95Prices].sort((a, b) => a - b);

  const cheapestGasoleoA = gasoleoAPrices_sorted[0] ?? null;
  const cheapestGasolina95 = gasolina95Prices_sorted[0] ?? null;

  const googleMapsUrl =
    lat != null && lon != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`
      : null;

  // Port type label
  const typeLabel = portTypeLabel(spanishPort?.type ?? null);

  // JSON-LD LocalBusiness
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${BASE_URL}/maritimo/puertos/${slug}`,
    name: `Puerto de ${portName}`,
    description: `Estaciones de suministro de combustible nautico en el Puerto de ${portName}`,
    url: `${BASE_URL}/maritimo/puertos/${slug}`,
    ...(province && { address: { "@type": "PostalAddress", addressLocality: province, addressCountry: "ES" } }),
    ...(lat != null && lon != null && {
      geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lon },
      hasMap: googleMapsUrl,
    }),
    ...(cheapestGasoleoA != null && {
      offers: [
        {
          "@type": "Offer",
          name: "Gasoleo A",
          price: cheapestGasoleoA.toFixed(3),
          priceCurrency: "EUR",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: cheapestGasoleoA.toFixed(3),
            priceCurrency: "EUR",
            unitText: "L",
          },
        },
      ],
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Hero */}
        <div className="bg-gradient-to-br from-tl-sea-700 via-tl-sea-600 to-tl-sea-500 text-white">
          <div className="max-w-5xl mx-auto px-4 py-10 sm:py-12">
            <Breadcrumbs
              items={[
                { name: "Inicio", href: "/" },
                { name: "Maritimo", href: "/maritimo" },
                { name: "Puertos", href: "/maritimo/puertos" },
                { name: portName, href: `/maritimo/puertos/${slug}` },
              ]}
            />

            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Anchor className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-heading font-bold">
                    Puerto de {portName}
                  </h1>
                  <div className="flex items-center gap-3 mt-1 text-tl-sea-100">
                    {province && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {province}
                      </span>
                    )}
                    {typeLabel && (
                      <span className="px-2 py-0.5 bg-white/15 rounded text-xs font-medium">
                        {typeLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {googleMapsUrl && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  Como llegar
                </a>
              )}
            </div>

            {/* Summary stats */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white/10 rounded-xl p-3.5">
                <div className="text-xs text-tl-sea-100">Gasoleo A (min.)</div>
                <div className="font-data font-bold text-lg tabular-nums mt-0.5">
                  {cheapestGasoleoA != null
                    ? `${cheapestGasoleoA.toFixed(3)} €`
                    : "N/D"}
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3.5">
                <div className="text-xs text-tl-sea-100">Gasolina 95 (min.)</div>
                <div className="font-data font-bold text-lg tabular-nums mt-0.5">
                  {cheapestGasolina95 != null
                    ? `${cheapestGasolina95.toFixed(3)} €`
                    : "N/D"}
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3.5">
                <div className="text-xs text-tl-sea-100">Estaciones</div>
                <div className="font-data font-bold text-lg tabular-nums mt-0.5">
                  {stations.length}
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3.5">
                <div className="text-xs text-tl-sea-100">24h disponibles</div>
                <div className="font-data font-bold text-lg tabular-nums mt-0.5">
                  {stations.filter((s) => s.is24h).length}
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3.5">
                <div className="text-xs text-tl-sea-100">Buques en zona</div>
                <div className="font-data font-bold text-lg tabular-nums mt-0.5">
                  {vessels.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
          {/* ============================================================= */}
          {/* SECTION: Live vessels in port                                  */}
          {/* ============================================================= */}
          {vessels.length > 0 && (
            <section>
              <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Ship className="w-5 h-5 text-tl-sea-500" />
                Trafico maritimo en tiempo real
              </h2>

              {/* Category distribution badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(vesselsByCategory)
                  .sort(([, a], [, b]) => b.length - a.length)
                  .map(([cat, items]) => (
                    <span
                      key={cat}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${getShipCategoryColor(cat)}`}
                    >
                      {getShipCategoryLabel(cat)}
                      <span className="font-data font-bold tabular-nums">
                        {items.length}
                      </span>
                    </span>
                  ))}
              </div>

              {/* Vessel list */}
              <div className="grid gap-2">
                {vessels.slice(0, 30).map((pos) => {
                  const cat = getShipCategory(pos.vessel.shipType);
                  const statusLabel = getNavStatusLabel(pos.navStatus);
                  const statusBadge = getNavStatusBadge(pos.navStatus);

                  return (
                    <div
                      key={pos.mmsi}
                      className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3"
                    >
                      {/* Flag + Name */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {pos.vessel.flag && (
                          <span className="text-lg flex-shrink-0" title={pos.vessel.flag}>
                            {flagEmoji(pos.vessel.flag)}
                          </span>
                        )}
                        <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {pos.vessel.name || `MMSI ${pos.mmsi}`}
                        </span>
                        <span
                          className={`flex-shrink-0 text-xs font-medium px-1.5 py-0.5 rounded ${getShipCategoryColor(cat)}`}
                        >
                          {getShipCategoryLabel(cat)}
                        </span>
                      </div>

                      {/* Speed + Status */}
                      <div className="flex items-center gap-3 text-sm">
                        {pos.sog != null && pos.sog > 0 && (
                          <span className="font-data tabular-nums text-gray-600 dark:text-gray-400">
                            {pos.sog.toFixed(1)} kn
                          </span>
                        )}
                        {statusLabel && statusBadge && (
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${statusBadge}`}
                          >
                            {statusLabel}
                          </span>
                        )}
                        {pos.vessel.length != null && pos.vessel.length > 0 && (
                          <span className="font-data tabular-nums text-gray-500 dark:text-gray-500 text-xs">
                            {pos.vessel.length}m
                          </span>
                        )}
                        {pos.vessel.destination && (
                          <span className="text-xs text-gray-500 dark:text-gray-500 truncate max-w-[120px]" title={pos.vessel.destination}>
                            <Flag className="w-3 h-3 inline mr-0.5" />
                            {pos.vessel.destination}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {vessels.length > 30 && (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                  Mostrando 30 de {vessels.length} buques en la zona
                </p>
              )}

              <p className="mt-3 text-xs text-gray-400 dark:text-gray-600">
                Posiciones AIS en las ultimas 2 horas. Radio de ~5 km del centro del puerto.
                Fuente: aisstream.io
              </p>
            </section>
          )}

          {/* ============================================================= */}
          {/* SECTION: Ferry connections                                     */}
          {/* ============================================================= */}
          {uniqueFerryRoutes.length > 0 && (
            <section>
              <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Ship className="w-5 h-5 text-tl-sea-500" />
                Conexiones de ferry
              </h2>

              <div className="grid gap-3 sm:grid-cols-2">
                {uniqueFerryRoutes.map((route) => (
                  <div
                    key={route.id}
                    className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md hover:border-tl-sea-300 dark:hover:border-tl-sea-700 transition-all"
                  >
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {route.routeName}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Operador: {route.operator}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============================================================= */}
          {/* SECTION: Intermodal connections                                */}
          {/* ============================================================= */}
          {(nearbyRailway.length > 0 || nearbyAirports.length > 0) && (
            <section>
              <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-tl-sea-500" />
                Conexiones intermodales
              </h2>

              <div className="grid gap-3 sm:grid-cols-2">
                {nearbyRailway.map((station) => (
                  <Link
                    key={station.slug ?? station.name}
                    href={station.slug ? `/trenes/estaciones/${station.slug}` : "/trenes/estaciones"}
                    className="group flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md hover:border-tl-sea-300 dark:hover:border-tl-sea-700 transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-tl-sea-50 dark:bg-tl-sea-950 flex items-center justify-center flex-shrink-0">
                      <Train className="w-5 h-5 text-tl-sea-600 dark:text-tl-sea-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-sea-700 dark:group-hover:text-tl-sea-300 transition-colors truncate">
                        {station.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-data tabular-nums">
                        {station.distance.toFixed(1)} km
                      </div>
                    </div>
                  </Link>
                ))}

                {nearbyAirports.map((airport) => (
                  <Link
                    key={airport.iata ?? airport.name}
                    href="/aviacion"
                    className="group flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md hover:border-tl-sea-300 dark:hover:border-tl-sea-700 transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-tl-sea-50 dark:bg-tl-sea-950 flex items-center justify-center flex-shrink-0">
                      <Plane className="w-5 h-5 text-tl-sea-600 dark:text-tl-sea-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-sea-700 dark:group-hover:text-tl-sea-300 transition-colors truncate">
                        {airport.name}
                        {airport.iata && (
                          <span className="ml-1.5 text-xs font-data text-gray-500 dark:text-gray-400">
                            ({airport.iata})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-data tabular-nums">
                        {airport.distance.toFixed(1)} km
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ============================================================= */}
          {/* SECTION: Maritime weather link                                 */}
          {/* ============================================================= */}
          {spanishPort?.coastalZone && (
            <section>
              <Link
                href={`/maritimo/meteorologia`}
                className="group flex items-center gap-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md hover:border-tl-sea-300 dark:hover:border-tl-sea-700 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-tl-sea-50 dark:bg-tl-sea-950 flex items-center justify-center flex-shrink-0">
                  <Waves className="w-6 h-6 text-tl-sea-600 dark:text-tl-sea-400" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-sea-700 dark:group-hover:text-tl-sea-300 transition-colors">
                    Meteorologia costera — {spanishPort.coastalZone}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Previsiones para navegacion en la zona de {portName}
                  </div>
                </div>
              </Link>
            </section>
          )}

          {/* ============================================================= */}
          {/* SECTION: Fuel stations (original)                             */}
          {/* ============================================================= */}
          <section>
            <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Fuel className="w-5 h-5 text-tl-sea-500" />
              Estaciones de combustible
            </h2>

            {stations.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                No hay estaciones registradas en este puerto.
              </div>
            ) : (
              <div className="space-y-3">
                {stations.map((station, index) => {
                  const gasoleoANum = toNum(station.priceGasoleoA);
                  const gasolina95Num = toNum(station.priceGasolina95E5);
                  const gasoleoBNum = toNum(station.priceGasoleoB);
                  const isCheapestGasoleoA =
                    gasoleoANum != null && gasoleoANum === cheapestGasoleoA;

                  return (
                    <Link
                      key={station.id}
                      href={`/gasolineras/maritimas/${station.id}`}
                      className="group block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md hover:border-tl-sea-300 dark:hover:border-tl-sea-700 transition-all"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-400 dark:text-gray-600 w-6 text-right flex-shrink-0">
                              {index + 1}.
                            </span>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-sea-700 dark:group-hover:text-tl-sea-300 transition-colors truncate">
                              {station.name}
                            </h3>
                            {station.is24h && (
                              <span className="flex-shrink-0 text-xs font-medium px-1.5 py-0.5 bg-tl-sea-100 dark:bg-tl-sea-900/40 text-tl-sea-700 dark:text-tl-sea-300 rounded">
                                24h
                              </span>
                            )}
                            {isCheapestGasoleoA && (
                              <span className="flex-shrink-0 text-xs font-medium px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded">
                                Mas barata
                              </span>
                            )}
                          </div>
                          {station.locality && (
                            <div className="flex items-center gap-1 ml-8 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              <MapPin className="w-3 h-3" />
                              {station.locality}
                            </div>
                          )}
                        </div>

                        {/* Prices */}
                        <div className="flex flex-wrap gap-4 ml-8 sm:ml-0">
                          {gasoleoANum != null && (
                            <div className="text-right">
                              <div className="text-xs text-gray-500 dark:text-gray-400">Gasoleo A</div>
                              <div
                                className={`font-data font-semibold tabular-nums ${
                                  isCheapestGasoleoA
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-tl-sea-700 dark:text-tl-sea-300"
                                }`}
                              >
                                {formatPrice(station.priceGasoleoA)}
                              </div>
                            </div>
                          )}
                          {gasoleoBNum != null && (
                            <div className="text-right">
                              <div className="text-xs text-gray-500 dark:text-gray-400">Gasoleo B</div>
                              <div className="font-data font-semibold tabular-nums text-tl-sea-700 dark:text-tl-sea-300">
                                {formatPrice(station.priceGasoleoB)}
                              </div>
                            </div>
                          )}
                          {gasolina95Num != null && (
                            <div className="text-right">
                              <div className="text-xs text-gray-500 dark:text-gray-400">Gasolina 95</div>
                              <div className="font-data font-semibold tabular-nums text-tl-sea-700 dark:text-tl-sea-300">
                                {formatPrice(station.priceGasolina95E5)}
                              </div>
                            </div>
                          )}
                          {gasoleoANum == null && gasoleoBNum == null && gasolina95Num == null && (
                            <span className="text-sm text-gray-400 dark:text-gray-600 italic">
                              Precios no disponibles
                            </span>
                          )}
                        </div>
                      </div>

                      {station.schedule && (
                        <div className="mt-2 ml-8 text-xs text-gray-500 dark:text-gray-400">
                          <Ship className="w-3 h-3 inline mr-1" />
                          {station.schedule}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Data attribution */}
            <p className="mt-6 text-xs text-gray-400 dark:text-gray-600 text-center">
              Precios actualizados desde el Ministerio para la Transicion Ecologica y el Reto
              Demografico (MITERD). Datos orientativos — verifica con la estacion antes de zarpar.
            </p>
          </section>

          {/* Back link */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
            <Link
              href="/maritimo/puertos"
              className="inline-flex items-center gap-2 text-tl-sea-600 dark:text-tl-sea-400 hover:text-tl-sea-700 dark:hover:text-tl-sea-300 text-sm font-medium transition-colors"
            >
              <Anchor className="w-4 h-4" />
              Ver todos los puertos
            </Link>
          </div>

          <RelatedLinks links={[
            { title: "Hub Maritimo", description: "Informacion maritima de Espana: puertos, combustible y seguridad", href: "/maritimo", icon: <Anchor className="w-5 h-5" /> },
            { title: "Meteorologia costera", description: "Previsiones meteorologicas para navegacion costera", href: "/maritimo/meteorologia", icon: <Cloud className="w-5 h-5" /> },
            { title: "Combustible maritimo", description: "Precios de combustible nautico en puertos espanoles", href: "/maritimo/combustible", icon: <Fuel className="w-5 h-5" /> },
            { title: "Seguridad maritima", description: "Avisos y normas de seguridad para la navegacion", href: "/maritimo/seguridad", icon: <ShieldCheck className="w-5 h-5" /> },
          ]} />
        </div>
      </div>
    </>
  );
}
