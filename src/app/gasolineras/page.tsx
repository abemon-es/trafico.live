import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Fuel, Anchor, TrendingUp, TrendingDown, Minus, MapPin, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Gasolineras y Precios de Combustible | Tráfico España",
  description: "Consulta los precios de combustible actualizados en más de 12.000 gasolineras de España. Encuentra la gasolinera más barata cerca de ti.",
};

// Force dynamic rendering - database not accessible during build
export const dynamic = 'force-dynamic';

async function getStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [nationalStats, yesterday, terrestrialCount, maritimeCount] = await Promise.all([
    prisma.fuelPriceDailyStats.findFirst({
      where: { scope: "national", date: today },
    }),
    prisma.fuelPriceDailyStats.findFirst({
      where: { scope: "national", date: new Date(today.getTime() - 24 * 60 * 60 * 1000) },
    }),
    prisma.gasStation.count(),
    prisma.maritimeStation.count(),
  ]);

  return { nationalStats, yesterday, terrestrialCount, maritimeCount };
}

async function getCheapestStations() {
  const [cheapestDiesel, cheapestGas95] = await Promise.all([
    prisma.gasStation.findMany({
      where: { priceGasoleoA: { not: null } },
      orderBy: { priceGasoleoA: "asc" },
      take: 5,
    }),
    prisma.gasStation.findMany({
      where: { priceGasolina95E5: { not: null } },
      orderBy: { priceGasolina95E5: "asc" },
      take: 5,
    }),
  ]);

  return { cheapestDiesel, cheapestGas95 };
}

function TrendBadge({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null || previous == null) return null;
  const change = current - previous;
  const percent = ((change / previous) * 100).toFixed(2);

  if (change > 0.001) {
    return (
      <span className="flex items-center gap-1 text-red-600 text-sm">
        <TrendingUp className="w-4 h-4" />
        +{change.toFixed(3)}€ ({percent}%)
      </span>
    );
  }
  if (change < -0.001) {
    return (
      <span className="flex items-center gap-1 text-green-600 text-sm">
        <TrendingDown className="w-4 h-4" />
        {change.toFixed(3)}€ ({percent}%)
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-gray-500 text-sm">
      <Minus className="w-4 h-4" />
      Sin cambios
    </span>
  );
}

export default async function GasolinerasPage() {
  const [stats, cheapest] = await Promise.all([getStats(), getCheapestStations()]);

  const formatPrice = (price: unknown) => {
    if (price == null) return "N/D";
    const num = typeof price === "object" && "toNumber" in price
      ? (price as { toNumber: () => number }).toNumber()
      : Number(price);
    return `${num.toFixed(3)}€`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gasolineras y Precios de Combustible
        </h1>
        <p className="text-gray-600">
          Precios actualizados de más de {stats.terrestrialCount.toLocaleString("es-ES")} gasolineras terrestres
          y {stats.maritimeCount.toLocaleString("es-ES")} estaciones marítimas en toda España.
        </p>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link
          href="/gasolineras/terrestres"
          className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors"
        >
          <Fuel className="w-8 h-8 text-orange-600" />
          <div>
            <div className="font-semibold text-orange-900">Terrestres</div>
            <div className="text-sm text-orange-700">{stats.terrestrialCount.toLocaleString("es-ES")} estaciones</div>
          </div>
        </Link>
        <Link
          href="/gasolineras/maritimas"
          className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
        >
          <Anchor className="w-8 h-8 text-blue-600" />
          <div>
            <div className="font-semibold text-blue-900">Marítimas</div>
            <div className="text-sm text-blue-700">{stats.maritimeCount.toLocaleString("es-ES")} estaciones</div>
          </div>
        </Link>
        <Link
          href="/gasolineras/precios"
          className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
        >
          <TrendingUp className="w-8 h-8 text-green-600" />
          <div>
            <div className="font-semibold text-green-900">Precios</div>
            <div className="text-sm text-green-700">Hoy por provincia</div>
          </div>
        </Link>
        <Link
          href="/gasolineras/mapa"
          className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
        >
          <MapPin className="w-8 h-8 text-purple-600" />
          <div>
            <div className="font-semibold text-purple-900">Mapa</div>
            <div className="text-sm text-purple-700">Ver en mapa</div>
          </div>
        </Link>
      </div>

      {/* National Stats */}
      {stats.nationalStats && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Precios Medios Nacionales - Hoy
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="text-sm text-amber-600 mb-1">Gasóleo A</div>
              <div className="text-3xl font-bold text-amber-700 mb-2">
                {formatPrice(stats.nationalStats.avgGasoleoA)}
              </div>
              <TrendBadge
                current={stats.nationalStats.avgGasoleoA ? Number(stats.nationalStats.avgGasoleoA) : null}
                previous={stats.yesterday?.avgGasoleoA ? Number(stats.yesterday.avgGasoleoA) : null}
              />
              <div className="text-xs text-amber-600 mt-2">
                Min: {formatPrice(stats.nationalStats.minGasoleoA)} | Max: {formatPrice(stats.nationalStats.maxGasoleoA)}
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 mb-1">Gasolina 95</div>
              <div className="text-3xl font-bold text-blue-700 mb-2">
                {formatPrice(stats.nationalStats.avgGasolina95)}
              </div>
              <TrendBadge
                current={stats.nationalStats.avgGasolina95 ? Number(stats.nationalStats.avgGasolina95) : null}
                previous={stats.yesterday?.avgGasolina95 ? Number(stats.yesterday.avgGasolina95) : null}
              />
              <div className="text-xs text-blue-600 mt-2">
                Min: {formatPrice(stats.nationalStats.minGasolina95)} | Max: {formatPrice(stats.nationalStats.maxGasolina95)}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 mb-1">Gasolina 98</div>
              <div className="text-3xl font-bold text-purple-700 mb-2">
                {formatPrice(stats.nationalStats.avgGasolina98)}
              </div>
              <TrendBadge
                current={stats.nationalStats.avgGasolina98 ? Number(stats.nationalStats.avgGasolina98) : null}
                previous={stats.yesterday?.avgGasolina98 ? Number(stats.yesterday.avgGasolina98) : null}
              />
              <div className="text-xs text-purple-600 mt-2">
                Min: {formatPrice(stats.nationalStats.minGasolina98)} | Max: {formatPrice(stats.nationalStats.maxGasolina98)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cheapest Stations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            Gasóleo A Más Barato
          </h2>
          <div className="space-y-3">
            {cheapest.cheapestDiesel.map((station, idx) => (
              <Link
                key={station.id}
                href={`/gasolineras/terrestres/${station.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{station.name}</div>
                    <div className="text-xs text-gray-500">{station.locality}, {station.provinceName}</div>
                  </div>
                </div>
                <div className="text-lg font-bold text-amber-700">
                  {formatPrice(station.priceGasoleoA)}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            Gasolina 95 Más Barata
          </h2>
          <div className="space-y-3">
            {cheapest.cheapestGas95.map((station, idx) => (
              <Link
                key={station.id}
                href={`/gasolineras/terrestres/${station.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{station.name}</div>
                    <div className="text-xs text-gray-500">{station.locality}, {station.provinceName}</div>
                  </div>
                </div>
                <div className="text-lg font-bold text-blue-700">
                  {formatPrice(station.priceGasolina95E5)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Información sobre los datos</h3>
            <p className="text-sm text-gray-600">
              Los precios de combustible se actualizan varias veces al día desde la API oficial del
              Ministerio para la Transición Ecológica y el Reto Demográfico (MITERD).
              Los datos mostrados corresponden a los precios comunicados por las gasolineras y
              pueden variar ligeramente respecto al precio real en el momento del repostaje.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
