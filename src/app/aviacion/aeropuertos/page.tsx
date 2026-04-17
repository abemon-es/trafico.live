/**
 * /aviacion/aeropuertos — AENA Airport Catalog
 *
 * Server component with ISR (revalidate = 3600). Lists all 46 AENA airports
 * sorted by latest annual passengers desc (alphabetically when no pax data).
 *
 * Stub — T2.5 will amplify with charts + statistics.
 *
 * Data sources:
 *   - Airport catalog: AENA
 *   - Passenger statistics: Eurostat AVIA_PAOA via AENA stats collector
 */

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { Plane, MapPin, Users } from "lucide-react";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Aeropuertos AENA en España — trafico.live",
  description:
    "Catalogo de los 46 aeropuertos AENA en España con estadisticas de pasajeros, codigos IATA/ICAO y ubicacion. Datos Eurostat AVIA_PAOA y AENA.",
  alternates: {
    canonical: `${BASE_URL}/aviacion/aeropuertos`,
  },
  openGraph: {
    title: "Aeropuertos AENA en España — trafico.live",
    description:
      "Catalogo completo de aeropuertos AENA: codigos IATA/ICAO, ciudad, provincia y estadisticas de pasajeros.",
    url: `${BASE_URL}/aviacion/aeropuertos`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Province names
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

function getSlug(airport: { iata: string | null; icao: string }): string {
  return (airport.iata ?? airport.icao).toLowerCase();
}

function formatPax(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("es-ES");
}

async function getAirports() {
  const airports = await prisma.airport.findMany({
    where: { isAena: true },
    select: {
      id: true,
      icao: true,
      iata: true,
      name: true,
      city: true,
      province: true,
      statistics: {
        where: { metric: "pax" },
        orderBy: { periodStart: "desc" },
        take: 1,
        select: { value: true, periodStart: true },
      },
    },
  });

  return airports
    .map((a) => ({
      ...a,
      latestPax: a.statistics[0] ? Number(a.statistics[0].value) : null,
      latestPaxPeriod: a.statistics[0]?.periodStart ?? null,
    }))
    .sort((a, b) => {
      if (a.latestPax !== null && b.latestPax !== null) return b.latestPax - a.latestPax;
      if (a.latestPax !== null) return -1;
      if (b.latestPax !== null) return 1;
      return a.name.localeCompare(b.name, "es");
    });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AeropuertosPage() {
  const airports = await getAirports();

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Aeropuertos AENA en España",
    url: `${BASE_URL}/aviacion/aeropuertos`,
    numberOfItems: airports.length,
    itemListElement: airports.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Airport",
        name: a.name,
        ...(a.iata && { iataCode: a.iata }),
        icaoCode: a.icao,
        url: `${BASE_URL}/aviacion/aeropuertos/${getSlug(a)}`,
      },
    })),
  };

  return (
    <>
      <StructuredData data={itemListSchema} />

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Aviacion", href: "/aviacion" },
            { name: "Aeropuertos", href: "/aviacion/aeropuertos" },
          ]}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-tl-50 dark:bg-tl-900/30 flex items-center justify-center flex-shrink-0">
            <Plane className="w-6 h-6 text-tl-600 dark:text-tl-400" />
          </div>
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
              Aeropuertos AENA en España
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
              <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                {airports.length}
              </span>{" "}
              aeropuertos · Ordenados por pasajeros · Fuente: AENA / Eurostat AVIA_PAOA
            </p>
          </div>
        </div>

        {/* Airport grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {airports.map((airport, index) => {
            const slug = getSlug(airport);
            const provinceName = airport.province
              ? (PROVINCE_NAMES[airport.province] ?? airport.province)
              : null;

            return (
              <Link
                key={airport.id}
                href={`/aviacion/aeropuertos/${slug}`}
                className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-tl-400 dark:hover:border-tl-600 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  {/* Rank + name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 bg-tl-50 dark:bg-tl-900/30 text-tl-600 dark:text-tl-400">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight truncate group-hover:text-tl-600 dark:group-hover:text-tl-400 transition-colors">
                        {airport.name}
                      </h2>
                      {(airport.city || provinceName) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {[airport.city, provinceName].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* IATA badge */}
                  {airport.iata && (
                    <span className="flex-shrink-0 font-mono text-sm font-bold px-2 py-1 rounded-lg bg-tl-100 dark:bg-tl-900/40 text-tl-700 dark:text-tl-300">
                      {airport.iata}
                    </span>
                  )}
                </div>

                {/* Footer: ICAO + pax */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
                    {airport.icao}
                  </span>
                  {airport.latestPax !== null && (
                    <span className="flex items-center gap-1 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                      <Users className="w-3 h-3 text-gray-400" />
                      {formatPax(airport.latestPax)}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Attribution */}
        <footer className="text-xs text-gray-400 dark:text-gray-500 text-center py-4 border-t border-gray-100 dark:border-gray-800">
          Datos: AENA Aeropuertos, Eurostat AVIA_PAOA (estadisticas de pasajeros).
        </footer>
      </div>
    </>
  );
}
