/**
 * /camaras/camara/[id] — página de detalle de cámara DGT.
 *
 * 14.000+ cámaras activas en carreteras españolas. Muestra imagen en
 * directo (thumbnail periódico), mapa con cámaras cercanas, incidencias
 * próximas y datos de ubicación en carretera + pk.
 *
 * Fuente: DGT — Red de cámaras de tráfico.
 * Schema.org VideoObject + Place JSON-LD.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { TrackEntityView } from "@/components/analytics/TrackEntityView";
import {
  Camera,
  MapPin,
  Route,
  Clock,
  ArrowRight,
  CheckCircle,
  XCircle,
  Video,
  Navigation,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 3600;
export const dynamicParams = true;

type Props = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// Haversine distance (km)
// ---------------------------------------------------------------------------

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getData(id: string) {
  const camera = await prisma.camera.findUnique({ where: { id } });
  if (!camera) return null;

  const lat = Number(camera.latitude);
  const lon = Number(camera.longitude);

  // Fetch candidates for nearby (same road first, then same province)
  const [sameRoadCandidates, sameProvincia, nearbyIncidents] = await Promise.all([
    // Same road cameras
    camera.roadNumber
      ? prisma.camera.findMany({
          where: {
            id: { not: camera.id },
            isActive: true,
            roadNumber: camera.roadNumber,
          },
          take: 30,
          select: {
            id: true,
            name: true,
            roadNumber: true,
            kmPoint: true,
            provinceName: true,
            latitude: true,
            longitude: true,
          },
        })
      : Promise.resolve([]),
    // Same province cameras (fallback)
    camera.province
      ? prisma.camera.findMany({
          where: {
            id: { not: camera.id },
            isActive: true,
            province: camera.province,
          },
          take: 30,
          select: {
            id: true,
            name: true,
            roadNumber: true,
            kmPoint: true,
            provinceName: true,
            latitude: true,
            longitude: true,
          },
        })
      : Promise.resolve([]),
    // Nearby incidents within ~2km (bounding box approximation)
    prisma.trafficIncident.findMany({
      where: {
        latitude: { gte: lat - 0.018, lte: lat + 0.018 },
        longitude: { gte: lon - 0.025, lte: lon + 0.025 },
        isActive: true,
      },
      take: 5,
      orderBy: { lastSeenAt: "desc" },
      select: {
        id: true,
        description: true,
        roadNumber: true,
        severity: true,
        lastSeenAt: true,
      },
    }),
  ]);

  // Combine and rank by distance
  const allCandidates = [
    ...sameRoadCandidates,
    ...sameProvincia.filter(
      (c) => !sameRoadCandidates.some((r) => r.id === c.id)
    ),
  ];

  const nearbyCameras = allCandidates
    .map((c) => ({
      ...c,
      distKm: haversineKm(lat, lon, Number(c.latitude), Number(c.longitude)),
    }))
    .filter((c) => c.distKm <= 5)
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, 8);

  return { camera, nearbyCameras, nearbyIncidents };
}

// ---------------------------------------------------------------------------
// Static params — top 500 cameras
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  try {
    const cameras = await prisma.camera.findMany({
      where: { isActive: true },
      select: { id: true },
      orderBy: { lastUpdated: "desc" },
      take: 500,
    });
    return cameras.map((c) => ({ id: c.id }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const camera = await prisma.camera.findUnique({
    where: { id },
    select: { name: true, roadNumber: true, provinceName: true, thumbnailUrl: true },
  });
  if (!camera) return { title: "Cámara no encontrada" };

  const title = `Cámara DGT ${camera.name}${camera.roadNumber ? ` — ${camera.roadNumber}` : ""}${camera.provinceName ? ` · ${camera.provinceName}` : ""}`;
  const description = `Imagen en directo de la cámara de tráfico ${camera.name}${camera.roadNumber ? ` en la ${camera.roadNumber}` : ""}${camera.provinceName ? `, ${camera.provinceName}` : ""}. Fuente: DGT.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/camaras/camara/${id}` },
    openGraph: {
      title,
      description,
      ...(camera.thumbnailUrl ? { images: [{ url: camera.thumbnailUrl }] } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Severity labels
// ---------------------------------------------------------------------------

const SEVERITY_LABELS: Record<string, { label: string; colorClass: string }> = {
  LOW: { label: "Baja", colorClass: "text-green-600 dark:text-green-400" },
  MEDIUM: { label: "Media", colorClass: "text-amber-600 dark:text-amber-400" },
  HIGH: { label: "Alta", colorClass: "text-orange-600 dark:text-orange-400" },
  CRITICAL: { label: "Crítica", colorClass: "text-red-600 dark:text-red-400" },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CameraDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getData(id);
  if (!data) notFound();

  const { camera, nearbyCameras, nearbyIncidents } = data;

  // VideoObject JSON-LD: DGT thumbnail is a periodically-refreshed live feed
  const videoSchema = camera.thumbnailUrl
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: `Cámara de tráfico DGT — ${camera.name}`,
        description: `Imagen en directo de la cámara de tráfico de la DGT en ${camera.name}${camera.roadNumber ? ` (${camera.roadNumber}${camera.kmPoint ? `, km ${Number(camera.kmPoint).toFixed(1)}` : ""})` : ""}${camera.provinceName ? `, ${camera.provinceName}` : ""}. Actualización periódica desde el centro de gestión de tráfico.`,
        thumbnailUrl: [camera.thumbnailUrl],
        contentUrl: camera.thumbnailUrl,
        uploadDate: camera.lastUpdated.toISOString(),
        isLiveBroadcast: true,
        isFamilyFriendly: true,
        publisher: {
          "@type": "Organization",
          name: "Dirección General de Tráfico (DGT)",
          url: "https://www.dgt.es",
        },
        ...(camera.latitude && camera.longitude
          ? {
              contentLocation: {
                "@type": "Place",
                name: camera.name,
                geo: {
                  "@type": "GeoCoordinates",
                  latitude: Number(camera.latitude),
                  longitude: Number(camera.longitude),
                },
              },
            }
          : {}),
      }
    : null;

  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `Cámara de tráfico ${camera.name}`,
    url: `${BASE_URL}/camaras/camara/${id}`,
    ...(camera.latitude && camera.longitude
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: Number(camera.latitude),
            longitude: Number(camera.longitude),
          },
        }
      : {}),
    ...(camera.provinceName
      ? {
          address: {
            "@type": "PostalAddress",
            addressRegion: camera.provinceName,
            addressCountry: "ES",
          },
        }
      : {}),
  };

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${Number(camera.latitude)},${Number(camera.longitude)}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <TrackEntityView entityType="camera" entityId={id} />
      {videoSchema && <StructuredData data={videoSchema} />}
      <StructuredData data={placeSchema} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Cámaras", href: "/camaras" },
            ...(camera.provinceName && camera.province
              ? [{ name: camera.provinceName, href: `/provincias/${camera.province}` }]
              : []),
            { name: camera.name, href: `/camaras/camara/${id}` },
          ]}
        />
      </div>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)" }}
      >
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <Camera className="w-7 h-7 text-white/90" />
            <span className="font-heading text-white/80 text-xs font-semibold uppercase tracking-widest">
              DGT · Cámara de tráfico
            </span>
            {camera.isActive ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-green-600/30 text-green-300 border border-green-500/40">
                <CheckCircle className="w-3 h-3" />
                Activa
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white/60 border border-white/20">
                <XCircle className="w-3 h-3" />
                Inactiva
              </span>
            )}
          </div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-white leading-tight">
            {camera.name}
          </h1>
          <p className="mt-2 text-white/70 text-sm flex flex-wrap items-center gap-3">
            {camera.roadNumber && (
              <span className="flex items-center gap-1">
                <Route className="w-3.5 h-3.5" />
                {camera.roadNumber}
                {camera.kmPoint && ` km ${Number(camera.kmPoint).toFixed(1)}`}
              </span>
            )}
            {camera.provinceName && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {camera.provinceName}
              </span>
            )}
          </p>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Camera image / stream */}
        {camera.thumbnailUrl ? (
          <section aria-label="Imagen en directo">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 border border-gray-200 dark:border-gray-800">
              <Image
                src={camera.thumbnailUrl}
                alt={`Imagen en directo de la cámara de tráfico ${camera.name}`}
                fill
                sizes="(max-width: 768px) 100vw, 960px"
                className="object-cover"
                priority
                unoptimized
              />
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 text-white text-[11px] px-2 py-1 rounded-md backdrop-blur-sm">
                <Video className="w-3 h-3" />
                DGT · Actualización periódica
              </div>
              {camera.roadNumber && (
                <div className="absolute top-2 right-2 bg-black/60 text-white text-[11px] font-mono px-2 py-1 rounded-md backdrop-blur-sm">
                  {camera.roadNumber}
                  {camera.kmPoint && ` · km ${Number(camera.kmPoint).toFixed(1)}`}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Imagen actualizada periódicamente. Fuente: DGT — Dirección General de Tráfico.
            </p>
          </section>
        ) : (
          <section
            aria-label="Sin imagen disponible"
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 flex flex-col items-center justify-center text-center min-h-[160px]"
          >
            <Camera className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              No hay imagen en directo disponible para esta cámara
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              La DGT no publica el feed visual de todos sus dispositivos.
            </p>
          </section>
        )}

        {/* Location info */}
        <section
          aria-label="Ubicación"
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Ubicación en carretera
            </h2>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-tl-600 dark:text-tl-400 hover:underline"
            >
              Ver en Google Maps
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {camera.roadNumber && (
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 flex items-center gap-1">
                  <Route className="w-3 h-3" /> Carretera
                </dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100">
                  {camera.roadNumber}
                </dd>
              </div>
            )}
            {camera.kmPoint !== null && (
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                  Punto kilométrico
                </dt>
                <dd className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                  km {Number(camera.kmPoint).toFixed(1)}
                </dd>
              </div>
            )}
            {camera.provinceName && (
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Provincia</dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100">
                  {camera.provinceName}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Coordenadas</dt>
              <dd className="font-mono text-xs text-gray-600 dark:text-gray-400">
                {Number(camera.latitude).toFixed(5)}, {Number(camera.longitude).toFixed(5)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Última actualización
              </dt>
              <dd className="text-sm text-gray-700 dark:text-gray-300">
                {camera.lastUpdated.toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
          </dl>
        </section>

        {/* Nearby incidents */}
        {nearbyIncidents.length > 0 && (
          <section
            aria-label="Incidencias cercanas"
            className="bg-white dark:bg-gray-900 rounded-xl border border-amber-200 dark:border-amber-800/40 p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Incidencias cercanas (radio 2 km)
            </h2>
            <div className="space-y-2">
              {nearbyIncidents.map((inc) => {
                const sev = SEVERITY_LABELS[inc.severity as string] ?? {
                  label: inc.severity,
                  colorClass: "text-gray-500",
                };
                return (
                  <div
                    key={inc.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {inc.description ?? "Incidencia"} 
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                        {inc.roadNumber && <span>{inc.roadNumber}</span>}
                        <span className={sev.colorClass}>{sev.label}</span>
                        <span className="font-mono">
                          {inc.lastSeenAt.toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Nearby cameras */}
        {nearbyCameras.length > 0 && (
          <section
            aria-label="Cámaras cercanas"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Cámaras cercanas (radio 5 km)
            </h2>
            <div className="space-y-2">
              {nearbyCameras.map((c) => (
                <Link
                  key={c.id}
                  href={`/camaras/camara/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-950 hover:bg-tl-50 dark:hover:bg-tl-900/20 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {c.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                      {c.roadNumber && `${c.roadNumber} `}
                      {c.kmPoint !== null && `km ${Number(c.kmPoint).toFixed(1)} `}
                      {c.provinceName && `· ${c.provinceName} `}
                      <span className="text-tl-600 dark:text-tl-400">
                        {c.distKm.toFixed(1)} km
                      </span>
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Cross-links */}
        <section
          aria-label="Más recursos"
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
        >
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Más información de tráfico
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {camera.roadNumber && (
              <Link
                href={`/camaras/carretera/${encodeURIComponent(camera.roadNumber)}`}
                className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-sm text-gray-700 dark:text-gray-300"
              >
                <Camera className="w-4 h-4 text-tl-600 dark:text-tl-400 flex-shrink-0" />
                Cámaras en {camera.roadNumber}
                <ArrowRight className="w-3.5 h-3.5 ml-auto text-gray-400" />
              </Link>
            )}
            {camera.provinceName && camera.province && (
              <Link
                href={`/provincias/${camera.province}`}
                className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-sm text-gray-700 dark:text-gray-300"
              >
                <MapPin className="w-4 h-4 text-tl-600 dark:text-tl-400 flex-shrink-0" />
                Tráfico en {camera.provinceName}
                <ArrowRight className="w-3.5 h-3.5 ml-auto text-gray-400" />
              </Link>
            )}
            <Link
              href="/camaras"
              className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-sm text-gray-700 dark:text-gray-300"
            >
              <Camera className="w-4 h-4 text-tl-600 dark:text-tl-400 flex-shrink-0" />
              Todas las cámaras DGT
              <ArrowRight className="w-3.5 h-3.5 ml-auto text-gray-400" />
            </Link>
            <Link
              href="/incidencias"
              className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-sm text-gray-700 dark:text-gray-300"
            >
              <AlertTriangle className="w-4 h-4 text-tl-600 dark:text-tl-400 flex-shrink-0" />
              Incidencias en tiempo real
              <ArrowRight className="w-3.5 h-3.5 ml-auto text-gray-400" />
            </Link>
          </div>
        </section>

        {/* Attribution */}
        <footer className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500 pt-2">
          <Camera className="w-4 h-4 flex-shrink-0" />
          <span>
            Fuente: Dirección General de Tráfico (DGT). Imágenes actualizadas periódicamente.
            Coordenadas y datos de carretera del Sistema de Gestión de Tráfico.
          </span>
        </footer>
      </main>
    </div>
  );
}
