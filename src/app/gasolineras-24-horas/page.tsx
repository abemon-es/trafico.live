import Link from "next/link";
import {
  Clock,
  MapPin,
  ChevronRight,
  Fuel,
  BarChart3,
  AlertCircle,
  ExternalLink,
  Info,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 300;

const CURRENT_YEAR = new Date().getFullYear();

export const metadata = {
  ...buildPageMetadata({
    title: `Gasolineras Abiertas 24 Horas en España ${CURRENT_YEAR}`,
    description:
      "Todas las gasolineras abiertas 24 horas en España. Distribución por provincia, las 10 más baratas en gasóleo A y respuestas a las preguntas más frecuentes. Datos actualizados.",
    path: "/gasolineras-24-horas",
    keywords: [
      "gasolineras 24 horas",
      "gasolineras abiertas 24 horas España",
      "gasolineras nocturnas España",
      "gasolineras abiertas festivos",
      "estaciones servicio 24h",
      "gasolineras abiertas domingos",
    ],
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toNum(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === "object" && "toNumber" in (val as object)) {
    return (val as { toNumber: () => number }).toNumber();
  }
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function formatPrice(val: unknown): string {
  const n = toNum(val);
  if (n == null) return "N/D";
  return `${n.toFixed(3)} €`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function Gasolineras24hPage() {
  const [total24h, byProvince, cheapest24h] = await Promise.all([
    // Count: try both exact match and contains
    prisma.gasStation.count({
      where: {
        OR: [
          { schedule: { contains: "L-D: 24H" } },
          { schedule: { contains: "24H" } },
          { is24h: true },
        ],
      },
    }),

    // Group by province
    prisma.gasStation.groupBy({
      by: ["province", "provinceName"],
      where: {
        OR: [
          { schedule: { contains: "24" } },
          { is24h: true },
        ],
      },
      _count: { province: true },
      orderBy: { _count: { province: "desc" } },
    }),

    // Top 10 cheapest 24h by diesel (public stations only)
    prisma.gasStation.findMany({
      where: {
        AND: [
          {
            OR: [
              { schedule: { contains: "24" } },
              { is24h: true },
            ],
          },
          {
            OR: [{ saleType: "P" }, { saleType: null }],
          },
        ],
        priceGasoleoA: { not: null },
      },
      orderBy: { priceGasoleoA: "asc" },
      take: 10,
      select: {
        id: true,
        name: true,
        locality: true,
        municipalityCode: true,
        province: true,
        provinceName: true,
        address: true,
        priceGasoleoA: true,
        priceGasolina95E5: true,
        schedule: true,
        is24h: true,
        lastPriceUpdate: true,
      },
    }),
  ]);

  const now = new Date();

  // JSON-LD structured data
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "¿Cuántas gasolineras hay abiertas 24 horas en España?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `Actualmente hay ${total24h.toLocaleString("es-ES")} gasolineras con horario 24 horas registradas en España según los datos oficiales del Ministerio para la Transición Ecológica. La cifra puede variar con el tiempo, ya que algunas estaciones modifican sus horarios de forma estacional.`,
        },
      },
      {
        "@type": "Question",
        name: "¿Cómo sé si una gasolinera está abierta las 24 horas?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "En trafico.live puedes consultar el horario de cada gasolinera en su ficha individual. Las estaciones 24h aparecen identificadas con una etiqueta naranja. Los datos provienen de la API oficial del Ministerio de Transición Ecológica y se actualizan regularmente.",
        },
      },
      {
        "@type": "Question",
        name: "¿Las gasolineras 24 horas son más caras?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No necesariamente. Aunque las gasolineras 24h suelen ser de grandes cadenas (Repsol, Cepsa, BP, etc.) que en ocasiones tienen precios algo superiores a los independientes, el ranking de las más baratas con horario 24h demuestra que también hay estaciones con precios muy competitivos entre las que abren todo el día.",
        },
      },
    ],
  };

  const listSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Gasolineras 24 horas más baratas en España",
    numberOfItems: cheapest24h.length,
    itemListElement: cheapest24h.slice(0, 5).map((station, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "GasStation",
        name: station.name,
        address: {
          "@type": "PostalAddress",
          addressLocality: station.locality ?? station.provinceName ?? "España",
          addressCountry: "ES",
        },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <Breadcrumbs items={[
            { name: "Inicio", href: "/" },
            { name: "Gasolineras", href: "/gasolineras" },
            { name: "24 Horas", href: "/gasolineras-24-horas" },
          ]} />

          {/* Header */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex-shrink-0">
                <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Gasolineras Abiertas 24 Horas en España
                </h1>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-xl">
                  Directorio de estaciones de servicio con horario ininterrumpido en España.
                  Descubre cuántas hay por provincia y cuáles ofrecen el gasóleo más barato.
                </p>
              </div>
            </div>
          </div>

          {/* Total counter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-orange-200 p-5 text-center">
              <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                {total24h.toLocaleString("es-ES")}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">gasolineras 24h en España</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 text-center">
              <div className="text-4xl font-bold text-gray-700 dark:text-gray-300 mb-1">
                {byProvince.length}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">provincias con cobertura</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 text-center">
              <div className="text-4xl font-bold text-gray-700 dark:text-gray-300 mb-1">
                {cheapest24h[0]
                  ? formatPrice(cheapest24h[0].priceGasoleoA)
                  : "N/D"}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">gasóleo más barato (24h)</p>
            </div>
          </div>

          {/* Province breakdown */}
          <section className="mb-8" aria-labelledby="heading-provincias">
            <div className="flex items-center justify-between mb-4">
              <h2 id="heading-provincias" className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Gasolineras 24h por provincia
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Ordenadas por número</span>
              </div>
            </div>

            {byProvince.length === 0 ? (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">No se encontraron datos por provincia en este momento.</span>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Top 10 with visual bars */}
                <div className="divide-y divide-gray-100">
                  {byProvince.slice(0, 52).map((row, idx) => {
                    const count = row._count.province;
                    const max = byProvince[0]._count.province;
                    const pct = Math.round((count / max) * 100);
                    const isTop = idx < 3;

                    return (
                      <div
                        key={row.province ?? `prov-${idx}`}
                        className={`flex items-center gap-3 px-4 py-3 ${
                          isTop ? "bg-orange-50 dark:bg-orange-900/20" : ""
                        }`}
                      >
                        <span className={`text-sm font-medium w-5 text-right flex-shrink-0 ${isTop ? "text-orange-700 dark:text-orange-400" : "text-gray-400"}`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {row.provinceName ?? row.province ?? "Desconocida"}
                            </span>
                            <span className={`text-sm font-bold ml-2 flex-shrink-0 ${isTop ? "text-orange-700 dark:text-orange-400" : "text-gray-700 dark:text-gray-300"}`}>
                              {count.toLocaleString("es-ES")}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isTop ? "bg-orange-50 dark:bg-orange-900/200" : "bg-gray-300"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {byProvince.length > 52 && (
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 text-center">
                    Mostrando las {Math.min(byProvince.length, 52)} provincias con datos disponibles
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Top 10 cheapest 24h (diesel) */}
          <section className="mb-8" aria-labelledby="heading-cheapest">
            <h2 id="heading-cheapest" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Las 10 gasolineras 24h más baratas en gasóleo A
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Ranking en tiempo real — actualizado el {now.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}.
            </p>

            {cheapest24h.length === 0 ? (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">No se encontraron datos de precios para gasolineras 24h en este momento.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {cheapest24h.map((station, idx) => (
                  <Link
                    key={station.id}
                    href={`/gasolineras/terrestres/${station.id}`}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-orange-300 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          idx === 0
                            ? "bg-orange-50 dark:bg-orange-900/200 text-white"
                            : idx === 1
                            ? "bg-orange-400 text-white"
                            : idx === 2
                            ? "bg-orange-300 text-white"
                            : "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm group-hover:text-orange-700 dark:text-orange-400 transition-colors truncate">
                          {station.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">
                            {station.locality ?? station.provinceName ?? "España"}
                            {station.address ? ` · ${station.address}` : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded font-medium">
                        <Clock className="w-3 h-3" />
                        24h
                      </span>
                      <div className="text-right">
                        <div className="text-lg font-bold text-orange-700 dark:text-orange-400 font-mono">
                          {formatPrice(station.priceGasoleoA)}
                        </div>
                        {station.priceGasolina95E5 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            95: {formatPrice(station.priceGasolina95E5)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Map CTA */}
          <div className="mb-8">
            <Link
              href="/gasolineras/mapa?horario=24h"
              className="flex items-center gap-4 p-5 bg-gradient-to-r from-orange-50 to-tl-amber-50 rounded-xl border border-orange-200 hover:border-orange-300 hover:shadow-sm transition-all group"
            >
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex-shrink-0">
                <MapPin className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-orange-700 dark:text-orange-400 transition-colors">
                  Ver todas las gasolineras 24h en el mapa
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Filtra por tu ubicación y encuentra la más cercana que esté abierta ahora.
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-orange-500 dark:text-orange-400 flex-shrink-0" />
            </Link>
          </div>

          {/* Informative section */}
          <section className="mb-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              ¿Qué gasolineras abren 24 horas?
            </h2>
            <div className="prose prose-sm text-gray-600 dark:text-gray-400 max-w-none space-y-3">
              <p>
                Las gasolineras con horario 24 horas son aquellas que permanecen abiertas todos los días del año, incluyendo festivos nacionales, domingos y Navidad. En España, suelen ser estaciones de grandes redes como <strong>Repsol, Cepsa, BP, Galp o Shell</strong> ubicadas en autopistas, circunvalaciones o áreas de servicio de alta afluencia.
              </p>
              <p>
                Sin embargo, también hay muchas gasolineras independientes y de supermercado (como <strong>Carrefour, Alcampo o Eroski</strong>) que operan 24 horas en sus instalaciones de mayor tráfico.
              </p>
              <p>
                Las gasolineras en <strong>áreas de servicio de autopistas y autovías</strong> están prácticamente todas obligadas a mantener algún tipo de servicio de suministro de combustible en horario nocturno o fin de semana, aunque no todas son estrictamente 24h.
              </p>
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-8" aria-labelledby="heading-faq">
            <h2 id="heading-faq" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Preguntas frecuentes sobre gasolineras 24 horas
            </h2>
            <div className="space-y-3">
              <details className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden group">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:bg-gray-950 transition-colors select-none">
                  ¿Cuántas gasolineras hay abiertas 24 horas en España?
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 leading-relaxed">
                  Actualmente hay <strong>{total24h.toLocaleString("es-ES")} gasolineras con horario 24 horas</strong> registradas en España según los datos oficiales del Ministerio para la Transición Ecológica. La provincia con mayor número de gasolineras 24h es{" "}
                  {byProvince[0]?.provinceName ?? byProvince[0]?.province ?? "datos no disponibles"}, con{" "}
                  {byProvince[0]?._count.province.toLocaleString("es-ES") ?? "–"} estaciones. La cifra varía a lo largo del año ya que algunas estaciones modifican sus horarios de forma estacional.
                </div>
              </details>

              <details className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden group">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:bg-gray-950 transition-colors select-none">
                  ¿Cómo sé si una gasolinera concreta está abierta las 24 horas?
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 leading-relaxed">
                  En trafico.live puedes consultar el horario de cada gasolinera en su ficha individual (accesible desde el mapa o desde las listas). Las estaciones con horario 24h aparecen identificadas con la etiqueta naranja &ldquo;24h&rdquo;. Los datos provienen de la API oficial del Ministerio de Transición Ecológica y se actualizan regularmente. También puedes usar el filtro del mapa para mostrar solo gasolineras 24h.
                </div>
              </details>

              <details className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden group">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:bg-gray-950 transition-colors select-none">
                  ¿Las gasolineras 24 horas son más caras que las de horario normal?
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 leading-relaxed">
                  No necesariamente. Aunque las gasolineras 24h suelen pertenecer a grandes cadenas que en ocasiones tienen precios algo superiores a las estaciones independientes, el ranking de las más baratas con horario 24h demuestra que también existen estaciones con precios muy competitivos entre las que abren todo el día. Te recomendamos comparar siempre el precio antes de repostar, especialmente si el trayecto pasa cerca de varias opciones.
                  {cheapest24h[0] && (
                    <>
                      {" "}La gasolinera 24h más barata actualmente en gasóleo A es{" "}
                      <strong>{cheapest24h[0].name}</strong>{cheapest24h[0].locality ? ` en ${cheapest24h[0].locality}` : ""}, con un precio de{" "}
                      <strong>{formatPrice(cheapest24h[0].priceGasoleoA)}</strong> por litro.
                    </>
                  )}
                </div>
              </details>
            </div>
          </section>

          {/* Related links */}
          <nav aria-label="Páginas relacionadas" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">También te puede interesar</h3>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/precio-diesel-hoy"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-sm rounded-full transition-colors"
              >
                <Fuel className="w-3.5 h-3.5" />
                Precio diesel hoy
              </Link>
              <Link
                href="/precio-gasolina-hoy"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-sm rounded-full transition-colors"
              >
                <Fuel className="w-3.5 h-3.5" />
                Precio gasolina hoy
              </Link>
              <Link
                href="/gasolineras/baratas"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-sm rounded-full transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                Gasolineras baratas
              </Link>
              <Link
                href="/gasolineras/mapa"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-sm rounded-full transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                Mapa gasolineras
              </Link>
              <Link
                href="/carga-ev"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-sm rounded-full transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Carga eléctrica EV
              </Link>
              <Link
                href="/calculadora"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-sm rounded-full transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                Calculadora de viaje
              </Link>
            </div>
          </nav>

          {/* Data source */}
          <div className="bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1 text-sm">Fuente de datos</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Los datos de horarios y precios de gasolineras se actualizan regularmente desde la API oficial del{" "}
                  <a
                    href="https://geoportalgasolineras.es/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tl-600 dark:text-tl-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    Geoportal Gasolineras
                    <ExternalLink className="w-3 h-3" />
                  </a>{" "}
                  del Ministerio para la Transición Ecológica y el Reto Demográfico (MITERD). Los horarios indicados corresponden a la información comunicada por las propias estaciones de servicio. Recomendamos verificar el horario actual en la ficha individual de cada gasolinera antes de desplazarte.
                </p>
              </div>
            </div>
          </div>

        </main>
      </div>
    </>
  );
}
