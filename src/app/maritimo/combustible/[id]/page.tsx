import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { Anchor, MapPin, Clock, Navigation, ArrowLeft, TrendingUp, TrendingDown, Minus, Waves } from "lucide-react";
import { PriceComparisonCard, StationRanking, StationLocationMap, PriceHistoryChart } from "@/components/gas-stations";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const revalidate = 60;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// Cache the station lookup so generateMetadata and the page component share one DB query per request
const getStation = cache(async (id: string) => {
  return prisma.maritimeStation.findUnique({ where: { id } });
});

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const station = await getStation(id);

  if (!station) {
    return { title: "Estacion maritima no encontrada" };
  }

  return {
    title: `${station.name} - Estacion Maritima | Trafico Espana`,
    description: `Precios de combustible en ${station.name}${station.port ? `, Puerto de ${station.port}` : ""}. Gasoleo A: ${station.priceGasoleoA?.toFixed(3) || "N/D"}`,
    alternates: {
      canonical: `${BASE_URL}/maritimo/combustible/${id}`,
    },
  };
}

export default async function MaritimeStationDetailPage({ params }: Props) {
  const { id } = await params;

  const [station, priceHistory] = await Promise.all([
    getStation(id),
    prisma.maritimePriceHistory.findMany({
      where: { stationId: id },
      orderBy: { recordedAt: "asc" },
      take: 90,
    }),
  ]);

  if (!station) {
    notFound();
  }

  const formatPrice = (price: unknown, normalize = false) => {
    if (price == null) return "N/D";
    let num = typeof price === "object" && "toNumber" in price
      ? (price as { toNumber: () => number }).toNumber()
      : Number(price);
    // Normalize bulk pricing (per 1000L) to per-liter
    if (normalize && num > 10) {
      num = num / 1000;
    }
    return `${num.toFixed(3)}`;
  };

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;

  // Calculate trend from price history
  const calculateTrend = (prices: (number | null)[]) => {
    const validPrices = prices.filter((p): p is number => p != null);
    if (validPrices.length < 2) return null;
    const first = validPrices[0];
    const last = validPrices[validPrices.length - 1];
    const change = last - first;
    return {
      direction: change > 0.001 ? "up" : change < -0.001 ? "down" : "flat",
      change: change.toFixed(3),
      percent: ((change / first) * 100).toFixed(1),
    };
  };

  const dieselTrend = calculateTrend(priceHistory.map((h) => h.priceGasoleoA ? Number(h.priceGasoleoA) : null));
  const gas95Trend = calculateTrend(priceHistory.map((h) => h.priceGasolina95E5 ? Number(h.priceGasolina95E5) : null));

  const chartData = priceHistory.map((h) => ({
    date: h.recordedAt.toISOString().split("T")[0],
    avgGasoleoA: h.priceGasoleoA ? Number(h.priceGasoleoA) : undefined,
    avgGasolina95: h.priceGasolina95E5 ? Number(h.priceGasolina95E5) : undefined,
  }));

  // Get brand from name
  const brandName = station.name.split(" ")[0].toUpperCase();

  // All fuel prices for display
  const mainFuels = [
    { key: "gasoleoA", label: "Gasoleo A", price: station.priceGasoleoA, color: "amber", trend: dieselTrend },
    { key: "gasolina95", label: "Gasolina 95", price: station.priceGasolina95E5, color: "blue", trend: gas95Trend },
  ].filter(f => f.price != null);

  const additionalFuels = [
    { key: "gasoleoB", label: "Gasoleo B", price: station.priceGasoleoB },
    { key: "gasolina98", label: "Gasolina 98", price: station.priceGasolina98E5 },
  ].filter(f => f.price != null);

  // Determine service type badges
  const badges = [];
  if (station.is24h) badges.push({ label: "24h", color: "blue" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["GasStation", "LocalBusiness"],
    name: station.name,
    ...(station.port ? { description: `Estación marítima en Puerto de ${station.port}` } : {}),
    ...(station.latitude && station.longitude ? {
      geo: {
        "@type": "GeoCoordinates",
        latitude: Number(station.latitude),
        longitude: Number(station.longitude),
      },
    } : {}),
    ...(station.provinceName ? {
      address: {
        "@type": "PostalAddress",
        addressLocality: station.port || station.locality || undefined,
        addressRegion: station.provinceName,
        addressCountry: "ES",
      },
    } : {}),
    priceRange: "€",
    url: `${BASE_URL}/maritimo/combustible/${station.id}`,
    ...(station.priceGasoleoA ? {
      offers: [
        ...(station.priceGasoleoA ? [{
          "@type": "Offer",
          name: "Gasóleo A",
          price: Number(station.priceGasoleoA).toFixed(3),
          priceCurrency: "EUR",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: Number(station.priceGasoleoA).toFixed(3),
            priceCurrency: "EUR",
            unitCode: "LTR",
          },
        }] : []),
        ...(station.priceGasolina95E5 ? [{
          "@type": "Offer",
          name: "Gasolina 95 E5",
          price: Number(station.priceGasolina95E5).toFixed(3),
          priceCurrency: "EUR",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: Number(station.priceGasolina95E5).toFixed(3),
            priceCurrency: "EUR",
            unitCode: "LTR",
          },
        }] : []),
      ],
    } : {}),
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumbs items={[
        { name: "Inicio", href: "/" },
        { name: "Marítimo", href: "/maritimo" },
        { name: "Combustible", href: "/maritimo/combustible" },
        { name: station.name, href: `/maritimo/combustible/${station.id}` },
      ]} />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
        <Link href="/maritimo" className="hover:text-gray-700 dark:text-gray-300">Marítimo</Link>
        <span>/</span>
        <Link href="/maritimo/combustible" className="hover:text-gray-700 dark:text-gray-300">Combustible</Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{station.name}</span>
      </div>

      {/* Back button */}
      <Link
        href="/maritimo/combustible"
        className="inline-flex items-center gap-2 text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al listado
      </Link>

      {/* Header with brand and badges */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-tl-100 dark:bg-tl-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Anchor className="w-7 h-7 text-tl-600 dark:text-tl-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                {/* Brand and port badges */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex px-2 py-0.5 bg-tl-800 text-white text-xs font-bold rounded">
                    {brandName}
                  </span>
                  {badges.map((badge) => (
                    <span
                      key={badge.label}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 rounded text-xs font-medium"
                    >
                      {badge.label === "24h" && <Clock className="w-3 h-3" />}
                      {badge.label}
                    </span>
                  ))}
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{station.name}</h1>
                {station.port && (
                  <p className="text-lg text-tl-600 dark:text-tl-400 font-medium">Puerto de {station.port}</p>
                )}
                <p className="text-gray-600 dark:text-gray-400">
                  {station.locality}
                  {station.provinceName && `, ${station.provinceName}`}
                </p>
              </div>
            </div>

            {station.schedule && !station.is24h && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock className="w-4 h-4 inline mr-1" />
                {station.schedule}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-tl-600 text-white rounded-lg hover:bg-tl-700 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Como llegar
              </a>
              <Link
                href={`/gasolineras/mapa?lat=${station.latitude}&lng=${station.longitude}&zoom=15&layer=maritime`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-950 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                Ver en mapa
              </Link>
              <Link
                href="/maritimo/meteorologia"
                className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--color-tl-sea-300)] dark:border-[var(--color-tl-sea-700)] text-[var(--color-tl-sea-700)] dark:text-[var(--color-tl-sea-300)] rounded-lg hover:bg-[var(--color-tl-sea-50)] dark:hover:bg-[color-mix(in_oklch,var(--color-tl-sea-900)_20%,transparent)] transition-colors"
              >
                <Waves className="w-4 h-4" />
                Ver meteorología marítima
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Two column layout: Map + Quick stats */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Embedded Map */}
        <StationLocationMap
          latitude={Number(station.latitude)}
          longitude={Number(station.longitude)}
          name={station.name}
          stationType="maritime"
          stationId={station.id}
          height={280}
        />

        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Informacion</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Ultima actualizacion</span>
              <span className="font-medium">{new Date(station.lastPriceUpdate).toLocaleString("es-ES")}</span>
            </div>
            {station.schedule && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Horario</span>
                <span className="font-medium">{station.is24h ? "24 horas" : station.schedule}</span>
              </div>
            )}
            {station.port && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Puerto</span>
                <span className="font-medium">{station.port}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Localidad</span>
              <span className="font-medium">{station.locality || "N/D"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Provincia</span>
              <span className="font-medium">{station.provinceName || "N/D"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Prices */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Precios Actuales</h2>

        {/* Main fuels with trends */}
        <div className="grid grid-cols-2 gap-4">
          {mainFuels.map((fuel) => {
            const colorClasses: Record<string, { bg: string; text: string; textDark: string }> = {
              amber: { bg: "bg-tl-amber-50 dark:bg-tl-amber-900/20", text: "text-tl-amber-600 dark:text-tl-amber-400", textDark: "text-tl-amber-700 dark:text-tl-amber-300" },
              blue: { bg: "bg-tl-50 dark:bg-tl-900/20", text: "text-tl-600 dark:text-tl-400", textDark: "text-tl-700 dark:text-tl-300" },
            };
            const colors = colorClasses[fuel.color] || colorClasses.amber;

            return (
              <div key={fuel.key} className={`${colors.bg} rounded-lg p-4`}>
                <div className={`text-sm ${colors.text} mb-1`}>{fuel.label}</div>
                <div className={`text-3xl font-bold ${colors.textDark}`}>{formatPrice(fuel.price)}</div>
                {fuel.trend && (
                  <div className={`flex items-center gap-1 text-sm mt-1 ${
                    fuel.trend.direction === "up" ? "text-red-600 dark:text-red-400" :
                    fuel.trend.direction === "down" ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
                  }`}>
                    {fuel.trend.direction === "up" ? <TrendingUp className="w-4 h-4" /> :
                     fuel.trend.direction === "down" ? <TrendingDown className="w-4 h-4" /> :
                     <Minus className="w-4 h-4" />}
                    {fuel.trend.direction === "up" ? "+" : ""}{fuel.trend.change}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Additional fuels */}
        {additionalFuels.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {additionalFuels.map((fuel) => (
              <div key={fuel.key} className="bg-gray-50 dark:bg-gray-950 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{fuel.label}</div>
                <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{formatPrice(fuel.price)}</div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4">
          Ultima actualizacion: {new Date(station.lastPriceUpdate).toLocaleString("es-ES")}
        </p>
      </div>

      {/* Price Comparison Card */}
      <div className="mb-6">
        <PriceComparisonCard stationId={station.id} stationType="maritime" />
      </div>

      {/* Station Ranking */}
      <div className="mb-6">
        <StationRanking
          stationId={station.id}
          stationType="maritime"
          defaultFuel={station.priceGasoleoA ? "gasoleoA" : "gasolina95"}
        />
      </div>

      {/* Price History Chart */}
      {chartData.length > 1 && (
        <div className="mb-6">
          <PriceHistoryChart
            data={chartData}
            title={`Historico de precios - ${station.name}`}
            height={350}
          />
        </div>
      )}

      {/* Location Info */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Ubicacion</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {station.port && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Puerto:</span>
              <p className="font-medium">{station.port}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500 dark:text-gray-400">Localidad:</span>
            <p className="font-medium">{station.locality || "No disponible"}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Provincia:</span>
            <p className="font-medium">{station.provinceName || "No disponible"}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Coordenadas:</span>
            <p className="font-medium font-mono text-xs">
              {Number(station.latitude).toFixed(6)}, {Number(station.longitude).toFixed(6)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
