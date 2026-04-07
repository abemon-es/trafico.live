import { Metadata } from "next";
import Link from "next/link";
import {
  Fuel,
  Clock,
  ChevronRight,
  Zap,
  Calculator,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildPageMetadata } from "@/lib/seo/metadata";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = buildPageMetadata({
  title: "Gasolina vs Diesel vs Electrico 2026 — Comparativa Completa de Costes",
  description:
    "Comparativa completa gasolina vs diesel vs electrico: coste por kilometro, impacto ambiental, mantenimiento, fiscalidad y perspectivas de futuro. Con precios reales actualizados.",
  path: "/guias/gasolina-vs-diesel-vs-electrico",
  keywords: [
    "gasolina o diesel",
    "electrico vs gasolina",
    "coste por kilometro gasolina diesel electrico",
    "mejor combustible coche",
    "diesel vs gasolina 2026",
    "coste coche electrico",
    "mantenimiento electrico vs combustion",
    "precio gasolina diesel hoy",
  ],
  ogType: "article",
});

export const revalidate = 3600;

const TOC_ITEMS = [
  { id: "resumen", label: "Resumen rapido" },
  { id: "precios-hoy", label: "Precios de combustible hoy" },
  { id: "coste-km", label: "Coste por kilometro" },
  { id: "mantenimiento", label: "Mantenimiento" },
  { id: "impuestos", label: "Fiscalidad" },
  { id: "ambiental", label: "Impacto ambiental" },
  { id: "reventa", label: "Valor residual" },
  { id: "futuro", label: "Perspectivas de futuro" },
  { id: "recomendacion", label: "Que te conviene" },
];

function formatPrice(n: number): string {
  return n.toLocaleString("es-ES", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function formatDecimal(d: unknown): number {
  if (d === null || d === undefined) return 0;
  return typeof d === "number" ? d : Number(d);
}

export default async function GuiaCombustiblesPage() {
  // Get latest CNMC national average prices
  const latestPrices = await prisma.cNMCFuelPrice.findMany({
    where: {
      provinceName: { not: null },
    },
    orderBy: { date: "desc" },
    take: 52, // ~52 provinces, latest date
    select: {
      date: true,
      provinceName: true,
      priceGasolina95: true,
      priceGasoleoA: true,
    },
  });

  // Calculate national averages from latest date
  const latestDate = latestPrices[0]?.date;
  const pricesForDate = latestDate
    ? latestPrices.filter(
        (p) => p.date.getTime() === latestDate.getTime()
      )
    : [];

  const avgGasolina =
    pricesForDate.length > 0
      ? pricesForDate.reduce(
          (sum, p) => sum + formatDecimal(p.priceGasolina95),
          0
        ) / pricesForDate.filter((p) => p.priceGasolina95).length
      : 1.55;

  const avgDiesel =
    pricesForDate.length > 0
      ? pricesForDate.reduce(
          (sum, p) => sum + formatDecimal(p.priceGasoleoA),
          0
        ) / pricesForDate.filter((p) => p.priceGasoleoA).length
      : 1.45;

  // Cost calculations for 15,000 km/year
  const KM_YEAR = 15000;
  const CONSUMO_GASOLINA = 6.5; // L/100km
  const CONSUMO_DIESEL = 5.5; // L/100km
  const CONSUMO_ELECTRICO = 16; // kWh/100km
  const PRECIO_ELECTRICIDAD_CASA = 0.1; // EUR/kWh nocturna
  const PRECIO_ELECTRICIDAD_PUBLICA = 0.45; // EUR/kWh DC rapido

  const costeGasolina = (KM_YEAR / 100) * CONSUMO_GASOLINA * avgGasolina;
  const costeDiesel = (KM_YEAR / 100) * CONSUMO_DIESEL * avgDiesel;
  const costeElectricoCasa = (KM_YEAR / 100) * CONSUMO_ELECTRICO * PRECIO_ELECTRICIDAD_CASA;
  const costeElectricoPublico = (KM_YEAR / 100) * CONSUMO_ELECTRICO * PRECIO_ELECTRICIDAD_PUBLICA;

  const costeKmGasolina = (CONSUMO_GASOLINA / 100) * avgGasolina;
  const costeKmDiesel = (CONSUMO_DIESEL / 100) * avgDiesel;
  const costeKmElectricoCasa = (CONSUMO_ELECTRICO / 100) * PRECIO_ELECTRICIDAD_CASA;
  const costeKmElectricoPublico = (CONSUMO_ELECTRICO / 100) * PRECIO_ELECTRICIDAD_PUBLICA;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Gasolina vs Diesel vs Electrico 2026 — Comparativa Completa",
    description:
      "Comparativa completa de costes entre gasolina, diesel y electrico con precios actualizados.",
    url: `${BASE_URL}/guias/gasolina-vs-diesel-vs-electrico`,
    datePublished: "2026-04-06",
    dateModified: new Date().toISOString(),
    author: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    mainEntityOfPage: `${BASE_URL}/guias/gasolina-vs-diesel-vs-electrico`,
    inLanguage: "es",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Guias", href: "/guias" },
              { name: "Gasolina vs Diesel vs Electrico", href: "/guias/gasolina-vs-diesel-vs-electrico" },
            ]}
          />

          <div className="lg:grid lg:grid-cols-[1fr_240px] lg:gap-8">
            <article>
              <header className="mb-8">
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 mb-2">
                  <Fuel className="w-4 h-4" />
                  <span>Guia de combustibles</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Gasolina vs Diesel vs Electrico: Comparativa 2026
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  Comparativa completa con precios reales actualizados: coste por kilometro,
                  mantenimiento, fiscalidad, impacto ambiental y que te conviene segun tu uso.
                </p>
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    16 min de lectura
                  </span>
                  <span>Actualizado: abril 2026</span>
                </div>
              </header>

              {/* LIVE DATA: Current prices */}
              <section id="precios-hoy" className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Precios de combustible hoy — Media nacional
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gasolina 95</p>
                    <p className="text-2xl font-bold text-tl-amber-700 dark:text-tl-amber-300 font-data">
                      {formatPrice(avgGasolina)} euros/L
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Diesel (Gasoleo A)</p>
                    <p className="text-2xl font-bold text-tl-amber-700 dark:text-tl-amber-300 font-data">
                      {formatPrice(avgDiesel)} euros/L
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Electrico (casa)</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-data">
                      0,100 euros/kWh
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Electrico (rapido)</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-data">
                      0,450 euros/kWh
                    </p>
                  </div>
                </div>
                {latestDate && (
                  <p className="text-xs text-gray-400 mt-2">
                    Precios combustible: CNMC, ultima fecha {latestDate.toLocaleDateString("es-ES")}.
                    Precio electricidad: tarifa PVPC nocturna y media de carga rapida publica.
                  </p>
                )}
              </section>

              <div className="prose prose-lg dark:prose-invert max-w-none">
                <h2 id="resumen">Resumen rapido</h2>
                <p>
                  Si vas con prisa, aqui tienes las conclusiones principales. Debajo
                  desarrollamos cada punto en detalle con datos reales:
                </p>
                <ul>
                  <li><strong>Mas barato por km:</strong> Electrico cargando en casa (0,016 euros/km). Un 85% mas barato que gasolina.</li>
                  <li><strong>Menor mantenimiento:</strong> Electrico (sin aceite, embrague, correa, escape).</li>
                  <li><strong>Mejor para muchos km/ano:</strong> Diesel (consumo menor) o electrico (coste energia minimo).</li>
                  <li><strong>Mejor para ciudad:</strong> Electrico (etiqueta 0, ZBE libre, SER gratis).</li>
                  <li><strong>Mas versatil en 2026:</strong> Gasolina hibrido (sin ansiedad de autonomia, etiqueta ECO).</li>
                </ul>
              </div>

              {/* Cost comparison table */}
              <section id="coste-km" className="my-10">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Coste por kilometro — Con precios reales
                </h2>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-950">
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Concepto</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Gasolina</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Diesel</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Electrico (casa)</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Electrico (publico)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      <tr>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">Consumo medio</td>
                        <td className="px-4 py-3 text-center font-data">{CONSUMO_GASOLINA} L/100km</td>
                        <td className="px-4 py-3 text-center font-data">{CONSUMO_DIESEL} L/100km</td>
                        <td className="px-4 py-3 text-center font-data">{CONSUMO_ELECTRICO} kWh/100km</td>
                        <td className="px-4 py-3 text-center font-data">{CONSUMO_ELECTRICO} kWh/100km</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">Precio energia</td>
                        <td className="px-4 py-3 text-center font-data">{formatPrice(avgGasolina)} euros/L</td>
                        <td className="px-4 py-3 text-center font-data">{formatPrice(avgDiesel)} euros/L</td>
                        <td className="px-4 py-3 text-center font-data">0,100 euros/kWh</td>
                        <td className="px-4 py-3 text-center font-data">0,450 euros/kWh</td>
                      </tr>
                      <tr className="bg-tl-50 dark:bg-tl-900/10">
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">Coste por km</td>
                        <td className="px-4 py-3 text-center font-data font-bold text-tl-amber-700 dark:text-tl-amber-300">
                          {costeKmGasolina.toFixed(3)} euros
                        </td>
                        <td className="px-4 py-3 text-center font-data font-bold text-tl-amber-700 dark:text-tl-amber-300">
                          {costeKmDiesel.toFixed(3)} euros
                        </td>
                        <td className="px-4 py-3 text-center font-data font-bold text-emerald-600 dark:text-emerald-400">
                          {costeKmElectricoCasa.toFixed(3)} euros
                        </td>
                        <td className="px-4 py-3 text-center font-data font-bold text-emerald-600 dark:text-emerald-400">
                          {costeKmElectricoPublico.toFixed(3)} euros
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                          Coste anual ({(KM_YEAR / 1000).toFixed(0)}K km)
                        </td>
                        <td className="px-4 py-3 text-center font-data font-bold text-gray-900 dark:text-gray-100">
                          {costeGasolina.toFixed(0)} euros
                        </td>
                        <td className="px-4 py-3 text-center font-data font-bold text-gray-900 dark:text-gray-100">
                          {costeDiesel.toFixed(0)} euros
                        </td>
                        <td className="px-4 py-3 text-center font-data font-bold text-emerald-600 dark:text-emerald-400">
                          {costeElectricoCasa.toFixed(0)} euros
                        </td>
                        <td className="px-4 py-3 text-center font-data font-bold text-gray-900 dark:text-gray-100">
                          {costeElectricoPublico.toFixed(0)} euros
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Calculos para un vehiculo medio del segmento C (tipo Seat Leon / VW Golf).
                  Precios CNMC actualizados automaticamente.
                </p>
              </section>

              <div className="prose prose-lg dark:prose-invert max-w-none">
                <h2 id="mantenimiento">Mantenimiento: la gran diferencia oculta</h2>
                <p>
                  El mantenimiento es donde el vehiculo electrico saca la mayor ventaja. Un
                  motor electrico tiene unas 20 piezas moviles, frente a las mas de 2.000 de
                  un motor de combustion. Esto se traduce en:
                </p>
                <h3>Gasolina</h3>
                <ul>
                  <li>Cambio de aceite y filtro: cada 15.000-20.000 km (~60-100 euros)</li>
                  <li>Filtro de aire: cada 30.000 km (~20-40 euros)</li>
                  <li>Bujias: cada 60.000 km (~80-150 euros)</li>
                  <li>Correa de distribucion: cada 120.000 km (~400-800 euros)</li>
                  <li>Embrague: cada 150.000-200.000 km (~600-1.200 euros)</li>
                  <li><strong>Coste medio anual (15.000 km/ano): 400-700 euros</strong></li>
                </ul>
                <h3>Diesel</h3>
                <ul>
                  <li>Todo lo anterior del gasolina, mas:</li>
                  <li>Filtro de particulas (FAP/DPF): limpieza o sustitucion (~300-2.000 euros)</li>
                  <li>AdBlue: recarga cada 15.000-20.000 km (~15-30 euros)</li>
                  <li>Sistema EGR: limpieza periodica</li>
                  <li><strong>Coste medio anual (15.000 km/ano): 500-900 euros</strong></li>
                </ul>
                <h3>Electrico</h3>
                <ul>
                  <li>No hay cambio de aceite, filtro, bujias, correa ni embrague</li>
                  <li>Frenos: duran 2-3x mas gracias a la frenada regenerativa</li>
                  <li>Neumaticos: desgaste ligeramente mayor (mas peso y par instantaneo)</li>
                  <li>Liquido de frenos: cada 2 anos (~50 euros)</li>
                  <li>Revision anual del sistema de alta tension: ~100-200 euros</li>
                  <li><strong>Coste medio anual (15.000 km/ano): 150-350 euros</strong></li>
                </ul>

                <h2 id="impuestos">Fiscalidad y ayudas</h2>
                <p>
                  La fiscalidad en Espana favorece claramente a los vehiculos electricos e
                  hibridos enchufables:
                </p>
                <ul>
                  <li>
                    <strong>Impuesto de matriculacion:</strong> Los vehiculos electricos (0
                    emisiones de CO2) estan exentos. Los diesel y gasolina pagan entre el 0%
                    y el 14,75% segun las emisiones.
                  </li>
                  <li>
                    <strong>Impuesto de circulacion (IVTM):</strong> Muchos ayuntamientos
                    ofrecen bonificaciones del 50-75% para vehiculos 0 emisiones y ECO.
                  </li>
                  <li>
                    <strong>Plan MOVES III (y sucesores):</strong> Subvencion de hasta 7.000
                    euros para la compra de vehiculos electricos nuevos con achatarramiento.
                  </li>
                  <li>
                    <strong>Zona SER:</strong> Aparcamiento gratuito para etiqueta 0 en Madrid;
                    50% descuento para ECO.
                  </li>
                  <li>
                    <strong>Peajes:</strong> Algunos operadores ofrecen descuentos para vehiculos
                    ECO y 0 emisiones.
                  </li>
                </ul>

                <h2 id="ambiental">Impacto ambiental</h2>
                <p>
                  El impacto ambiental no se limita a las emisiones del tubo de escape. El
                  analisis del ciclo de vida (LCA) incluye la fabricacion, el uso y el reciclaje:
                </p>
                <ul>
                  <li>
                    <strong>Gasolina:</strong> ~120-150 g CO2/km (tubo de escape) + emisiones
                    de refineria. Total ciclo de vida: ~180-250 g CO2/km.
                  </li>
                  <li>
                    <strong>Diesel:</strong> ~110-140 g CO2/km en tubo + NOx y particulas
                    (especialmente problematicas en ciudad). Total: ~170-230 g CO2/km.
                  </li>
                  <li>
                    <strong>Electrico:</strong> 0 g CO2/km en uso local. La fabricacion de la
                    bateria genera mas CO2 que un motor convencional, pero se compensa tras
                    30.000-50.000 km de uso. Con el mix electrico espanol (alto porcentaje
                    renovable en 2026), el ciclo de vida total es de ~50-80 g CO2/km.
                  </li>
                </ul>

                <h2 id="reventa">Valor residual</h2>
                <p>
                  El valor residual es un factor importante en el coste total de propiedad:
                </p>
                <ul>
                  <li>
                    <strong>Diesel:</strong> Depreciacion acelerada en los ultimos anos debido
                    a la incertidumbre regulatoria (restricciones ZBE, posible prohibicion de
                    venta de nuevos diesel en 2035). Un diesel de 3 anos pierde un 50-60% de
                    su valor.
                  </li>
                  <li>
                    <strong>Gasolina:</strong> Depreciacion mas moderada que el diesel. Un
                    gasolina de 3 anos pierde un 40-50% de su valor.
                  </li>
                  <li>
                    <strong>Electrico:</strong> Variable. Los Tesla y modelos populares mantienen
                    bien el valor (35-40% de perdida a 3 anos). Modelos con baterias pequenas
                    o marcas menos conocidas pueden depreciarse mas rapido.
                  </li>
                </ul>

                <h2 id="futuro">Perspectivas de futuro</h2>
                <p>
                  La Union Europea ha aprobado la prohibicion de venta de vehiculos nuevos con
                  motor de combustion a partir de 2035 (con la excepcion de e-fuels). Esto
                  significa que:
                </p>
                <ul>
                  <li>Los vehiculos de gasolina y diesel seguiran circulando, pero su valor
                  residual se reducira progresivamente.</li>
                  <li>La infraestructura de recarga electrica seguira creciendo exponencialmente.</li>
                  <li>Los precios de las baterias continuan bajando (~100 euros/kWh en 2026,
                  frente a 1.000 euros/kWh en 2010). Los electricos seran mas baratos que los
                  combustion en precio de compra alrededor de 2027-2028.</li>
                  <li>Las ZBE se expandiran y endurecerán las restricciones a diesel y gasolina
                  en zonas urbanas.</li>
                </ul>

                <h2 id="recomendacion">Que te conviene segun tu uso</h2>
                <h3>Elige electrico si...</h3>
                <ul>
                  <li>Tienes plaza de garaje con posibilidad de instalar wallbox</li>
                  <li>Tu uso es principalmente urbano o periurbano</li>
                  <li>Conduces menos de 300 km al dia (autonomia media en 2026: 350-500 km)</li>
                  <li>Quieres el menor coste operativo posible</li>
                  <li>Vives en una ciudad con ZBE</li>
                </ul>
                <h3>Elige hibrido (gasolina) si...</h3>
                <ul>
                  <li>No tienes donde cargar en casa</li>
                  <li>Haces viajes largos frecuentes (&gt;500 km)</li>
                  <li>Quieres etiqueta ECO sin depender de la infraestructura de carga</li>
                  <li>Buscas versatilidad total</li>
                </ul>
                <h3>Elige diesel si...</h3>
                <ul>
                  <li>Recorres mas de 25.000 km/ano principalmente en carretera</li>
                  <li>Necesitas remolcar o transportar cargas pesadas</li>
                  <li>No circulas habitualmente por ZBE</li>
                  <li>El precio de compra es tu prioridad absoluta (segunda mano)</li>
                </ul>
                <h3>Elige gasolina si...</h3>
                <ul>
                  <li>Recorres menos de 15.000 km/ano</li>
                  <li>No quieres complicaciones (sin enchufe, sin AdBlue)</li>
                  <li>El presupuesto de compra es limitado</li>
                  <li>Priorizas la conduccion deportiva</li>
                </ul>
              </div>

              {/* CTAs */}
              <div className="mt-10 mb-8 space-y-3">
                <Link
                  href="/precio-gasolina-hoy"
                  className="flex items-center justify-between bg-amber-500 hover:bg-amber-600 text-white rounded-xl p-5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Fuel className="w-7 h-7" />
                    <div>
                      <p className="font-semibold">Precio de gasolina y diesel hoy</p>
                      <p className="text-sm text-amber-100">Precios actualizados por gasolinera</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/calculadora"
                  className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-tl-300 dark:hover:border-tl-700 rounded-xl p-5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calculator className="w-7 h-7 text-tl-600 dark:text-tl-400" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Calculadora de coste de viaje</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Calcula combustible + peajes para tu ruta</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              </div>

              <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500">
                <p>
                  Fuentes: CNMC (precios combustible); IDAE (consumos); REE (mix electrico);
                  ACEA (datos mercado europeo). Calculos basados en vehiculo medio segmento C.
                  Precios actualizados automaticamente con datos CNMC.
                </p>
              </footer>
            </article>

            {/* Sidebar TOC */}
            <aside className="hidden lg:block">
              <nav className="sticky top-24 space-y-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  En esta guia
                </p>
                {TOC_ITEMS.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block text-sm text-gray-600 dark:text-gray-400 hover:text-tl-600 dark:hover:text-tl-400 py-1 transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
                  <Link
                    href="/guias/puntos-recarga-electrico"
                    className="flex items-center gap-2 text-sm font-semibold text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:hover:text-tl-300"
                  >
                    <Zap className="w-4 h-4" />
                    Puntos de recarga
                  </Link>
                </div>
              </nav>
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}
