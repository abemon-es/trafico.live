import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Ship, ArrowLeft, Anchor, Navigation, CloudRain, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { vesselSlug } from "@/lib/vessel-utils";

export const revalidate = 3600;
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = {
  params: Promise<{ community: string; province: string }>;
};

const VESSEL_TYPE_LABELS: Record<number, string> = {
  30: "Pesca",
  31: "Remolcador",
  32: "Remolcador",
  33: "Dragado",
  34: "Buceo",
  35: "Militar",
  36: "Velero",
  37: "Recreo",
  40: "HSC",
  50: "Piloto",
  60: "Pasaje",
  70: "Carga",
  80: "Tanque",
};

function getVesselTypeLabel(shipType: number | null): string {
  if (shipType === null) return "Desconocido";
  const decade = Math.floor(shipType / 10) * 10;
  return VESSEL_TYPE_LABELS[decade] ?? VESSEL_TYPE_LABELS[shipType] ?? `Tipo ${shipType}`;
}

async function getProvince(communitySlug: string, provinceSlug: string) {
  const province = await prisma.province.findUnique({
    where: { slug: provinceSlug },
    include: { community: true },
  });
  if (!province || province.community.slug !== communitySlug) return null;
  return province;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { community, province: provSlug } = await params;
  const prov = await getProvince(community, provSlug);
  if (!prov) return { title: "Provincia no encontrada" };

  const title = `Trafico maritimo en ${prov.name} — Puertos y buques`;
  const description = `Puertos, buques y trafico maritimo en ${prov.name} (${prov.community.name}). Seguimiento AIS, rutas de ferry y meteorologia costera.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/espana/${community}/${provSlug}/maritimo`,
    },
    openGraph: {
      title: `Trafico maritimo en ${prov.name}`,
      description,
      url: `${BASE_URL}/espana/${community}/${provSlug}/maritimo`,
      type: "website",
    },
  };
}

export async function generateStaticParams() {
  return [];
}

export default async function ProvinceMaritimePage({ params }: Props) {
  const { community, province: provSlug } = await params;
  const prov = await getProvince(community, provSlug);
  if (!prov) notFound();

  // Check if province has ports (coastal indicator)
  const ports = await prisma.spanishPort.findMany({
    where: { province: prov.code },
    orderBy: { name: "asc" },
  }).catch(() => []);

  // If no ports, this is an inland province
  if (ports.length === 0) notFound();

  // Get nearby vessels (within ~20km of any port in province)
  const portCoords = ports.map((p) => ({
    lat: Number(p.latitude),
    lng: Number(p.longitude),
  }));

  // Use centroid of all ports as center for vessel search
  const centerLat = portCoords.reduce((s, p) => s + p.lat, 0) / portCoords.length;
  const centerLng = portCoords.reduce((s, p) => s + p.lng, 0) / portCoords.length;

  // Bounding box (±0.25° ≈ 20-28km) to avoid full table scan on VesselPosition
  const latDelta = 0.25;
  const lngDelta = 0.35;
  const latMin = centerLat - latDelta;
  const latMax = centerLat + latDelta;
  const lngMin = centerLng - lngDelta;
  const lngMax = centerLng + lngDelta;

  // Find recent vessel positions near province ports (within ~20km)
  // Uses bounding box pre-filter to avoid full-table haversine scan on 127M rows
  const recentVessels = await prisma.$queryRawUnsafe<
    {
      mmsi: number;
      name: string | null;
      shipType: number | null;
      flag: string | null;
      latitude: number;
      longitude: number;
      sog: number | null;
      heading: number | null;
      createdAt: Date;
    }[]
  >(
    `SELECT DISTINCT ON (v.mmsi)
       v.mmsi, v.name, v."shipType", v.flag,
       vp.latitude::float, vp.longitude::float, vp.sog, vp.heading,
       vp."createdAt"
     FROM "Vessel" v
     JOIN "VesselPosition" vp ON vp.mmsi = v.mmsi
     WHERE vp."createdAt" > NOW() - INTERVAL '48 hours'
       AND vp.latitude::float BETWEEN $3 AND $4
       AND vp.longitude::float BETWEEN $5 AND $6
       AND (6371 * acos(
         LEAST(1.0, cos(radians($1)) * cos(radians(vp.latitude::float)) *
         cos(radians(vp.longitude::float) - radians($2)) +
         sin(radians($1)) * sin(radians(vp.latitude::float)))
       )) < 20
     ORDER BY v.mmsi, vp."createdAt" DESC
     LIMIT 50`,
    centerLat,
    centerLng,
    latMin,
    latMax,
    lngMin,
    lngMax
  ).catch(() => [] as { mmsi: number; name: string | null; shipType: number | null; flag: string | null; latitude: number; longitude: number; sog: number | null; heading: number | null; createdAt: Date }[]);

  // Ferry routes from province ports
  const portNames = ports.map((p) => p.name);
  const ferryRoutes = await prisma.ferryRoute.findMany({
    include: {
      stops: true,
    },
  }).catch(() => []);
  // Filter ferry routes that have a stop matching a province port
  const provinceFerries = ferryRoutes.filter((route) =>
    route.stops.some((stop) =>
      portNames.some(
        (pn) =>
          stop.stopName.toLowerCase().includes(pn.toLowerCase()) ||
          pn.toLowerCase().includes(stop.stopName.toLowerCase())
      )
    )
  );

  // Maritime weather alerts for coastal zone
  const coastalZone = ports[0]?.coastalZone ?? null;
  const weatherAlerts = coastalZone
    ? await prisma.weatherAlert.findMany({
        where: {
          isActive: true,
          description: { contains: coastalZone, mode: "insensitive" },
        },
        take: 5,
        orderBy: { startedAt: "desc" },
      }).catch(() => [])
    : [];

  // Group vessels by type
  const vesselsByType = new Map<string, typeof recentVessels>();
  for (const v of recentVessels) {
    const label = getVesselTypeLabel(v.shipType);
    const list = vesselsByType.get(label) ?? [];
    list.push(v);
    vesselsByType.set(label, list);
  }

  const breadcrumbs = [
    { name: "Inicio", href: "/" },
    { name: "Espana", href: "/espana" },
    { name: prov.community.name, href: `/espana/${community}` },
    { name: prov.name, href: `/espana/${community}/${provSlug}` },
    { name: "Maritimo", href: `/espana/${community}/${provSlug}/maritimo` },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumbs items={breadcrumbs} />

        {/* Hero */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
              <Ship className="w-6 h-6 text-cyan-600" />
            </div>
            <div className="flex-1">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900">
                Trafico maritimo en {prov.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {prov.community.name}
                {coastalZone && ` — Zona: ${coastalZone}`}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <p className="font-data text-lg font-bold text-gray-900">
                    {ports.length}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Puerto{ports.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <p className="font-data text-lg font-bold text-gray-900">
                    {recentVessels.length}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Buques cercanos (48h)
                  </p>
                </div>
                {provinceFerries.length > 0 && (
                  <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                    <p className="font-data text-lg font-bold text-gray-900">
                      {provinceFerries.length}
                    </p>
                    <p className="text-[10px] text-gray-500">Rutas de ferry</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Maritime weather alerts */}
        {weatherAlerts.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <CloudRain className="w-5 h-5 text-blue-600" />
              <h2 className="font-heading text-lg font-bold text-gray-900">
                Alertas meteorologicas costeras
              </h2>
            </div>
            <div className="space-y-3">
              {weatherAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl border border-blue-100 bg-blue-50 p-4"
                >
                  <p className="text-sm text-blue-800 line-clamp-3">
                    {alert.description}
                  </p>
                  <p className="text-[10px] text-blue-500 mt-2 font-data">
                    {alert.startedAt.toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                    })}
                    {alert.endedAt &&
                      ` — ${alert.endedAt.toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                      })}`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ports */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Anchor className="w-5 h-5 text-tl-600" />
            <h2 className="font-heading text-lg font-bold text-gray-900">
              Puertos en {prov.name}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ports.map((port) => (
              <Link
                key={port.id}
                href={`/maritimo/puertos/${port.slug}`}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4 hover:border-tl-300 hover:bg-tl-50 transition-all group"
              >
                <p className="text-sm font-semibold text-gray-900 group-hover:text-tl-600 truncate">
                  {port.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 font-medium">
                    {port.type}
                  </span>
                  {port.stationCount > 0 && (
                    <span className="text-[10px] text-gray-500">
                      {port.stationCount} estaciones combustible
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Nearby vessels */}
        {recentVessels.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Navigation className="w-5 h-5 text-tl-600" />
              <h2 className="font-heading text-lg font-bold text-gray-900">
                Buques cercanos
              </h2>
              <span className="text-xs text-gray-500">(ultimas 48h)</span>
            </div>

            {/* By type summary */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Array.from(vesselsByType.entries())
                .sort((a, b) => b[1].length - a[1].length)
                .map(([type, vessels]) => (
                  <span
                    key={type}
                    className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium"
                  >
                    {type}{" "}
                    <span className="font-data">({vessels.length})</span>
                  </span>
                ))}
            </div>

            {/* Vessel list */}
            <div className="space-y-2">
              {recentVessels.slice(0, 20).map((vessel) => (
                <Link
                  key={vessel.mmsi}
                  href={`/maritimo/buques/${vesselSlug(vessel.mmsi, vessel.name ?? null)}`}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 hover:border-tl-300 hover:bg-tl-50 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-tl-600 truncate">
                      {vessel.name ?? `MMSI ${vessel.mmsi}`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-500">
                        {getVesselTypeLabel(vessel.shipType)}
                      </span>
                      {vessel.flag && (
                        <span className="text-[10px] text-gray-400">
                          {vessel.flag}
                        </span>
                      )}
                    </div>
                  </div>
                  {vessel.sog != null && (
                    <span className="text-xs font-data text-gray-500">
                      {vessel.sog.toFixed(1)} kn
                    </span>
                  )}
                </Link>
              ))}
            </div>
            {recentVessels.length > 20 && (
              <p className="mt-3 text-xs text-gray-500">
                +{recentVessels.length - 20} buques mas
              </p>
            )}
          </section>
        )}

        {/* Ferry routes */}
        {provinceFerries.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
              Rutas de ferry
            </h2>
            <div className="space-y-2">
              {provinceFerries.map((route) => (
                <div
                  key={route.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                >
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 font-semibold">
                    {route.operator}
                  </span>
                  <p className="text-sm text-gray-900 truncate flex-1">
                    {route.routeName}
                  </p>
                  <span className="text-[10px] text-gray-500 font-data">
                    {route.stops.length} paradas
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/maritimo"
              className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
            >
              Ver todo el trafico maritimo{" "}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </section>
        )}

        {/* Back link + attribution */}
        <div className="flex items-center justify-between mt-8">
          <Link
            href={`/espana/${community}/${provSlug}`}
            className="inline-flex items-center gap-2 text-sm text-tl-600 hover:text-tl-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a {prov.name}
          </Link>
          <p className="text-[10px] text-gray-400">
            Fuente: Puertos del Estado, aisstream.io
          </p>
        </div>
      </div>
    </div>
  );
}
