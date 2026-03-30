import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { StructuredData, generateFAQSchema } from "@/components/seo/StructuredData";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { TrendingUp, TrendingDown, Minus, MapPin, Clock, Fuel, ChevronRight, Camera, Radar, Truck, Route } from "lucide-react";
import { AdSlot } from "@/components/ads/AdSlot";
import { AffiliateWidget } from "@/components/ads/AffiliateWidget";
import { PriceAlertForm } from "@/components/fuel/PriceAlertForm";
import { FuelPriceChart } from "@/components/charts/FuelPriceChart";

export const revalidate = 3600;

// Province code → { slug, name } for internal links
const PROVINCE_CODES: Record<string, { slug: string; name: string }> = {
  "01": { slug: "alava", name: "Álava" },
  "02": { slug: "albacete", name: "Albacete" },
  "03": { slug: "alicante", name: "Alicante" },
  "04": { slug: "almeria", name: "Almería" },
  "05": { slug: "avila", name: "Ávila" },
  "06": { slug: "badajoz", name: "Badajoz" },
  "07": { slug: "baleares", name: "Baleares" },
  "08": { slug: "barcelona", name: "Barcelona" },
  "09": { slug: "burgos", name: "Burgos" },
  "10": { slug: "caceres", name: "Cáceres" },
  "11": { slug: "cadiz", name: "Cádiz" },
  "12": { slug: "castellon", name: "Castellón" },
  "13": { slug: "ciudad-real", name: "Ciudad Real" },
  "14": { slug: "cordoba", name: "Córdoba" },
  "15": { slug: "a-coruna", name: "A Coruña" },
  "16": { slug: "cuenca", name: "Cuenca" },
  "17": { slug: "girona", name: "Girona" },
  "18": { slug: "granada", name: "Granada" },
  "19": { slug: "guadalajara", name: "Guadalajara" },
  "20": { slug: "gipuzkoa", name: "Gipuzkoa" },
  "21": { slug: "huelva", name: "Huelva" },
  "22": { slug: "huesca", name: "Huesca" },
  "23": { slug: "jaen", name: "Jaén" },
  "24": { slug: "leon", name: "León" },
  "25": { slug: "lleida", name: "Lleida" },
  "26": { slug: "la-rioja", name: "La Rioja" },
  "27": { slug: "lugo", name: "Lugo" },
  "28": { slug: "madrid", name: "Madrid" },
  "29": { slug: "malaga", name: "Málaga" },
  "30": { slug: "murcia", name: "Murcia" },
  "31": { slug: "navarra", name: "Navarra" },
  "32": { slug: "ourense", name: "Ourense" },
  "33": { slug: "asturias", name: "Asturias" },
  "34": { slug: "palencia", name: "Palencia" },
  "35": { slug: "las-palmas", name: "Las Palmas" },
  "36": { slug: "pontevedra", name: "Pontevedra" },
  "37": { slug: "salamanca", name: "Salamanca" },
  "38": { slug: "santa-cruz-de-tenerife", name: "S.C. Tenerife" },
  "39": { slug: "cantabria", name: "Cantabria" },
  "40": { slug: "segovia", name: "Segovia" },
  "41": { slug: "sevilla", name: "Sevilla" },
  "42": { slug: "soria", name: "Soria" },
  "43": { slug: "tarragona", name: "Tarragona" },
  "44": { slug: "teruel", name: "Teruel" },
  "45": { slug: "toledo", name: "Toledo" },
  "46": { slug: "valencia", name: "Valencia" },
  "47": { slug: "valladolid", name: "Valladolid" },
  "48": { slug: "bizkaia", name: "Bizkaia" },
  "49": { slug: "zamora", name: "Zamora" },
  "50": { slug: "zaragoza", name: "Zaragoza" },
  "51": { slug: "ceuta", name: "Ceuta" },
  "52": { slug: "melilla", name: "Melilla" },
};

const TAX_FREE_PROVINCES = ["35", "38", "51", "52"];

function getToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function getYesterday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
}

async function getGasolinaData() {
  const today = getToday();
  const yesterday = getYesterday();

  const [nationalToday, nationalYesterday, provinceStats, cheapestStations] = await Promise.all([
    prisma.fuelPriceDailyStats.findFirst({
      where: { scope: "national", date: today },
    }),
    prisma.fuelPriceDailyStats.findFirst({
      where: { scope: "national", date: yesterday },
    }),
    prisma.fuelPriceDailyStats.findMany({
      where: {
        scope: { startsWith: "province:" },
        date: today,
      },
      orderBy: { avgGasolina95: "asc" },
    }),
    prisma.gasStation.findMany({
      where: {
        priceGasolina95E5: { not: null },
        province: { notIn: TAX_FREE_PROVINCES },
        OR: [{ saleType: "P" }, { saleType: null }],
      },
      orderBy: { priceGasolina95E5: "asc" },
      take: 10,
      select: {
        id: true,
        name: true,
        locality: true,
        provinceName: true,
        province: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
      },
    }),
  ]);

  return { nationalToday, nationalYesterday, provinceStats, cheapestStations };
}

function formatPrice(price: unknown): string {
  if (price == null) return "N/D";
  const num =
    typeof price === "object" && price !== null && "toNumber" in price
      ? (price as { toNumber: () => number }).toNumber()
      : Number(price);
  return `${num.toFixed(3)}€`;
}

function toNum(price: unknown): number | null {
  if (price == null) return null;
  const num =
    typeof price === "object" && price !== null && "toNumber" in price
      ? (price as { toNumber: () => number }).toNumber()
      : Number(price);
  return isNaN(num) ? null : num;
}

function extractProvinceCode(scope: string): string {
  // scope is "province:28" → "28"
  const raw = scope.replace("province:", "");
  return raw.padStart(2, "0");
}

export async function generateMetadata(): Promise<Metadata> {
  const today = getToday();
  const nationalStats = await prisma.fuelPriceDailyStats.findFirst({
    where: { scope: "national", date: today },
  });

  const dateStr = today.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const avgStr = nationalStats?.avgGasolina95
    ? `${Number(nationalStats.avgGasolina95).toFixed(3)}€/L`
    : "consulta el precio";

  return {
    title: `Precio Gasolina Hoy ${dateStr} — ${avgStr} | trafico.live`,
    description: `Precio de la gasolina 95 hoy en España: media nacional ${avgStr}. Consulta las gasolineras más baratas, precios por provincia y evolución respecto a ayer. Datos oficiales MITERD.`,
    keywords: [
      "precio gasolina hoy",
      "precio gasolina 95 hoy",
      "precio gasolina hoy españa",
      "gasolina precio hoy",
      "precio litro gasolina hoy",
    ],
    alternates: {
      canonical: "https://trafico.live/precio-gasolina-hoy",
    },
    openGraph: {
      title: `Precio Gasolina Hoy — ${avgStr} | trafico.live`,
      description: `Media nacional de gasolina 95 hoy en España: ${avgStr}. Datos oficiales MITERD actualizados.`,
      type: "website",
      locale: "es_ES",
    },
  };
}

function TrendArrow({
  current,
  previous,
  short = false,
}: {
  current: number | null;
  previous: number | null;
  short?: boolean;
}) {
  if (current == null || previous == null) return null;
  const change = current - previous;

  if (change > 0.001) {
    return (
      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium text-sm font-data">
        <TrendingUp className="w-4 h-4" />
        +{change.toFixed(3)}€{!short && " vs ayer"}
      </span>
    );
  }
  if (change < -0.001) {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium text-sm font-data">
        <TrendingDown className="w-4 h-4" />
        {change.toFixed(3)}€{!short && " vs ayer"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
      <Minus className="w-4 h-4" />
      {short ? "=" : "Sin cambios vs ayer"}
    </span>
  );
}

export default async function PrecioGasolinaHoyPage() {
  const { nationalToday, nationalYesterday, provinceStats, cheapestStations } =
    await getGasolinaData();

  const todayLabel = getToday().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  const avg95 = toNum(nationalToday?.avgGasolina95);
  const avg95Yesterday = toNum(nationalYesterday?.avgGasolina95);
  const avg98 = toNum(nationalToday?.avgGasolina98);

  const faqSchema = generateFAQSchema({
    questions: [
      {
        question: "¿Cuánto cuesta la gasolina hoy en España?",
        answer: avg95
          ? `El precio medio de la gasolina 95 en España hoy es de ${avg95.toFixed(3)}€ por litro (Península y Baleares, datos MITERD). El precio varía según la gasolinera y la provincia.`
          : "El precio medio de la gasolina 95 en España varía diariamente. Consulta la cifra actualizada en la parte superior de esta página, obtenida de los datos oficiales del MITERD.",
      },
      {
        question: "¿Dónde está la gasolina más barata hoy?",
        answer:
          "Las gasolineras más económicas suelen ser las de marcas blancas y las situadas en zonas de alta competencia. En esta página mostramos en tiempo real las 10 gasolineras más baratas de la Península. Canarias tiene precios más bajos por su fiscalidad especial (IGIC 7%).",
      },
      {
        question: "¿Con qué frecuencia se actualizan los precios de gasolina?",
        answer:
          "Los precios se actualizan varias veces al día desde la API oficial del Ministerio para la Transición Ecológica y el Reto Demográfico (MITERD). Cada gasolinera está obligada a comunicar sus precios cuando los modifica.",
      },
      {
        question: "¿Cuál es la diferencia entre gasolina 95 y gasolina 98?",
        answer:
          "La gasolina 95 (índice de octano 95) es la más común y económica. La gasolina 98 tiene mayor índice de octano, lo que mejora el rendimiento y la protección del motor en vehículos de alta cilindrada. El precio de la 98 suele ser entre 0,10€ y 0,20€ más caro por litro.",
      },
    ],
  });

  const peninsulaProvinces = provinceStats.filter(
    (p) => !TAX_FREE_PROVINCES.includes(extractProvinceCode(p.scope))
  );
  const taxFreeProvinces = provinceStats.filter((p) =>
    TAX_FREE_PROVINCES.includes(extractProvinceCode(p.scope))
  );

  return (
    <>
      <StructuredData data={faqSchema} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Combustible", href: "/gasolineras" },
            { name: "Precio Gasolina Hoy", href: "/precio-gasolina-hoy" },
          ]}
        />

        <AdSlot id="fuel-gasolina-top" format="banner" className="mb-6" />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-tl-600 dark:text-tl-400 text-sm font-medium mb-2">
            <Fuel className="w-4 h-4" />
            <span>Datos oficiales MITERD</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-50 dark:bg-green-900/200 animate-pulse" />
            <span className="text-green-600 dark:text-green-400">Actualizado hoy</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Precio de la Gasolina Hoy en España
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg capitalize">{todayLabel}</p>
        </div>

        {/* Hero price cards */}
        {nationalToday ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Gasolina 95 — main hero */}
            <div className="md:col-span-2 bg-gradient-to-br from-tl-600 to-tl-700 rounded-2xl p-6 text-white shadow-lg">
              <div className="text-tl-200 text-sm font-medium mb-1">
                Gasolina 95 — Precio Medio Nacional
              </div>
              <div className="text-6xl font-extrabold tracking-tight mb-2 font-data">
                {formatPrice(nationalToday.avgGasolina95)}
              </div>
              <div className="text-tl-100 text-sm mb-4">por litro · Península y Baleares</div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-white dark:bg-gray-900/10 rounded-lg px-3 py-1.5 text-sm">
                  Mín: <span className="font-bold font-data">{formatPrice(nationalToday.minGasolina95)}</span>
                </div>
                <div className="bg-white dark:bg-gray-900/10 rounded-lg px-3 py-1.5 text-sm">
                  Máx: <span className="font-bold font-data">{formatPrice(nationalToday.maxGasolina95)}</span>
                </div>
                <div className="bg-white dark:bg-gray-900/10 rounded-lg px-3 py-1.5 text-sm font-data">
                  {nationalToday.stationCount.toLocaleString("es-ES")} gasolineras
                </div>
              </div>
              {avg95 !== null && avg95Yesterday !== null && (
                <div className="mt-4 bg-white dark:bg-gray-900/10 rounded-lg px-3 py-2 inline-flex">
                  <TrendArrow current={avg95} previous={avg95Yesterday} />
                </div>
              )}
            </div>

            {/* Gasolina 98 */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <div className="text-purple-600 dark:text-purple-400 text-sm font-medium mb-1">Gasolina 98</div>
              <div className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-1 font-data">
                {formatPrice(nationalToday.avgGasolina98)}
              </div>
              <div className="text-gray-500 dark:text-gray-400 text-xs mb-4">precio medio · Península</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Mínimo</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 font-data">
                    {formatPrice(nationalToday.minGasolina98)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Máximo</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 font-data">
                    {formatPrice(nationalToday.maxGasolina98)}
                  </span>
                </div>
                {avg98 !== null && avg95 !== null && (
                  <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">Diferencia vs 95</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400 font-data">
                      +{(avg98 - avg95).toFixed(3)}€
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-xl p-6 mb-8 text-tl-amber-800">
            Los precios de hoy aún no están disponibles. Los datos se actualizan varias veces al
            día desde la API oficial del MITERD.
          </div>
        )}

        {/* Yesterday comparison strip */}
        {nationalYesterday && nationalToday && (
          <div className="bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-8 flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
              <Clock className="w-4 h-4" />
              <span className="font-medium">Gasolina 95 vs ayer:</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                Ayer:{" "}
                <span className="font-bold text-gray-900 dark:text-gray-100 font-data">
                  {formatPrice(nationalYesterday.avgGasolina95)}
                </span>
              </span>
              <TrendArrow current={avg95} previous={avg95Yesterday} />
            </div>
          </div>
        )}

        {/* Price evolution chart */}
        <FuelPriceChart
          initialLines={{ diesel: false, gasolina95: true, gasolina98: true }}
          initialDays={30}
        />

        <AdSlot id="fuel-gasolina-mid" format="inline" className="mb-8" />

        {/* Price alert subscription */}
        <PriceAlertForm
          defaultFuelType="gasolina95"
          defaultTargetPrice={avg95 ?? undefined}
          accent="blue"
        />

        <div className="mb-8" />

        {/* Top 10 cheapest stations */}
        {cheapestStations.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-8 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-tl-600" />
                10 Gasolineras Más Baratas — Gasolina 95
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded-full hidden sm:block">
                Península · excluye fiscalidad especial
              </span>
            </div>
            <div className="space-y-2">
              {cheapestStations.map((station, idx) => (
                <Link
                  key={station.id}
                  href={`/gasolineras/terrestres/${station.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-tl-50 dark:bg-tl-900/20 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 font-data ${
                        idx === 0
                          ? "bg-tl-amber-400 text-tl-amber-900"
                          : idx === 1
                          ? "bg-gray-300 text-gray-700 dark:text-gray-300"
                          : idx === 2
                          ? "bg-orange-300 text-orange-800"
                          : "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm group-hover:text-tl-700 dark:text-tl-300 transition-colors">
                        {station.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {station.locality}, {station.provinceName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-tl-700 dark:text-tl-300 font-data">
                      {formatPrice(station.priceGasolina95E5)}
                    </div>
                    {station.priceGasolina98E5 && (
                      <div className="text-xs text-gray-400 font-data">
                        98: {formatPrice(station.priceGasolina98E5)}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
              <Link
                href="/gasolineras/terrestres"
                className="text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 text-sm font-medium inline-flex items-center gap-1"
              >
                Ver todas las gasolineras
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Province breakdown table */}
        {peninsulaProvinces.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
              Precio Gasolina 95 por Provincia — Hoy
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left py-3 px-2 font-semibold text-gray-600 dark:text-gray-400">Provincia</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-600 dark:text-gray-400">
                      Media hoy
                    </th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                      Mínimo
                    </th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                      Máximo
                    </th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-600 dark:text-gray-400 hidden md:table-cell">
                      Estaciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {peninsulaProvinces.map((p) => {
                    const code = extractProvinceCode(p.scope);
                    const province = PROVINCE_CODES[code];
                    const avg = toNum(p.avgGasolina95);
                    const nationalAvg = toNum(nationalToday?.avgGasolina95);
                    const isCheap =
                      avg !== null && nationalAvg !== null && avg < nationalAvg - 0.005;
                    const isExpensive =
                      avg !== null && nationalAvg !== null && avg > nationalAvg + 0.005;

                    return (
                      <tr
                        key={p.scope}
                        className="border-b border-gray-50 hover:bg-gray-50 dark:bg-gray-950 transition-colors"
                      >
                        <td className="py-3 px-2">
                          {province ? (
                            <Link
                              href={`/gasolineras/precios/${province.slug}`}
                              className="text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 font-medium flex items-center gap-1 w-fit"
                            >
                              {province.name}
                              <ChevronRight className="w-3 h-3 opacity-60" />
                            </Link>
                          ) : (
                            <span className="text-gray-700 dark:text-gray-300 font-medium">{code}</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span
                            className={`font-bold font-data ${
                              isCheap
                                ? "text-green-600 dark:text-green-400"
                                : isExpensive
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-900 dark:text-gray-100"
                            }`}
                          >
                            {formatPrice(p.avgGasolina95)}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-400 hidden sm:table-cell font-data">
                          {formatPrice(p.minGasolina95)}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-400 hidden sm:table-cell font-data">
                          {formatPrice(p.maxGasolina95)}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-500 dark:text-gray-400 hidden md:table-cell font-data">
                          {p.stationCount.toLocaleString("es-ES")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tax-free provinces */}
            {taxFreeProvinces.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Territorios con fiscalidad especial (precios menores por menor carga impositiva):
                </p>
                <div className="flex flex-wrap gap-3">
                  {taxFreeProvinces.map((p) => {
                    const code = extractProvinceCode(p.scope);
                    const province = PROVINCE_CODES[code];
                    return (
                      <Link
                        key={p.scope}
                        href={
                          province
                            ? `/gasolineras/precios/${province.slug}`
                            : "/gasolineras/precios"
                        }
                        className="flex items-center gap-2 bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-lg px-3 py-2 hover:bg-tl-amber-100 transition-colors"
                      >
                        <span className="text-xs font-medium text-tl-amber-800">
                          {province?.name ?? code}
                        </span>
                        <span className="text-xs font-bold text-tl-amber-600 dark:text-tl-amber-400 font-data">
                          {formatPrice(p.avgGasolina95)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FAQ Section */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Preguntas Frecuentes sobre el Precio de la Gasolina
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                ¿Cuánto cuesta la gasolina hoy en España?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                {avg95
                  ? `El precio medio de la gasolina 95 en España hoy es de ${avg95.toFixed(3)}€ por litro (Península y Baleares, datos MITERD). El precio varía según la gasolinera y la provincia.`
                  : "El precio medio de la gasolina 95 en España varía diariamente. Consulta la cifra actualizada en la parte superior de esta página, obtenida de los datos oficiales del MITERD."}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                ¿Dónde está la gasolina más barata hoy?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Las gasolineras más económicas suelen ser las de marcas blancas y las situadas en
                zonas de alta competencia. En esta página mostramos en tiempo real las 10
                gasolineras más baratas de la Península. Canarias tiene precios más bajos por su
                fiscalidad especial (IGIC 7%).
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                ¿Con qué frecuencia se actualizan los precios?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Los precios se actualizan varias veces al día desde la API oficial del Ministerio
                para la Transición Ecológica y el Reto Demográfico (MITERD). Cada gasolinera está
                obligada a comunicar sus precios cuando los modifica.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                ¿Cuál es la diferencia entre gasolina 95 y gasolina 98?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                La gasolina 95 (índice de octano 95) es la más común y económica. La gasolina 98
                tiene mayor índice de octano, lo que mejora el rendimiento y la protección del
                motor en vehículos de alta cilindrada. El precio de la 98 suele ser entre 0,10€ y
                0,20€ más caro por litro.
                {avg95 !== null && avg98 !== null
                  ? ` Hoy la diferencia es de ${(avg98 - avg95).toFixed(3)}€ por litro.`
                  : ""}
              </p>
            </div>
          </div>
        </div>

        <AffiliateWidget type="insurance" className="mb-8" />

        <RelatedLinks
          links={[
            {
              title: "Precio Diésel Hoy",
              description: "Gasóleo A — precio medio nacional y por provincia",
              href: "/precio-diesel-hoy",
              icon: <Fuel className="w-5 h-5" />,
            },
            {
              title: "Mapa de Gasolineras",
              description: "Encuentra la gasolinera más barata cerca de ti",
              href: "/gasolineras/mapa",
              icon: <MapPin className="w-5 h-5" />,
            },
            {
              title: "Gasolineras por Provincia",
              description: "Precios y ranking por cada provincia de España",
              href: "/gasolineras",
              icon: <Route className="w-5 h-5" />,
            },
            {
              title: "Diésel Profesional",
              description: "Datos para flotas y transporte de mercancías",
              href: "/profesional/diesel",
              icon: <Truck className="w-5 h-5" />,
            },
          ]}
        />

        {/* Data source note */}
        <div className="mt-6 flex items-start gap-3 text-xs text-gray-400">
          <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Datos proporcionados por la API oficial del Ministerio para la Transición Ecológica y
            el Reto Demográfico (MITERD). Los precios son los comunicados por las propias
            gasolineras y pueden diferir ligeramente del precio en el momento del repostaje.
          </p>
        </div>
      </div>
    </>
  );
}
