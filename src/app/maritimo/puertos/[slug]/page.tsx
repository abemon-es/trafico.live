import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { Anchor, MapPin, Fuel, Navigation, Ship } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const revalidate = 60;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Slug helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Return all unique port names from the DB */
const getAllPorts = cache(async () => {
  return prisma.maritimeStation.findMany({
    where: { port: { not: null } },
    select: { port: true },
    distinct: ["port"],
  });
});

/** Find all stations for a port slug */
const getPortStations = cache(async (slug: string) => {
  const allPorts = await getAllPorts();
  const matched = allPorts.find((p) => p.port != null && slugify(p.port) === slug);
  if (!matched?.port) return null;

  const stations = await prisma.maritimeStation.findMany({
    where: { port: matched.port },
    orderBy: [{ priceGasoleoA: "asc" }],
  });

  return { portName: matched.port, stations };
});

// ---------------------------------------------------------------------------
// Static params
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const ports = await getAllPorts();
  return ports
    .filter((p) => p.port != null)
    .map((p) => ({ slug: slugify(p.port as string) }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPortStations(slug);

  if (!result) {
    return { title: "Puerto no encontrado" };
  }

  const { portName, stations } = result;
  const province = stations[0]?.provinceName ?? null;
  const cheapestGasoleoA = stations
    .map((s) => (s.priceGasoleoA != null ? Number(s.priceGasoleoA) : null))
    .filter((p): p is number => p != null)
    .sort((a, b) => a - b)[0];

  return {
    title: `Puerto de ${portName}`,
    description: `Estaciones de combustible náutico en el Puerto de ${portName}${province ? `, ${province}` : ""}. ${cheapestGasoleoA != null ? `Gasóleo A desde ${cheapestGasoleoA.toFixed(3)} €/L.` : ""} ${stations.length} estaciones disponibles.`,
    alternates: {
      canonical: `${BASE_URL}/maritimo/puertos/${slug}`,
    },
    openGraph: {
      title: `Puerto de ${portName} — Combustible Náutico | trafico.live`,
      description: `Precios de combustible náutico en el Puerto de ${portName}. ${stations.length} estaciones disponibles con datos del MITERD.`,
      url: `${BASE_URL}/maritimo/puertos/${slug}`,
      type: "website",
      locale: "es_ES",
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(value: unknown): string {
  if (value == null) return "N/D";
  const num = typeof value === "object" && value !== null && "toNumber" in value
    ? (value as { toNumber: () => number }).toNumber()
    : Number(value);
  return `${num.toFixed(3)} €`;
}

function toNum(value: unknown): number | null {
  if (value == null) return null;
  const num = typeof value === "object" && value !== null && "toNumber" in value
    ? (value as { toNumber: () => number }).toNumber()
    : Number(value);
  return isNaN(num) ? null : num;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PortDetailPage({ params }: Props) {
  const { slug } = await params;
  const result = await getPortStations(slug);

  if (!result) {
    notFound();
  }

  const { portName, stations } = result;
  const province = stations[0]?.provinceName ?? null;
  const lat = stations[0] ? toNum(stations[0].latitude) : null;
  const lon = stations[0] ? toNum(stations[0].longitude) : null;

  // Cheapest prices across the port
  const gasoleoAPrices = stations
    .map((s) => toNum(s.priceGasoleoA))
    .filter((p): p is number => p != null);
  const gasolina95Prices = stations
    .map((s) => toNum(s.priceGasolina95E5))
    .filter((p): p is number => p != null);
  const gasoleoAPrices_sorted = [...gasoleoAPrices].sort((a, b) => a - b);
  const gasolina95Prices_sorted = [...gasolina95Prices].sort((a, b) => a - b);

  const cheapestGasoleoA = gasoleoAPrices_sorted[0] ?? null;
  const cheapestGasolina95 = gasolina95Prices_sorted[0] ?? null;

  const googleMapsUrl =
    lat != null && lon != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`
      : null;

  // JSON-LD LocalBusiness
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${BASE_URL}/maritimo/puertos/${slug}`,
    name: `Puerto de ${portName}`,
    description: `Estaciones de suministro de combustible náutico en el Puerto de ${portName}`,
    url: `${BASE_URL}/maritimo/puertos/${slug}`,
    ...(province && { address: { "@type": "PostalAddress", addressLocality: province, addressCountry: "ES" } }),
    ...(lat != null && lon != null && {
      geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lon },
      hasMap: googleMapsUrl,
    }),
    ...(cheapestGasoleoA != null && {
      offers: [
        {
          "@type": "Offer",
          name: "Gasóleo A",
          price: cheapestGasoleoA.toFixed(3),
          priceCurrency: "EUR",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: cheapestGasoleoA.toFixed(3),
            priceCurrency: "EUR",
            unitText: "L",
          },
        },
      ],
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Hero */}
        <div className="bg-gradient-to-br from-tl-sea-700 via-tl-sea-600 to-tl-sea-500 text-white">
          <div className="max-w-5xl mx-auto px-4 py-10 sm:py-12">
            <Breadcrumbs
              items={[
                { name: "Inicio", href: "/" },
                { name: "Marítimo", href: "/maritimo" },
                { name: "Puertos", href: "/maritimo/puertos" },
                { name: portName, href: `/maritimo/puertos/${slug}` },
              ]}
            />

            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Anchor className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-heading font-bold">
                    Puerto de {portName}
                  </h1>
                  {province && (
                    <div className="flex items-center gap-1.5 mt-1 text-tl-sea-100">
                      <MapPin className="w-4 h-4" />
                      <span>{province}</span>
                    </div>
                  )}
                </div>
              </div>

              {googleMapsUrl && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  Cómo llegar
                </a>
              )}
            </div>

            {/* Cheapest fuel summary */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/10 rounded-xl p-3.5">
                <div className="text-xs text-tl-sea-100">Gasóleo A (mín.)</div>
                <div className="font-data font-bold text-lg tabular-nums mt-0.5">
                  {cheapestGasoleoA != null
                    ? `${cheapestGasoleoA.toFixed(3)} €`
                    : "N/D"}
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3.5">
                <div className="text-xs text-tl-sea-100">Gasolina 95 (mín.)</div>
                <div className="font-data font-bold text-lg tabular-nums mt-0.5">
                  {cheapestGasolina95 != null
                    ? `${cheapestGasolina95.toFixed(3)} €`
                    : "N/D"}
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3.5">
                <div className="text-xs text-tl-sea-100">Estaciones</div>
                <div className="font-data font-bold text-lg tabular-nums mt-0.5">
                  {stations.length}
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3.5">
                <div className="text-xs text-tl-sea-100">24h disponibles</div>
                <div className="font-data font-bold text-lg tabular-nums mt-0.5">
                  {stations.filter((s) => s.is24h).length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stations list */}
        <div className="max-w-5xl mx-auto px-4 py-8">
          <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Fuel className="w-5 h-5 text-tl-sea-500" />
            Estaciones de combustible
          </h2>

          {stations.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              No hay estaciones registradas en este puerto.
            </div>
          ) : (
            <div className="space-y-3">
              {stations.map((station, index) => {
                const gasoleoANum = toNum(station.priceGasoleoA);
                const gasolina95Num = toNum(station.priceGasolina95E5);
                const gasoleoBNum = toNum(station.priceGasoleoB);
                const isCheapestGasoleoA =
                  gasoleoANum != null && gasoleoANum === cheapestGasoleoA;

                return (
                  <Link
                    key={station.id}
                    href={`/gasolineras/maritimas/${station.id}`}
                    className="group block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md hover:border-tl-sea-300 dark:hover:border-tl-sea-700 transition-all"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-400 dark:text-gray-600 w-6 text-right flex-shrink-0">
                            {index + 1}.
                          </span>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-sea-700 dark:group-hover:text-tl-sea-300 transition-colors truncate">
                            {station.name}
                          </h3>
                          {station.is24h && (
                            <span className="flex-shrink-0 text-xs font-medium px-1.5 py-0.5 bg-tl-sea-100 dark:bg-tl-sea-900/40 text-tl-sea-700 dark:text-tl-sea-300 rounded">
                              24h
                            </span>
                          )}
                          {isCheapestGasoleoA && (
                            <span className="flex-shrink-0 text-xs font-medium px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded">
                              Más barata
                            </span>
                          )}
                        </div>
                        {station.locality && (
                          <div className="flex items-center gap-1 ml-8 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            <MapPin className="w-3 h-3" />
                            {station.locality}
                          </div>
                        )}
                      </div>

                      {/* Prices */}
                      <div className="flex flex-wrap gap-4 ml-8 sm:ml-0">
                        {gasoleoANum != null && (
                          <div className="text-right">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Gasóleo A</div>
                            <div
                              className={`font-data font-semibold tabular-nums ${
                                isCheapestGasoleoA
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-tl-sea-700 dark:text-tl-sea-300"
                              }`}
                            >
                              {formatPrice(station.priceGasoleoA)}
                            </div>
                          </div>
                        )}
                        {gasoleoBNum != null && (
                          <div className="text-right">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Gasóleo B</div>
                            <div className="font-data font-semibold tabular-nums text-tl-sea-700 dark:text-tl-sea-300">
                              {formatPrice(station.priceGasoleoB)}
                            </div>
                          </div>
                        )}
                        {gasolina95Num != null && (
                          <div className="text-right">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Gasolina 95</div>
                            <div className="font-data font-semibold tabular-nums text-tl-sea-700 dark:text-tl-sea-300">
                              {formatPrice(station.priceGasolina95E5)}
                            </div>
                          </div>
                        )}
                        {gasoleoANum == null && gasoleoBNum == null && gasolina95Num == null && (
                          <span className="text-sm text-gray-400 dark:text-gray-600 italic">
                            Precios no disponibles
                          </span>
                        )}
                      </div>
                    </div>

                    {station.schedule && (
                      <div className="mt-2 ml-8 text-xs text-gray-500 dark:text-gray-400">
                        <Ship className="w-3 h-3 inline mr-1" />
                        {station.schedule}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Data attribution */}
          <p className="mt-6 text-xs text-gray-400 dark:text-gray-600 text-center">
            Precios actualizados desde el Ministerio para la Transición Ecológica y el Reto
            Demográfico (MITERD). Datos orientativos — verifica con la estación antes de zarpar.
          </p>

          {/* Back link */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
            <Link
              href="/maritimo/puertos"
              className="inline-flex items-center gap-2 text-tl-sea-600 dark:text-tl-sea-400 hover:text-tl-sea-700 dark:hover:text-tl-sea-300 text-sm font-medium transition-colors"
            >
              <Anchor className="w-4 h-4" />
              Ver todos los puertos
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
