import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { MapPin, ArrowLeft, Clock, Map, Tag, Fuel, BarChart3 } from "lucide-react";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

// Render on first request, cache 1h via ISR
// (Coolify builds with DATABASE_URL='' so generateStaticParams would pre-render empty pages)
export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

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
    alternates: {
      canonical: `${BASE_URL}/gasolineras/precios/${province}`,
    },
  };
}

// generateStaticParams removed: Coolify builds with DATABASE_URL='' causing empty pre-renders.
// Pages render on-demand via ISR instead.

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
      <Breadcrumbs items={[
        { name: "Inicio", href: "/" },
        { name: "Gasolineras", href: "/gasolineras" },
        { name: "Precios", href: "/gasolineras/precios" },
        { name: provinceData.name, href: `/gasolineras/precios/${province}` },
      ]} />

      <Link
        href="/gasolineras/precios"
        className="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:text-orange-400 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a precios nacionales
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Precios de Combustible en {provinceData.name}
      </h1>

      {/* Cheapest Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {cheapestDiesel && (
          <Link
            href={`/gasolineras/terrestres/${cheapestDiesel.id}`}
            className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 p-4 hover:bg-green-100 dark:bg-green-900/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-50 dark:bg-green-900/200 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <div>
                <div className="text-sm text-green-600 dark:text-green-400">Gasóleo A más barato</div>
                <div className="font-semibold text-green-800">{cheapestDiesel.name}</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
              {formatPrice(cheapestDiesel.priceGasoleoA)}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">{cheapestDiesel.locality}</div>
          </Link>
        )}
        {cheapestGas95 && (
          <Link
            href={`/gasolineras/terrestres/${cheapestGas95.id}`}
            className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 p-4 hover:bg-green-100 dark:bg-green-900/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-50 dark:bg-green-900/200 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <div>
                <div className="text-sm text-green-600 dark:text-green-400">Gasolina 95 más barata</div>
                <div className="font-semibold text-green-800">{cheapestGas95.name}</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
              {formatPrice(cheapestGas95.priceGasolina95E5)}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">{cheapestGas95.locality}</div>
          </Link>
        )}
      </div>

      {/* Station List */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Gasolineras en {provinceData.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{stations.length} estaciones (ordenadas por Gasóleo A)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-950">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Gasolinera
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Gasóleo A
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Gasolina 95
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Gasolina 98
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {stations.map((station, idx) => (
                <tr key={station.id} className={idx < 3 ? "bg-green-50 dark:bg-green-900/20/50" : ""}>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      {idx < 3 && (
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          idx === 0 ? "bg-green-50 dark:bg-green-900/200 text-white" :
                          idx === 1 ? "bg-green-400 text-white" :
                          "bg-green-300 text-white"
                        }`}>
                          {idx + 1}
                        </span>
                      )}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          {station.name}
                          {station.is24h && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded">
                              <Clock className="w-3 h-3" />
                              24h
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{station.locality}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono ${idx < 3 ? "text-green-700 dark:text-green-400 font-bold" : "text-tl-amber-700 dark:text-tl-amber-300"}`}>
                      {formatPrice(station.priceGasoleoA)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-tl-700 dark:text-tl-300">{formatPrice(station.priceGasolina95E5)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-purple-700 dark:text-purple-400">{formatPrice(station.priceGasolina98E5)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/gasolineras/terrestres/${station.id}`}
                      className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:text-orange-400"
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
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No se encontraron gasolineras en {provinceData.name}
        </div>
      )}

      <RelatedLinks
        title={`Más sobre gasolineras en ${provinceData.name}`}
        links={[
          {
            title: `Mapa de gasolineras en ${provinceData.name}`,
            description: "Ver todas las estaciones en el mapa interactivo",
            href: `/gasolineras/mapa/provincia/${provinceData.code}`,
            icon: <Map className="w-5 h-5" />,
          },
          {
            title: "Comparar precios por marca",
            description: "Repsol, Cepsa, BP y más — precios medios por marca",
            href: "/gasolineras/marcas",
            icon: <Tag className="w-5 h-5" />,
          },
          {
            title: "Directorio completo",
            description: "Busca y filtra entre todas las gasolineras de España",
            href: "/gasolineras/terrestres",
            icon: <Fuel className="w-5 h-5" />,
          },
          {
            title: "Precios nacionales",
            description: "Comparativa de precios medios por provincia",
            href: "/gasolineras/precios",
            icon: <BarChart3 className="w-5 h-5" />,
          },
        ]}
      />
    </div>
  );
}
