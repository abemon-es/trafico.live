import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import {
  Ship,
  Anchor,
  Navigation,
  Compass,
  Flag,
  Ruler,
  MapPin,
  Clock,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { VesselVoyageHistory } from "@/components/maritimo/VesselVoyageHistory";
import { VesselOverview } from "@/components/maritimo/VesselOverview";
import { VesselLiveMap } from "@/components/maritimo/VesselLiveMap";
import { vesselSlug, parseVesselSlug } from "@/lib/vessel-utils";
import { NAV_STATUS, shipTypeLabel, cleanDestination, cleanEta } from "@/lib/ais-labels";

export const revalidate = 120;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classifyShipType(type: number | null): {
  label: string;
  slug: string;
  color: string;
  bgColor: string;
} {
  if (type === null || type === undefined)
    return { label: "Desconocido", slug: "desconocido", color: "text-gray-500", bgColor: "bg-gray-100 dark:bg-gray-800" };
  if (type >= 70 && type <= 79)
    return { label: "Carga", slug: "carga", color: "text-indigo-600 dark:text-indigo-400", bgColor: "bg-indigo-100 dark:bg-indigo-900/40" };
  if (type >= 80 && type <= 89)
    return { label: "Petrolero", slug: "petrolero", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/40" };
  if (type >= 60 && type <= 69)
    return { label: "Pasajeros", slug: "pasajeros", color: "text-sky-600 dark:text-sky-400", bgColor: "bg-sky-100 dark:bg-sky-900/40" };
  if (type === 30)
    return { label: "Pesca", slug: "pesca", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/40" };
  if (type >= 31 && type <= 32)
    return { label: "Remolcador", slug: "remolcador", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/40" };
  if (type >= 36 && type <= 37)
    return { label: "Velero", slug: "velero", color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-100 dark:bg-violet-900/40" };
  if (type >= 40 && type <= 49)
    return { label: "Embarcacion rapida", slug: "embarcacion-rapida", color: "text-cyan-600 dark:text-cyan-400", bgColor: "bg-cyan-100 dark:bg-cyan-900/40" };
  if (type === 51)
    return { label: "SAR", slug: "sar", color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-900/40" };
  if (type === 55)
    return { label: "Policia", slug: "policia", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/40" };
  return { label: shipTypeLabel(type), slug: "otro", color: "text-gray-600 dark:text-gray-400", bgColor: "bg-gray-100 dark:bg-gray-800" };
}

function flagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

const FLAG_NAMES: Record<string, string> = {
  ES: "Espana",
  PT: "Portugal",
  FR: "Francia",
  IT: "Italia",
  GB: "Reino Unido",
  DE: "Alemania",
  NL: "Paises Bajos",
  GR: "Grecia",
  MT: "Malta",
  CY: "Chipre",
  PA: "Panama",
  LR: "Liberia",
  MH: "Islas Marshall",
  HK: "Hong Kong",
  SG: "Singapur",
  BS: "Bahamas",
  BM: "Bermudas",
  NO: "Noruega",
  DK: "Dinamarca",
  SE: "Suecia",
  FI: "Finlandia",
  BE: "Belgica",
  US: "Estados Unidos",
  TR: "Turquia",
  MA: "Marruecos",
  DZ: "Argelia",
  GI: "Gibraltar",
  HR: "Croacia",
  AG: "Antigua y Barbuda",
  IE: "Irlanda",
  PL: "Polonia",
  RU: "Rusia",
  CN: "China",
  JP: "Japon",
  KR: "Corea del Sur",
  IN: "India",
  BR: "Brasil",
  CL: "Chile",
  MX: "Mexico",
  AR: "Argentina",
  PH: "Filipinas",
  VU: "Vanuatu",
  TG: "Togo",
  KN: "San Cristobal y Nieves",
  AD: "Andorra",
};

function flagName(code: string | null): string {
  if (!code) return "Desconocido";
  return FLAG_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

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

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "hace menos de 1 minuto";
  if (mins < 60) return `hace ${mins} minuto${mins === 1 ? "" : "s"}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} hora${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `hace ${days} dia${days === 1 ? "" : "s"}`;
}

function compassDirection(degrees: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
  const index = Math.round(degrees / 22.5) % 16;
  return dirs[index];
}

// ---------------------------------------------------------------------------
// Data fetching (cached for deduplication within the same request)
// ---------------------------------------------------------------------------

const KM_PER_DEG_LAT = 111;

const getVessel = cache(async (mmsi: number) => {
  return prisma.vessel.findUnique({ where: { mmsi } });
});

const getLatestPosition = cache(async (mmsi: number) => {
  const since48h = new Date(Date.now() - 48 * 3600_000);
  return prisma.vesselPosition.findFirst({
    where: { mmsi, createdAt: { gte: since48h } },
    orderBy: { createdAt: "desc" },
  });
});

const getPositionCount = cache(async (mmsi: number) => {
  const since48h = new Date(Date.now() - 48 * 3600_000);
  return prisma.vesselPosition.count({
    where: { mmsi, createdAt: { gte: since48h } },
  });
});

const getNearestPort = cache(async (lat: number, lng: number) => {
  const latDelta = 200 / KM_PER_DEG_LAT;
  const lngDelta = 200 / (KM_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));

  const ports = await prisma.spanishPort.findMany({
    where: {
      latitude: { gte: lat - latDelta, lte: lat + latDelta },
      longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
    },
    select: { name: true, slug: true, latitude: true, longitude: true },
  });

  let minDist = Infinity;
  let nearest: { name: string; slug: string; distanceKm: number } | null = null;

  for (const port of ports) {
    const dist = haversineKm(lat, lng, Number(port.latitude), Number(port.longitude));
    if (dist < minDist) {
      minDist = dist;
      nearest = { name: port.name, slug: port.slug, distanceKm: Math.round(dist * 10) / 10 };
    }
  }

  return nearest;
});

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { mmsi } = parseVesselSlug(slug);
  if (!mmsi) return { title: "Buque no encontrado" };

  const vessel = await getVessel(mmsi);
  if (!vessel) return { title: "Buque no encontrado" };

  const name = vessel.name || `Buque MMSI ${mmsi}`;
  const category = classifyShipType(vessel.shipType);
  const flagStr = vessel.flag ? ` (${vessel.flag})` : "";
  const imoStr = vessel.imo ? `, IMO: ${vessel.imo}` : "";
  const cleanDest = cleanDestination(vessel.destination);
  const destStr = cleanDest ? `. Destino: ${cleanDest}` : "";
  const latestPos = await getLatestPosition(mmsi);
  const posStr = latestPos
    ? `, ultima posicion ${timeAgo(latestPos.createdAt)}`
    : "";

  const canonicalSlug = vesselSlug(mmsi, vessel.name);
  const title = `${name}${flagStr} — ${category.label} en tiempo real | Trafico.live`;
  const description = `Seguimiento en tiempo real del buque ${name} (MMSI: ${mmsi}${imoStr}). Tipo: ${category.label}${destStr}${posStr}. Datos AIS actualizados.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/maritimo/buques/${canonicalSlug}`,
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/maritimo/buques/${canonicalSlug}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function VesselPage({ params }: PageProps) {
  const { slug } = await params;
  const { mmsi } = parseVesselSlug(slug);

  if (!mmsi || mmsi < 100000000 || mmsi > 999999999) {
    notFound();
  }

  const vessel = await getVessel(mmsi);
  if (!vessel) notFound();

  // Canonical slug for this vessel
  const canonicalSlug = vesselSlug(mmsi, vessel.name);

  // Redirect mmsi-only or stale-slug URLs to canonical slug (301)
  if (slug !== canonicalSlug) {
    redirect(`/maritimo/buques/${canonicalSlug}`);
  }

  const latestPos = await getLatestPosition(mmsi);
  const positionCount = await getPositionCount(mmsi);

  // Quality gate: no name AND no positions in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000);
  const hasRecentPositions = latestPos ? latestPos.createdAt > thirtyDaysAgo : false;
  if (!vessel.name && !hasRecentPositions) {
    notFound();
  }

  const category = classifyShipType(vessel.shipType);
  const latestLat = latestPos ? Number(latestPos.latitude) : null;
  const latestLng = latestPos ? Number(latestPos.longitude) : null;

  const nearestPort =
    latestLat !== null && latestLng !== null
      ? await getNearestPort(latestLat, latestLng)
      : null;

  const displayName = vessel.name || `Buque MMSI ${mmsi}`;

  // Signal age thresholds
  const signalAgeMs = latestPos ? Date.now() - latestPos.createdAt.getTime() : Infinity;
  const isRecent = signalAgeMs < 10 * 60_000;      // < 10 min
  const isSignalLost = signalAgeMs > 15 * 60_000;  // > 15 min

  // Sanitize AIS fields
  const cleanDest = cleanDestination(vessel.destination);
  const cleanEtaDate = cleanEta(vessel.eta ?? null);

  // Nav status label (from latest position row, not vessel table)
  const navStatusLabel =
    latestPos?.navStatus != null
      ? (NAV_STATUS[latestPos.navStatus] ?? `Estado ${latestPos.navStatus}`)
      : "Desconocido";

  // JSON-LD: Vehicle schema
  const identifiers: object[] = [
    { "@type": "PropertyValue", propertyID: "MMSI", value: mmsi },
  ];
  if (vessel.imo) {
    identifiers.push({ "@type": "PropertyValue", propertyID: "IMO", value: vessel.imo });
  }
  if (vessel.callsign) {
    identifiers.push({ "@type": "PropertyValue", propertyID: "callsign", value: vessel.callsign });
  }

  const additionalProperties: object[] = [];
  if (vessel.length) {
    additionalProperties.push({ "@type": "PropertyValue", name: "Length", value: vessel.length, unitText: "m" });
  }
  if (vessel.beam) {
    additionalProperties.push({ "@type": "PropertyValue", name: "Beam", value: vessel.beam, unitText: "m" });
  }
  if (vessel.draught) {
    additionalProperties.push({ "@type": "PropertyValue", name: "Draught", value: Number(vessel.draught), unitText: "m" });
  }

  const vehicleSchema = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: displayName,
    identifier: identifiers,
    description: `Buque ${category.label.toLowerCase()}${vessel.flag ? ` de bandera ${flagName(vessel.flag)}` : ""}. MMSI: ${mmsi}${vessel.imo ? `, IMO: ${vessel.imo}` : ""}.`,
    url: `${BASE_URL}/maritimo/buques/${canonicalSlug}`,
    vehicleConfiguration: category.label,
    ...(vessel.flag && {
      countryOfOrigin: { "@type": "Country", name: flagName(vessel.flag) },
    }),
    ...(additionalProperties.length > 0 && { additionalProperty: additionalProperties }),
  };

  return (
    <>
      <StructuredData data={vehicleSchema} />

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Maritimo", href: "/maritimo" },
            { name: "Buques", href: "/maritimo" },
            { name: displayName, href: `/maritimo/buques/${canonicalSlug}` },
          ]}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--color-tl-sea-800) 0%, var(--color-tl-sea-600) 50%, var(--color-tl-sea-500) 100%)",
        }}
      >
        {/* Decorative elements */}
        <div
          className="pointer-events-none absolute -bottom-12 -right-12 w-72 h-72 rounded-full opacity-10"
          style={{ background: "var(--color-tl-sea-300)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -top-8 -left-8 w-48 h-48 rounded-full opacity-10"
          style={{ background: "var(--color-tl-sea-200)" }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="flex items-center gap-3 mb-4">
            <Ship className="w-10 h-10 text-tl-sea-200" />
            <span className="font-heading text-tl-sea-200 text-sm font-semibold uppercase tracking-widest">
              Seguimiento AIS
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-white leading-tight">
              {displayName}
            </h1>
            {vessel.flag && (
              <span className="text-3xl" title={flagName(vessel.flag)}>
                {flagEmoji(vessel.flag)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Type badge */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${category.bgColor} ${category.color}`}>
              <Ship className="w-4 h-4" />
              {category.label}
            </span>
            {vessel.flag && (
              <span className="text-tl-sea-200 text-sm">
                {flagName(vessel.flag)}
              </span>
            )}
          </div>

          {/* Identifiers in mono */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-tl-sea-200 text-sm">
            <span className="font-mono">MMSI: {mmsi}</span>
            {vessel.imo && <span className="font-mono">IMO: {vessel.imo}</span>}
            {vessel.callsign && <span className="font-mono">Indicativo: {vessel.callsign}</span>}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">

        {/* ---------------------------------------------------------------- */}
        {/* Live map with current position + 24h track                        */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Mapa en vivo">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-tl-sea-500" />
            Mapa en vivo
          </h2>
          <VesselLiveMap
            mmsi={vessel.mmsi}
            name={vessel.name}
            initialPosition={
              latestPos
                ? {
                    lat: Number(latestPos.latitude),
                    lng: Number(latestPos.longitude),
                    sog: latestPos.sog,
                    cog: latestPos.cog,
                    heading: latestPos.heading,
                  }
                : undefined
            }
          />
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Vessel overview: status + 30d stats + top ports                   */}
        {/* ---------------------------------------------------------------- */}
        <VesselOverview mmsi={vessel.mmsi} />

        {/* ---------------------------------------------------------------- */}
        {/* Current status card                                               */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Estado actual">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-tl-sea-500" />
            Estado actual
          </h2>
          <div className="rounded-2xl border border-tl-sea-200 dark:border-tl-sea-800/50 bg-white dark:bg-gray-900 shadow-sm p-6">
            {latestPos ? (
              <>
                {/* Signal lost banner */}
                {isSignalLost && (
                  <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      Senal perdida — ultima posicion {timeAgo(latestPos.createdAt)}. Los datos de velocidad y rumbo pueden no ser actuales.
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {/* Nav status */}
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Estado de navegacion</div>
                    <div className="flex items-center gap-2">
                      {isRecent && (
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                        </span>
                      )}
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {navStatusLabel}
                      </span>
                    </div>
                  </div>

                  {/* Speed (SOG) — dimmed if signal lost */}
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Velocidad (SOG){isSignalLost ? " *" : ""}
                    </div>
                    <div className={`font-mono text-lg font-bold ${isSignalLost ? "text-gray-400 dark:text-gray-600" : "text-tl-sea-700 dark:text-tl-sea-300"}`}>
                      {latestPos.sog !== null ? `${Number(latestPos.sog).toFixed(1)} kn` : "N/D"}
                    </div>
                  </div>

                  {/* Course (COG) — dimmed if signal lost */}
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Rumbo (COG){isSignalLost ? " *" : ""}
                    </div>
                    <div className="flex items-center gap-2">
                      <Compass className="w-5 h-5 text-tl-sea-500" />
                      <span className={`font-mono text-lg font-bold ${isSignalLost ? "text-gray-400 dark:text-gray-600" : "text-tl-sea-700 dark:text-tl-sea-300"}`}>
                        {latestPos.cog !== null ? `${Number(latestPos.cog).toFixed(0)}° ${compassDirection(Number(latestPos.cog))}` : "N/D"}
                      </span>
                    </div>
                  </div>

                  {/* Heading */}
                  {latestPos.heading !== null && latestPos.heading !== 511 && (
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Proa</div>
                      <div className="font-mono text-lg font-bold text-tl-sea-700 dark:text-tl-sea-300">
                        {latestPos.heading}° {compassDirection(latestPos.heading)}
                      </div>
                    </div>
                  )}

                  {/* Destination — sanitized */}
                  {cleanDest && (
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Destino</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {cleanDest}
                      </div>
                    </div>
                  )}

                  {/* ETA — sanitized */}
                  {cleanEtaDate && (
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">ETA</div>
                      <div className="font-mono text-gray-900 dark:text-gray-100">
                        {cleanEtaDate.toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  )}

                  {/* Last signal timestamp */}
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Ultima senal
                    </div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {timeAgo(latestPos.createdAt)}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                Sin datos de posicion recientes.
              </p>
            )}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Vessel specs                                                      */}
        {/* ---------------------------------------------------------------- */}
        {(vessel.length || vessel.beam || vessel.draught || vessel.flag) && (
          <section aria-label="Especificaciones del buque">
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Ruler className="w-5 h-5 text-tl-sea-500" />
              Especificaciones
            </h2>
            <div className="rounded-2xl border border-tl-sea-200 dark:border-tl-sea-800/50 bg-white dark:bg-gray-900 shadow-sm">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden">
                {vessel.length && (
                  <div className="bg-white dark:bg-gray-900 p-5">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Eslora</div>
                    <div className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
                      {vessel.length} m
                    </div>
                  </div>
                )}
                {vessel.beam && (
                  <div className="bg-white dark:bg-gray-900 p-5">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Manga</div>
                    <div className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
                      {vessel.beam} m
                    </div>
                  </div>
                )}
                {vessel.draught && (
                  <div className="bg-white dark:bg-gray-900 p-5">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Calado</div>
                    <div className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
                      {Number(vessel.draught).toFixed(1)} m
                    </div>
                  </div>
                )}
                {vessel.flag && (
                  <div className="bg-white dark:bg-gray-900 p-5">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Bandera</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{flagEmoji(vessel.flag)}</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {flagName(vessel.flag)}
                      </span>
                    </div>
                  </div>
                )}
                {vessel.shipType !== null && (
                  <div className="bg-white dark:bg-gray-900 p-5">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tipo</div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${category.bgColor} ${category.color}`}>
                        {category.label}
                      </span>
                      <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                        (AIS {vessel.shipType})
                      </span>
                    </div>
                  </div>
                )}
                {vessel.length && vessel.beam && (
                  <div className="bg-white dark:bg-gray-900 p-5">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Dimensiones</div>
                    <div className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
                      {vessel.length} x {vessel.beam}{vessel.draught ? ` x ${Number(vessel.draught).toFixed(1)}` : ""} m
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Position                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Ultima posicion">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-tl-sea-500" />
            Posicion
          </h2>
          <div className="rounded-2xl border border-tl-sea-200 dark:border-tl-sea-800/50 bg-white dark:bg-gray-900 shadow-sm p-6 space-y-4">
            {latestPos ? (
              <>
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Coordenadas</div>
                    <div className="font-mono text-sm text-gray-900 dark:text-gray-100">
                      {Number(latestPos.latitude).toFixed(6)}°N, {Number(latestPos.longitude).toFixed(6)}°{Number(latestPos.longitude) >= 0 ? "E" : "O"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Ultima posicion
                    </div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {timeAgo(latestPos.createdAt)}
                    </div>
                  </div>
                </div>

                {nearestPort && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <Anchor className="w-4 h-4 text-tl-sea-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Puerto mas cercano:
                    </span>
                    <Link
                      href={`/maritimo/puertos/${nearestPort.slug}`}
                      className="text-sm font-semibold text-tl-sea-600 dark:text-tl-sea-400 hover:underline"
                    >
                      {nearestPort.name}
                    </Link>
                    <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                      ({nearestPort.distanceKm} km)
                    </span>
                  </div>
                )}

                {positionCount > 1 && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {positionCount} posiciones registradas en las ultimas 48 horas
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No se han registrado posiciones en las ultimas 48 horas.
              </p>
            )}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Voyage history (client component with SWR)                       */}
        {/* ---------------------------------------------------------------- */}
        <VesselVoyageHistory mmsi={mmsi} />

        {/* ---------------------------------------------------------------- */}
        {/* Related vessels                                                   */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Buques relacionados">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Flag className="w-5 h-5 text-tl-sea-500" />
            Explorar buques
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* By type */}
            <Link
              href={`/maritimo/buques/tipo/${category.slug}`}
              className="group flex items-center gap-4 p-5 rounded-2xl border border-tl-sea-200 dark:border-tl-sea-800/50 bg-white dark:bg-gray-900 shadow-sm hover:border-tl-sea-400 dark:hover:border-tl-sea-600 hover:shadow-md transition-all"
            >
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--color-tl-sea-100)" }}
              >
                <Ship className="w-5 h-5 text-tl-sea-600 dark:text-tl-sea-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  Buques tipo {category.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Ver todos los buques de esta categoria
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-tl-sea-500 group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* By flag */}
            {vessel.flag && (
              <Link
                href={`/maritimo/buques/bandera/${vessel.flag.toLowerCase()}`}
                className="group flex items-center gap-4 p-5 rounded-2xl border border-tl-sea-200 dark:border-tl-sea-800/50 bg-white dark:bg-gray-900 shadow-sm hover:border-tl-sea-400 dark:hover:border-tl-sea-600 hover:shadow-md transition-all"
              >
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl"
                  style={{ background: "var(--color-tl-sea-100)" }}
                >
                  {flagEmoji(vessel.flag)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                    Bandera: {flagName(vessel.flag)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Ver todos los buques de esta bandera
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-tl-sea-500 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* External links / attribution                                     */}
        {/* ---------------------------------------------------------------- */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-6">
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
            Informacion adicional
          </h2>
          <div className="flex flex-wrap gap-3">
            <a
              href={`https://www.marinetraffic.com/en/ais/details/ships/mmsi:${mmsi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:border-tl-sea-400 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              MarineTraffic
            </a>
            <a
              href={`https://www.vesselfinder.com/vessels/details/${mmsi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:border-tl-sea-400 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              VesselFinder
            </a>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
            Datos AIS recibidos via aisstream.io. Las posiciones se actualizan en funcion de la cobertura AIS disponible.
          </p>
        </section>
      </div>
    </>
  );
}
