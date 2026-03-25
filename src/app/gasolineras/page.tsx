import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Fuel, Anchor, TrendingUp, TrendingDown, Minus, MapPin, Clock } from "lucide-react";
import { AdSlot } from "@/components/ads/AdSlot";
import { PriceAlertForm } from "@/components/fuel/PriceAlertForm";

export const metadata: Metadata = {
  title: "Gasolineras y Precios de Combustible | Tráfico España",
  description: "Consulta los precios de combustible actualizados en más de 12.000 gasolineras de España. Encuentra la gasolinera más barata cerca de ti.",
  alternates: {
    canonical: "/gasolineras",
  },
};

export const revalidate = 3600;

// Provincias con fiscalidad especial
const TAX_FREE_PROVINCES = ["35", "38", "51", "52"];

async function getStats() {
  // Use UTC date to ensure consistency across timezones
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterdayDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));

  const [nationalStats, yesterday, taxFreeStats, terrestrialCount, maritimeCount, maritimeStats] = await Promise.all([
    prisma.fuelPriceDailyStats.findFirst({
      where: { scope: "national", date: today },
    }),
    prisma.fuelPriceDailyStats.findFirst({
      where: { scope: "national", date: yesterdayDate },
    }),
    prisma.fuelPriceDailyStats.findFirst({
      where: { scope: "tax-free", date: today },
    }),
    prisma.gasStation.count({
      where: { province: { notIn: TAX_FREE_PROVINCES } },
    }),
    prisma.maritimeStation.count(),
    prisma.maritimeStation.aggregate({
      _avg: { priceGasoleoA: true, priceGasoleoB: true, priceGasolina95E5: true },
      _min: { priceGasoleoA: true, priceGasoleoB: true, priceGasolina95E5: true },
      _max: { priceGasoleoA: true, priceGasoleoB: true, priceGasolina95E5: true },
      _count: true,
    }),
  ]);

  // Stats individuales de territorios especiales
  const [ceutaStats, melillaStats, canariasStats] = await Promise.all([
    prisma.fuelPriceDailyStats.findFirst({
      where: { scope: "province:51", date: today },
    }),
    prisma.fuelPriceDailyStats.findFirst({
      where: { scope: "province:52", date: today },
    }),
    prisma.fuelPriceDailyStats.findMany({
      where: { scope: { in: ["province:35", "province:38"] }, date: today },
    }),
  ]);

  // Calcular media de Canarias (Las Palmas + Santa Cruz de Tenerife)
  const canariasAvg = canariasStats.length > 0
    ? canariasStats.reduce((sum, s) => sum + (s.avgGasoleoA ? Number(s.avgGasoleoA) : 0), 0) / canariasStats.length
    : null;

  return {
    nationalStats,
    yesterday,
    taxFreeStats,
    ceutaStats,
    melillaStats,
    canariasAvg,
    terrestrialCount,
    maritimeCount,
    maritimeStats,
  };
}

async function getCheapestStations() {
  // Excluir zonas con fiscalidad especial para comparación justa
  const [cheapestDiesel, cheapestGas95, cheapestMaritimeDiesel] = await Promise.all([
    prisma.gasStation.findMany({
      where: {
        priceGasoleoA: { not: null },
        province: { notIn: TAX_FREE_PROVINCES },
      },
      orderBy: { priceGasoleoA: "asc" },
      take: 5,
    }),
    prisma.gasStation.findMany({
      where: {
        priceGasolina95E5: { not: null },
        province: { notIn: TAX_FREE_PROVINCES },
      },
      orderBy: { priceGasolina95E5: "asc" },
      take: 5,
    }),
    prisma.maritimeStation.findMany({
      where: { priceGasoleoA: { not: null } },
      orderBy: { priceGasoleoA: "asc" },
      take: 5,
    }),
  ]);

  return { cheapestDiesel, cheapestGas95, cheapestMaritimeDiesel };
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
    <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Gasolineras y Precios de Combustible
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Precios actualizados de más de <span className="font-data">{stats.terrestrialCount.toLocaleString("es-ES")}</span> gasolineras terrestres
          y <span className="font-data">{stats.maritimeCount.toLocaleString("es-ES")}</span> estaciones marítimas en toda España.
        </p>
      </div>

      <AdSlot id="gasolineras-top" format="banner" className="mb-8" />

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link
          href="/gasolineras/terrestres"
          className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800/50 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
        >
          <Fuel className="w-8 h-8 text-orange-600" />
          <div>
            <div className="font-semibold text-orange-900 dark:text-orange-300">Terrestres</div>
            <div className="text-sm text-orange-700 dark:text-orange-400 font-data">{stats.terrestrialCount.toLocaleString("es-ES")} estaciones</div>
          </div>
        </Link>
        <Link
          href="/gasolineras/maritimas"
          className="flex items-center gap-3 p-4 bg-tl-50 dark:bg-tl-900/20 rounded-lg border border-tl-200 dark:border-tl-800/50 hover:bg-tl-100 dark:hover:bg-tl-900/30 transition-colors"
        >
          <Anchor className="w-8 h-8 text-tl-600 dark:text-tl-400" />
          <div>
            <div className="font-semibold text-tl-900 dark:text-tl-300">Marítimas</div>
            <div className="text-sm text-tl-700 dark:text-tl-400 font-data">{stats.maritimeCount.toLocaleString("es-ES")} estaciones</div>
          </div>
        </Link>
        <Link
          href="/gasolineras/precios"
          className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800/50 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          <TrendingUp className="w-8 h-8 text-green-600" />
          <div>
            <div className="font-semibold text-green-900 dark:text-green-300">Precios</div>
            <div className="text-sm text-green-700 dark:text-green-400">Hoy por provincia</div>
          </div>
        </Link>
        <Link
          href="/gasolineras/mapa"
          className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800/50 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
        >
          <MapPin className="w-8 h-8 text-purple-600" />
          <div>
            <div className="font-semibold text-purple-900 dark:text-purple-300">Mapa</div>
            <div className="text-sm text-purple-700 dark:text-purple-400">Ver en mapa</div>
          </div>
        </Link>
      </div>

      {/* National Stats */}
      {stats.nationalStats && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Precios Medios Nacionales - Hoy
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">(Península y Baleares)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded-lg p-4">
              <div className="text-sm text-tl-amber-600 dark:text-tl-amber-300 mb-1">Gasóleo A</div>
              <div className="text-3xl font-bold text-tl-amber-700 dark:text-tl-amber-300 mb-2 font-data">
                {formatPrice(stats.nationalStats.avgGasoleoA)}
              </div>
              <TrendBadge
                current={stats.nationalStats.avgGasoleoA ? Number(stats.nationalStats.avgGasoleoA) : null}
                previous={stats.yesterday?.avgGasoleoA ? Number(stats.yesterday.avgGasoleoA) : null}
              />
              <div className="text-xs text-tl-amber-600 dark:text-tl-amber-400 mt-2 font-data">
                Min: {formatPrice(stats.nationalStats.minGasoleoA)} | Max: {formatPrice(stats.nationalStats.maxGasoleoA)}
              </div>
            </div>
            <div className="bg-tl-50 dark:bg-tl-900/20 rounded-lg p-4">
              <div className="text-sm text-tl-600 dark:text-tl-400 mb-1">Gasolina 95</div>
              <div className="text-3xl font-bold text-tl-700 dark:text-tl-300 mb-2 font-data">
                {formatPrice(stats.nationalStats.avgGasolina95)}
              </div>
              <TrendBadge
                current={stats.nationalStats.avgGasolina95 ? Number(stats.nationalStats.avgGasolina95) : null}
                previous={stats.yesterday?.avgGasolina95 ? Number(stats.yesterday.avgGasolina95) : null}
              />
              <div className="text-xs text-tl-600 dark:text-tl-400 mt-2 font-data">
                Min: {formatPrice(stats.nationalStats.minGasolina95)} | Max: {formatPrice(stats.nationalStats.maxGasolina95)}
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">Gasolina 98</div>
              <div className="text-3xl font-bold text-purple-700 dark:text-purple-300 mb-2 font-data">
                {formatPrice(stats.nationalStats.avgGasolina98)}
              </div>
              <TrendBadge
                current={stats.nationalStats.avgGasolina98 ? Number(stats.nationalStats.avgGasolina98) : null}
                previous={stats.yesterday?.avgGasolina98 ? Number(stats.yesterday.avgGasolina98) : null}
              />
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-2 font-data">
                Min: {formatPrice(stats.nationalStats.minGasolina98)} | Max: {formatPrice(stats.nationalStats.maxGasolina98)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maritime Stats */}
      {stats.maritimeStats._count > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-tl-200 dark:border-tl-800/50 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Anchor className="w-6 h-6 text-tl-600 dark:text-tl-400" />
            Precios Medios Estaciones Marítimas
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2 font-data">
              ({stats.maritimeCount.toLocaleString("es-ES")} estaciones en puertos)
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded-lg p-4">
              <div className="text-sm text-tl-amber-600 dark:text-tl-amber-300 mb-1">Gasóleo A</div>
              <div className="text-3xl font-bold text-tl-amber-700 dark:text-tl-amber-300 mb-2 font-data">
                {formatPrice(stats.maritimeStats._avg.priceGasoleoA)}
              </div>
              <div className="text-xs text-tl-amber-600 dark:text-tl-amber-400 font-data">
                Min: {formatPrice(stats.maritimeStats._min.priceGasoleoA)} | Max: {formatPrice(stats.maritimeStats._max.priceGasoleoA)}
              </div>
            </div>
            <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-4">
              <div className="text-sm text-cyan-600 dark:text-cyan-400 mb-1">Gasóleo B</div>
              <div className="text-3xl font-bold text-cyan-700 dark:text-cyan-300 mb-2 font-data">
                {formatPrice(stats.maritimeStats._avg.priceGasoleoB)}
              </div>
              <div className="text-xs text-cyan-600 dark:text-cyan-400 font-data">
                Min: {formatPrice(stats.maritimeStats._min.priceGasoleoB)} | Max: {formatPrice(stats.maritimeStats._max.priceGasoleoB)}
              </div>
              <div className="text-xs text-cyan-500 dark:text-cyan-400 mt-1">(uso náutico/pesca)</div>
            </div>
            <div className="bg-tl-50 dark:bg-tl-900/20 rounded-lg p-4">
              <div className="text-sm text-tl-600 dark:text-tl-400 mb-1">Gasolina 95</div>
              <div className="text-3xl font-bold text-tl-700 dark:text-tl-300 mb-2 font-data">
                {formatPrice(stats.maritimeStats._avg.priceGasolina95E5)}
              </div>
              <div className="text-xs text-tl-600 dark:text-tl-400 font-data">
                Min: {formatPrice(stats.maritimeStats._min.priceGasolina95E5)} | Max: {formatPrice(stats.maritimeStats._max.priceGasolina95E5)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Territorios con Fiscalidad Especial */}
      {(stats.ceutaStats || stats.melillaStats || stats.canariasAvg) && (
        <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded-lg border border-tl-amber-200 dark:border-tl-amber-800/50 p-6 mb-8">
          <h2 className="text-lg font-semibold text-tl-amber-900 dark:text-tl-amber-300 mb-2">
            Territorios con Fiscalidad Especial
          </h2>
          <p className="text-sm text-tl-amber-700 dark:text-tl-amber-400 mb-4">
            Sin IVA (Ceuta, Melilla) o con IGIC 7% (Canarias) - precios más bajos por menor carga fiscal
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ceuta */}
            <Link
              href="/gasolineras/precios/ceuta"
              className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-tl-amber-200 dark:border-tl-amber-800/50 hover:shadow-md dark:shadow-gray-900/20 transition-shadow"
            >
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Ceuta</h3>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">IPSI 0.5%</div>
              <div className="text-2xl font-bold text-tl-amber-600 dark:text-tl-amber-300 font-data">
                {stats.ceutaStats?.avgGasoleoA ? formatPrice(stats.ceutaStats.avgGasoleoA) : "N/D"}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Gasóleo A medio</div>
            </Link>

            {/* Melilla */}
            <Link
              href="/gasolineras/precios/melilla"
              className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-tl-amber-200 dark:border-tl-amber-800/50 hover:shadow-md dark:shadow-gray-900/20 transition-shadow"
            >
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Melilla</h3>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">IPSI 0.5%</div>
              <div className="text-2xl font-bold text-tl-amber-600 dark:text-tl-amber-300 font-data">
                {stats.melillaStats?.avgGasoleoA ? formatPrice(stats.melillaStats.avgGasoleoA) : "N/D"}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Gasóleo A medio</div>
            </Link>

            {/* Canarias */}
            <Link
              href="/gasolineras/precios/las-palmas"
              className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-tl-amber-200 dark:border-tl-amber-800/50 hover:shadow-md dark:shadow-gray-900/20 transition-shadow"
            >
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Islas Canarias</h3>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">IGIC 7%</div>
              <div className="text-2xl font-bold text-tl-amber-600 dark:text-tl-amber-300 font-data">
                {stats.canariasAvg ? `${stats.canariasAvg.toFixed(3)}€` : "N/D"}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Gasóleo A medio</div>
            </Link>
          </div>
        </div>
      )}

      {/* Cheapest Stations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-tl-amber-500"></span>
            Gasóleo A Más Barato
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(Península)</span>
          </h2>
          <div className="space-y-3">
            {cheapest.cheapestDiesel.map((station, idx) => (
              <Link
                key={station.id}
                href={`/gasolineras/terrestres/${station.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-tl-amber-100 dark:bg-tl-amber-900/30 text-tl-amber-700 dark:text-tl-amber-300 text-sm font-bold flex items-center justify-center font-data">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{station.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{station.locality}, {station.provinceName}</div>
                  </div>
                </div>
                <div className="text-lg font-bold text-tl-amber-700 dark:text-tl-amber-300 font-data">
                  {formatPrice(station.priceGasoleoA)}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-tl-500"></span>
            Gasolina 95 Más Barata
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(Península)</span>
          </h2>
          <div className="space-y-3">
            {cheapest.cheapestGas95.map((station, idx) => (
              <Link
                key={station.id}
                href={`/gasolineras/terrestres/${station.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 text-sm font-bold flex items-center justify-center font-data">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{station.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{station.locality}, {station.provinceName}</div>
                  </div>
                </div>
                <div className="text-lg font-bold text-tl-700 dark:text-tl-300 font-data">
                  {formatPrice(station.priceGasolina95E5)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Cheapest Maritime Stations */}
      {cheapest.cheapestMaritimeDiesel.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-tl-200 dark:border-tl-800/50 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Anchor className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            Gasóleo A Más Barato - Marítimas
          </h2>
          <div className="space-y-3">
            {cheapest.cheapestMaritimeDiesel.map((station, idx) => (
              <Link
                key={station.id}
                href={`/gasolineras/maritimas/${station.id}`}
                className="flex items-center justify-between p-3 bg-tl-50 dark:bg-tl-900/20 rounded-lg hover:bg-tl-100 dark:hover:bg-tl-900/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 text-sm font-bold flex items-center justify-center border border-tl-200 dark:border-tl-800/50 font-data">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{station.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{station.port || station.locality}{station.provinceName && `, ${station.provinceName}`}</div>
                  </div>
                </div>
                <div className="text-lg font-bold text-tl-700 dark:text-tl-300 font-data">
                  {formatPrice(station.priceGasoleoA)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Price alert subscription */}
      <div className="mb-8">
        <PriceAlertForm accent="amber" />
      </div>

      {/* Info Box */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Información sobre los datos</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
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
