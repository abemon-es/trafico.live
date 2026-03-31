import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { StructuredData, generateFAQSchema } from "@/components/seo/StructuredData";
import { Fuel, TrendingDown, BarChart3, Building2, ChevronRight } from "lucide-react";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Comparativa de Precios por Marca de Gasolinera — España 2026",
  description:
    "Compara los precios de combustible por marca: Repsol, Cepsa, BP, Shell, Galp, low-cost y supermercados. Descubre qué marca vende el diesel y la gasolina 95 más barata en España.",
  keywords: [
    "gasolineras más baratas marca",
    "Repsol vs Cepsa precios",
    "comparativa precios gasolineras España",
    "marcas gasolineras baratas",
    "BP Shell Galp precios",
    "Ballenoil Petroprix Plenoil precios",
    "gasolineras supermercado baratas",
  ],
  openGraph: {
    title: "Comparativa de Precios por Marca de Gasolinera — España 2026",
    description:
      "¿Qué marca de gasolinera tiene el precio más barato? Comparativa completa con datos reales de más de 11.000 estaciones.",
    type: "website",
  },
  alternates: {
    canonical: "https://trafico.live/gasolineras/marcas",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toNum(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === "object" && val !== null && "toNumber" in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function formatPrice(val: unknown): string {
  const n = toNum(val);
  if (n == null) return "N/D";
  return `${n.toFixed(3)}€`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data fetching
// ─────────────────────────────────────────────────────────────────────────────

interface BrandStat {
  brand: string;
  slug: string;
  count: number;
  avgDiesel: number | null;
  avgGas95: number | null;
  minDiesel: number | null;
  minGas95: number | null;
}

async function getBrandStats(brandName: string, brandSlug: string, brandPattern: string): Promise<BrandStat> {
  const [count, stats] = await Promise.all([
    prisma.gasStation.count({
      where: { name: { contains: brandPattern, mode: "insensitive" } },
    }),
    prisma.gasStation.aggregate({
      where: {
        name: { contains: brandPattern, mode: "insensitive" },
        priceGasoleoA: { not: null },
      },
      _avg: { priceGasoleoA: true, priceGasolina95E5: true },
      _min: { priceGasoleoA: true, priceGasolina95E5: true },
    }),
  ]);

  return {
    brand: brandName,
    slug: brandSlug,
    count,
    avgDiesel: toNum(stats._avg.priceGasoleoA),
    avgGas95: toNum(stats._avg.priceGasolina95E5),
    minDiesel: toNum(stats._min.priceGasoleoA),
    minGas95: toNum(stats._min.priceGasolina95E5),
  };
}

async function getAllBrandStats(): Promise<BrandStat[]> {
  const brands = await Promise.all([
    getBrandStats("Repsol", "repsol", "REPSOL"),
    getBrandStats("Cepsa", "cepsa", "CEPSA"),
    getBrandStats("BP", "bp", " BP "),
    getBrandStats("Shell", "shell", "SHELL"),
    getBrandStats("Galp", "galp", "GALP"),
    getBrandStats("Ballenoil", "ballenoil", "BALLENOIL"),
    getBrandStats("Petroprix", "petroprix", "PETROPRIX"),
    getBrandStats("Plenoil", "plenoil", "PLENOIL"),
    getBrandStats("Plenergy", "plenergy", "PLENERGY"),
    getBrandStats("Bonàrea", "bonarea", "BONAREA"),
    getBrandStats("Alcampo", "alcampo", "ALCAMPO"),
    getBrandStats("Carrefour", "carrefour", "CARREFOUR"),
    getBrandStats("Eroski", "eroski", "EROSKI"),
    getBrandStats("Meroil", "meroil", "MEROIL"),
    getBrandStats("Campsa", "campsa", "CAMPSA"),
    getBrandStats("Esclat", "esclat", "ESCLAT"),
  ]);

  // Only return brands with at least 1 station, sorted by avg diesel asc (nulls last)
  return brands
    .filter((b) => b.count > 0)
    .sort((a, b) => {
      if (a.avgDiesel == null && b.avgDiesel == null) return 0;
      if (a.avgDiesel == null) return 1;
      if (b.avgDiesel == null) return -1;
      return a.avgDiesel - b.avgDiesel;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function MarcasPage() {
  const brands = await getAllBrandStats();

  const cheapestDieselBrand = brands.find((b) => b.avgDiesel != null);
  const mostExpensiveDieselBrand = [...brands]
    .filter((b) => b.avgDiesel != null)
    .sort((a, b) => (b.avgDiesel ?? 0) - (a.avgDiesel ?? 0))[0];

  const biggestBrand = [...brands].sort((a, b) => b.count - a.count)[0];

  // Savings calculation: 50L diesel difference between cheapest and most expensive
  const savings50L =
    cheapestDieselBrand?.avgDiesel != null && mostExpensiveDieselBrand?.avgDiesel != null
      ? ((mostExpensiveDieselBrand.avgDiesel - cheapestDieselBrand.avgDiesel) * 50).toFixed(2)
      : null;

  const today = new Date().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const faqSchema = generateFAQSchema({
    questions: [
      {
        question: "¿Qué marca de gasolinera tiene el diesel más barato en España?",
        answer: cheapestDieselBrand
          ? `Según los datos actuales, ${cheapestDieselBrand.brand} ofrece el precio medio de Gasóleo A más bajo entre las principales marcas, con una media de ${cheapestDieselBrand.avgDiesel?.toFixed(3)}€/L. Las gasolineras low-cost como Ballenoil, Petroprix y Plenoil suelen situarse entre las más baratas.`
          : "Las gasolineras de marca blanca y supermercados (Alcampo, Carrefour, Eroski) suelen ofrecer los precios más competitivos, junto con las cadenas low-cost como Ballenoil, Petroprix y Plenoil.",
      },
      {
        question: "¿Por qué hay diferencia de precio entre marcas de gasolinera?",
        answer:
          "Las diferencias de precio entre marcas se deben a varios factores: el coste de la marca y los servicios adicionales (cafeterías, talleres, tiendas), el modelo de negocio (low-cost vs. servicio completo), la localización de las estaciones (autopista vs. núcleo urbano), y los acuerdos de suministro con refinerías. Las gasolineras de supermercado suelen ser más baratas porque usan el combustible como reclamo para atraer clientes a la tienda.",
      },
      {
        question: "¿Es igual la calidad del combustible en todas las marcas?",
        answer:
          "En España, todas las gasolineras están obligadas a suministrar combustible que cumpla la norma europea EN 228 (gasolinas) y EN 590 (gasóleo). La calidad base es la misma; las diferencias están en los aditivos propietarios que cada marca añade (por ejemplo, Repsol Activa, BP Ultimate o Cepsa Star). Los combustibles estándar de todas las marcas son equivalentes en términos de rendimiento para el uso diario.",
      },
    ],
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <StructuredData data={faqSchema} />

      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Combustible", href: "/gasolineras" },
          { name: "Marcas", href: "/gasolineras/marcas" },
        ]}
      />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Comparativa de Precios por Marca de Gasolinera
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Precios medios actualizados el {today} · Fuente: MITERD (Ministerio para la Transición Ecológica)
        </p>
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cheapestDieselBrand && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">Marca más barata (diesel)</span>
            </div>
            <p className="text-2xl font-bold text-green-800">{cheapestDieselBrand.brand}</p>
            <p className="text-lg font-semibold text-green-700 dark:text-green-400 mt-1">
              {cheapestDieselBrand.avgDiesel?.toFixed(3)}€/L <span className="text-sm font-normal text-green-600 dark:text-green-400">de media</span>
            </p>
          </div>
        )}

        {biggestBrand && (
          <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              <span className="text-sm font-medium text-tl-700 dark:text-tl-300">Marca con más estaciones</span>
            </div>
            <p className="text-2xl font-bold text-tl-800 dark:text-tl-200">{biggestBrand.brand}</p>
            <p className="text-lg font-semibold text-tl-700 dark:text-tl-300 mt-1">
              {biggestBrand.count.toLocaleString("es-ES")} <span className="text-sm font-normal text-tl-600 dark:text-tl-400">estaciones</span>
            </p>
          </div>
        )}

        {savings50L && cheapestDieselBrand && mostExpensiveDieselBrand && (
          <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Fuel className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
              <span className="text-sm font-medium text-tl-amber-700 dark:text-tl-amber-300">Ahorro repostando 50 L</span>
            </div>
            <p className="text-2xl font-bold text-tl-amber-800">{savings50L}€</p>
            <p className="text-sm text-tl-amber-700 dark:text-tl-amber-300 mt-1">
              eligiendo {cheapestDieselBrand.brand} en vez de {mostExpensiveDieselBrand.brand}
            </p>
          </div>
        )}
      </div>

      {/* Main ranking table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-8">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Ranking por Precio Medio de Diesel</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ordenado de más barato a más caro · Gasóleo A</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Marca</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estaciones</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Diesel medio
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Diesel min.
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  G95 media
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  G95 min.
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {brands.map((b, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === brands.length - 1 && b.avgDiesel != null;

                let rowClass = "";
                if (isFirst) rowClass = "bg-green-50 dark:bg-green-900/20/60";
                else if (isLast) rowClass = "bg-red-50 dark:bg-red-900/20/40";

                return (
                  <tr key={b.slug} className={`hover:bg-gray-50 dark:bg-gray-950 transition-colors ${rowClass}`}>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          isFirst
                            ? "bg-green-50 dark:bg-green-900/200 text-white"
                            : isLast
                            ? "bg-red-400 text-white"
                            : "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{b.brand}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-gray-600 dark:text-gray-400 tabular-nums">
                      {b.count.toLocaleString("es-ES")}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      <span
                        className={`font-semibold ${
                          isFirst ? "text-green-700 dark:text-green-400" : isLast ? "text-red-600 dark:text-red-400" : "text-tl-amber-700 dark:text-tl-amber-300"
                        }`}
                      >
                        {formatPrice(b.avgDiesel)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-gray-600 dark:text-gray-400">
                      {formatPrice(b.minDiesel)}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      <span className="text-tl-700 dark:text-tl-300 font-medium">{formatPrice(b.avgGas95)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-gray-600 dark:text-gray-400">
                      {formatPrice(b.minGas95)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/gasolineras/terrestres?marca=${b.slug}`}
                        className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:text-orange-400 font-medium"
                        title={`Ver estaciones ${b.brand}`}
                      >
                        Ver
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Los precios son medias calculadas sobre las estaciones con precio publicado en el día de hoy.
            Precios en €/litro con IVA incluido. Fuente: API MITERD.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-5">Preguntas frecuentes sobre precios por marca</h2>
        <div className="space-y-5">
          {[
            {
              q: "¿Qué marca de gasolinera tiene el diesel más barato en España?",
              a: cheapestDieselBrand
                ? `Según los datos actuales, ${cheapestDieselBrand.brand} ofrece el precio medio de Gasóleo A más bajo entre las principales marcas, con una media de ${cheapestDieselBrand.avgDiesel?.toFixed(3)}€/L. Las gasolineras low-cost como Ballenoil, Petroprix y Plenoil suelen situarse entre las más baratas.`
                : "Las gasolineras low-cost (Ballenoil, Petroprix, Plenoil) y las de supermercado (Alcampo, Carrefour, Eroski) suelen ofrecer los precios más competitivos.",
            },
            {
              q: "¿Por qué hay diferencia de precio entre marcas de gasolinera?",
              a: "Las diferencias se deben al coste de marca y servicios adicionales, el modelo de negocio (low-cost vs. servicio completo), la localización (autopista vs. ciudad) y los acuerdos de suministro. Las gasolineras de supermercado son más baratas porque usan el combustible como reclamo para atraer clientes.",
            },
            {
              q: "¿Es igual la calidad del combustible en todas las marcas?",
              a: "En España, todas las gasolineras deben cumplir la norma europea EN 228 (gasolinas) y EN 590 (gasóleo). La calidad base es idéntica. Las diferencias residen en los aditivos propietarios que cada marca incorpora (Repsol Activa, BP Ultimate, Cepsa Star…). Para uso diario, el combustible estándar de cualquier marca es equivalente.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-gray-100 dark:border-gray-800 last:border-0 pb-5 last:pb-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{q}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Related links */}
      <RelatedLinks
        title="Más información sobre combustible"
        links={[
          {
            title: "Precio Gasolina Hoy",
            description: "Media nacional y por provincia de Gasolina 95 y 98",
            href: "/precio-gasolina-hoy",
            icon: <Fuel className="w-5 h-5" />,
          },
          {
            title: "Precio Diesel Hoy",
            description: "Gasóleo A: precio medio, mínimos y evolución",
            href: "/precio-diesel-hoy",
            icon: <Fuel className="w-5 h-5" />,
          },
          {
            title: "Gasolineras Baratas",
            description: "Las estaciones más baratas por ciudad",
            href: "/gasolineras/baratas",
            icon: <TrendingDown className="w-5 h-5" />,
          },
          {
            title: "Gasolineras 24 Horas",
            description: "Estaciones abiertas toda la noche en España",
            href: "/gasolineras-24-horas",
            icon: <Building2 className="w-5 h-5" />,
          },
        ]}
      />
    </div>
  );
}
