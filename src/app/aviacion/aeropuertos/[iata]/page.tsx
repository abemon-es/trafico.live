/**
 * /aviacion/aeropuertos/[iata] — Airport Detail Page
 *
 * Server component with ISR (revalidate = 300). Shows full airport info:
 * hero with IATA/ICAO badges, live nearby aircraft count, passenger statistics
 * chart (Recharts), runway table, nearby transport, air quality, and JSON-LD structured data.
 *
 * Slug is IATA (lowercased), ICAO as fallback for airports without IATA.
 *
 * Data sources:
 *   - Airport catalog: AENA
 *   - Aircraft positions: OpenSky Network (CC BY 4.0) — last 4h within 30km
 *   - Passenger statistics: Eurostat AVIA_PAOA via AENA stats collector
 *   - Runways: OurAirports
 *   - Air quality: MITECO ICA (nearest station within 30km)
 *
 * TODO Team B-10:
 *   - Conectar afiliado Parclick para parking
 *   - Conectar afiliado DiscoverCars para alquiler de coche
 *   - Widget meteo AEMET (pendiente helper src/lib/aemet — no existe aún)
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
  Wind,
  ParkingCircle,
  Car,
  ChevronRight,
  Clock,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import runwaysData from "../../../../../public/data/runways.json";
import PaxChart from "./pax-chart";
import { TrackEntityView } from "@/components/analytics/TrackEntityView";
import { AirportEntityMap } from "./entity-map";

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

/** Recent aircraft seen within 30km in the last 4h — AirportBoard */
async function getRecentAircraft(lat: number, lng: number) {
  const since = new Date(Date.now() - 4 * 60 * 60 * 1000);
  return prisma.aircraftPosition.findMany({
    where: {
      createdAt: { gte: since },
      onGround: false,
      latitude: {
        gte: lat - RADIUS_30KM_LAT,
        lte: lat + RADIUS_30KM_LAT,
      },
      longitude: {
        gte: lng - RADIUS_30KM_LNG,
        lte: lng + RADIUS_30KM_LNG,
      },
      callsign: { not: null },
    },
    select: {
      id: true,
      callsign: true,
      altitude: true,
      velocity: true,
      heading: true,
      originCountry: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    distinct: ["callsign"],
    take: 20,
  });
}

/** Nearest air quality station within 30km */
async function getNearestAirQuality(lat: number, lng: number) {
  const stations = await prisma.airQualityStation.findMany({
    where: {
      latitude: {
        gte: lat - RADIUS_30KM_LAT,
        lte: lat + RADIUS_30KM_LAT,
      },
      longitude: {
        gte: lng - RADIUS_30KM_LNG,
        lte: lng + RADIUS_30KM_LNG,
      },
    },
    include: {
      readings: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    take: 5,
  });

  if (!stations.length) return null;

  // Find closest by Euclidean distance approximation
  const closest = stations.reduce((best, s) => {
    const dLat = Number(s.latitude) - lat;
    const dLng = Number(s.longitude) - lng;
    const dist = dLat * dLat + dLng * dLng;
    const bLat = Number(best.latitude) - lat;
    const bLng = Number(best.longitude) - lng;
    const bestDist = bLat * bLat + bLng * bLng;
    return dist < bestDist ? s : best;
  });

  return closest.readings[0]
    ? { station: closest, reading: closest.readings[0] }
    : null;
}

/** Other nearby AENA airports within ~200km, excluding self */
async function getNearbyAirports(lat: number, lng: number, selfIcao: string) {
  const RADIUS_200KM_LAT = 200 / 111.32;
  const RADIUS_200KM_LNG = 200 / (111.32 * Math.cos((40 * Math.PI) / 180));
  return prisma.airport.findMany({
    where: {
      icao: { not: selfIcao },
      isAena: true,
      latitude: {
        gte: lat - RADIUS_200KM_LAT,
        lte: lat + RADIUS_200KM_LAT,
      },
      longitude: {
        gte: lng - RADIUS_200KM_LNG,
        lte: lng + RADIUS_200KM_LNG,
      },
    },
    select: {
      iata: true,
      icao: true,
      name: true,
      city: true,
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

export async function getSlugList(): Promise<string[]> {
  const airports = await prisma.airport.findMany({
    where: { isAena: true },
    select: { iata: true, icao: true },
  });
  return airports.map(getAirportSlug);
}

export async function generateStaticParams() {
  const slugs = await getSlugList();
  return slugs.map((iata) => ({ iata }));
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

  const cityLabel = airport.city ? `de ${airport.city}` : "";
  const title = `Aeropuerto ${cityLabel || airport.name} (${airport.iata ?? airport.icao}) — Vuelos, llegadas y salidas en tiempo real`;
  const description = `Información del aeropuerto ${airport.name}${airport.city ? ` en ${airport.city}` : ""}${provinceName ? `, ${provinceName}` : ""}. Llegadas y salidas en tiempo real, calidad del aire, parking, alquiler de coches y estadísticas de pasajeros.`;

  return {
    title,
    description,
    keywords: [
      `aeropuerto ${airport.city ?? airport.name}`,
      `aeropuerto de ${airport.city ?? ""}`.trim(),
      airport.name,
      airport.iata ?? airport.icao,
      "llegadas aeropuerto",
      "salidas aeropuerto",
      "estadísticas pasajeros",
      "parking aeropuerto",
      "AENA",
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

  const [nearbyAircraft, nearbyStations, nearbyGas, recentAircraft, airQuality, nearbyAirports] = await Promise.all([
    getNearbyAircraftCount(lat, lng),
    getNearbyStations(lat, lng),
    getNearbyGasStations(lat, lng),
    getRecentAircraft(lat, lng),
    getNearestAirQuality(lat, lng),
    getNearbyAirports(lat, lng, airport.icao),
  ]);

  const provinceName = airport.province
    ? PROVINCE_NAMES[airport.province] ?? airport.province
    : null;

  const slug = getAirportSlug(airport);
  const runways = (runwaysByIcao[airport.icao] ?? []).filter((r) => !r.closed);

  // Build pax stats for chart
  const paxRecords = airport.statistics.filter((s) => s.metric === "pax");

  const paxStats = paxRecords.reduce<Record<number, number>>((acc, s) => {
    const year = new Date(s.periodStart).getFullYear();
    acc[year] = (acc[year] ?? 0) + Number(s.value);
    return acc;
  }, {});

  const paxChartData = Object.entries(paxStats)
    .map(([year, total]) => ({ year: Number(year), pasajeros: total }))
    .sort((a, b) => a.year - b.year);

  const latestPax = paxRecords[0] ?? null;

  const cityLabel = airport.city ? `de ${airport.city}` : "";

  // JSON-LD — Airport with full address, geo, openingHours
  const airportSchema = {
    "@context": "https://schema.org",
    "@type": "Airport",
    name: airport.name,
    iataCode: airport.iata ?? undefined,
    icaoCode: airport.icao,
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
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
    sameAs: airport.iata
      ? [`https://www.aena.es/es/aeropuertos/${airport.iata?.toLowerCase()}.html`]
      : undefined,
  };

  // BreadcrumbList
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Aviación", item: `${BASE_URL}/aviacion` },
      { "@type": "ListItem", position: 3, name: "Aeropuertos", item: `${BASE_URL}/aviacion/aeropuertos` },
      { "@type": "ListItem", position: 4, name: airport.name, item: `${BASE_URL}/aviacion/aeropuertos/${slug}` },
    ],
  };

  // FAQPage — 5 preguntas targeting PAA
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `¿Cómo llegar al aeropuerto ${cityLabel || airport.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `El aeropuerto ${airport.name}${airport.city ? ` en ${airport.city}` : ""} está accesible en transporte público (autobús y tren en la mayoría de ciudades), taxi y coche privado. Consulta las opciones de transporte en el mapa inferior.`,
        },
      },
      {
        "@type": "Question",
        name: `¿Dónde aparcar en el aeropuerto ${cityLabel || airport.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `AENA ofrece parking oficial en todos sus aeropuertos. Existen parkings a corto, medio y largo plazo. Para mejores precios, se recomienda reservar con antelación a través de comparadores como Parclick o el parking oficial de AENA.`,
        },
      },
      {
        "@type": "Question",
        name: `¿Cuánto tiempo de antelación llegar al aeropuerto ${airport.iata ?? airport.icao}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Para vuelos nacionales se recomienda llegar con 90 minutos de antelación. Para vuelos internacionales dentro de Schengen, 2 horas. Para vuelos internacionales fuera de Schengen o intercontinentales, 2,5-3 horas.`,
        },
      },
      {
        "@type": "Question",
        name: `¿Cómo ver las llegadas en tiempo real del aeropuerto ${airport.iata ?? airport.icao}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Puedes ver las aeronaves en tiempo real cerca del aeropuerto ${airport.name} en esta página, con datos ADS-B de OpenSky Network actualizados cada 15 minutos. Para el tablón oficial de llegadas y salidas consulta AENA Infovuelos.`,
        },
      },
      {
        "@type": "Question",
        name: `¿Qué hacer si mi vuelo se cancela en ${airport.iata ?? airport.icao}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Si tu vuelo es cancelado tienes derecho a reembolso o transporte alternativo según el Reglamento CE 261/2004. Si la cancelación no es por causa de fuerza mayor, puedes tener derecho a compensación económica de 250€, 400€ o 600€ según la distancia. Consulta la guía completa en trafico.live/reclamacion-vuelo.`,
        },
      },
    ],
  };

  const ICA_LABELS: Record<number, { label: string; color: string }> = {
    1: { label: "Buena", color: "text-sky-600 dark:text-sky-400" },
    2: { label: "Razonable", color: "text-green-600 dark:text-green-400" },
    3: { label: "Regular", color: "text-yellow-600 dark:text-yellow-400" },
    4: { label: "Desfavorable", color: "text-red-600 dark:text-red-400" },
    5: { label: "Muy desfavorable", color: "text-red-700 dark:text-red-300" },
    6: { label: "Extrema", color: "text-purple-600 dark:text-purple-400" },
  };

  return (
    <>
      <TrackEntityView entityType="airport" entityId={iata} />
      <StructuredData data={[airportSchema, breadcrumbSchema, faqSchema]} />

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Aviacion", href: "/aviacion" },
            { name: "Aeropuertos", href: "/aviacion/aeropuertos" },
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
        {/* 1b. Live map (aviation preset + airport entity)                   */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="h-[320px] md:h-[420px] bg-gray-100 dark:bg-gray-800 relative">
            <p className="sr-only">
              Mapa en tiempo real de aeronaves cerca del aeropuerto {airport.name}
            </p>
            <AirportEntityMap airportId={slug} center={[lng, lat]} />
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
              Datos anuales de pasajeros. Fuente: Eurostat AVIA_PAOA / AENA.
            </p>
          </section>
        )}

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
        {/* 5. AirportBoard — últimas aeronaves en el entorno (4h)            */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">
                Aeronaves recientes
              </h2>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              últimas 4h · radio 30 km
            </span>
          </div>
          {recentAircraft.length > 0 ? (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vuelo</th>
                    <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Alt (m)</th>
                    <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vel (km/h)</th>
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Procedencia</th>
                    <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {recentAircraft.slice(0, 10).map((ac) => (
                    <tr key={ac.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-2.5 pr-4 font-mono font-semibold text-tl-700 dark:text-tl-300">
                        {ac.callsign?.trim() ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono text-gray-700 dark:text-gray-300">
                        {ac.altitude != null ? (ac.altitude * 0.3048).toFixed(0) : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono text-gray-700 dark:text-gray-300">
                        {ac.velocity != null ? (ac.velocity * 3.6).toFixed(0) : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400">
                        {ac.originCountry ?? "—"}
                      </td>
                      <td className="py-2.5 text-right font-mono text-xs text-gray-400 dark:text-gray-500">
                        {new Date(ac.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
              No se han detectado aeronaves en las últimas 4 horas en un radio de 30 km.
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Datos ADS-B: OpenSky Network (CC BY 4.0). Actualizados cada 15 min.
          </p>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 6. Air Quality Widget (MITECO ICA)                               */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wind className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">
              Calidad del aire
            </h2>
          </div>
          {airQuality ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {airQuality.station.name}
                </p>
                {airQuality.station.city && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {airQuality.station.city}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-3">
                  {airQuality.reading.no2 != null && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 font-mono">
                      NO₂ {airQuality.reading.no2.toFixed(1)} µg/m³
                    </span>
                  )}
                  {airQuality.reading.pm10 != null && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 font-mono">
                      PM10 {airQuality.reading.pm10.toFixed(1)} µg/m³
                    </span>
                  )}
                  {airQuality.reading.pm25 != null && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 font-mono">
                      PM2.5 {airQuality.reading.pm25.toFixed(1)} µg/m³
                    </span>
                  )}
                  {airQuality.reading.o3 != null && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 font-mono">
                      O₃ {airQuality.reading.o3.toFixed(1)} µg/m³
                    </span>
                  )}
                </div>
              </div>
              {airQuality.reading.ica != null && (
                <div className="flex-shrink-0 text-center">
                  <div className={`text-4xl font-mono font-bold ${ICA_LABELS[airQuality.reading.ica]?.color ?? "text-gray-700 dark:text-gray-300"}`}>
                    {airQuality.reading.ica}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ICA — {airQuality.reading.icaLabel ?? ICA_LABELS[airQuality.reading.ica]?.label}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No se han encontrado estaciones de calidad del aire en un radio de 30 km.
            </p>
          )}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Fuente: MITECO ICA. Índice 1 (buena) → 6 (extrema).
            </p>
            <Link href="/calidad-aire" className="text-xs text-tl-600 dark:text-tl-400 hover:underline flex items-center gap-1">
              Ver mapa nacional <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 7. Parking placeholder                                            */}
        {/* TODO Team B-10 afiliado Parclick                                 */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ParkingCircle className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">
              Parking en el aeropuerto
            </h2>
          </div>
          {/* TODO Team B-10: conectar afiliado Parclick — https://www.parclick.es/parking-aeropuerto/?utm_source=traficolive&utm_medium=affiliate */}
          <div className="rounded-xl bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 p-4">
            <p className="text-sm text-tl-amber-800 dark:text-tl-amber-200 font-medium mb-1">
              Reserva tu parking con antelación y ahorra hasta un 70%
            </p>
            <p className="text-xs text-tl-amber-700 dark:text-tl-amber-300 mb-3">
              AENA ofrece parking oficial a corto, medio y largo plazo. Para mejores precios,
              compara con los parkings externos homologados.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://www.aena.es/es/aeropuerto-${airport.iata?.toLowerCase() ?? ""}/transporte-y-accesos/parking.html`}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-tl-amber-100 dark:bg-tl-amber-900/40 text-tl-amber-700 dark:text-tl-amber-300 hover:bg-tl-amber-200 dark:hover:bg-tl-amber-900/60 transition-colors"
              >
                Parking oficial AENA <ArrowUpRight className="w-3 h-3" />
              </a>
              {/* TODO Team B-10 afiliado Parclick */}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 8. Alquiler de coche placeholder                                  */}
        {/* TODO Team B-10 afiliado DiscoverCars                             */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">
              Alquiler de coche en el aeropuerto
            </h2>
          </div>
          {/* TODO Team B-10: conectar afiliado DiscoverCars — https://www.discovercars.com/spain/airport?utm_source=traficolive&utm_medium=affiliate */}
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">
              Compara precios de alquiler en {airport.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Hertz, Europcar, Sixt, Avis y otros operadores están presentes en el aeropuerto.
              Comparar precios antes de llegar puede suponer un ahorro significativo.
            </p>
            <div className="flex flex-wrap gap-2">
              {/* TODO Team B-10 afiliado DiscoverCars */}
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5">
                Comparador disponible próximamente
              </span>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 9. Aeropuertos cercanos — internal linking                       */}
        {/* ---------------------------------------------------------------- */}
        {nearbyAirports.length > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">
                Aeropuertos cercanos
              </h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">radio 200 km</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {nearbyAirports.map((a) => {
                const aSlug = (a.iata ?? a.icao).toLowerCase();
                return (
                  <Link
                    key={a.icao}
                    href={`/aviacion/aeropuertos/${aSlug}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-tl-300 dark:hover:border-tl-700 hover:bg-tl-50/50 dark:hover:bg-tl-900/10 transition-all group"
                  >
                    <div>
                      <span className="font-mono text-xs font-bold text-tl-600 dark:text-tl-400 mr-2">
                        {a.iata ?? a.icao}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {a.name}
                      </span>
                      {a.city && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{a.city}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-tl-500 transition-colors flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* 10. FAQ — targeting PAA en SERPs                                 */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">
              Preguntas frecuentes
            </h2>
          </div>
          <dl className="space-y-4">
            {[
              {
                q: `¿Cómo llegar al aeropuerto ${cityLabel || airport.name}?`,
                a: `El aeropuerto ${airport.name}${airport.city ? ` en ${airport.city}` : ""} está accesible en transporte público (autobús y tren en la mayoría de ciudades), taxi y coche privado. Consulta las opciones de transporte en el mapa superior.`,
                isCancellation: false,
              },
              {
                q: `¿Dónde aparcar en el aeropuerto ${airport.iata ?? airport.icao}?`,
                a: `AENA ofrece parking oficial en todos sus aeropuertos a corto, medio y largo plazo. Para mejores precios, se recomienda reservar con antelación. El parking oficial de AENA está disponible en la web de AENA.`,
                isCancellation: false,
              },
              {
                q: `¿Cuánto tiempo de antelación llegar al aeropuerto?`,
                a: `Para vuelos nacionales: 90 minutos. Vuelos internacionales Schengen: 2 horas. Vuelos internacionales fuera de Schengen o intercontinentales: 2,5-3 horas.`,
                isCancellation: false,
              },
              {
                q: `¿Cómo ver llegadas en tiempo real en ${airport.iata ?? airport.icao}?`,
                a: `En esta página puedes ver las aeronaves detectadas en un radio de 30 km con datos ADS-B de OpenSky Network. Para el tablón oficial de llegadas y salidas consulta AENA Infovuelos.`,
                isCancellation: false,
              },
              {
                q: `¿Qué hacer si mi vuelo se cancela en ${airport.iata ?? airport.icao}?`,
                a: `Si tu vuelo es cancelado tienes derecho a reembolso o transporte alternativo según el Reglamento CE 261/2004. Si la cancelación no es por causa de fuerza mayor, puedes tener derecho a compensación económica de 250€, 400€ o 600€ según la distancia.`,
                isCancellation: true,
              },
            ].map(({ q, a, isCancellation }) => (
              <div key={q} className="border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0 last:pb-0">
                <dt className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-tl-500 flex-shrink-0 mt-0.5" />
                  {q}
                </dt>
                <dd className="text-sm text-gray-600 dark:text-gray-400 ml-6">
                  {a}
                  {isCancellation && (
                    <Link href="/reclamacion-vuelo" className="text-tl-600 dark:text-tl-400 hover:underline ml-1">
                      Ver guía de reclamación →
                    </Link>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Attribution                                                       */}
        {/* ---------------------------------------------------------------- */}
        <footer className="text-xs text-gray-400 dark:text-gray-500 text-center py-4 border-t border-gray-100 dark:border-gray-800">
          Datos: AENA Aeropuertos, Eurostat AVIA_PAOA, OpenSky Network (CC BY 4.0), OurAirports, MITECO ICA.
          Posiciones de aeronaves actualizadas cada 15 minutos.
        </footer>
      </div>
    </>
  );
}
