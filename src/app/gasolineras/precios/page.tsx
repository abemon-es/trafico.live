import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { TrendingUp, TrendingDown, Minus, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Precios de Combustible Hoy | Tráfico España",
  description: "Consulta los precios medios de combustible por provincia y comunidad autónoma. Actualizado varias veces al día.",
};

// Force dynamic rendering - database not accessible during build
export const dynamic = 'force-dynamic';

const PROVINCES: Record<string, string> = {
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
  "48": "Bizkaia", "49": "Zamora", "50": "Zaragoza", "51": "Ceuta", "52": "Melilla",
};

const PROVINCE_SLUGS: Record<string, string> = {
  "01": "alava", "02": "albacete", "03": "alicante", "04": "almeria",
  "05": "avila", "06": "badajoz", "07": "baleares", "08": "barcelona",
  "09": "burgos", "10": "caceres", "11": "cadiz", "12": "castellon",
  "13": "ciudad-real", "14": "cordoba", "15": "a-coruna", "16": "cuenca",
  "17": "girona", "18": "granada", "19": "guadalajara", "20": "gipuzkoa",
  "21": "huelva", "22": "huesca", "23": "jaen", "24": "leon",
  "25": "lleida", "26": "la-rioja", "27": "lugo", "28": "madrid",
  "29": "malaga", "30": "murcia", "31": "navarra", "32": "ourense",
  "33": "asturias", "34": "palencia", "35": "las-palmas", "36": "pontevedra",
  "37": "salamanca", "38": "santa-cruz-de-tenerife", "39": "cantabria",
  "40": "segovia", "41": "sevilla", "42": "soria", "43": "tarragona",
  "44": "teruel", "45": "toledo", "46": "valencia", "47": "valladolid",
  "48": "bizkaia", "49": "zamora", "50": "zaragoza", "51": "ceuta", "52": "melilla",
};

// Provincias con fiscalidad especial (IPSI en Ceuta/Melilla, IGIC en Canarias)
const TAX_FREE_PROVINCES = ["35", "38", "51", "52"];

const TAX_FREE_INFO: Record<string, { tax: string; rate: string }> = {
  "35": { tax: "IGIC", rate: "7%" },
  "38": { tax: "IGIC", rate: "7%" },
  "51": { tax: "IPSI", rate: "0.5%" },
  "52": { tax: "IPSI", rate: "0.5%" },
};

async function getProvinceStats() {
  // Use UTC date to ensure consistency across timezones
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const stats = await prisma.fuelPriceDailyStats.findMany({
    where: {
      scope: { startsWith: "province:" },
      date: today,
    },
    orderBy: { avgGasoleoA: "asc" },
  });

  const allProvinces = stats.map((s) => {
    const code = s.scope.replace("province:", "");
    return {
      code,
      name: PROVINCES[code] || code,
      slug: PROVINCE_SLUGS[code] || code,
      avgGasoleoA: s.avgGasoleoA ? Number(s.avgGasoleoA) : null,
      avgGasolina95: s.avgGasolina95 ? Number(s.avgGasolina95) : null,
      avgGasolina98: s.avgGasolina98 ? Number(s.avgGasolina98) : null,
      minGasoleoA: s.minGasoleoA ? Number(s.minGasoleoA) : null,
      minGasolina95: s.minGasolina95 ? Number(s.minGasolina95) : null,
      stationCount: s.stationCount,
      taxInfo: TAX_FREE_INFO[code] || null,
    };
  });

  // Separar península/baleares de territorios con fiscalidad especial
  const mainlandProvinces = allProvinces.filter(p => !TAX_FREE_PROVINCES.includes(p.code));
  const taxFreeProvinces = allProvinces.filter(p => TAX_FREE_PROVINCES.includes(p.code));

  return { mainlandProvinces, taxFreeProvinces };
}

async function getNationalStats() {
  // Use UTC date to ensure consistency across timezones
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));

  const [todayStats, yesterdayStats] = await Promise.all([
    prisma.fuelPriceDailyStats.findFirst({
      where: { scope: "national", date: today },
    }),
    prisma.fuelPriceDailyStats.findFirst({
      where: { scope: "national", date: yesterday },
    }),
  ]);

  return { today: todayStats, yesterday: yesterdayStats };
}

function TrendIndicator({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null || previous == null) return null;
  const change = current - previous;

  if (change > 0.001) {
    return <TrendingUp className="w-4 h-4 text-red-500 inline ml-1" />;
  }
  if (change < -0.001) {
    return <TrendingDown className="w-4 h-4 text-green-500 inline ml-1" />;
  }
  return <Minus className="w-4 h-4 text-gray-400 inline ml-1" />;
}

export default async function PreciosPage() {
  const [{ mainlandProvinces, taxFreeProvinces }, nationalStats] = await Promise.all([
    getProvinceStats(),
    getNationalStats(),
  ]);

  const formatPrice = (price: number | null) => {
    if (price == null) return "N/D";
    return `${price.toFixed(3)}€`;
  };

  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Find cheapest province for each fuel type (solo península y Baleares)
  const cheapestDiesel = mainlandProvinces.find((p) => p.avgGasoleoA != null);
  const cheapestGas95 = [...mainlandProvinces].sort((a, b) =>
    (a.avgGasolina95 || 999) - (b.avgGasolina95 || 999)
  )[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/gasolineras" className="hover:text-gray-700">Gasolineras</Link>
          <span>/</span>
          <span className="text-gray-900">Precios</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Precios de Combustible Hoy
        </h1>
        <p className="text-gray-600 capitalize">{today}</p>
      </div>

      {/* National Summary */}
      {nationalStats.today && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Media Nacional
            <span className="text-sm font-normal text-gray-500 ml-2">(Península y Baleares)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="text-sm text-amber-600 mb-1">Gasóleo A</div>
              <div className="text-3xl font-bold text-amber-700">
                {formatPrice(nationalStats.today.avgGasoleoA ? Number(nationalStats.today.avgGasoleoA) : null)}
                <TrendIndicator
                  current={nationalStats.today.avgGasoleoA ? Number(nationalStats.today.avgGasoleoA) : null}
                  previous={nationalStats.yesterday?.avgGasoleoA ? Number(nationalStats.yesterday.avgGasoleoA) : null}
                />
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 mb-1">Gasolina 95</div>
              <div className="text-3xl font-bold text-blue-700">
                {formatPrice(nationalStats.today.avgGasolina95 ? Number(nationalStats.today.avgGasolina95) : null)}
                <TrendIndicator
                  current={nationalStats.today.avgGasolina95 ? Number(nationalStats.today.avgGasolina95) : null}
                  previous={nationalStats.yesterday?.avgGasolina95 ? Number(nationalStats.yesterday.avgGasolina95) : null}
                />
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 mb-1">Gasolina 98</div>
              <div className="text-3xl font-bold text-purple-700">
                {formatPrice(nationalStats.today.avgGasolina98 ? Number(nationalStats.today.avgGasolina98) : null)}
                <TrendIndicator
                  current={nationalStats.today.avgGasolina98 ? Number(nationalStats.today.avgGasolina98) : null}
                  previous={nationalStats.yesterday?.avgGasolina98 ? Number(nationalStats.yesterday.avgGasolina98) : null}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cheapest Provinces */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {cheapestDiesel && (
          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <div>
                <div className="text-sm text-green-600">Gasóleo A más barato</div>
                <div className="font-semibold text-green-800">{cheapestDiesel.name}</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-green-700">
              {formatPrice(cheapestDiesel.avgGasoleoA)}
              <span className="text-sm font-normal text-green-600 ml-2">media</span>
            </div>
            <Link
              href={`/gasolineras/precios/${cheapestDiesel.slug}`}
              className="text-sm text-green-600 hover:underline mt-2 inline-block"
            >
              Ver gasolineras en {cheapestDiesel.name} →
            </Link>
          </div>
        )}
        {cheapestGas95 && (
          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <div>
                <div className="text-sm text-green-600">Gasolina 95 más barata</div>
                <div className="font-semibold text-green-800">{cheapestGas95.name}</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-green-700">
              {formatPrice(cheapestGas95.avgGasolina95)}
              <span className="text-sm font-normal text-green-600 ml-2">media</span>
            </div>
            <Link
              href={`/gasolineras/precios/${cheapestGas95.slug}`}
              className="text-sm text-green-600 hover:underline mt-2 inline-block"
            >
              Ver gasolineras en {cheapestGas95.name} →
            </Link>
          </div>
        )}
      </div>

      {/* Province Table - Península y Baleares */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Precios por Provincia
            <span className="text-sm font-normal text-gray-500 ml-2">(Península y Baleares)</span>
          </h2>
          <p className="text-sm text-gray-500">Ordenado por Gasóleo A (más barato primero)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provincia
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gasóleo A
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gasolina 95
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gasolina 98
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estaciones
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mainlandProvinces.map((province, idx) => (
                <tr key={province.code} className={idx < 3 ? "bg-green-50/50" : ""}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {idx < 3 && (
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? "bg-green-500 text-white" :
                          idx === 1 ? "bg-green-400 text-white" :
                          "bg-green-300 text-white"
                        }`}>
                          {idx + 1}
                        </span>
                      )}
                      <span className="font-medium text-gray-900">{province.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-amber-700">{formatPrice(province.avgGasoleoA)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-blue-700">{formatPrice(province.avgGasolina95)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-purple-700">{formatPrice(province.avgGasolina98)}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-500">
                    {province.stationCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/gasolineras/precios/${province.slug}`}
                      className="text-orange-600 hover:text-orange-700 text-sm"
                    >
                      <MapPin className="w-4 h-4 inline" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Territorios con Fiscalidad Especial */}
      {taxFreeProvinces.length > 0 && (
        <div className="bg-amber-50 rounded-lg border border-amber-200 overflow-hidden">
          <div className="p-4 border-b border-amber-200">
            <h2 className="text-lg font-semibold text-amber-900">
              Territorios con Fiscalidad Especial
            </h2>
            <p className="text-sm text-amber-700">
              Sin IVA (Ceuta, Melilla con IPSI 0.5%) o con IGIC 7% (Canarias) - precios más bajos por menor carga fiscal
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-amber-100/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                    Territorio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                    Impuesto
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-amber-700 uppercase tracking-wider">
                    Gasóleo A
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-amber-700 uppercase tracking-wider">
                    Gasolina 95
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-amber-700 uppercase tracking-wider">
                    Gasolina 98
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-amber-700 uppercase tracking-wider">
                    Estaciones
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-200 bg-white">
                {taxFreeProvinces.map((province) => (
                  <tr key={province.code}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{province.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      {province.taxInfo && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                          {province.taxInfo.tax} {province.taxInfo.rate}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-amber-700">{formatPrice(province.avgGasoleoA)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-blue-700">{formatPrice(province.avgGasolina95)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-purple-700">{formatPrice(province.avgGasolina98)}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {province.stationCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/gasolineras/precios/${province.slug}`}
                        className="text-orange-600 hover:text-orange-700 text-sm"
                      >
                        <MapPin className="w-4 h-4 inline" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
