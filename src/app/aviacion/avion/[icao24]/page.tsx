/**
 * /aviacion/avion/[icao24] — página de aeronave en tiempo real.
 *
 * Muestra la posición actual, estadísticas de vuelo y trayectoria de
 * las últimas 24 horas de una aeronave identificada por su código
 * ICAO24 (hexadecimal de 6 dígitos).
 *
 * Fuente: OpenSky Network, recolector cada 15 minutos.
 * Noindex: los datos cambian continuamente; la URL es compartible
 * pero no indexable (igual que /trenes/tren/[trainId]).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  Plane,
  ArrowUp,
  ArrowDown,
  Minus,
  Gauge,
  Navigation,
  MapPin,
  Clock,
  Globe,
  Radio,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 60;
export const dynamicParams = true;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Position = {
  id: string;
  icao24: string;
  callsign: string | null;
  latitude: number;
  longitude: number;
  altitude: number | null;
  velocity: number | null;
  heading: number | null;
  verticalRate: number | null;
  onGround: boolean;
  originCountry: string | null;
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// Static params — top 200 most-recently-seen ICAO24 in last 7 days
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  try {
    const rows = await prisma.aircraftPosition.findMany({
      select: { icao24: true },
      distinct: ["icao24"],
      take: 200,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({ icao24: r.icao24.toLowerCase() }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getData(icao24: string): Promise<{
  positions: Position[];
  latest: Position | null;
  icao24: string;
}> {
  const cleanId = icao24.trim().toLowerCase();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const rows = await prisma.aircraftPosition.findMany({
      where: {
        icao24: { equals: cleanId, mode: "insensitive" },
        createdAt: { gte: since24h },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        icao24: true,
        callsign: true,
        latitude: true,
        longitude: true,
        altitude: true,
        velocity: true,
        heading: true,
        verticalRate: true,
        onGround: true,
        originCountry: true,
        createdAt: true,
      },
    });

    const positions: Position[] = rows.map((r) => ({
      id: r.id,
      icao24: r.icao24,
      callsign: r.callsign,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      altitude: r.altitude ?? null,
      velocity: r.velocity ?? null,
      heading: r.heading ?? null,
      verticalRate: r.verticalRate ?? null,
      onGround: r.onGround,
      originCountry: r.originCountry,
      createdAt: r.createdAt,
    }));

    return { positions, latest: positions[0] ?? null, icao24: cleanId };
  } catch {
    return { positions: [], latest: null, icao24: cleanId };
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function velocityKmh(ms: number | null): string {
  if (ms === null) return "—";
  return Math.round(ms * 3.6).toLocaleString("es-ES");
}

function altitudeM(feet: number | null): string {
  if (feet === null) return "—";
  return Math.round(feet * 0.3048).toLocaleString("es-ES");
}

function heading360(deg: number | null): string {
  if (deg === null) return "—";
  return `${Math.round(deg)}°`;
}

function verticalRateMs(mps: number | null): string {
  if (mps === null) return "—";
  const sign = mps > 0 ? "+" : "";
  return `${sign}${mps.toFixed(1)} m/s`;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDatetime(d: Date): string {
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function headingDirection(deg: number | null): string {
  if (deg === null) return "";
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ icao24: string }>;
}): Promise<Metadata> {
  const { icao24 } = await params;
  const id = icao24.trim().toUpperCase();
  return {
    title: `Aeronave ${id} en tiempo real — Altitud, velocidad y trayectoria`,
    description: `Posición en tiempo real de la aeronave con código ICAO24 ${id}. Altitud, velocidad, rumbo y trayectoria de las últimas 24 horas sobre España.`,
    alternates: { canonical: `${BASE_URL}/aviacion/avion/${icao24.toLowerCase()}` },
    robots: { index: false, follow: true },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AircraftEntityPage({
  params,
}: {
  params: Promise<{ icao24: string }>;
}) {
  const { icao24 } = await params;
  const { positions, latest, icao24: cleanId } = await getData(icao24);

  const displayId = cleanId.toUpperCase();
  const callsign = latest?.callsign?.trim() || null;
  const isAirborne = latest ? !latest.onGround : null;

  // JSON-LD
  const vehicleSchema = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    vehicleIdentificationNumber: displayId,
    name: callsign ? `${callsign} (${displayId})` : `Aeronave ${displayId}`,
    description: `Aeronave con código ICAO24 ${displayId}. ${latest?.originCountry ? `País de registro: ${latest.originCountry}.` : ""}`,
    ...(latest
      ? {
          location: {
            "@type": "GeoCoordinates",
            latitude: latest.latitude,
            longitude: latest.longitude,
          },
        }
      : {}),
  };

  // Google Maps deep-link
  const mapsUrl = latest
    ? `https://www.google.com/maps/search/?api=1&query=${latest.latitude},${latest.longitude}`
    : null;

  // Trajectory: last 20 positions (positions are already desc by createdAt)
  const trajectory = positions.slice(0, 20);
  const oldest = positions[positions.length - 1];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <StructuredData data={vehicleSchema} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Aviación", href: "/aviacion" },
            { name: `Aeronave ${displayId}`, href: `/aviacion/avion/${cleanId}` },
          ]}
        />
      </div>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #0c4a6e 100%)" }}
      >
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <Plane className="w-7 h-7 text-white/90" />
            <span className="font-heading text-white/80 text-xs font-semibold uppercase tracking-widest">
              OpenSky · ICAO24
            </span>
            {isAirborne === true && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-tl-600/30 text-tl-200 border border-tl-500/40">
                <Plane className="w-3 h-3" />
                En vuelo
              </span>
            )}
            {isAirborne === false && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white/70 border border-white/20">
                En tierra
              </span>
            )}
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-white font-mono leading-tight">
            Aeronave {displayId}
          </h1>
          {callsign && (
            <p className="mt-1 text-white/80 text-lg font-medium flex items-center gap-2">
              <Radio className="w-4 h-4" />
              {callsign}
            </p>
          )}
          {latest?.originCountry && (
            <p className="mt-1 text-white/60 text-sm flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              {latest.originCountry}
            </p>
          )}
          {!latest && (
            <p className="mt-2 text-white/70 text-sm">
              Sin posiciones registradas en las últimas 24 horas.
            </p>
          )}
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* No data state */}
        {!latest && (
          <section className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Sin datos recientes para {displayId}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Esta aeronave no ha sido detectada sobre España en las últimas 24 horas. Puede que
                vuele en otra región o que el código ICAO24 no esté activo.
              </p>
              <Link
                href="/aviacion"
                className="inline-flex items-center gap-1.5 mt-3 text-sm text-tl-600 dark:text-tl-400 hover:underline"
              >
                <Plane className="w-4 h-4" />
                Ver aeronaves en vivo
              </Link>
            </div>
          </section>
        )}

        {/* Stats cards */}
        {latest && (
          <section
            aria-label="Estadísticas de vuelo"
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {/* Altitude */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-2">
                {latest.verticalRate !== null && latest.verticalRate > 0.5 ? (
                  <ArrowUp className="w-3.5 h-3.5 text-green-500" />
                ) : latest.verticalRate !== null && latest.verticalRate < -0.5 ? (
                  <ArrowDown className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-gray-400" />
                )}
                Altitud
              </p>
              <p className="font-mono text-xl font-bold text-gray-900 dark:text-gray-100">
                {altitudeM(latest.altitude)}
              </p>
              {latest.altitude !== null && (
                <p className="text-[10px] text-gray-400 mt-0.5">metros</p>
              )}
            </div>

            {/* Velocity */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-2">
                <Gauge className="w-3.5 h-3.5" />
                Velocidad
              </p>
              <p className="font-mono text-xl font-bold text-gray-900 dark:text-gray-100">
                {velocityKmh(latest.velocity)}
              </p>
              {latest.velocity !== null && (
                <p className="text-[10px] text-gray-400 mt-0.5">km/h</p>
              )}
            </div>

            {/* Heading */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-2">
                <Navigation className="w-3.5 h-3.5" />
                Rumbo
              </p>
              <p className="font-mono text-xl font-bold text-gray-900 dark:text-gray-100">
                {heading360(latest.heading)}
              </p>
              {latest.heading !== null && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {headingDirection(latest.heading)}
                </p>
              )}
            </div>

            {/* Vertical rate */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-2">
                <ArrowUp className="w-3.5 h-3.5" />
                Tasa vertical
              </p>
              <p className="font-mono text-xl font-bold text-gray-900 dark:text-gray-100">
                {latest.verticalRate !== null
                  ? `${latest.verticalRate > 0 ? "+" : ""}${latest.verticalRate.toFixed(1)}`
                  : "—"}
              </p>
              {latest.verticalRate !== null && (
                <p className="text-[10px] text-gray-400 mt-0.5">m/s</p>
              )}
            </div>
          </section>
        )}

        {/* Position summary */}
        {latest && (
          <section
            aria-label="Posición actual"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                Última posición registrada
              </h2>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-tl-600 dark:text-tl-400 hover:underline"
                >
                  Ver en Google Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Latitud</dt>
                <dd className="font-mono text-gray-900 dark:text-gray-100">
                  {latest.latitude.toFixed(5)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Longitud</dt>
                <dd className="font-mono text-gray-900 dark:text-gray-100">
                  {latest.longitude.toFixed(5)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Última señal
                </dt>
                <dd className="font-mono text-gray-900 dark:text-gray-100">
                  {formatDatetime(latest.createdAt)}
                </dd>
              </div>
            </dl>

            {/* 24h summary */}
            {positions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400 flex flex-wrap gap-4">
                <span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono">
                    {positions.length}
                  </span>{" "}
                  posiciones en 24h
                </span>
                {oldest && (
                  <span>
                    Desde{" "}
                    <span className="font-mono">
                      {formatTime(oldest.createdAt)}
                    </span>
                  </span>
                )}
                <span>
                  Hasta{" "}
                  <span className="font-mono">{formatTime(latest.createdAt)}</span>
                </span>
              </div>
            )}
          </section>
        )}

        {/* Trajectory table */}
        {trajectory.length > 0 && (
          <section
            aria-label="Trayectoria"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Últimas {trajectory.length} posiciones registradas
            </h2>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left pb-2 text-xs text-gray-500 dark:text-gray-400 font-normal pr-4">
                      Hora
                    </th>
                    <th className="text-right pb-2 text-xs text-gray-500 dark:text-gray-400 font-normal pr-4">
                      Lat
                    </th>
                    <th className="text-right pb-2 text-xs text-gray-500 dark:text-gray-400 font-normal pr-4">
                      Lon
                    </th>
                    <th className="text-right pb-2 text-xs text-gray-500 dark:text-gray-400 font-normal pr-4">
                      Alt (m)
                    </th>
                    <th className="text-right pb-2 text-xs text-gray-500 dark:text-gray-400 font-normal pr-4">
                      Vel (km/h)
                    </th>
                    <th className="text-left pb-2 text-xs text-gray-500 dark:text-gray-400 font-normal">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {trajectory.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-950/50">
                      <td className="py-1.5 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {formatTime(p.createdAt)}
                      </td>
                      <td className="py-1.5 pr-4 font-mono text-xs text-right text-gray-700 dark:text-gray-300">
                        {p.latitude.toFixed(4)}
                      </td>
                      <td className="py-1.5 pr-4 font-mono text-xs text-right text-gray-700 dark:text-gray-300">
                        {p.longitude.toFixed(4)}
                      </td>
                      <td className="py-1.5 pr-4 font-mono text-xs text-right text-gray-700 dark:text-gray-300">
                        {altitudeM(p.altitude)}
                      </td>
                      <td className="py-1.5 pr-4 font-mono text-xs text-right text-gray-700 dark:text-gray-300">
                        {velocityKmh(p.velocity)}
                      </td>
                      <td className="py-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            p.onGround
                              ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                              : "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-400"
                          }`}
                        >
                          {p.onGround ? "Tierra" : "Vuelo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-4">
              Posiciones descentes cronológicamente. Período cubierto: últimas 24 horas.
              Fuente: OpenSky Network.
            </p>
          </section>
        )}

        {/* Cross-links */}
        <section
          aria-label="Más recursos de aviación"
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
        >
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Más sobre aviación en España
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link
              href="/aviacion"
              className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-sm text-gray-700 dark:text-gray-300"
            >
              <Plane className="w-4 h-4 text-tl-600 dark:text-tl-400 flex-shrink-0" />
              Mapa de tráfico aéreo en vivo
            </Link>
            <Link
              href="/aviacion/aeropuertos"
              className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-sm text-gray-700 dark:text-gray-300"
            >
              <MapPin className="w-4 h-4 text-tl-600 dark:text-tl-400 flex-shrink-0" />
              Aeropuertos AENA — catálogo completo
            </Link>
          </div>
        </section>

        {/* Attribution */}
        <footer className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500 pt-2">
          <Plane className="w-4 h-4 flex-shrink-0" />
          <span>
            Datos: OpenSky Network. Actualizado cada 15 minutos. Cobertura: espacio aéreo español
            y áreas adyacentes.
          </span>
        </footer>
      </main>
    </div>
  );
}
