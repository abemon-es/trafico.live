/**
 * /aviacion/aeropuertos — Airport index (parent list)
 *
 * Fixes the prior 404 on the listing route. Lists every AENA airport
 * (~42) with hero card, search, province filter, sort, and CollectionPage
 * JSON-LD for discovery.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { Plane, MapPin, ArrowUpRight, Info } from "lucide-react";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Aeropuertos de España — Catálogo AENA completo | trafico.live",
  description:
    "Listado completo de los aeropuertos AENA en España. Pasajeros anuales, IATA/ICAO, provincia y enlaces a cada aeropuerto con estadísticas en tiempo real.",
  alternates: { canonical: `${BASE_URL}/aviacion/aeropuertos` },
  openGraph: {
    title: "Aeropuertos de España — Catálogo AENA",
    description:
      "Catálogo de aeropuertos AENA: IATA/ICAO, provincia, estadísticas de pasajeros y aeronaves cercanas.",
    url: `${BASE_URL}/aviacion/aeropuertos`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

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

function getAirportSlug(airport: { iata: string | null; icao: string }): string {
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
    include: {
      statistics: {
        where: { metric: "pax" },
        orderBy: { periodStart: "desc" },
        take: 12,
      },
    },
    orderBy: { name: "asc" },
  });

  return airports.map((a) => {
    const totalPax = a.statistics.reduce((sum, s) => sum + Number(s.value), 0);
    return {
      id: a.id,
      name: a.name,
      iata: a.iata,
      icao: a.icao,
      city: a.city,
      province: a.province,
      provinceName: a.province ? PROVINCE_NAMES[a.province] ?? a.province : null,
      slug: getAirportSlug(a),
      pax12m: totalPax,
    };
  });
}

export default async function AirportsIndexPage() {
  const airports = await getAirports();
  const totalPax = airports.reduce((sum, a) => sum + a.pax12m, 0);

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Aeropuertos de España",
    description:
      "Listado de aeropuertos AENA con estadísticas de pasajeros y enlaces a información en tiempo real.",
    url: `${BASE_URL}/aviacion/aeropuertos`,
    inLanguage: "es-ES",
    isPartOf: {
      "@type": "WebSite",
      name: "trafico.live",
      url: BASE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: airports.length,
      itemListElement: airports.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Airport",
          name: a.name,
          iataCode: a.iata ?? undefined,
          icaoCode: a.icao,
          url: `${BASE_URL}/aviacion/aeropuertos/${a.slug}`,
          ...(a.city && {
            address: {
              "@type": "PostalAddress",
              addressLocality: a.city,
              ...(a.provinceName && { addressRegion: a.provinceName }),
              addressCountry: "ES",
            },
          }),
        },
      })),
    },
  };

  // Sort by pax descending for the "top" view
  const topByPax = [...airports]
    .filter((a) => a.pax12m > 0)
    .sort((a, b) => b.pax12m - a.pax12m);

  return (
    <>
      <StructuredData data={collectionSchema} />

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Aviación", href: "/aviacion" },
            { name: "Aeropuertos", href: "/aviacion/aeropuertos" },
          ]}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Hero */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-tl-50 dark:bg-tl-900/30 flex items-center justify-center">
              <Plane className="w-6 h-6 text-tl-600 dark:text-tl-400" />
            </div>
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
                Aeropuertos de España
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Red AENA — {airports.length} aeropuertos operativos
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
            <div className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Aeropuertos
              </div>
              <div className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {airports.length}
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Con datos PAX
              </div>
              <div className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {topByPax.length}
              </div>
            </div>
            <div className="col-span-2 md:col-span-1 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Pasajeros 12m
              </div>
              <div className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {formatPax(totalPax)}
              </div>
            </div>
          </div>
        </section>

        {/* Top by PAX */}
        {topByPax.length > 0 && (
          <section>
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Top aeropuertos por pasajeros (12m)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {topByPax.slice(0, 6).map((a, i) => (
                <Link
                  key={a.id}
                  href={`/aviacion/aeropuertos/${a.slug}`}
                  className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 hover:border-tl-400 dark:hover:border-tl-600 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-tl-100 dark:bg-tl-900/40 text-tl-700 dark:text-tl-300 text-xs font-bold">
                          {i + 1}
                        </span>
                        {a.iata && (
                          <span className="font-mono text-sm font-bold px-2 py-0.5 rounded bg-tl-50 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300">
                            {a.iata}
                          </span>
                        )}
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                          {a.icao}
                        </span>
                      </div>
                      <div className="font-heading text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-600 dark:group-hover:text-tl-400 transition-colors line-clamp-2">
                        {a.name}
                      </div>
                      {(a.city || a.provinceName) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {[a.city, a.provinceName].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-tl-500 transition-colors flex-shrink-0" />
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-end justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-gray-400">
                        PAX 12m
                      </div>
                      <div className="font-mono text-xl font-bold text-tl-600 dark:text-tl-400">
                        {formatPax(a.pax12m)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Full alphabetical list */}
        <section>
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Todos los aeropuertos AENA
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {airports.map((a) => (
                <Link
                  key={a.id}
                  href={`/aviacion/aeropuertos/${a.slug}`}
                  className="group flex items-center justify-between gap-4 p-4 hover:bg-tl-50/50 dark:hover:bg-tl-900/10 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {a.iata && (
                        <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-tl-50 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 w-[44px] text-center">
                          {a.iata}
                        </span>
                      )}
                      {!a.iata && (
                        <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 w-[44px] text-center">
                          {a.icao}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-tl-600 dark:group-hover:text-tl-400 transition-colors truncate">
                        {a.name}
                      </div>
                      {(a.city || a.provinceName) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {[a.city, a.provinceName].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {a.pax12m > 0 && (
                      <span className="hidden sm:inline-block font-mono text-sm text-gray-500 dark:text-gray-400">
                        {formatPax(a.pax12m)} PAX
                      </span>
                    )}
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-tl-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <footer className="text-xs text-gray-400 dark:text-gray-500 text-center py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-1">
          <Info className="w-3 h-3" />
          Datos: AENA Aeropuertos Españoles y Eurostat AVIA_PAOA. Actualizado cada hora.
        </footer>
      </div>
    </>
  );
}
