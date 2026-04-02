import { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData, generateFAQSchema } from "@/components/seo/StructuredData";
import { Route, MapPin, Clock, Calculator, Building2, ChevronRight } from "lucide-react";
import tollData from "../../../data/tolls.json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Peajes en España 2026 — Tarifas de Autopistas Actualizadas",
  description:
    "Consulta las tarifas de peaje de todas las autopistas de pago en España. AP-9, AP-68, AP-6, AP-7 y radiales de Madrid. Precios 2026 para vehículos ligeros y pesados.",
  keywords: [
    "peajes españa",
    "tarifas autopistas",
    "precio peaje AP-9",
    "precio peaje AP-68",
    "autopistas de pago españa",
    "peajes radiales madrid",
    "SEITT peajes",
  ],
  alternates: { canonical: `${BASE_URL}/peajes` },
  openGraph: {
    title: "Peajes en España 2026 — Tarifas Actualizadas",
    description:
      "Todas las autopistas de pago en España con precios actualizados. Operadores, tramos y tarifas por segmento.",
    type: "website",
    locale: "es_ES",
  },
};

export const revalidate = 86400;

function formatPrice(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PeajesPage() {
  const concessionRoads = tollData.roads.filter((r) => !("isSeitt" in r && r.isSeitt));
  const seittRoads = tollData.roads.filter((r) => "isSeitt" in r && r.isSeitt);

  const faqData = generateFAQSchema({
    questions: [
      {
        question: "¿Cuántas autopistas de peaje hay en España en 2026?",
        answer: `En 2026 hay ${tollData.roads.length} autopistas o tramos con peaje activo en España: ${concessionRoads.length} autopistas concesionadas y ${seittRoads.length} radiales/autopistas gestionadas por SEITT.`,
      },
      {
        question: "¿Las radiales de Madrid (R-2, R-3, R-4, R-5) siguen siendo de pago?",
        answer:
          "Sí, las radiales de Madrid son gestionadas por SEITT con tarifas de 0,0827 €/km con Tag y 0,0927 €/km sin Tag. Son gratuitas entre las 00:00 y las 06:00.",
      },
      {
        question: "¿Cuándo dejarán de tener peaje la AP-68 Bilbao–Zaragoza?",
        answer:
          "La concesión de la AP-68 expira en noviembre de 2026. Tras esa fecha, la autopista pasará a ser gratuita.",
      },
      {
        question: "¿Cómo se calculan los peajes de SEITT?",
        answer:
          "Las autopistas SEITT (radiales de Madrid, AP-36, AP-41) aplican una tarifa por kilómetro: 0,0827 €/km con Tag (Telepeaje) y 0,0927 €/km con tarjeta/efectivo para vehículos ligeros. Son gratuitas de 00:00 a 06:00.",
      },
    ],
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <StructuredData data={faqData} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Peajes", href: "/peajes" },
          ]}
        />

        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
            Peajes en España 2026
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
            Tarifas actualizadas de las {tollData.roads.length} autopistas de pago activas en España.
            Precios para vehículos ligeros con Tag/Telepeaje.
            Fuente: Ministerio de Transportes y SEITT.
          </p>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Última actualización: {tollData.lastUpdated}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">{tollData.roads.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Autopistas con peaje</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">{concessionRoads.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Concesionadas</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">{seittRoads.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Radiales SEITT</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-tl-amber-700 dark:text-tl-amber-300 font-data">
              {formatPrice(tollData.seittPerKm.ligeros.tag)}€
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">SEITT por km (Tag)</p>
          </div>
        </div>

        {/* Concession roads */}
        <section className="mb-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
              <Route className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              Autopistas Concesionadas
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Gestionadas por operadores privados. Peaje variable por tramo.
            </p>
            <div className="space-y-4">
              {concessionRoads.map((road) => {
                const fullSegment = road.segments.reduce((max, s) => (s.price > max.price ? s : max), road.segments[0]);
                return (
                  <div key={road.id} className="border border-gray-100 dark:border-gray-800 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{road.id}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{road.name.replace(`${road.id} `, "")}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-tl-amber-700 dark:text-tl-amber-300 font-data">
                          {formatPrice(fullSegment.price)}€
                        </p>
                        <p className="text-xs text-gray-400">{fullSegment.from} → {fullSegment.to}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{road.operator}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Expira: {road.expires}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{fullSegment.km} km</span>
                    </div>
                    {road.segments.length > 1 && (
                      <details className="mt-3">
                        <summary className="text-sm text-tl-600 dark:text-tl-400 cursor-pointer hover:underline">
                          Ver {road.segments.length} tramos
                        </summary>
                        <div className="mt-2 space-y-1">
                          {road.segments.map((s, i) => (
                            <div key={i} className="flex justify-between text-sm py-1 border-t border-gray-100 dark:border-gray-800 first:border-0">
                              <span className="text-gray-700 dark:text-gray-300">{s.from} → {s.to} <span className="text-gray-400">({s.km} km)</span></span>
                              <span className="font-data font-semibold text-tl-amber-700 dark:text-tl-amber-300">{formatPrice(s.price)}€</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SEITT roads */}
        <section className="mb-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              Radiales y Autopistas SEITT
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Gestionadas por la Sociedad Estatal de Infraestructuras del Transporte Terrestre.
            </p>
            <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800/50 rounded-lg p-3 mb-4">
              <p className="text-sm text-tl-800 dark:text-tl-300">
                <strong>Tarifa por km (2026):</strong>{" "}
                <span className="font-data">{formatPrice(tollData.seittPerKm.ligeros.tag)}€/km</span> con Tag |{" "}
                <span className="font-data">{formatPrice(tollData.seittPerKm.ligeros.cash)}€/km</span> sin Tag |{" "}
                Gratuitas de 00:00 a 06:00
              </p>
            </div>
            <div className="space-y-3">
              {seittRoads.map((road) => (
                <div key={road.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-950">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{road.id}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{road.name.replace(`${road.id} `, "")}</p>
                  </div>
                  <div className="text-right">
                    {road.segments.map((s, i) => (
                      <div key={i} className="text-sm">
                        <span className="font-data font-bold text-tl-amber-700 dark:text-tl-amber-300">{formatPrice(s.price)}€</span>
                        <span className="text-xs text-gray-400 ml-1">({s.km} km)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA to calculadora */}
        <section className="mb-8">
          <Link
            href="/calculadora"
            className="flex items-center justify-between bg-tl-600 hover:bg-tl-700 text-white rounded-xl p-6 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Calculator className="w-8 h-8" />
              <div>
                <p className="font-semibold text-lg">Calculadora de Coste de Ruta</p>
                <p className="text-sm text-tl-200">Calcula combustible + peajes para tu viaje</p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6" />
          </Link>
        </section>

        {/* SEO content */}
        <section className="mb-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Autopistas de Peaje en España
            </h2>
            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
              <p>
                España cuenta con una red de autopistas de peaje que incluye tanto concesiones privadas
                como autopistas gestionadas por el Estado a través de SEITT. Tras la liberalización de
                varios tramos en los últimos años (AP-1, AP-4, AP-2, AP-7 en Cataluña y Alicante),
                quedan activas {tollData.roads.length} autopistas o tramos de pago.
              </p>
              <p>
                Las tarifas se actualizan anualmente por resolución del Ministerio de Transportes,
                publicada en el BOE. En 2026, las autopistas concesionadas subieron entre un 3,64%
                y un 4,68%, mientras que las autopistas SEITT subieron un 2%.
              </p>
              <p>
                Las radiales de Madrid (R-2, R-3/R-5, R-4) y las autopistas AP-36, AP-41 y M-12
                son gratuitas entre las 00:00 y las 06:00, y aplican una tarifa por kilómetro
                recorrido en lugar de un precio fijo por tramo.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Fuentes: Ministerio de Transportes, SEITT, BOE-A-2024-26469. Tarifas para vehículos ligeros con Tag.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Preguntas Frecuentes
            </h2>
            <dl className="space-y-4">
              <div>
                <dt className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  ¿Cuándo dejará de tener peaje la AP-68?
                </dt>
                <dd className="text-sm text-gray-600 dark:text-gray-400">
                  La concesión de la AP-68 (Bilbao – Zaragoza) expira en noviembre de 2026.
                  Tras esa fecha, la autopista pasará a ser gratuita, como ya ocurrió con la AP-1 y AP-4.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  ¿Las radiales de Madrid son gratuitas por la noche?
                </dt>
                <dd className="text-sm text-gray-600 dark:text-gray-400">
                  Sí. Las autopistas gestionadas por SEITT (R-2, R-3/R-5, R-4, M-12, AP-36, AP-41)
                  son gratuitas de 00:00 a 06:00 todos los días.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  ¿Cuánto cuesta el peaje con Tag vs sin Tag?
                </dt>
                <dd className="text-sm text-gray-600 dark:text-gray-400">
                  En las autopistas SEITT, el Tag ahorra un 11%: {formatPrice(tollData.seittPerKm.ligeros.tag)}€/km
                  frente a {formatPrice(tollData.seittPerKm.ligeros.cash)}€/km sin Tag.
                  En las concesionadas, el descuento varía según el operador.
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </main>
    </div>
  );
}
