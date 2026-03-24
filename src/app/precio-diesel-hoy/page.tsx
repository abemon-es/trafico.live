import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { StructuredData, generateFAQSchema } from "@/components/seo/StructuredData";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { TrendingUp, TrendingDown, Minus, MapPin, Clock, Fuel, ChevronRight, Truck, Radar, Ban } from "lucide-react";
import { AdSlot } from "@/components/ads/AdSlot";
import { AffiliateWidget } from "@/components/ads/AffiliateWidget";
import nextDynamic from "next/dynamic";

const FuelPriceChart = nextDynamic(
  () => import("@/components/charts/FuelPriceChart").then((m) => m.FuelPriceChart),
  { ssr: false }
);

export const dynamic = "force-dynamic";

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

async function getDieselData() {
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
      orderBy: { avgGasoleoA: "asc" },
    }),
    prisma.gasStation.findMany({
      where: {
        priceGasoleoA: { not: null },
        province: { notIn: TAX_FREE_PROVINCES },
      },
      orderBy: { priceGasoleoA: "asc" },
      take: 10,
      select: {
        id: true,
        name: true,
        locality: true,
        provinceName: true,
        province: true,
        priceGasoleoA: true,
        priceGasoleoPremium: true,
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

  const avgStr = nationalStats?.avgGasoleoA
    ? `${Number(nationalStats.avgGasoleoA).toFixed(3)}€/L`
    : "consulta el precio";

  return {
    title: `Precio Diésel Hoy ${dateStr} — ${avgStr} | trafico.live`,
    description: `Precio del gasóleo A (diésel) hoy en España: media nacional ${avgStr}. Consulta las gasolineras más baratas, precios por provincia y evolución respecto a ayer. Datos oficiales MITERD.`,
    keywords: [
      "precio diesel hoy",
      "precio gasoleo hoy",
      "precio gasoleo a hoy",
      "precio diesel hoy españa",
      "precio litro diesel hoy",
      "gasoleo precio hoy",
    ],
    alternates: {
      canonical: "/precio-diesel-hoy",
    },
    openGraph: {
      title: `Precio Diésel Hoy — ${avgStr} | trafico.live`,
      description: `Media nacional del gasóleo A hoy en España: ${avgStr}. Datos oficiales MITERD actualizados.`,
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
      <span className="inline-flex items-center gap-1 text-red-600 font-medium text-sm">
        <TrendingUp className="w-4 h-4" />
        +{change.toFixed(3)}€{!short && " vs ayer"}
      </span>
    );
  }
  if (change < -0.001) {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 font-medium text-sm">
        <TrendingDown className="w-4 h-4" />
        {change.toFixed(3)}€{!short && " vs ayer"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-gray-500 text-sm">
      <Minus className="w-4 h-4" />
      {short ? "=" : "Sin cambios vs ayer"}
    </span>
  );
}

export default async function PrecioDieselHoyPage() {
  const { nationalToday, nationalYesterday, provinceStats, cheapestStations } =
    await getDieselData();

  const todayLabel = getToday().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  const avgDiesel = toNum(nationalToday?.avgGasoleoA);
  const avgDieselYesterday = toNum(nationalYesterday?.avgGasoleoA);
  const avg95 = toNum(nationalToday?.avgGasolina95);

  const faqSchema = generateFAQSchema({
    questions: [
      {
        question: "¿Cuánto cuesta el diésel hoy en España?",
        answer: avgDiesel
          ? `El precio medio del gasóleo A (diésel) en España hoy es de ${avgDiesel.toFixed(3)}€ por litro (Península y Baleares, datos MITERD). El precio varía según la gasolinera y la comunidad autónoma.`
          : "El precio medio del diésel en España varía diariamente. Consulta la cifra actualizada en la parte superior de esta página, obtenida de los datos oficiales del MITERD.",
      },
      {
        question: "¿Es más barato el diésel o la gasolina en España?",
        answer:
          avgDiesel !== null && avg95 !== null
            ? `Hoy el gasóleo A (diésel) cuesta ${avgDiesel.toFixed(3)}€/L y la gasolina 95 cuesta ${avg95.toFixed(3)}€/L, por lo que el ${avgDiesel < avg95 ? "diésel es más barato" : "diésel es más caro"} en ${Math.abs(avgDiesel - avg95).toFixed(3)}€ por litro. Históricamente el diésel ha sido más económico, aunque la diferencia ha variado en los últimos años.`
            : "Históricamente el diésel (gasóleo A) ha sido más económico que la gasolina en España, aunque la diferencia varía según el contexto internacional del petróleo.",
      },
      {
        question: "¿Dónde está el diésel más barato hoy en España?",
        answer:
          "Las gasolineras con diésel más barato suelen ser marcas blancas y estaciones en zonas de alta competencia. En esta página actualizamos en tiempo real el ranking de las 10 gasolineras más baratas de la Península. Canarias, Ceuta y Melilla tienen precios menores por su fiscalidad especial.",
      },
      {
        question: "¿Qué es el gasóleo A y en qué se diferencia del gasóleo B?",
        answer:
          "El gasóleo A es el diésel de automoción estándar, disponible en todas las gasolineras. El gasóleo B (gasóleo agrícola o de calefacción) está subvencionado y solo puede usarse en maquinaria agrícola, embarcaciones y calefacción. Su uso en vehículos de carretera es ilegal y conlleva sanciones.",
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
            { name: "Precio Diésel Hoy", href: "/precio-diesel-hoy" },
          ]}
        />

        <AdSlot id="fuel-diesel-top" format="banner" className="mb-6" />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-amber-600 text-sm font-medium mb-2">
            <Fuel className="w-4 h-4" />
            <span>Gasóleo A · Datos oficiales MITERD</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-600">Actualizado hoy</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Precio del Diésel Hoy en España
          </h1>
          <p className="text-gray-600 text-lg capitalize">{todayLabel}</p>
        </div>

        {/* Hero price cards */}
        {nationalToday ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Gasóleo A — main hero */}
            <div className="md:col-span-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="text-amber-100 text-sm font-medium mb-1">
                Gasóleo A (Diésel) — Precio Medio Nacional
              </div>
              <div className="text-6xl font-extrabold tracking-tight mb-2">
                {formatPrice(nationalToday.avgGasoleoA)}
              </div>
              <div className="text-amber-100 text-sm mb-4">por litro · Península y Baleares</div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-white/10 rounded-lg px-3 py-1.5 text-sm">
                  Mín: <span className="font-bold">{formatPrice(nationalToday.minGasoleoA)}</span>
                </div>
                <div className="bg-white/10 rounded-lg px-3 py-1.5 text-sm">
                  Máx: <span className="font-bold">{formatPrice(nationalToday.maxGasoleoA)}</span>
                </div>
                <div className="bg-white/10 rounded-lg px-3 py-1.5 text-sm">
                  {nationalToday.stationCount.toLocaleString("es-ES")} gasolineras
                </div>
              </div>
              {avgDiesel !== null && avgDieselYesterday !== null && (
                <div className="mt-4 bg-white/10 rounded-lg px-3 py-2 inline-flex">
                  <TrendArrow current={avgDiesel} previous={avgDieselYesterday} />
                </div>
              )}
            </div>

            {/* Comparativa con gasolina 95 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="text-tl-600 text-sm font-medium mb-1">Gasolina 95 hoy</div>
              <div className="text-4xl font-extrabold text-gray-900 mb-1">
                {formatPrice(nationalToday.avgGasolina95)}
              </div>
              <div className="text-gray-500 text-xs mb-4">precio medio · Península</div>
              {avgDiesel !== null && avg95 !== null && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Diésel vs Gasolina 95</span>
                    <span
                      className={`font-bold ${
                        avgDiesel < avg95 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {avgDiesel < avg95 ? "-" : "+"}
                      {Math.abs(avgDiesel - avg95).toFixed(3)}€
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    {avgDiesel < avg95
                      ? "El diésel es más barato hoy"
                      : "La gasolina es más barata hoy"}
                  </div>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link
                  href="/precio-gasolina-hoy"
                  className="text-tl-600 hover:text-tl-700 text-xs font-medium inline-flex items-center gap-1"
                >
                  Ver precio gasolina hoy
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8 text-amber-800">
            Los precios de hoy aún no están disponibles. Los datos se actualizan varias veces al
            día desde la API oficial del MITERD.
          </div>
        )}

        {/* Yesterday comparison strip */}
        {nationalYesterday && nationalToday && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-8 flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Clock className="w-4 h-4" />
              <span className="font-medium">Gasóleo A vs ayer:</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                Ayer:{" "}
                <span className="font-bold text-gray-900">
                  {formatPrice(nationalYesterday.avgGasoleoA)}
                </span>
              </span>
              <TrendArrow current={avgDiesel} previous={avgDieselYesterday} />
            </div>
          </div>
        )}

        {/* Professional transport callout */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8 flex items-start gap-4">
          <Truck className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="font-semibold text-amber-900 mb-1">
              ¿Transportista o empresa con flota?
            </h2>
            <p className="text-amber-800 text-sm leading-relaxed mb-3">
              Consulta nuestra sección profesional con datos específicos para flotas: precio del
              gasóleo A en grandes volúmenes, áreas de servicio en autopistas y restricciones de
              circulación para vehículos pesados.
            </p>
            <Link
              href="/profesional/diesel"
              className="inline-flex items-center gap-2 bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
            >
              <Truck className="w-4 h-4" />
              Sección Profesional — Diésel
            </Link>
          </div>
        </div>

        {/* Price evolution chart */}
        <FuelPriceChart
          initialLines={{ diesel: true, gasolina95: false, gasolina98: false }}
          initialDays={30}
        />

        <AdSlot id="fuel-diesel-mid" format="inline" className="mb-8" />

        {/* Top 10 cheapest stations */}
        {cheapestStations.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                10 Gasolineras Más Baratas — Gasóleo A (Diésel)
              </h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full hidden sm:block">
                Península · excluye fiscalidad especial
              </span>
            </div>
            <div className="space-y-2">
              {cheapestStations.map((station, idx) => (
                <Link
                  key={station.id}
                  href={`/gasolineras/terrestres/${station.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-amber-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        idx === 0
                          ? "bg-amber-400 text-amber-900"
                          : idx === 1
                          ? "bg-gray-300 text-gray-700"
                          : idx === 2
                          ? "bg-orange-300 text-orange-800"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm group-hover:text-amber-700 transition-colors">
                        {station.name}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {station.locality}, {station.provinceName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-amber-700">
                      {formatPrice(station.priceGasoleoA)}
                    </div>
                    {station.priceGasoleoPremium && (
                      <div className="text-xs text-gray-400">
                        Premium: {formatPrice(station.priceGasoleoPremium)}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <Link
                href="/gasolineras/terrestres"
                className="text-amber-600 hover:text-amber-700 text-sm font-medium inline-flex items-center gap-1"
              >
                Ver todas las gasolineras
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Province breakdown table */}
        {peninsulaProvinces.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-5">
              Precio Diésel (Gasóleo A) por Provincia — Hoy
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-gray-600">Provincia</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-600">
                      Media hoy
                    </th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-600 hidden sm:table-cell">
                      Mínimo
                    </th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-600 hidden sm:table-cell">
                      Máximo
                    </th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-600 hidden md:table-cell">
                      Estaciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {peninsulaProvinces.map((p) => {
                    const code = extractProvinceCode(p.scope);
                    const province = PROVINCE_CODES[code];
                    const avg = toNum(p.avgGasoleoA);
                    const nationalAvg = toNum(nationalToday?.avgGasoleoA);
                    const isCheap =
                      avg !== null && nationalAvg !== null && avg < nationalAvg - 0.005;
                    const isExpensive =
                      avg !== null && nationalAvg !== null && avg > nationalAvg + 0.005;

                    return (
                      <tr
                        key={p.scope}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-2">
                          {province ? (
                            <Link
                              href={`/gasolineras/precios/${province.slug}`}
                              className="text-tl-600 hover:text-tl-700 font-medium flex items-center gap-1 w-fit"
                            >
                              {province.name}
                              <ChevronRight className="w-3 h-3 opacity-60" />
                            </Link>
                          ) : (
                            <span className="text-gray-700 font-medium">{code}</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span
                            className={`font-bold ${
                              isCheap
                                ? "text-green-600"
                                : isExpensive
                                ? "text-red-600"
                                : "text-gray-900"
                            }`}
                          >
                            {formatPrice(p.avgGasoleoA)}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right text-gray-600 hidden sm:table-cell">
                          {formatPrice(p.minGasoleoA)}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-600 hidden sm:table-cell">
                          {formatPrice(p.maxGasoleoA)}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-500 hidden md:table-cell">
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
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-3">
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
                        className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 hover:bg-amber-100 transition-colors"
                      >
                        <span className="text-xs font-medium text-amber-800">
                          {province?.name ?? code}
                        </span>
                        <span className="text-xs font-bold text-amber-600">
                          {formatPrice(p.avgGasoleoA)}
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
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Preguntas Frecuentes sobre el Precio del Diésel
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Cuánto cuesta el diésel hoy en España?
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {avgDiesel
                  ? `El precio medio del gasóleo A (diésel) en España hoy es de ${avgDiesel.toFixed(3)}€ por litro (Península y Baleares, datos MITERD). El precio varía según la gasolinera y la comunidad autónoma.`
                  : "El precio medio del diésel en España varía diariamente. Consulta la cifra actualizada en la parte superior de esta página, obtenida de los datos oficiales del MITERD."}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Es más barato el diésel o la gasolina en España?
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {avgDiesel !== null && avg95 !== null
                  ? `Hoy el gasóleo A (diésel) cuesta ${avgDiesel.toFixed(3)}€/L y la gasolina 95 cuesta ${avg95.toFixed(3)}€/L, por lo que el ${avgDiesel < avg95 ? "diésel es más barato" : "diésel es más caro"} en ${Math.abs(avgDiesel - avg95).toFixed(3)}€ por litro.`
                  : "Históricamente el diésel (gasóleo A) ha sido más económico que la gasolina en España, aunque la diferencia varía con el precio internacional del petróleo."}{" "}
                Ten en cuenta que los vehículos diésel pueden ser más costosos de mantener y tener
                restricciones de circulación en algunas ciudades.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Dónde está el diésel más barato hoy en España?
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Las gasolineras con diésel más barato suelen ser marcas blancas y estaciones en
                zonas de alta competencia. En esta página actualizamos en tiempo real el ranking de
                las 10 gasolineras más baratas de la Península. Canarias, Ceuta y Melilla tienen
                precios menores por su fiscalidad especial.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Qué es el gasóleo A y en qué se diferencia del gasóleo B?
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                El gasóleo A es el diésel de automoción estándar, disponible en todas las
                gasolineras. El gasóleo B (gasóleo agrícola o de calefacción) está subvencionado y
                solo puede usarse en maquinaria agrícola, embarcaciones y calefacción. Su uso en
                vehículos de carretera es ilegal y conlleva sanciones económicas y retirada del
                vehículo.
              </p>
            </div>
          </div>
        </div>

        <AffiliateWidget type="fuel-card" className="mb-8" />

        <RelatedLinks
          links={[
            {
              title: "Precio Gasolina Hoy",
              description: "Gasolina 95 y 98 — precio medio nacional y por provincia",
              href: "/precio-gasolina-hoy",
              icon: <Fuel className="w-5 h-5" />,
            },
            {
              title: "Mapa de Gasolineras",
              description: "Encuentra la gasolinera más barata cerca de ti",
              href: "/gasolineras/mapa",
              icon: <MapPin className="w-5 h-5" />,
            },
            {
              title: "Restricciones de Circulación",
              description: "Camiones, ZBE y restricciones por festivos",
              href: "/restricciones",
              icon: <Ban className="w-5 h-5" />,
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
