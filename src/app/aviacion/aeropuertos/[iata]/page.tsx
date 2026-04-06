/**
 * /aviacion/aeropuertos/[iata] — Airport Detail Page
 *
 * Server component with ISR (revalidate = 300). Shows full airport info:
 * hero with IATA/ICAO badges, live nearby aircraft count, passenger statistics
 * chart (Recharts), runway table, nearby transport, and JSON-LD structured data.
 *
 * Slug is IATA (lowercased), ICAO as fallback for airports without IATA.
 *
 * Data sources:
 *   - Airport catalog: AENA
 *   - Aircraft positions: OpenSky Network (CC BY 4.0)
 *   - Passenger statistics: Eurostat AVIA_PAOA via AENA stats collector
 *   - Runways: OurAirports
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  Plane,
  MapPin,
  BarChart3,
  Ruler,
  Navigation,
  Train,
  Fuel,
  Zap,
  ArrowUpRight,
  Mountain,
  Info,
} from "lucide-react";
import runwaysData from "../../../../../public/data/runways.json";
import PaxChart from "./pax-chart";

export const revalidate = 300;
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// Bounding-box approximation: ~30 km in degrees at mid-latitudes (Spain ~40N)
const RADIUS_30KM_LAT = 30 / 111.32;
const RADIUS_30KM_LNG = 30 / (111.32 * Math.cos((40 * Math.PI) / 180));

// 10 km for nearby transport
const RADIUS_10KM_LAT = 10 / 111.32;
const RADIUS_10KM_LNG = 10 / (111.32 * Math.cos((40 * Math.PI) / 180));

const PROVINCE_NAMES: Record<string, string> = {
  "01": "Alava", "02": "Albacete", "03": "Alicante", "04": "Almeria",
  "05": "Avila", "06": "Badajoz", "07": "Baleares", "08": "Barcelona",
  "09": "Burgos", "10": "Caceres", "11": "Cadiz", "12": "Castellon",
  "13": "Ciudad Real", "14": "Cordoba", "15": "A Coruna", "16": "Cuenca",
  "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Gipuzkoa",
  "21": "Huelva", "22": "Huesca", "23": "Jaen", "24": "Leon",
  "25": "Lleida", "26": "La Rioja", "27": "Lugo", "28": "Madrid",
  "29": "Malaga", "30": "Murcia", "31": "Navarra", "32": "Ourense",
  "33": "Asturias", "34": "Palencia", "35": "Las Palmas", "36": "Pontevedra",
  "37": "Salamanca", "38": "Santa Cruz de Tenerife", "39": "Cantabria",
  "40": "Segovia", "41": "Sevilla", "42": "Soria", "43": "Tarragona",
  "44": "Teruel", "45": "Toledo", "46": "Valencia", "47": "Valladolid",
  "48": "Bizkaia", "49": "Zamora", "50": "Zaragoza", "51": "Ceuta",
  "52": "Melilla",
};

// Runway data typed
interface Runway {
  id: string;
  lengthFt: number;
  widthFt: number;
  surface: string;
  lighted: boolean;
  closed: boolean;
  leIdent: string;
  leLat: number;
  leLon: number;
  leHeading: number;
  leElevFt: number | null;
  heIdent: string;
  heLat: number;
  heLon: number;
  heHeading: number;
  heElevFt: number | null;
}

const runwaysByIcao = runwaysData as Record<string, Runway[]>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  params: Promise<{ iata: string }>;
};

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getAirport(code: string) {
  const upper = code.toUpperCase();
  return prisma.airport.findFirst({
    where: {
      OR: [{ iata: upper }, { icao: upper }],
    },
    include: {
      statistics: {
        orderBy: { periodStart: "desc" },
        take: 120,
      },
    },
  });
}

async function getNearbyAircraftCount(lat: number, lng: number) {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  return prisma.aircraftPosition.count({
    where: {
      createdAt: { gte: since },
      latitude: {
        gte: lat - RADIUS_30KM_LAT,
        lte: lat + RADIUS_30KM_LAT,
      },
      longitude: {
        gte: lng - RADIUS_30KM_LNG,
        lte: lng + RADIUS_30KM_LNG,
      },
    },
  });
}

async function getNearbyStations(lat: number, lng: number) {
  return prisma.railwayStation.findMany({
    where: {
      locationType: 1,
      latitude: {
        gte: lat - RADIUS_10KM_LAT,
        lte: lat + RADIUS_10KM_LAT,
      },
      longitude: {
        gte: lng - RADIUS_10KM_LNG,
        lte: lng + RADIUS_10KM_LNG,
      },
    },
    select: {
      name: true,
      slug: true,
      latitude: true,
      longitude: true,
    },
    take: 5,
  });
}

async function getNearbyGasStations(lat: number, lng: number) {
  return prisma.gasStation.findMany({
    where: {
      latitude: {
        gte: lat - RADIUS_10KM_LAT,
        lte: lat + RADIUS_10KM_LAT,
      },
      longitude: {
        gte: lng - RADIUS_10KM_LNG,
        lte: lng + RADIUS_10KM_LNG,
      },
    },
    select: {
      id: true,
      name: true,
      locality: true,
    },
    take: 5,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function feetToMeters(ft: number): number {
  return Math.round(ft * 0.3048);
}

function formatNumber(n: number): string {
  return n.toLocaleString("es-ES");
}

function surfaceLabel(surface: string): string {
  const map: Record<string, string> = {
    ASP: "Asfalto",
    ASPH: "Asfalto",
    asphalt: "Asfalto",
    Asphalt: "Asfalto",
    CON: "Hormigon",
    CONC: "Hormigon",
    GRE: "Hierba",
    GRS: "Hierba",
    GRASS: "Hierba",
    DIRT: "Tierra",
    PEM: "PEM",
    hard: "Firme duro",
  };
  return map[surface] ?? surface;
}

function getAirportSlug(airport: { iata: string | null; icao: string }): string {
  return (airport.iata ?? airport.icao).toLowerCase();
}

// ---------------------------------------------------------------------------
// Static Params
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const airports = await prisma.airport.findMany({
    where: { isAena: true },
    select: { iata: true, icao: true },
  });

  return airports.map((a) => ({
    iata: getAirportSlug(a),
  }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { iata } = await params;
  const airport = await getAirport(iata);

  if (!airport) {
    return { title: "Aeropuerto no encontrado" };
  }

  const provinceName = airport.province
    ? PROVINCE_NAMES[airport.province] ?? airport.province
    : null;

  const title = `Aeropuerto ${airport.name} (${airport.iata ?? airport.icao}) — Informacion y estadisticas | trafico.live`;
  const description = `Informacion del aeropuerto ${airport.name}${airport.city ? ` en ${airport.city}` : ""}${provinceName ? `, ${provinceName}` : ""}. Estadisticas de pasajeros, pistas, aeronaves cercanas en tiempo real y transporte proximo.`;

  return {
    title,
    description,
    keywords: [
      airport.name,
      airport.iata ?? airport.icao,
      `aeropuerto ${airport.city ?? ""}`.trim(),
      "estadisticas pasajeros",
      "pistas aeropuerto",
      "AENA",
      "aviacion Espana",
    ],
    alternates: {
      canonical: `${BASE_URL}/aviacion/aeropuertos/${getAirportSlug(airport)}`,
    },
    openGraph: {
      title: `Aeropuerto ${airport.name} (${airport.iata ?? airport.icao})`,
      description,
      url: `${BASE_URL}/aviacion/aeropuertos/${getAirportSlug(airport)}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AirportDetailPage({ params }: Props) {
  const { iata } = await params;
  const airport = await getAirport(iata);

  if (!airport) notFound();

  const lat = Number(airport.latitude);
  const lng = Number(airport.longitude);

  const [nearbyAircraft, nearbyStations, nearbyGas] = await Promise.all([
    getNearbyAircraftCount(lat, lng),
    getNearbyStations(lat, lng),
    getNearbyGasStations(lat, lng),
  ]);

  const provinceName = airport.province
    ? PROVINCE_NAMES[airport.province] ?? airport.province
    : null;

  const slug = getAirportSlug(airport);
  const runways = (runwaysByIcao[airport.icao] ?? []).filter((r) => !r.closed);

  // Build pax stats for chart (yearly aggregates from monthly data)
  const paxStats = airport.statistics
    .filter((s) => s.metric === "pax" && s.periodType === "monthly")
    .reduce<Record<number, number>>((acc, s) => {
      const year = new Date(s.periodStart).getFullYear();
      acc[year] = (acc[year] ?? 0) + Number(s.value);
      return acc;
    }, {});

  const paxChartData = Object.entries(paxStats)
    .map(([year, total]) => ({ year: Number(year), pasajeros: total }))
    .sort((a, b) => a.year - b.year);

  // Latest monthly pax
  const latestPax = airport.statistics.find(
    (s) => s.metric === "pax" && s.periodType === "monthly"
  );

  // JSON-LD
  const airportSchema = {
    "@context": "https://schema.org",
    "@type": "Airport",
    name: airport.name,
    iataCode: airport.iata ?? undefined,
    icaoCode: airport.icao,
    geo: {
      "@type": "GeoCoordinates",
      latitude: lat,
      longitude: lng,
      ...(airport.elevation != null && {
        elevation: {
          "@type": "QuantitativeValue",
          value: airport.elevation,
          unitCode: "FOT",
        },
      }),
    },
    address: {
      "@type": "PostalAddress",
      ...(airport.city && { addressLocality: airport.city }),
      ...(provinceName && { addressRegion: provinceName }),
      addressCountry: "ES",
    },
    url: `${BASE_URL}/aviacion/aeropuertos/${slug}`,
  };

  return (
    <>
      <StructuredData data={airportSchema} />

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Aviacion", href: "/aviacion" },
            { name: "Aeropuertos", href: "/aviacion" },
            { name: airport.name, href: `/aviacion/aeropuertos/${slug}` },
          ]}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* ---------------------------------------------------------------- */}
        {/* 1. Hero card                                                      */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-tl-50 dark:bg-tl-900/30 flex items-center justify-center">
                  <Plane className="w-6 h-6 text-tl-600 dark:text-tl-400" />
                </div>
                <div className="flex items-center gap-2">
                  {airport.iata && (
                    <span className="font-mono text-lg font-bold px-3 py-1 rounded-lg bg-tl-100 dark:bg-tl-900/40 text-tl-700 dark:text-tl-300">
                      {airport.iata}
                    </span>
                  )}
                  <span className="font-mono text-sm font-semibold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {airport.icao}
                  </span>
                  {airport.isAena && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-tl-amber-50 dark:bg-tl-amber-900/20 text-tl-amber-700 dark:text-tl-amber-300 border border-tl-amber-200 dark:border-tl-amber-800">
                      AENA
                    </span>
                  )}
                </div>
              </div>

              <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {airport.name}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                {airport.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {airport.city}
                  </span>
                )}
                {provinceName && (
                  <span>{provinceName}</span>
                )}
                {airport.elevation != null && (
                  <span className="flex items-center gap-1">
                    <Mountain className="w-4 h-4" />
                    <span className="font-mono">{formatNumber(airport.elevation)}</span> ft ({formatNumber(feetToMeters(airport.elevation))} m)
                  </span>
                )}
              </div>

              <div className="mt-3 text-xs text-gray-400 dark:text-gray-500 font-mono">
                {lat.toFixed(6)}N, {lng.toFixed(6)}
                {lng >= 0 ? "E" : "W"}
              </div>
            </div>

            {/* Live aircraft badge */}
            <div className="flex-shrink-0">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-center min-w-[140px]">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Aeronaves cercanas
                  </span>
                </div>
                <div className="font-mono text-4xl font-bold text-tl-600 dark:text-tl-400">
                  {formatNumber(nearbyAircraft)}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  radio 30 km / ultima hora
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 2. Passenger Statistics Chart                                     */}
        {/* ---------------------------------------------------------------- */}
        {paxChartData.length > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">
                  Estadisticas de pasajeros
                </h2>
              </div>
              {latestPax && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Ultimo dato:{" "}
                  {new Date(latestPax.periodStart).toLocaleDateString("es-ES", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>

            {/* Yearly totals summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {paxChartData.slice(-4).map((d) => (
                <div
                  key={d.year}
                  className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-3"
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {d.year}
                  </div>
                  <div className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
                    {d.pasajeros >= 1_000_000
                      ? `${(d.pasajeros / 1_000_000).toFixed(1)}M`
                      : d.pasajeros >= 1_000
                      ? `${(d.pasajeros / 1_000).toFixed(0)}K`
                      : formatNumber(d.pasajeros)}
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">
                    pasajeros
                  </div>
                </div>
              ))}
            </div>

            <PaxChart data={paxChartData} />

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Datos anuales agregados de estadisticas mensuales. Fuente: Eurostat AVIA_PAOA / AENA.
            </p>
          </section>
        )}

        {/* Empty state when no statistics */}
        {paxChartData.length === 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-gray-400" />
              <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">
                Estadisticas de pasajeros
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No hay datos de pasajeros disponibles para este aeropuerto.
            </p>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* 3. Runways                                                        */}
        {/* ---------------------------------------------------------------- */}
        {runways.length > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Ruler className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">
                Pistas
              </h2>
              <span className="text-sm text-gray-400 dark:text-gray-500 ml-2">
                {runways.length} {runways.length === 1 ? "pista activa" : "pistas activas"}
              </span>
            </div>

            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 pr-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
                      Designacion
                    </th>
                    <th className="text-left py-3 pr-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
                      Rumbo
                    </th>
                    <th className="text-right py-3 pr-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
                      Longitud
                    </th>
                    <th className="text-right py-3 pr-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
                      Ancho
                    </th>
                    <th className="text-left py-3 pr-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
                      Superficie
                    </th>
                    <th className="text-center py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
                      Iluminada
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {runways.map((rwy) => (
                    <tr
                      key={rwy.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Navigation className="w-4 h-4 text-tl-500 dark:text-tl-400" />
                          <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                            {rwy.leIdent}/{rwy.heIdent}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-mono text-gray-600 dark:text-gray-400">
                        {Math.round(rwy.leHeading)}° / {Math.round(rwy.heHeading)}°
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                          {formatNumber(feetToMeters(rwy.lengthFt))} m
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                          ({formatNumber(rwy.lengthFt)} ft)
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-gray-600 dark:text-gray-400">
                        {formatNumber(feetToMeters(rwy.widthFt))} m
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                        {surfaceLabel(rwy.surface)}
                      </td>
                      <td className="py-3 text-center">
                        {rwy.lighted ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                            <Zap className="w-3 h-3" />
                            Si
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Datos de pistas: OurAirports. Longitud y anchura convertidas de pies a metros.
            </p>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* 4. Nearby Transport                                               */}
        {/* ---------------------------------------------------------------- */}
        {(nearbyStations.length > 0 || nearbyGas.length > 0) && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Transporte cercano
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Railway stations */}
              {nearbyStations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Train className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      Estaciones de tren
                    </h3>
                    <span className="text-xs text-gray-400">radio 10 km</span>
                  </div>
                  <ul className="space-y-2">
                    {nearbyStations.map((st) => (
                      <li key={st.slug ?? st.name}>
                        <Link
                          href="/trenes/estaciones"
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-tl-300 dark:hover:border-tl-700 hover:bg-tl-50/50 dark:hover:bg-tl-900/10 transition-all group"
                        >
                          <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-tl-600 dark:group-hover:text-tl-400 transition-colors">
                            {st.name}
                          </span>
                          <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-tl-500 transition-colors" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Gas stations */}
              {nearbyGas.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Fuel className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      Gasolineras
                    </h3>
                    <span className="text-xs text-gray-400">radio 10 km</span>
                  </div>
                  <ul className="space-y-2">
                    {nearbyGas.map((gs) => (
                      <li key={gs.id}>
                        <Link
                          href="/gasolineras"
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-tl-amber-300 dark:hover:border-tl-amber-700 hover:bg-tl-amber-50/50 dark:hover:bg-tl-amber-900/10 transition-all group"
                        >
                          <div>
                            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-tl-amber-600 dark:group-hover:text-tl-amber-400 transition-colors">
                              {gs.name}
                            </span>
                            {gs.locality && (
                              <span className="text-xs text-gray-400 ml-2">
                                {gs.locality}
                              </span>
                            )}
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-tl-amber-500 transition-colors" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Attribution                                                       */}
        {/* ---------------------------------------------------------------- */}
        <footer className="text-xs text-gray-400 dark:text-gray-500 text-center py-4 border-t border-gray-100 dark:border-gray-800">
          Datos: AENA Aeropuertos, Eurostat AVIA_PAOA, OpenSky Network (CC BY 4.0), OurAirports.
          Actualizado cada 5 minutos.
        </footer>
      </div>
    </>
  );
}
