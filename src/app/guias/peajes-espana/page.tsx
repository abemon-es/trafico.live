import { Metadata } from "next";
import Link from "next/link";
import {
  Route,
  Clock,
  Euro,
  ChevronRight,
  Calculator,
  ArrowUpDown,
  Info,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildPageMetadata } from "@/lib/seo/metadata";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = buildPageMetadata({
  title: "Peajes en Espana 2026 — Guia Completa de Autopistas de Pago",
  description:
    "Guia completa de peajes en Espana: todas las autopistas de pago, tarifas actualizadas 2026, metodos de pago (VIA-T, telepeaje), alternativas gratuitas y consejos para ahorrar.",
  path: "/guias/peajes-espana",
  keywords: [
    "peajes espana",
    "autopistas de pago espana",
    "tarifas peaje 2026",
    "VIA-T telepeaje",
    "autopistas gratuitas alternativas",
    "peaje AP-68",
    "radiales madrid peaje",
    "precio peaje espana",
  ],
  ogType: "article",
});

export const revalidate = 3600;

function formatPrice(n: number): string {
  return n.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDecimal(d: unknown): number {
  if (d === null || d === undefined) return 0;
  return typeof d === "number" ? d : Number(d);
}

const TOC_ITEMS = [
  { id: "que-son", label: "Que son los peajes" },
  { id: "historia", label: "Historia de los peajes" },
  { id: "tipos", label: "Tipos de autopistas de pago" },
  { id: "datos-en-vivo", label: "Autopistas de pago actuales" },
  { id: "metodos-pago", label: "Metodos de pago" },
  { id: "telepeaje", label: "VIA-T y telepeaje" },
  { id: "alternativas", label: "Alternativas gratuitas" },
  { id: "consejos", label: "Consejos para ahorrar" },
  { id: "futuro", label: "El futuro de los peajes" },
];

export default async function GuiaPeajesPage() {
  const [tollRoads, totalCount] = await Promise.all([
    prisma.tollRoad.findMany({
      include: {
        segments: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.tollRoad.count(),
  ]);

  const concesionadas = tollRoads.filter((r) => !r.isSeitt);
  const seitt = tollRoads.filter((r) => r.isSeitt);

  // Price per km ranking (concesionadas only, use maxPrice/totalKm)
  const pricePerKm = concesionadas
    .map((r) => ({
      id: r.id,
      name: r.name,
      pricePerKm:
        formatDecimal(r.totalKm) > 0
          ? formatDecimal(r.maxPrice) / formatDecimal(r.totalKm)
          : 0,
      maxPrice: formatDecimal(r.maxPrice),
      totalKm: formatDecimal(r.totalKm),
    }))
    .filter((r) => r.pricePerKm > 0)
    .sort((a, b) => b.pricePerKm - a.pricePerKm);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Peajes en Espana 2026 — Guia Completa de Autopistas de Pago",
    description:
      "Guia completa de peajes en Espana con tarifas actualizadas, metodos de pago y alternativas gratuitas.",
    url: `${BASE_URL}/guias/peajes-espana`,
    datePublished: "2026-04-06",
    dateModified: new Date().toISOString(),
    author: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    mainEntityOfPage: `${BASE_URL}/guias/peajes-espana`,
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
              { name: "Peajes en Espana", href: "/guias/peajes-espana" },
            ]}
          />

          <div className="lg:grid lg:grid-cols-[1fr_240px] lg:gap-8">
            {/* Main content */}
            <article>
              {/* Hero */}
              <header className="mb-8">
                <div className="flex items-center gap-2 text-sm text-tl-600 dark:text-tl-400 mb-2">
                  <Route className="w-4 h-4" />
                  <span>Guia de trafico</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Peajes en Espana: Guia Completa 2026
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  Todo lo que necesitas saber sobre las autopistas de pago en Espana:
                  tarifas actualizadas, metodos de pago, telepeaje VIA-T y alternativas
                  gratuitas para cada ruta.
                </p>
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    12 min de lectura
                  </span>
                  <span>Actualizado: abril 2026</span>
                </div>
              </header>

              {/* Stats bar */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">{totalCount}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Autopistas con peaje</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">{concesionadas.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Concesionadas</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">{seitt.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Radiales SEITT</p>
                </div>
              </div>

              {/* Prose content */}
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <h2 id="que-son">Que son los peajes en Espana</h2>
                <p>
                  Los peajes son tasas que los conductores pagan por utilizar determinadas autopistas
                  en Espana. A diferencia de las autovias (gratuitas y financiadas con impuestos),
                  las autopistas de peaje fueron construidas y son mantenidas por empresas concesionarias
                  privadas bajo contrato con el Estado. El conductor paga en funcion de la distancia
                  recorrida, y el importe varia segun el operador, el tramo y el tipo de vehiculo.
                </p>
                <p>
                  En 2026, Espana cuenta con <strong>{totalCount} autopistas o tramos con peaje activo</strong>,
                  considerablemente menos que hace una decada. Muchas concesiones han ido expirando
                  y sus tramos se han convertido en autovias libres, como ocurrio con la AP-1 (Burgos–Arminon),
                  la AP-4 (Sevilla–Cadiz) o la AP-7 en buena parte de su recorrido mediterraneo.
                </p>

                <h2 id="historia">Breve historia de los peajes en Espana</h2>
                <p>
                  El modelo de autopistas de peaje en Espana comenzo en los anos 60 y 70 con el
                  Plan de Autopistas Nacionales. El Estado otorgaba concesiones a empresas privadas
                  para construir y explotar las vias durante periodos de 50 a 75 anos. Las primeras
                  fueron el Guadiana (AP-4), la AP-7 mediterranea y la AP-2 Zaragoza–Barcelona.
                </p>
                <p>
                  A partir de los anos 2000, el gobierno impulso las autopistas radiales de Madrid
                  (R-2, R-3, R-4, R-5) para descongestionar los accesos a la capital. Sin embargo,
                  las previsiones de trafico fueron excesivamente optimistas, varias concesionarias
                  quebraron y el Estado asumio su gestion a traves de la SEITT (Sociedad Estatal
                  de Infraestructuras del Transporte Terrestre).
                </p>
                <p>
                  Desde 2018, Espana ha liberalizado progresivamente tramos de peaje al expirar
                  concesiones. La AP-1, AP-4, AP-7 en Cataluna y Comunidad Valenciana, y la AP-2
                  pasaron a ser gratuitas. En noviembre de 2026 expira la concesion de la <strong>AP-68
                  (Bilbao–Zaragoza)</strong>, la ultima gran concesion pendiente.
                </p>

                <h2 id="tipos">Tipos de autopistas de pago</h2>
                <h3>Autopistas concesionadas</h3>
                <p>
                  Son autopistas gestionadas por empresas privadas bajo concesion estatal.
                  El precio se fija por tramo y se actualiza anualmente por resolucion ministerial
                  publicada en el BOE. El conductor paga al pasar por las cabinas de peaje
                  o mediante telepeaje (VIA-T). Los precios varian segun el operador: Abertis
                  (Acesa, Aucat, Avasa, Aucalsa), Itinere, Globalvia, etc.
                </p>
                <h3>Autopistas SEITT (radiales de Madrid)</h3>
                <p>
                  Las radiales de Madrid y otras autopistas rescatadas por el Estado (AP-36, AP-41, M-12)
                  son gestionadas por SEITT. Aplican un sistema de tarifa por kilometro en lugar de
                  un precio fijo por tramo. En 2026, la tarifa es de <strong>0,0827 euros/km con Tag</strong> y
                  0,0927 euros/km sin Tag para vehiculos ligeros. Una ventaja importante:
                  <strong> son gratuitas de 00:00 a 06:00</strong>.
                </p>
              </div>

              {/* LIVE DATA: Toll roads table */}
              <section id="datos-en-vivo" className="my-10">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Autopistas de pago en Espana — Datos en vivo
                </h2>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-950 text-left">
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Autopista</th>
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Tramo</th>
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right">Km</th>
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right">Precio max.</th>
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Operador</th>
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Expira</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {tollRoads.map((road) => (
                          <tr key={road.id} className="hover:bg-gray-50 dark:hover:bg-gray-950">
                            <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                              <Link
                                href={`/peajes`}
                                className="text-tl-600 dark:text-tl-400 hover:underline"
                              >
                                {road.id}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                              {road.fromCity} — {road.toCity}
                            </td>
                            <td className="px-4 py-3 text-right font-data text-gray-900 dark:text-gray-100">
                              {formatDecimal(road.totalKm).toFixed(0)}
                            </td>
                            <td className="px-4 py-3 text-right font-data font-semibold text-tl-amber-700 dark:text-tl-amber-300">
                              {formatPrice(formatDecimal(road.maxPrice))} euros
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                              {road.operator}
                            </td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                              {road.expires ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-950 text-xs text-gray-400">
                    Fuente: Ministerio de Transportes, SEITT. Precios para vehiculos ligeros con Tag.
                  </div>
                </div>
              </section>

              {/* LIVE DATA: Price per km ranking */}
              {pricePerKm.length > 0 && (
                <section className="my-10">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <ArrowUpDown className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                    Ranking por precio por kilometro
                  </h3>
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                    {pricePerKm.slice(0, 10).map((r, i) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-400 w-5 text-right font-data">{i + 1}</span>
                          <div>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{r.id}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{r.name}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-data font-bold text-tl-amber-700 dark:text-tl-amber-300">
                            {r.pricePerKm.toFixed(4)} euros/km
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Continue prose */}
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <h2 id="metodos-pago">Metodos de pago en peajes</h2>
                <p>
                  Las cabinas de peaje en Espana aceptan varios metodos de pago, aunque la
                  disponibilidad puede variar segun el operador:
                </p>
                <ul>
                  <li>
                    <strong>Efectivo:</strong> Billetes y monedas en las cabinas manuales o
                    automaticas. Es el metodo mas lento y no esta disponible en todas las cabinas.
                  </li>
                  <li>
                    <strong>Tarjeta bancaria:</strong> Tarjetas de debito y credito (Visa, Mastercard).
                    Es la opcion mas comun en cabinas automaticas.
                  </li>
                  <li>
                    <strong>VIA-T (telepeaje):</strong> Dispositivo electronico OBU (On-Board Unit)
                    que permite pasar por la via exclusiva sin detenerse. Es el metodo mas rapido
                    y ofrece descuentos en muchas autopistas.
                  </li>
                </ul>

                <h2 id="telepeaje">VIA-T y telepeaje: el sistema mas eficiente</h2>
                <p>
                  El sistema VIA-T es el estandar de telepeaje en Espana, gestionado por SEOPAN.
                  Consiste en un dispositivo electronico (OBU) adherido al parabrisas que se
                  comunica por radiofrecuencia con las antenas de las cabinas de peaje. Al pasar
                  por la via VIA-T, el importe se carga automaticamente a la cuenta del titular.
                </p>
                <h3>Ventajas del VIA-T</h3>
                <ul>
                  <li>
                    <strong>Velocidad:</strong> Paso sin detencion por las cabinas (30 km/h
                    maximo), eliminando colas.
                  </li>
                  <li>
                    <strong>Descuentos:</strong> En autopistas SEITT, el ahorro es del 11% respecto
                    al pago en efectivo o tarjeta. Algunos operadores ofrecen descuentos adicionales
                    por frecuencia de uso.
                  </li>
                  <li>
                    <strong>Interoperabilidad europea:</strong> Desde 2024, el VIA-T espanol es
                    compatible con peajes en Portugal (Via Verde), Francia (Liber-t) e Italia
                    (Telepass) bajo el estandar EETS.
                  </li>
                  <li>
                    <strong>Facturacion centralizada:</strong> Un unico recibo mensual con todos
                    los trayectos.
                  </li>
                </ul>
                <h3>Como contratar VIA-T</h3>
                <p>
                  Puedes contratar el VIA-T a traves de tu banco (la mayoria de bancos espanoles
                  lo ofrecen), de la app de tu operador de autopistas, o directamente en los
                  puntos de venta de las estaciones de servicio junto a las autopistas. El coste
                  del dispositivo oscila entre 0 y 30 euros, y la cuota mensual ronda los 1,50–2,50
                  euros segun el proveedor.
                </p>

                <h2 id="alternativas">Alternativas gratuitas a las autopistas de peaje</h2>
                <p>
                  Cada autopista de peaje en Espana tiene una alternativa gratuita, generalmente
                  una carretera nacional (N-) o una autovia (A-) que discurre en paralelo. Las
                  alternativas suelen ser mas lentas (entre 15 y 45 minutos mas en trayectos largos),
                  pero pueden ahorrar importes significativos, especialmente en viajes frecuentes.
                </p>
                <p>
                  Algunos ejemplos de alternativas habituales:
                </p>
                <ul>
                  <li><strong>AP-68 (Bilbao–Zaragoza):</strong> N-232 por el valle del Ebro</li>
                  <li><strong>AP-9 (Ferrol–Vigo):</strong> N-550 y carreteras autonómicas</li>
                  <li><strong>AP-6 (Villalba–Adanero):</strong> N-VI por el puerto de Guadarrama</li>
                  <li><strong>AP-71 (Leon–Astorga):</strong> N-120</li>
                </ul>
                <div className="not-prose my-6">
                  <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800/50 rounded-xl p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-tl-600 dark:text-tl-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-tl-800 dark:text-tl-300 text-sm">Consejo</p>
                      <p className="text-sm text-tl-700 dark:text-tl-400">
                        Usa nuestra <Link href="/calculadora" className="underline">calculadora de rutas</Link> para
                        comparar el coste total (combustible + peajes) entre la autopista y la alternativa gratuita.
                      </p>
                    </div>
                  </div>
                </div>

                <h2 id="consejos">Consejos para ahorrar en peajes</h2>
                <ol>
                  <li>
                    <strong>Usa VIA-T:</strong> El ahorro del 11% en autopistas SEITT se acumula
                    rapidamente si usas estas vias con frecuencia.
                  </li>
                  <li>
                    <strong>Viaja de noche en autopistas SEITT:</strong> Las radiales de Madrid y
                    las autopistas gestionadas por SEITT son completamente gratuitas de 00:00 a 06:00.
                  </li>
                  <li>
                    <strong>Consulta bonificaciones:</strong> Algunos operadores ofrecen descuentos
                    por frecuencia de uso, residencia en municipios colindantes o vehiculos
                    ECO/0 emisiones.
                  </li>
                  <li>
                    <strong>Planifica con alternativas:</strong> En trayectos cortos, la diferencia
                    de tiempo con la alternativa gratuita puede ser minima (10-15 minutos).
                  </li>
                  <li>
                    <strong>Aprovecha las liberalizaciones:</strong> Antes de planificar un viaje,
                    consulta si la autopista que vas a usar sigue siendo de peaje. En los ultimos
                    anos se han liberalizado muchos tramos.
                  </li>
                </ol>

                <h2 id="futuro">El futuro de los peajes en Espana</h2>
                <p>
                  Espana se dirige hacia un modelo con cada vez menos autopistas de peaje
                  tradicionales. En noviembre de 2026 expirara la concesion de la AP-68, la
                  ultima gran autopista concesionada pendiente. Sin embargo, el debate sobre
                  un posible <strong>peaje por uso generalizado</strong> (viñeta o pago por
                  kilometro) sigue abierto.
                </p>
                <p>
                  La Union Europea, a traves de la Directiva Eurovignette revisada, impulsa
                  que todos los paises miembros adopten un sistema de pago por uso en las
                  carreteras de alta capacidad. Espana podria implementar un sistema de este
                  tipo en el horizonte 2028-2030, similar al que ya existe en Portugal (Via Verde),
                  Francia (ecotaxe), o Alemania (Maut para camiones).
                </p>
                <p>
                  De momento, el Plan de Recuperacion, Transformacion y Resiliencia incluye
                  estudios sobre tarificacion vial, pero no hay una fecha concreta de
                  implementacion. Lo que si es seguro es que las concesiones actuales seguiran
                  expirando y mas tramos pasaran a ser gratuitos en los proximos anos.
                </p>
              </div>

              {/* CTA */}
              <div className="mt-10 mb-8">
                <Link
                  href="/peajes"
                  className="flex items-center justify-between bg-tl-600 hover:bg-tl-700 text-white rounded-xl p-5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Euro className="w-7 h-7" />
                    <div>
                      <p className="font-semibold">Ver todas las tarifas de peaje</p>
                      <p className="text-sm text-tl-200">Precios actualizados por tramo y operador</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>

              {/* Attribution */}
              <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500">
                <p>
                  Fuentes: Ministerio de Transportes, Movilidad y Agenda Urbana;
                  SEITT (Sociedad Estatal de Infraestructuras del Transporte Terrestre);
                  BOE. Datos actualizados automaticamente cada hora.
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
                    href="/calculadora"
                    className="flex items-center gap-2 text-sm font-semibold text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:hover:text-tl-300"
                  >
                    <Calculator className="w-4 h-4" />
                    Calculadora de rutas
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
