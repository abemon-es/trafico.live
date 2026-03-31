import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Fuel, MapPin, Clock, Navigation, ArrowLeft, TrendingUp, TrendingDown, Minus, ChevronRight, Tag } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { PriceComparisonCard, StationRanking, StationLocationMap, PriceHistoryChart } from "@/components/gas-stations";
import { StationPriceHistory } from "@/components/charts/StationPriceHistory";

export const revalidate = 60;

interface Props {
  params: Promise<{ id: string }>;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const station = await prisma.gasStation.findUnique({ where: { id } });

  if (!station) {
    return { title: "Gasolinera no encontrada" };
  }

  const brandName = station.name.split(" ")[0];
  const locality = station.locality || station.municipality || station.provinceName || "España";
  const province = station.provinceName || "";
  const dieselPrice = station.priceGasoleoA ? `${Number(station.priceGasoleoA).toFixed(3)}€/L` : "N/D";
  const gas95Price = station.priceGasolina95E5 ? `${Number(station.priceGasolina95E5).toFixed(3)}€/L` : "N/D";
  const schedule = station.is24h ? "Abierta 24h" : station.schedule || "Consultar horario";
  const canonicalUrl = `${BASE_URL}/gasolineras/terrestres/${id}`;

  // Pick the most relevant fuel and price for the title
  const leadFuelLabel = station.priceGasoleoA ? "Gasóleo A" : station.priceGasolina95E5 ? "Gasolina 95" : "Combustible";
  const leadFuelPrice = station.priceGasoleoA
    ? `${Number(station.priceGasoleoA).toFixed(3)}`
    : station.priceGasolina95E5
    ? `${Number(station.priceGasolina95E5).toFixed(3)}`
    : null;

  const title = leadFuelPrice
    ? `Gasolinera ${brandName} en ${locality} — Precio ${leadFuelLabel} ${leadFuelPrice}€/L Hoy`
    : `Gasolinera ${brandName} en ${locality} — Precios Combustible Hoy`;

  const description = `Precios actualizados de la gasolinera ${station.name} en ${locality}${province && province !== locality ? `, ${province}` : ""}. Gasóleo A: ${dieselPrice}. Gasolina 95: ${gas95Price}. Horario: ${schedule}. Las 5 alternativas más baratas cerca.`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      locale: "es_ES",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function StationDetailPage({ params }: Props) {
  const { id } = await params;

  const [station, priceHistory] = await Promise.all([
    prisma.gasStation.findUnique({ where: { id } }),
    prisma.gasStationPriceHistory.findMany({
      where: { stationId: id },
      orderBy: { recordedAt: "asc" },
      take: 90,
    }),
  ]);

  if (!station) {
    notFound();
  }

  // Provincial average for comparison badges
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const provincialStats = station.province
    ? await prisma.fuelPriceDailyStats.findFirst({
        where: {
          date: today,
          scope: `province:${station.province}`,
        },
        select: {
          avgGasoleoA: true,
          avgGasolina95: true,
        },
      })
    : null;

  // 5 cheaper alternatives in same province, ordered by lowest diesel price
  const cheaperAlternatives = await prisma.gasStation.findMany({
    where: {
      id: { not: station.id },
      province: station.province ?? undefined,
      priceGasoleoA: station.priceGasoleoA
        ? { lt: station.priceGasoleoA }
        : undefined,
    },
    orderBy: { priceGasoleoA: "asc" },
    take: 5,
    select: {
      id: true,
      name: true,
      locality: true,
      provinceName: true,
      priceGasoleoA: true,
      priceGasolina95E5: true,
      is24h: true,
    },
  });

  const formatPrice = (price: unknown) => {
    if (price == null) return "N/D";
    const num = typeof price === "object" && "toNumber" in price
      ? (price as { toNumber: () => number }).toNumber()
      : Number(price);
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
    avgGasolina98: h.priceGasolina98E5 ? Number(h.priceGasolina98E5) : undefined,
  }));

  // Get brand from name (usually first word or recognizable brand)
  const brandName = station.name.split(" ")[0].toUpperCase();

  // Build JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["GasStation", "LocalBusiness"],
    name: station.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: station.address || undefined,
      postalCode: station.postalCode || undefined,
      addressLocality: station.locality || station.municipality || undefined,
      addressRegion: station.provinceName || undefined,
      addressCountry: "ES",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: Number(station.latitude),
      longitude: Number(station.longitude),
    },
    ...(station.schedule ? { openingHours: station.schedule } : {}),
    ...(station.is24h ? { openingHours: "Mo-Su 00:00-24:00" } : {}),
    priceRange: "€",
    url: `${BASE_URL}/gasolineras/terrestres/${station.id}`,
    ...(station.priceGasoleoA || station.priceGasolina95E5
      ? {
          offers: [
            ...(station.priceGasoleoA
              ? [
                  {
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
                  },
                ]
              : []),
            ...(station.priceGasolina95E5
              ? [
                  {
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
                  },
                ]
              : []),
          ],
        }
      : {}),
  };

  // All fuel prices for display
  const mainFuels = [
    { key: "gasoleoA", label: "Gasoleo A", price: station.priceGasoleoA, color: "amber", trend: dieselTrend },
    { key: "gasolina95", label: "Gasolina 95", price: station.priceGasolina95E5, color: "blue", trend: gas95Trend },
    { key: "gasolina98", label: "Gasolina 98", price: station.priceGasolina98E5, color: "purple", trend: null },
    { key: "glp", label: "GLP", price: station.priceGLP, color: "green", trend: null },
  ].filter(f => f.price != null);

  const additionalFuels = [
    { key: "gasoleoB", label: "Gasoleo B", price: station.priceGasoleoB },
    { key: "gasoleoPremium", label: "Gasoleo Premium", price: station.priceGasoleoPremium },
    { key: "gasolina95E10", label: "Gasolina 95 E10", price: station.priceGasolina95E10 },
    { key: "gasolina98E10", label: "Gasolina 98 E10", price: station.priceGasolina98E10 },
    { key: "gnc", label: "GNC", price: station.priceGNC },
    { key: "gnl", label: "GNL", price: station.priceGNL },
    { key: "hidrogeno", label: "Hidrogeno", price: station.priceHidrogeno },
    { key: "adblue", label: "AdBlue", price: station.priceAdblue },
  ].filter(f => f.price != null);

  // Determine service type badges
  const badges = [];
  if (station.is24h) badges.push({ label: "24h", color: "orange" });
  if (station.saleType === "P") badges.push({ label: "Autoservicio", color: "gray" });
  if (station.saleType === "R") badges.push({ label: "Asistido", color: "gray" });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Gasolineras", href: "/gasolineras" },
          { name: "Terrestres", href: "/gasolineras/terrestres" },
          { name: station.name, href: `/gasolineras/terrestres/${station.id}` },
        ]}
      />

      {/* Back button */}
      <Link
        href="/gasolineras/terrestres"
        className="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:text-orange-400 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al listado
      </Link>

      {/* Header with brand and badges */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Fuel className="w-7 h-7 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                {/* Brand badge */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex px-2 py-0.5 bg-gray-800 text-white text-xs font-bold rounded">
                    {brandName}
                  </span>
                  {badges.map((badge) => (
                    <span
                      key={badge.label}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        badge.color === "orange"
                          ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                          : "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {badge.label === "24h" && <Clock className="w-3 h-3" />}
                      {badge.label}
                    </span>
                  ))}
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{station.name}</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {station.address && `${station.address}, `}
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
                href={`/gasolineras/mapa?lat=${station.latitude}&lng=${station.longitude}&zoom=15`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-950 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                Ver en mapa
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
          stationType="terrestrial"
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
            {station.nearestRoad && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Carretera</span>
                <Link href={`/carreteras/${encodeURIComponent(station.nearestRoad)}`} className="font-medium text-tl-600 dark:text-tl-400 hover:underline">
                  {station.nearestRoad}
                  {station.roadKm && ` - km ${Number(station.roadKm).toFixed(1)}`}
                </Link>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Municipio</span>
              <span className="font-medium">{station.municipality || station.locality || "N/D"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Provincia</span>
              {station.province ? (
                <Link href={`/provincias/${station.province}`} className="font-medium text-tl-600 dark:text-tl-400 hover:underline">
                  {station.provinceName || station.province}
                </Link>
              ) : (
                <span className="font-medium">N/D</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Codigo postal</span>
              <span className="font-medium font-mono">{station.postalCode || "N/D"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Prices - All fuels */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Precios Actuales</h2>

        {/* Main fuels with trends */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mainFuels.map((fuel) => {
            const colorClasses: Record<string, { bg: string; text: string; textDark: string }> = {
              amber: { bg: "bg-tl-amber-50 dark:bg-tl-amber-900/20", text: "text-tl-amber-600 dark:text-tl-amber-400", textDark: "text-tl-amber-700 dark:text-tl-amber-300" },
              blue: { bg: "bg-tl-50 dark:bg-tl-900/20", text: "text-tl-600 dark:text-tl-400", textDark: "text-tl-700 dark:text-tl-300" },
              purple: { bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-600 dark:text-purple-400", textDark: "text-purple-700 dark:text-purple-400" },
              green: { bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-600 dark:text-green-400", textDark: "text-green-700 dark:text-green-400" },
            };
            const colors = colorClasses[fuel.color] || colorClasses.amber;

            // Provincial average comparison badge
            const provincialAvg =
              fuel.key === "gasoleoA" && provincialStats?.avgGasoleoA
                ? Number(provincialStats.avgGasoleoA)
                : fuel.key === "gasolina95" && provincialStats?.avgGasolina95
                ? Number(provincialStats.avgGasolina95)
                : null;
            const fuelNum = fuel.price != null ? Number(fuel.price) : null;
            const diff = fuelNum != null && provincialAvg != null ? fuelNum - provincialAvg : null;

            return (
              <div key={fuel.key} className={`${colors.bg} rounded-lg p-4`}>
                <div className={`text-sm ${colors.text} mb-1`}>{fuel.label}</div>
                <div className={`text-2xl font-bold ${colors.textDark}`}>{formatPrice(fuel.price)}</div>
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
                {diff != null && Math.abs(diff) >= 0.001 && (
                  <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                    diff < 0
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                  }`}>
                    {diff < 0 ? (
                      <>{Math.abs(diff).toFixed(3)}€ por debajo de la media</>
                    ) : (
                      <>{diff.toFixed(3)}€ por encima de la media</>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Additional fuels */}
        {additionalFuels.length > 0 && (
          <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-2 text-sm">
            {additionalFuels.map((fuel) => (
              <div key={fuel.key} className="bg-gray-50 dark:bg-gray-950 rounded p-2 text-center">
                <div className="text-gray-500 dark:text-gray-400 text-xs">{fuel.label}</div>
                <div className="font-medium">{formatPrice(fuel.price)}</div>
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
        <PriceComparisonCard stationId={station.id} stationType="terrestrial" />
      </div>

      {/* Station Ranking */}
      <div className="mb-6">
        <StationRanking
          stationId={station.id}
          stationType="terrestrial"
          defaultFuel={station.priceGasoleoA ? "gasoleoA" : "gasolina95"}
        />
      </div>

      {/* Station Price History (client-side chart) */}
      <div className="mb-6">
        <StationPriceHistory stationId={station.id} />
      </div>

      {/* 5 alternativas más baratas */}
      {cheaperAlternatives.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-4 h-4 text-green-600 dark:text-green-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {cheaperAlternatives.length === 1
                ? "1 alternativa más barata en la provincia"
                : `${cheaperAlternatives.length} alternativas más baratas en la provincia`}
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {cheaperAlternatives.map((alt, index) => {
              const altDiesel = alt.priceGasoleoA ? Number(alt.priceGasoleoA) : null;
              const altGas95 = alt.priceGasolina95E5 ? Number(alt.priceGasolina95E5) : null;
              const currentDiesel = station.priceGasoleoA ? Number(station.priceGasoleoA) : null;
              const saving = altDiesel && currentDiesel ? currentDiesel - altDiesel : null;

              return (
                <Link
                  key={alt.id}
                  href={`/gasolineras/terrestres/${alt.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 dark:bg-gray-950 -mx-2 px-2 rounded transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{alt.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {alt.locality || alt.provinceName}
                        {alt.is24h && " · 24h"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <div className="text-right">
                      {altDiesel && (
                        <p className="font-bold text-tl-amber-700 dark:text-tl-amber-300">{altDiesel.toFixed(3)} €</p>
                      )}
                      {altGas95 && !altDiesel && (
                        <p className="font-bold text-tl-700 dark:text-tl-300">{altGas95.toFixed(3)} €</p>
                      )}
                      {saving && saving > 0 && (
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                          -{saving.toFixed(3)} €/L
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Precios Gasóleo A. Gasolineras en la misma provincia ordenadas de menor a mayor precio.
          </p>
        </div>
      )}

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
          <div>
            <span className="text-gray-500 dark:text-gray-400">Direccion:</span>
            <p className="font-medium">{station.address || "No disponible"}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Codigo postal:</span>
            <p className="font-medium">{station.postalCode || "No disponible"}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Localidad:</span>
            <p className="font-medium">{station.locality || "No disponible"}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Municipio:</span>
            <p className="font-medium">{station.municipality || "No disponible"}</p>
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

        {station.nearestRoad && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Carretera mas cercana:</span>
            <p className="font-medium">
              <Link href={`/carreteras/${encodeURIComponent(station.nearestRoad)}`} className="text-tl-600 dark:text-tl-400 hover:underline">
                {station.nearestRoad}
              </Link>
              {station.roadKm && ` - km ${Number(station.roadKm).toFixed(1)}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
