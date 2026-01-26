import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { MapPin, ArrowLeft, Clock } from "lucide-react";

// Force dynamic rendering - database not accessible during build
export const dynamic = 'force-dynamic';

const PROVINCE_SLUGS: Record<string, { code: string; name: string }> = {
  "alava": { code: "01", name: "Álava" },
  "albacete": { code: "02", name: "Albacete" },
  "alicante": { code: "03", name: "Alicante" },
  "almeria": { code: "04", name: "Almería" },
  "avila": { code: "05", name: "Ávila" },
  "badajoz": { code: "06", name: "Badajoz" },
  "baleares": { code: "07", name: "Baleares" },
  "barcelona": { code: "08", name: "Barcelona" },
  "burgos": { code: "09", name: "Burgos" },
  "caceres": { code: "10", name: "Cáceres" },
  "cadiz": { code: "11", name: "Cádiz" },
  "castellon": { code: "12", name: "Castellón" },
  "ciudad-real": { code: "13", name: "Ciudad Real" },
  "cordoba": { code: "14", name: "Córdoba" },
  "a-coruna": { code: "15", name: "A Coruña" },
  "cuenca": { code: "16", name: "Cuenca" },
  "girona": { code: "17", name: "Girona" },
  "granada": { code: "18", name: "Granada" },
  "guadalajara": { code: "19", name: "Guadalajara" },
  "gipuzkoa": { code: "20", name: "Gipuzkoa" },
  "huelva": { code: "21", name: "Huelva" },
  "huesca": { code: "22", name: "Huesca" },
  "jaen": { code: "23", name: "Jaén" },
  "leon": { code: "24", name: "León" },
  "lleida": { code: "25", name: "Lleida" },
  "la-rioja": { code: "26", name: "La Rioja" },
  "lugo": { code: "27", name: "Lugo" },
  "madrid": { code: "28", name: "Madrid" },
  "malaga": { code: "29", name: "Málaga" },
  "murcia": { code: "30", name: "Murcia" },
  "navarra": { code: "31", name: "Navarra" },
  "ourense": { code: "32", name: "Ourense" },
  "asturias": { code: "33", name: "Asturias" },
  "palencia": { code: "34", name: "Palencia" },
  "las-palmas": { code: "35", name: "Las Palmas" },
  "pontevedra": { code: "36", name: "Pontevedra" },
  "salamanca": { code: "37", name: "Salamanca" },
  "santa-cruz-de-tenerife": { code: "38", name: "Santa Cruz de Tenerife" },
  "cantabria": { code: "39", name: "Cantabria" },
  "segovia": { code: "40", name: "Segovia" },
  "sevilla": { code: "41", name: "Sevilla" },
  "soria": { code: "42", name: "Soria" },
  "tarragona": { code: "43", name: "Tarragona" },
  "teruel": { code: "44", name: "Teruel" },
  "toledo": { code: "45", name: "Toledo" },
  "valencia": { code: "46", name: "Valencia" },
  "valladolid": { code: "47", name: "Valladolid" },
  "bizkaia": { code: "48", name: "Bizkaia" },
  "zamora": { code: "49", name: "Zamora" },
  "zaragoza": { code: "50", name: "Zaragoza" },
  "ceuta": { code: "51", name: "Ceuta" },
  "melilla": { code: "52", name: "Melilla" },
};

interface Props {
  params: Promise<{ province: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { province } = await params;
  const provinceData = PROVINCE_SLUGS[province];

  if (!provinceData) {
    return { title: "Provincia no encontrada" };
  }

  return {
    title: `Precios Combustible en ${provinceData.name} | Tráfico España`,
    description: `Consulta los precios de combustible en las gasolineras de ${provinceData.name}. Encuentra la gasolinera más barata.`,
  };
}

export async function generateStaticParams() {
  return Object.keys(PROVINCE_SLUGS).map((province) => ({ province }));
}

export default async function ProvincePricesPage({ params }: Props) {
  const { province } = await params;
  const provinceData = PROVINCE_SLUGS[province];

  if (!provinceData) {
    notFound();
  }

  const stations = await prisma.gasStation.findMany({
    where: { province: provinceData.code },
    orderBy: { priceGasoleoA: "asc" },
    take: 100,
  });

  const formatPrice = (price: unknown) => {
    if (price == null) return "N/D";
    const num = typeof price === "object" && "toNumber" in price
      ? (price as { toNumber: () => number }).toNumber()
      : Number(price);
    return `${num.toFixed(3)}€`;
  };

  const cheapestDiesel = stations.find((s) => s.priceGasoleoA != null);
  const cheapestGas95 = [...stations]
    .filter((s) => s.priceGasolina95E5 != null)
    .sort((a, b) => Number(a.priceGasolina95E5) - Number(b.priceGasolina95E5))[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/gasolineras" className="hover:text-gray-700">Gasolineras</Link>
        <span>/</span>
        <Link href="/gasolineras/precios" className="hover:text-gray-700">Precios</Link>
        <span>/</span>
        <span className="text-gray-900">{provinceData.name}</span>
      </div>

      <Link
        href="/gasolineras/precios"
        className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a precios nacionales
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Precios de Combustible en {provinceData.name}
      </h1>

      {/* Cheapest Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {cheapestDiesel && (
          <Link
            href={`/gasolineras/terrestres/${cheapestDiesel.id}`}
            className="bg-green-50 rounded-lg border border-green-200 p-4 hover:bg-green-100 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <div>
                <div className="text-sm text-green-600">Gasóleo A más barato</div>
                <div className="font-semibold text-green-800">{cheapestDiesel.name}</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-green-700 mb-1">
              {formatPrice(cheapestDiesel.priceGasoleoA)}
            </div>
            <div className="text-sm text-green-600">{cheapestDiesel.locality}</div>
          </Link>
        )}
        {cheapestGas95 && (
          <Link
            href={`/gasolineras/terrestres/${cheapestGas95.id}`}
            className="bg-green-50 rounded-lg border border-green-200 p-4 hover:bg-green-100 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <div>
                <div className="text-sm text-green-600">Gasolina 95 más barata</div>
                <div className="font-semibold text-green-800">{cheapestGas95.name}</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-green-700 mb-1">
              {formatPrice(cheapestGas95.priceGasolina95E5)}
            </div>
            <div className="text-sm text-green-600">{cheapestGas95.locality}</div>
          </Link>
        )}
      </div>

      {/* Station List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Gasolineras en {provinceData.name}
          </h2>
          <p className="text-sm text-gray-500">{stations.length} estaciones (ordenadas por Gasóleo A)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Gasolinera
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Gasóleo A
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Gasolina 95
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Gasolina 98
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stations.map((station, idx) => (
                <tr key={station.id} className={idx < 3 ? "bg-green-50/50" : ""}>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      {idx < 3 && (
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          idx === 0 ? "bg-green-500 text-white" :
                          idx === 1 ? "bg-green-400 text-white" :
                          "bg-green-300 text-white"
                        }`}>
                          {idx + 1}
                        </span>
                      )}
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {station.name}
                          {station.is24h && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                              <Clock className="w-3 h-3" />
                              24h
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{station.locality}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono ${idx < 3 ? "text-green-700 font-bold" : "text-amber-700"}`}>
                      {formatPrice(station.priceGasoleoA)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-blue-700">{formatPrice(station.priceGasolina95E5)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-purple-700">{formatPrice(station.priceGasolina98E5)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/gasolineras/terrestres/${station.id}`}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      <MapPin className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {stations.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No se encontraron gasolineras en {provinceData.name}
        </div>
      )}
    </div>
  );
}
