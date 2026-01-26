import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Fuel, MapPin, Clock, Navigation, ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { PriceHistoryChart } from "@/components/gas-stations";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const station = await prisma.gasStation.findUnique({ where: { id } });

  if (!station) {
    return { title: "Gasolinera no encontrada" };
  }

  return {
    title: `${station.name} - Precios Combustible | Tráfico España`,
    description: `Precios de combustible en ${station.name}, ${station.locality}. Gasóleo A: ${station.priceGasoleoA?.toFixed(3) || "N/D"}€, Gasolina 95: ${station.priceGasolina95E5?.toFixed(3) || "N/D"}€`,
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

  const formatPrice = (price: unknown) => {
    if (price == null) return "N/D";
    const num = typeof price === "object" && "toNumber" in price
      ? (price as { toNumber: () => number }).toNumber()
      : Number(price);
    return `${num.toFixed(3)}€`;
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/gasolineras" className="hover:text-gray-700">Gasolineras</Link>
        <span>/</span>
        <Link href="/gasolineras/terrestres" className="hover:text-gray-700">Terrestres</Link>
        <span>/</span>
        <span className="text-gray-900 truncate max-w-[200px]">{station.name}</span>
      </div>

      {/* Back button */}
      <Link
        href="/gasolineras/terrestres"
        className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al listado
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Fuel className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{station.name}</h1>
                <p className="text-gray-600">
                  {station.address && `${station.address}, `}
                  {station.locality}
                  {station.provinceName && `, ${station.provinceName}`}
                </p>
              </div>
              {station.is24h && (
                <span className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  24h
                </span>
              )}
            </div>

            {station.schedule && !station.is24h && (
              <p className="mt-2 text-sm text-gray-500">
                <Clock className="w-4 h-4 inline mr-1" />
                {station.schedule}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Cómo llegar
              </a>
              <Link
                href={`/gasolineras/mapa?lat=${station.latitude}&lng=${station.longitude}&zoom=15`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                Ver en mapa
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Prices */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Precios Actuales</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {station.priceGasoleoA && (
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="text-sm text-amber-600 mb-1">Gasóleo A</div>
              <div className="text-2xl font-bold text-amber-700">{formatPrice(station.priceGasoleoA)}</div>
              {dieselTrend && (
                <div className={`flex items-center gap-1 text-sm mt-1 ${
                  dieselTrend.direction === "up" ? "text-red-600" :
                  dieselTrend.direction === "down" ? "text-green-600" : "text-gray-500"
                }`}>
                  {dieselTrend.direction === "up" ? <TrendingUp className="w-4 h-4" /> :
                   dieselTrend.direction === "down" ? <TrendingDown className="w-4 h-4" /> :
                   <Minus className="w-4 h-4" />}
                  {dieselTrend.direction === "up" ? "+" : ""}{dieselTrend.change}€
                </div>
              )}
            </div>
          )}
          {station.priceGasolina95E5 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 mb-1">Gasolina 95</div>
              <div className="text-2xl font-bold text-blue-700">{formatPrice(station.priceGasolina95E5)}</div>
              {gas95Trend && (
                <div className={`flex items-center gap-1 text-sm mt-1 ${
                  gas95Trend.direction === "up" ? "text-red-600" :
                  gas95Trend.direction === "down" ? "text-green-600" : "text-gray-500"
                }`}>
                  {gas95Trend.direction === "up" ? <TrendingUp className="w-4 h-4" /> :
                   gas95Trend.direction === "down" ? <TrendingDown className="w-4 h-4" /> :
                   <Minus className="w-4 h-4" />}
                  {gas95Trend.direction === "up" ? "+" : ""}{gas95Trend.change}€
                </div>
              )}
            </div>
          )}
          {station.priceGasolina98E5 && (
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 mb-1">Gasolina 98</div>
              <div className="text-2xl font-bold text-purple-700">{formatPrice(station.priceGasolina98E5)}</div>
            </div>
          )}
          {station.priceGLP && (
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 mb-1">GLP</div>
              <div className="text-2xl font-bold text-green-700">{formatPrice(station.priceGLP)}</div>
            </div>
          )}
        </div>

        {/* Additional fuels */}
        <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-2 text-sm">
          {station.priceGasoleoB && (
            <div className="bg-gray-50 rounded p-2 text-center">
              <div className="text-gray-500">Gasóleo B</div>
              <div className="font-medium">{formatPrice(station.priceGasoleoB)}</div>
            </div>
          )}
          {station.priceGasoleoPremium && (
            <div className="bg-gray-50 rounded p-2 text-center">
              <div className="text-gray-500">Gasóleo Premium</div>
              <div className="font-medium">{formatPrice(station.priceGasoleoPremium)}</div>
            </div>
          )}
          {station.priceGNC && (
            <div className="bg-gray-50 rounded p-2 text-center">
              <div className="text-gray-500">GNC</div>
              <div className="font-medium">{formatPrice(station.priceGNC)}</div>
            </div>
          )}
          {station.priceGNL && (
            <div className="bg-gray-50 rounded p-2 text-center">
              <div className="text-gray-500">GNL</div>
              <div className="font-medium">{formatPrice(station.priceGNL)}</div>
            </div>
          )}
          {station.priceHidrogeno && (
            <div className="bg-gray-50 rounded p-2 text-center">
              <div className="text-gray-500">Hidrógeno</div>
              <div className="font-medium">{formatPrice(station.priceHidrogeno)}</div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Última actualización: {new Date(station.lastPriceUpdate).toLocaleString("es-ES")}
        </p>
      </div>

      {/* Price History Chart */}
      {chartData.length > 1 && (
        <div className="mb-6">
          <PriceHistoryChart
            data={chartData}
            title={`Histórico de precios - ${station.name}`}
            height={350}
          />
        </div>
      )}

      {/* Location Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ubicación</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Dirección:</span>
            <p className="font-medium">{station.address || "No disponible"}</p>
          </div>
          <div>
            <span className="text-gray-500">Código postal:</span>
            <p className="font-medium">{station.postalCode || "No disponible"}</p>
          </div>
          <div>
            <span className="text-gray-500">Localidad:</span>
            <p className="font-medium">{station.locality || "No disponible"}</p>
          </div>
          <div>
            <span className="text-gray-500">Municipio:</span>
            <p className="font-medium">{station.municipality || "No disponible"}</p>
          </div>
          <div>
            <span className="text-gray-500">Provincia:</span>
            <p className="font-medium">{station.provinceName || "No disponible"}</p>
          </div>
          <div>
            <span className="text-gray-500">Coordenadas:</span>
            <p className="font-medium font-mono text-xs">
              {Number(station.latitude).toFixed(6)}, {Number(station.longitude).toFixed(6)}
            </p>
          </div>
        </div>

        {station.nearestRoad && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <span className="text-gray-500 text-sm">Carretera más cercana:</span>
            <p className="font-medium">
              {station.nearestRoad}
              {station.roadKm && ` - km ${Number(station.roadKm).toFixed(1)}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
