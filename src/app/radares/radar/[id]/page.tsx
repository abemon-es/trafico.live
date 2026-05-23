/**
 * /radares/radar/[id] — per-radar entity landing page.
 *
 * 83 K active radar URLs sit on this route (largest sitemap shard).
 * Previous implementation was a 114-line one-line-per-JSX stub. This
 * rebuild matches the depth pattern established by /carga-ev/punto/[id]:
 * real Place JSON-LD, haversine-ranked nearby, Maps deep-link, partner
 * radar cross-link for SECTION cameras, cross-link to the per-road
 * accidents page so the radar context grounds in real consequences.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Gauge,
  MapPin,
  Navigation,
  Radar,
  Route,
  Shield,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 86400;
export const dynamicParams = true;

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

const TYPE: Record<
  string,
  { label: string; bg: string; fg: string; description: string }
> = {
  FIXED: {
    label: "Radar fijo",
    bg: "rgba(234,179,8,0.12)",
    fg: "rgb(161,98,7)",
    description:
      "Cabina o pórtico estático que mide la velocidad instantánea de cada vehículo en su tramo de cobertura.",
  },
  SECTION: {
    label: "Radar de tramo",
    bg: "rgba(249,115,22,0.12)",
    fg: "rgb(194,65,12)",
    description:
      "Pareja de cabinas que calculan la velocidad media de un vehículo entre los puntos de entrada y salida del tramo.",
  },
  MOBILE_ZONE: {
    label: "Zona de radar móvil",
    bg: "rgba(220,38,38,0.12)",
    fg: "rgb(185,28,28)",
    description:
      "Tramo en el que la DGT despliega habitualmente unidades móviles. Sin cabina visible.",
  },
  TRAFFIC_LIGHT: {
    label: "Radar de semáforo (foto-rojo)",
    bg: "rgba(124,58,237,0.12)",
    fg: "rgb(109,40,217)",
    description:
      "Cámara que sanciona el paso de vehículos en fase roja o velocidad excesiva al cruzar una intersección semaforizada.",
  },
};

const DIR: Record<string, string> = {
  ASCENDING: "Sentido creciente del PK",
  DESCENDING: "Sentido decreciente del PK",
  BOTH: "Ambos sentidos",
  UNKNOWN: "Sentido no especificado",
};

type Props = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function getRadar(id: string) {
  const radar = await prisma.radar.findUnique({ where: { id } });
  if (!radar) return null;

  const lat = Number(radar.latitude);
  const lng = Number(radar.longitude);

  const [sameRoadRadars, partnerRadar] = await Promise.all([
    prisma.radar.findMany({
      where: {
        id: { not: radar.id },
        roadNumber: radar.roadNumber,
        isActive: true,
      },
      take: 30,
      select: {
        id: true,
        radarId: true,
        type: true,
        kmPoint: true,
        speedLimit: true,
        latitude: true,
        longitude: true,
        direction: true,
        provinceName: true,
      },
    }),
    radar.avgSpeedPartner
      ? prisma.radar.findFirst({
          where: { radarId: radar.avgSpeedPartner },
          select: {
            id: true,
            radarId: true,
            kmPoint: true,
            speedLimit: true,
            roadNumber: true,
            type: true,
          },
        })
      : Promise.resolve(null),
  ]);

  const nearby = sameRoadRadars
    .map((r) => ({
      ...r,
      distanceKm: haversine(lat, lng, Number(r.latitude), Number(r.longitude)),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 6);

  return { radar, nearby, partnerRadar, lat, lng };
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function fmtKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

// ---------------------------------------------------------------------------
// Pre-gen — top 1000 most-recently-updated active radars
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const radars = await prisma.radar.findMany({
    where: { isActive: true },
    select: { id: true },
    orderBy: { lastUpdated: "desc" },
    take: 1000,
  });
  return radars.map((r) => ({ id: r.id }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getRadar(id);
  if (!data) return { title: "Radar no encontrado" };
  const { radar } = data;
  const t = TYPE[radar.type] ?? { label: radar.type, bg: "", fg: "", description: "" };
  const km = Number(radar.kmPoint).toFixed(1);
  const speed = radar.speedLimit ? ` ${radar.speedLimit} km/h` : "";
  const where = radar.provinceName ? ` en ${radar.provinceName}` : "";
  const title = `${t.label} ${radar.roadNumber} km ${km}${speed}${where}`;
  const description =
    `${t.label} de la DGT en la ${radar.roadNumber} ` +
    `(pk ${km})${radar.provinceName ? `, ${radar.provinceName}` : ""}. ` +
    `${radar.speedLimit ? `Límite ${radar.speedLimit} km/h. ` : ""}` +
    `Radares cercanos en la misma vía y enlace a accidentes registrados en esta carretera.`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/radares/radar/${id}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/radares/radar/${id}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function RadarDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getRadar(id);
  if (!data) notFound();
  const { radar, nearby, partnerRadar, lat, lng } = data;

  const t = TYPE[radar.type] ?? {
    label: radar.type,
    bg: "rgba(107,114,128,0.12)",
    fg: "rgb(75,85,99)",
    description: "",
  };
  const km = Number(radar.kmPoint).toFixed(1);

  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  const amapsUrl = `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
  const gmapsViewUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `${t.label} — ${radar.roadNumber} km ${km}`,
    description: t.description,
    url: `${BASE_URL}/radares/radar/${id}`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: lat,
      longitude: lng,
    },
    ...(radar.provinceName && {
      address: {
        "@type": "PostalAddress",
        addressRegion: radar.provinceName,
        addressCountry: "ES",
      },
    }),
    ...(radar.speedLimit && {
      maximumAttendeeCapacity: undefined,
      additionalProperty: [
        {
          "@type": "PropertyValue",
          name: "Speed limit",
          value: radar.speedLimit,
          unitText: "km/h",
        },
      ],
    }),
  } as const;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Radares", item: `${BASE_URL}/radares` },
      {
        "@type": "ListItem",
        position: 3,
        name: radar.roadNumber,
        item: `${BASE_URL}/radares/${encodeURIComponent(radar.roadNumber)}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: `Radar ${radar.radarId}`,
        item: `${BASE_URL}/radares/radar/${id}`,
      },
    ],
  };

  return (
    <>
      <StructuredData data={[placeSchema, breadcrumbSchema]} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Radares", href: "/radares" },
              {
                name: radar.roadNumber,
                href: `/radares/${encodeURIComponent(radar.roadNumber)}`,
              },
              { name: `Radar ${radar.radarId}`, href: `/radares/radar/${id}` },
            ]}
          />
        </div>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Hero */}
          <header>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: t.bg, color: t.fg }}
              >
                <Radar className="w-3.5 h-3.5" />
                {t.label}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  radar.isActive
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {radar.isActive ? "Activo" : "Inactivo"}
              </span>
              {radar.direction && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  <Navigation className="w-3 h-3" />
                  {DIR[radar.direction] ?? radar.direction}
                </span>
              )}
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {t.label} en la {radar.roadNumber}
              <span className="font-mono text-gray-700 dark:text-gray-300"> · km {km}</span>
            </h1>
            {radar.provinceName && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {radar.provinceName}
                <span className="text-gray-400">·</span>
                <span className="font-mono">{radar.radarId}</span>
              </p>
            )}
          </header>

          {/* Stat row */}
          <section
            aria-label="Datos principales"
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {radar.speedLimit && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 text-center">
                <div className="w-20 h-20 mx-auto rounded-full border-4 border-red-500 flex items-center justify-center mb-2">
                  <span className="font-mono text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {radar.speedLimit}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Límite km/h
                </p>
              </div>
            )}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <Gauge className="w-5 h-5 text-tl-600 dark:text-tl-400 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Carretera
              </p>
              <p className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100">
                {radar.roadNumber}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                pk <span className="font-mono">{km}</span>
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <Navigation className="w-5 h-5 text-tl-600 dark:text-tl-400 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Coordenadas
              </p>
              <p className="font-mono text-xs text-gray-700 dark:text-gray-300 leading-snug">
                {lat.toFixed(5)}
                <br />
                {lng.toFixed(5)}
              </p>
              <a
                href={gmapsViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-tl-600 dark:text-tl-400 hover:underline"
              >
                Ver en mapa
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </section>

          {/* Cómo llegar */}
          <section
            aria-label="Cómo llegar"
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-5"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={gmapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-tl-600 text-white text-sm font-semibold hover:bg-tl-700 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Cómo llegar (Google Maps)
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={amapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-tl-200 dark:border-tl-700 text-tl-700 dark:text-tl-300 text-sm font-semibold hover:bg-tl-50 dark:hover:bg-tl-900/20 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Apple Maps
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </section>

          {/* About this radar type */}
          {t.description && (
            <section
              aria-label="Tipo de radar"
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6"
            >
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                ¿Cómo funciona este {t.label.toLowerCase()}?
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {t.description}
              </p>
            </section>
          )}

          {/* Section partner */}
          {partnerRadar && (
            <section
              aria-label="Radar pareja"
              className="bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800/50 rounded-xl p-5"
            >
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-tl-amber-700 dark:text-tl-amber-300" />
                Pareja del tramo
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Este radar de tramo mide la velocidad media entre dos puntos. La cabina pareja:
              </p>
              <Link
                href={`/radares/radar/${partnerRadar.id}`}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white dark:bg-gray-900 border border-tl-amber-200 dark:border-tl-amber-900/50 hover:bg-tl-amber-50 dark:hover:bg-tl-amber-900/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Radar className="w-4 h-4 text-tl-amber-600 dark:text-tl-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {partnerRadar.roadNumber} · km{" "}
                      <span className="font-mono">
                        {Number(partnerRadar.kmPoint).toFixed(1)}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      ID {partnerRadar.radarId}
                      {partnerRadar.speedLimit && ` · ${partnerRadar.speedLimit} km/h`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            </section>
          )}

          {/* Nearby radars on same road */}
          {nearby.length > 0 && (
            <section
              aria-label="Radares cercanos"
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6"
            >
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Radar className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                Otros radares en la {radar.roadNumber}
              </h2>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {nearby.map((r) => {
                  const rType = TYPE[r.type] ?? { label: r.type, bg: "", fg: "" };
                  return (
                    <li key={r.id}>
                      <Link
                        href={`/radares/radar/${r.id}`}
                        className="flex items-center justify-between gap-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 rounded-lg px-2 -mx-2 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span
                            className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: rType.bg, color: rType.fg }}
                          >
                            {rType.label}
                          </span>
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            km{" "}
                            <span className="font-mono font-semibold">
                              {Number(r.kmPoint).toFixed(1)}
                            </span>
                          </span>
                          {r.direction && (
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:inline">
                              {DIR[r.direction] ?? r.direction}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {r.speedLimit && (
                            <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400">
                              {r.speedLimit} km/h
                            </span>
                          )}
                          <span className="font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {fmtKm(r.distanceKm)}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Cross-links */}
          <section
            aria-label="Más información"
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Más sobre la {radar.roadNumber}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Link
                href={`/radares/${encodeURIComponent(radar.roadNumber)}`}
                className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors text-sm"
              >
                <Radar className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                Todos los radares
              </Link>
              <Link
                href={`/accidentes/carretera/${encodeURIComponent(radar.roadNumber)}`}
                className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors text-sm"
              >
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                Accidentes en la {radar.roadNumber}
              </Link>
              <Link
                href={`/camaras/carretera/${encodeURIComponent(radar.roadNumber)}`}
                className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors text-sm"
              >
                <Route className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                Cámaras en la {radar.roadNumber}
              </Link>
              {radar.province && (
                <Link
                  href={`/radares/provincia/${radar.province}`}
                  className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors text-sm"
                >
                  <MapPin className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                  Radares en {radar.provinceName}
                </Link>
              )}
            </div>
          </section>

          {/* Attribution */}
          <footer className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500 pt-2">
            <Radar className="w-4 h-4 flex-shrink-0" />
            <span>
              Datos: Dirección General de Tráfico (DGT). Catálogo de radares actualizado{" "}
              {radar.lastUpdated && (
                <>
                  el{" "}
                  <time dateTime={radar.lastUpdated.toISOString()} className="font-mono">
                    {radar.lastUpdated.toLocaleDateString("es-ES")}
                  </time>
                </>
              )}
              .
            </span>
            <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">·</span>
            <Link href="/etiqueta-ambiental" className="hover:text-gray-600 dark:hover:text-gray-300">
              Etiquetas ambientales y normativa
            </Link>
          </footer>

          {/* Right-margin gap (for visual rhythm) */}
          <div aria-hidden="true" />
        </main>
      </div>
    </>
  );
}
