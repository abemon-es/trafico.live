/**
 * /aviacion — Spanish Aviation Hub
 *
 * Server-side page with real data from Airport, AirportStatistic, AircraftPosition models.
 * Follows the same pattern as /maritimo.
 *
 * Data sources:
 *   - Airport catalog: AENA official data
 *   - Aircraft positions: OpenSky Network (CC BY 4.0)
 *   - Airport statistics: AENA monthly stats collector
 */

import type { Metadata } from "next";
import { AviationMapWrapper } from "./aviation-map-wrapper";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  MapPin,
  BarChart3,
  Users,
  Radio,
  ArrowRight,
  ChevronRight,
  Globe,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Tráfico Aéreo en España — Vuelos y Aeropuertos AENA | trafico.live",
  description:
    "Información sobre tráfico aéreo en España. Aeropuertos AENA, posiciones de aeronaves en tiempo real y estadísticas de pasajeros. Datos OpenSky Network y AENA.",
  alternates: {
    canonical: `${BASE_URL}/aviacion`,
  },
  openGraph: {
    title: "Tráfico Aéreo en España — Vuelos y Aeropuertos AENA",
    description:
      "Aeropuertos AENA, posiciones de aeronaves sobre espacio aéreo español y estadísticas mensuales de pasajeros.",
    url: `${BASE_URL}/aviacion`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getStats() {
  const [
    totalAirports,
    aenaAirports,
    recentPositions,
    onGroundCount,
    distinctCountries,
  ] = await Promise.all([
    prisma.airport.count(),
    prisma.airport.count({ where: { isAena: true } }),
    prisma.aircraftPosition.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        onGround: false,
      },
    }),
    prisma.aircraftPosition.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        onGround: true,
      },
    }),
    prisma.aircraftPosition
      .findMany({
        where: { createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
        distinct: ["originCountry"],
        select: { originCountry: true },
      })
      .then((r) => r.filter((x) => x.originCountry).length),
  ]);

  // Average altitude of airborne aircraft in the last hour
  const altitudeAgg = await prisma.aircraftPosition.aggregate({
    where: {
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      onGround: false,
      altitude: { not: null, gt: 0 },
    },
    _avg: { altitude: true },
  });

  return {
    totalAirports,
    aenaAirports,
    airborne: recentPositions,
    onGround: onGroundCount,
    distinctCountries,
    avgAltitudeM: altitudeAgg._avg.altitude
      ? Math.round(Number(altitudeAgg._avg.altitude))
      : null,
  };
}

async function getTopAirports() {
  // Get airports that have statistics — proxy for busiest
  const airports = await prisma.airport.findMany({
    where: { isAena: true },
    include: {
      statistics: {
        where: { metric: "pax", periodType: "monthly" },
        orderBy: { periodStart: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
    take: 50,
  });

  // Sort by latest pax stat descending, airports without stats go last
  return airports
    .map((a) => ({
      id: a.id,
      icao: a.icao,
      iata: a.iata,
      name: a.name,
      city: a.city,
      province: a.province,
      latitude: Number(a.latitude),
      longitude: Number(a.longitude),
      isAena: a.isAena,
      latestPax: a.statistics[0]
        ? Number(a.statistics[0].value)
        : null,
      latestPaxPeriod: a.statistics[0]?.periodStart ?? null,
    }))
    .sort((a, b) => {
      if (a.latestPax !== null && b.latestPax !== null)
        return b.latestPax - a.latestPax;
      if (a.latestPax !== null) return -1;
      if (b.latestPax !== null) return 1;
      return a.name.localeCompare(b.name, "es");
    })
    .slice(0, 15);
}

async function getRecentAircraft() {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  return prisma.aircraftPosition.findMany({
    where: {
      createdAt: { gte: since },
      onGround: false,
    },
    distinct: ["icao24"],
    orderBy: [{ icao24: "asc" }, { createdAt: "desc" }],
    take: 20,
    select: {
      icao24: true,
      callsign: true,
      altitude: true,
      velocity: true,
      heading: true,
      originCountry: true,
      onGround: true,
      createdAt: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPax(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("es-ES");
}

function formatAltitude(m: number | null): string {
  if (m === null) return "—";
  const ft = Math.round(m * 3.28084);
  return `${ft.toLocaleString("es-ES")} ft`;
}

function formatSpeed(ms: number | null): string {
  if (!ms) return "—";
  const kmh = Math.round(ms * 3.6);
  return `${kmh} km/h`;
}

function headingToCompass(deg: number | null): string {
  if (deg === null) return "—";
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
}

const PROVINCE_NAMES: Record<string, string> = {
  "01": "Álava", "02": "Albacete", "03": "Alicante", "04": "Almería",
  "05": "Ávila", "06": "Badajoz", "07": "Baleares", "08": "Barcelona",
  "09": "Burgos", "10": "Cáceres", "11": "Cádiz", "12": "Castellón",
  "13": "Ciudad Real", "14": "Córdoba", "15": "A Coruña", "16": "Cuenca",
  "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Gipuzkoa",
  "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León",
  "25": "Lleida", "26": "La Rioja", "27": "Lugo", "28": "Madrid",
  "29": "Málaga", "30": "Murcia", "31": "Navarra", "32": "Ourense",
  "33": "Asturias", "34": "Palencia", "35": "Las Palmas", "36": "Pontevedra",
  "37": "Salamanca", "38": "Santa Cruz de Tenerife", "39": "Cantabria",
  "40": "Segovia", "41": "Sevilla", "42": "Soria", "43": "Tarragona",
  "44": "Teruel", "45": "Toledo", "46": "Valencia", "47": "Valladolid",
  "48": "Bizkaia", "49": "Zamora", "50": "Zaragoza", "51": "Ceuta",
  "52": "Melilla",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AviacionPage() {
  const [stats, topAirports, recentAircraft] = await Promise.all([
    getStats(),
    getTopAirports(),
    getRecentAircraft(),
  ]);

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Tráfico Aéreo en España — Aeropuertos AENA y vuelos en tiempo real",
    description:
      "Portal de aviación con información sobre aeropuertos AENA, posiciones de aeronaves y estadísticas de pasajeros en España.",
    url: `${BASE_URL}/aviacion`,
    inLanguage: "es",
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  return (
    <>
      <StructuredData data={webPageSchema} />

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Aviación", href: "/aviacion" },
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
            "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1b4bd5 100%)",
        }}
      >
        {/* Decorative elements */}
        <div
          className="pointer-events-none absolute -bottom-16 -right-16 w-80 h-80 rounded-full opacity-10"
          style={{ background: "var(--color-tl-300)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-8 right-32 w-32 h-32 rounded-full opacity-5"
          style={{ background: "var(--color-tl-200)" }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-20">
          <div className="flex items-center gap-3 mb-4">
            <Plane className="w-10 h-10 text-tl-300 dark:text-tl-400" />
            <span className="font-heading text-tl-300 text-sm font-semibold uppercase tracking-widest">
              trafico.live / Aviación
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Tráfico Aéreo en España
          </h1>
          <p className="text-white/75 text-lg md:text-xl max-w-2xl leading-relaxed">
            Aeronaves sobre espacio aéreo español en tiempo real, aeropuertos AENA
            y estadísticas de pasajeros. Datos OpenSky Network y AENA actualizados
            cada 5 minutos.
          </p>

          {/* Live aircraft count pill */}
          {stats.airborne > 0 && (
            <div className="mt-6 inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white text-sm font-semibold font-mono">
                {stats.airborne.toLocaleString("es-ES")} aeronaves en vuelo ahora
              </span>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">

        {/* ---------------------------------------------------------------- */}
        {/* Quick stats row                                                   */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Estadísticas rápidas">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            {/* Aeronaves en vuelo */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <PlaneTakeoff className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  En vuelo ahora
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-[var(--tl-primary)] dark:text-[var(--tl-info)]">
                {stats.airborne.toLocaleString("es-ES")}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                aeronaves airborne
              </div>
            </div>

            {/* En tierra */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <PlaneLanding className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  En tierra
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-gray-700 dark:text-gray-200">
                {stats.onGround.toLocaleString("es-ES")}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                en pista o aparcamiento
              </div>
            </div>

            {/* Aeropuertos AENA */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Aeropuertos AENA
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-[var(--tl-primary)] dark:text-[var(--tl-info)]">
                {stats.aenaAirports}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                de {stats.totalAirports} en catálogo
              </div>
            </div>

            {/* Altitud media */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Altitud media
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-gray-700 dark:text-gray-200">
                {formatAltitude(stats.avgAltitudeM)}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {stats.avgAltitudeM
                  ? `${stats.avgAltitudeM.toLocaleString("es-ES")} m`
                  : "aeronaves activas"}
              </div>
            </div>
          </div>

          {/* Secondary stats */}
          {stats.distinctCountries > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-2.5">
                <Globe className="w-4 h-4 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                    {stats.distinctCountries}
                  </span>{" "}
                  países de origen en el espacio aéreo
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-2.5">
                <Radio className="w-4 h-4 text-[var(--tl-success)]" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Actualización cada 5 minutos · OpenSky Network
                </span>
              </div>
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Aviation map                                                     */}
        {/* ---------------------------------------------------------------- */}
        <section className="mb-10">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Mapa de tráfico aéreo
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Aeropuertos AENA y posiciones de aeronaves en tiempo real (OpenSky Network)
          </p>
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
            <AviationMapWrapper />
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Live aircraft table                                              */}
        {/* ---------------------------------------------------------------- */}
        {recentAircraft.length > 0 && (
          <section aria-label="Aeronaves en vuelo">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Plane className="w-6 h-6 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                Aeronaves sobre espacio aéreo español
              </h2>
              <span className="flex items-center gap-1.5 text-xs text-[var(--tl-success)] font-semibold bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--tl-success)] animate-pulse" />
                En tiempo real
              </span>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              {/* Table header */}
              <div className="grid grid-cols-5 gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <div>Indicativo</div>
                <div>País origen</div>
                <div className="hidden sm:block">Altitud</div>
                <div className="hidden sm:block">Velocidad</div>
                <div>Rumbo</div>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentAircraft.map((ac) => (
                  <div
                    key={ac.icao24}
                    className="grid grid-cols-5 gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    {/* Callsign + ICAO */}
                    <div>
                      <div className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {ac.callsign?.trim() || "—"}
                      </div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                        {ac.icao24.toUpperCase()}
                      </div>
                    </div>

                    {/* Country */}
                    <div className="flex items-center">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {ac.originCountry || "—"}
                      </span>
                    </div>

                    {/* Altitude */}
                    <div className="hidden sm:flex items-center">
                      <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                        {formatAltitude(ac.altitude)}
                      </span>
                    </div>

                    {/* Speed */}
                    <div className="hidden sm:flex items-center">
                      <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                        {formatSpeed(ac.velocity)}
                      </span>
                    </div>

                    {/* Heading */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                        {headingToCompass(ac.heading)}
                      </span>
                      {ac.heading !== null && (
                        <span className="text-[10px] text-gray-400 font-mono">
                          {Math.round(ac.heading)}°
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                <p className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                  <Info className="w-3 h-3" />
                  Mostrando {recentAircraft.length} aeronaves airborne de la última hora ·
                  Fuente: OpenSky Network (CC BY 4.0) · Actualización cada 5 min
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Empty state for aircraft */}
        {recentAircraft.length === 0 && (
          <section aria-label="Sin datos de aeronaves">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Plane className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Datos de aeronaves en recopilación
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  El colector OpenSky actualiza posiciones cada 5 minutos. Vuelve en breve.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--tl-primary)] dark:text-[var(--tl-info)] bg-[var(--tl-primary-bg)] border border-[var(--tl-primary)]/30 rounded-full px-4 py-1.5">
                <AlertTriangle className="w-3 h-3" />
                Colector TASK=opensky activo en hetzner-prod
              </div>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Airport grid                                                      */}
        {/* ---------------------------------------------------------------- */}
        {topAirports.length > 0 && (
          <section aria-label="Aeropuertos AENA">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                Aeropuertos AENA
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Ordenados por pasajeros
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topAirports.map((airport, index) => (
                <div
                  key={airport.id}
                  className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-[var(--tl-primary)] hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {/* Rank badge */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold font-mono flex-shrink-0"
                        style={{
                          background:
                            index === 0
                              ? "var(--tl-primary)"
                              : index < 3
                              ? "var(--color-tl-100)"
                              : "var(--color-tl-50)",
                          color:
                            index === 0
                              ? "white"
                              : index < 3
                              ? "var(--color-tl-700)"
                              : "var(--color-tl-600)",
                        }}
                      >
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight truncate">
                          {airport.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {airport.city ?? "—"}
                          {airport.province &&
                            ` · ${PROVINCE_NAMES[airport.province] ?? airport.province}`}
                        </p>
                      </div>
                    </div>

                    {/* IATA code */}
                    {airport.iata && (
                      <span className="flex-shrink-0 font-mono text-sm font-bold px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {airport.iata}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {airport.icao}
                      </span>
                      {airport.isAena && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--tl-primary-bg)] text-[var(--tl-primary)] dark:text-[var(--tl-info)] font-semibold text-[10px]">
                          AENA
                        </span>
                      )}
                    </div>

                    {/* Passenger count */}
                    {airport.latestPax !== null && (
                      <div className="text-right">
                        <div className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                          <Users className="w-3 h-3 text-gray-400" />
                          {formatPax(airport.latestPax)}
                        </div>
                        {airport.latestPaxPeriod && (
                          <div className="text-[10px] text-gray-400 font-mono">
                            {new Date(airport.latestPaxPeriod).toLocaleDateString("es-ES", {
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Navigation cards                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Secciones de aviación">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-5">
            Más información sobre aviación
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            <div className="group flex flex-col gap-4 p-6 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-[var(--tl-primary)] hover:shadow-md transition-all">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: "var(--tl-primary-bg)" }}
              >
                <Plane className="w-6 h-6 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Aeronaves en tiempo real
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Posiciones ADS-B en espacio aéreo español vía OpenSky Network
                </p>
              </div>
              <a
                href="/api/aviacion"
                target="_blank"
                rel="noopener"
                className="flex items-center gap-1 text-[var(--tl-primary)] dark:text-[var(--tl-info)] text-sm font-medium group-hover:gap-2 transition-all"
              >
                Ver datos GeoJSON <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="group flex flex-col gap-4 p-6 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-[var(--tl-primary)] hover:shadow-md transition-all">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: "var(--tl-primary-bg)" }}
              >
                <MapPin className="w-6 h-6 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Aeropuertos AENA
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Catálogo de {stats.aenaAirports} aeropuertos con estadísticas de pasajeros
                </p>
              </div>
              <a
                href="/api/aviacion/aeropuertos"
                target="_blank"
                rel="noopener"
                className="flex items-center gap-1 text-[var(--tl-primary)] dark:text-[var(--tl-info)] text-sm font-medium group-hover:gap-2 transition-all"
              >
                Ver catálogo <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="group flex flex-col gap-4 p-6 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-[var(--tl-primary)] hover:shadow-md transition-all">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: "var(--tl-primary-bg)" }}
              >
                <BarChart3 className="w-6 h-6 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Estadísticas de pasajeros
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Datos mensuales AENA por aeropuerto y ruta
                </p>
              </div>
              <a
                href="/api/aviacion/aeropuertos?airport=MAD"
                target="_blank"
                rel="noopener"
                className="flex items-center gap-1 text-[var(--tl-primary)] dark:text-[var(--tl-info)] text-sm font-medium group-hover:gap-2 transition-all"
              >
                Ver estadísticas MAD <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* SEO text                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section
          className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-8"
          aria-label="Información sobre el tráfico aéreo en España"
        >
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Aviación Civil en España
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-3">
            <p>
              España es uno de los principales destinos del turismo aéreo internacional.
              El sistema aeroportuario de <strong>AENA</strong> gestiona 46 aeropuertos y 2
              helipuertos en todo el territorio español, siendo el cuarto sistema aeroportuario
              más grande de Europa por número de pasajeros.
            </p>
            <p>
              El <strong>espacio aéreo español</strong> está gestionado por ENAIRE, la entidad
              pública responsable de la navegación aérea en España. El tráfico aéreo sobre la
              Península Ibérica incluye vuelos domésticos, europeos e intercontinentales, con
              especial relevancia de las rutas hacia las Islas Canarias y Baleares.
            </p>
            <p>
              Las posiciones de aeronaves en trafico.live provienen de la red de receptores
              ADS-B del <strong>OpenSky Network</strong>, una iniciativa colaborativa que
              agrega datos de posicionamiento de aeronaves de todo el mundo bajo licencia
              Creative Commons (CC BY 4.0). Los datos se actualizan cada 5 minutos.
            </p>
            <p>
              Las <strong>estadísticas de pasajeros</strong> proceden de los informes mensuales
              publicados por AENA Aeropuertos, que incluyen datos por terminal, ruta y tipo de
              tráfico (nacional, internacional, tránsito).
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Fuentes: OpenSky Network (posiciones ADS-B, CC BY 4.0), AENA Aeropuertos
              (catálogo y estadísticas de pasajeros), ENAIRE (espacio aéreo). Datos de
              aeronaves actualizados cada 5 minutos.
            </p>
          </div>
        </section>

        {/* Attribution */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-400 dark:text-gray-500 pb-2">
          <div className="flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            <span>
              Datos de posicionamiento: © The OpenSky Network (opensky-network.org) · CC BY 4.0
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/maritimo"
              className="flex items-center gap-1 hover:text-[var(--tl-primary)] transition-colors"
            >
              Tráfico Marítimo <ChevronRight className="w-3 h-3" />
            </Link>
            <Link
              href="/trenes"
              className="flex items-center gap-1 hover:text-[var(--tl-primary)] transition-colors"
            >
              Red Ferroviaria <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

      </div>
    </>
  );
}
