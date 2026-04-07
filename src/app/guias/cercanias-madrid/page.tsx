import { Metadata } from "next";
import Link from "next/link";
import {
  Train,
  Clock,
  MapPin,
  ChevronRight,
  Info,
  Map,
  Plane,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildPageMetadata } from "@/lib/seo/metadata";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = buildPageMetadata({
  title: "Cercanias Madrid 2026 — Guia Completa: Lineas, Precios, Horarios y Consejos",
  description:
    "Guia completa de Cercanias Madrid: todas las lineas, zonas tarifarias, precios, horarios, conexiones con Metro y aeropuerto, y consejos practicos para viajeros.",
  path: "/guias/cercanias-madrid",
  keywords: [
    "cercanias madrid",
    "lineas cercanias madrid",
    "precios cercanias madrid",
    "horarios cercanias madrid",
    "cercanias aeropuerto madrid",
    "zonas cercanias madrid",
    "abono cercanias madrid",
    "estaciones cercanias madrid",
  ],
  ogType: "article",
});

export const revalidate = 3600;

const TOC_ITEMS = [
  { id: "que-es", label: "Que es Cercanias Madrid" },
  { id: "lineas", label: "Las lineas de Cercanias" },
  { id: "datos-en-vivo", label: "Lineas activas (datos)" },
  { id: "zonas", label: "Zonas tarifarias" },
  { id: "precios", label: "Precios y abonos" },
  { id: "horarios", label: "Horarios y frecuencias" },
  { id: "aeropuerto", label: "Cercanias al aeropuerto" },
  { id: "conexiones", label: "Conexiones con Metro" },
  { id: "consejos", label: "Consejos practicos" },
  { id: "apps", label: "Apps y recursos" },
];

export default async function GuiaCercaniasPage() {
  const [routes, stationCount] = await Promise.all([
    prisma.railwayRoute.findMany({
      where: {
        network: "Madrid",
        serviceType: "CERCANIAS",
      },
      select: {
        id: true,
        shortName: true,
        longName: true,
        originName: true,
        destName: true,
        stopsCount: true,
        tripCount: true,
        color: true,
        stopNames: true,
      },
      orderBy: { shortName: "asc" },
    }),
    prisma.railwayStation.count({
      where: {
        network: "Madrid",
        serviceTypes: { has: "CERCANIAS" },
      },
    }),
  ]);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Cercanias Madrid 2026 — Guia Completa",
    description: "Guia completa de Cercanias Madrid con lineas, precios, horarios y consejos.",
    url: `${BASE_URL}/guias/cercanias-madrid`,
    datePublished: "2026-04-06",
    dateModified: new Date().toISOString(),
    author: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    mainEntityOfPage: `${BASE_URL}/guias/cercanias-madrid`,
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
              { name: "Cercanias Madrid", href: "/guias/cercanias-madrid" },
            ]}
          />

          <div className="lg:grid lg:grid-cols-[1fr_240px] lg:gap-8">
            <article>
              <header className="mb-8">
                <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 mb-2">
                  <Train className="w-4 h-4" />
                  <span>Guia de transporte publico</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Cercanias Madrid: Guia Completa 2026
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  Todo lo que necesitas saber sobre la red de Cercanias de Madrid: todas las
                  lineas, estaciones, zonas tarifarias, precios, abonos, conexiones con Metro
                  y aeropuerto, y consejos practicos para viajeros.
                </p>
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    15 min de lectura
                  </span>
                  <span>Actualizado: abril 2026</span>
                </div>
              </header>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">{routes.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Lineas activas</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">{stationCount}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Estaciones</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">7</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Zonas tarifarias</p>
                </div>
              </div>

              <div className="prose prose-lg dark:prose-invert max-w-none">
                <h2 id="que-es">Que es Cercanias Madrid</h2>
                <p>
                  Cercanias Madrid es la red de trenes de cercanias que conecta la capital con
                  su area metropolitana y las ciudades del entorno. Gestionada por Renfe Operadora
                  y con infraestructura de ADIF, es el sistema de transporte ferroviario suburbano
                  mas grande de Espana, con mas de 280 millones de viajeros anuales.
                </p>
                <p>
                  La red se estructura en lineas numeradas (C-1, C-2, C-3, etc.) que parten
                  de las principales estaciones del centro de Madrid (Atocha, Sol, Chamartin,
                  Nuevos Ministerios, Recoletos) y se extienden hacia todos los puntos cardinales
                  de la Comunidad de Madrid y provincias colindantes (Guadalajara, Segovia, Avila).
                </p>
                <p>
                  El tunel de Cercanias que conecta Atocha con Chamartin pasando por Sol,
                  Nuevos Ministerios y Recoletos es el eje central de toda la red. Todas las
                  lineas confluyen en este corredor, lo que permite transbordos comodos entre
                  cualquier linea.
                </p>

                <h2 id="lineas">Las lineas de Cercanias Madrid</h2>
                <p>
                  La red de Cercanias Madrid se compone de diversas lineas que cubren
                  los principales corredores metropolitanos. Cada linea se identifica por
                  un numero (C-1, C-2, C-3...) y un color distintivo. Las lineas mas utilizadas
                  son la C-3 (Aranjuez), la C-4 (Parla/Alcobendas) y la C-5 (Mostoles/Humanes).
                </p>
              </div>

              {/* LIVE DATA: Lines table */}
              <section id="datos-en-vivo" className="my-10">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Lineas de Cercanias Madrid — Datos en vivo
                </h2>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-950 text-left">
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Linea</th>
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Recorrido</th>
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right">Estaciones</th>
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right">Servicios/dia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {routes.map((route) => (
                          <tr key={route.id} className="hover:bg-gray-50 dark:hover:bg-gray-950">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {route.color && (
                                  <span
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: `#${route.color}` }}
                                  />
                                )}
                                <span className="font-bold text-gray-900 dark:text-gray-100">
                                  {route.shortName || route.longName}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                              {route.originName} — {route.destName}
                            </td>
                            <td className="px-4 py-3 text-right font-data text-gray-900 dark:text-gray-100">
                              {route.stopsCount ?? route.stopNames?.length ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-data text-gray-900 dark:text-gray-100">
                              {route.tripCount ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-950 text-xs text-gray-400">
                    Fuente: Renfe GTFS. {routes.length} lineas activas, {stationCount} estaciones en la red.
                  </div>
                </div>
              </section>

              <div className="prose prose-lg dark:prose-invert max-w-none">
                <h2 id="zonas">Zonas tarifarias</h2>
                <p>
                  La red de Cercanias Madrid se divide en 7 zonas tarifarias concentricas,
                  numeradas de la A (centro) a la E2 (periferia mas lejana). El precio del
                  billete depende del numero de zonas que atravieses:
                </p>
                <ul>
                  <li><strong>Zona A:</strong> Centro de Madrid (Sol, Atocha, Chamartin, Nuevos Ministerios, Recoletos, Mendez Alvaro).</li>
                  <li><strong>Zona B1:</strong> Primera corona metropolitana (Getafe, Alcorcon, Fuenlabrada, Alcala de Henares).</li>
                  <li><strong>Zona B2:</strong> Segunda corona (Parla, Mostoles, Aranjuez parcial, Tres Cantos).</li>
                  <li><strong>Zona B3:</strong> Valdemoro, San Martin de la Vega, El Escorial.</li>
                  <li><strong>Zona C1:</strong> Alcobendas, San Sebastian de los Reyes, Ciempozuelos.</li>
                  <li><strong>Zona C2:</strong> Aranjuez, Cercedilla, Guadalajara.</li>
                  <li><strong>Zonas E1/E2:</strong> Periferias mas alejadas (Segovia, Avila).</li>
                </ul>

                <h2 id="precios">Precios y abonos 2026</h2>
                <p>
                  Los billetes de Cercanias Madrid se compran en maquinas expendedoras de las
                  estaciones, en la app Renfe Cercanias o con la tarjeta de transporte Multi.
                </p>
                <h3>Billete sencillo</h3>
                <ul>
                  <li>1-2 zonas: 1,70 euros</li>
                  <li>3 zonas: 1,85 euros</li>
                  <li>4 zonas: 2,60 euros</li>
                  <li>5 zonas: 3,40 euros</li>
                  <li>6 zonas: 4,05 euros</li>
                  <li>7+ zonas: 5,50 euros</li>
                </ul>
                <h3>Abono Transporte</h3>
                <p>
                  El <strong>Abono Transporte de la Comunidad de Madrid</strong> incluye viajes
                  ilimitados en Cercanias (y Metro, EMT, interurbanos) dentro de las zonas
                  contratadas. Es la opcion mas economica para uso diario:
                </p>
                <ul>
                  <li>Abono Joven (hasta 26 anos): 20 euros/mes (todas las zonas)</li>
                  <li>Abono zona A: 54,60 euros/mes</li>
                  <li>Abono zona B1: 63,70 euros/mes</li>
                  <li>Abono zona B2: 72,00 euros/mes</li>
                  <li>Abono zona C1: 82,00 euros/mes</li>
                  <li>Abono zona C2: 99,30 euros/mes</li>
                </ul>
                <div className="not-prose my-6">
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 rounded-xl p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-purple-800 dark:text-purple-300 text-sm">Abono Joven</p>
                      <p className="text-sm text-purple-700 dark:text-purple-400">
                        Si tienes menos de 26 anos, el Abono Joven por 20 euros/mes incluye
                        viajes ilimitados en toda la Comunidad de Madrid (todas las zonas, todos
                        los transportes). Es la mejor relacion calidad-precio del sistema.
                      </p>
                    </div>
                  </div>
                </div>
                <h3>Tarjeta Multi</h3>
                <p>
                  La <strong>Tarjeta Multi</strong> es el soporte para billetes de transporte
                  publico en Madrid. Se adquiere en estancos y maquinas expendedoras por 2,50
                  euros y permite cargar billetes sencillos, billetes de 10 viajes y abonos
                  mensuales. Es compatible con Cercanias, Metro y EMT.
                </p>

                <h2 id="horarios">Horarios y frecuencias</h2>
                <p>
                  Cercanias Madrid opera todos los dias del ano, incluyendo festivos. Los
                  horarios generales son:
                </p>
                <ul>
                  <li><strong>Primer tren:</strong> Entre 05:00 y 06:00 (dependiendo de la linea y estacion).</li>
                  <li><strong>Ultimo tren:</strong> Entre 23:30 y 00:30.</li>
                  <li><strong>Frecuencia hora punta:</strong> 5-10 minutos en las lineas principales (C-3, C-4, C-5).</li>
                  <li><strong>Frecuencia hora valle:</strong> 15-20 minutos.</li>
                  <li><strong>Fines de semana:</strong> Frecuencias reducidas (15-30 minutos).</li>
                </ul>
                <p>
                  Los viernes y sabados por la noche, el servicio se amplia con trenes
                  adicionales hasta la 01:00-01:30 (servicio Buho de Cercanias en verano
                  y fechas especiales).
                </p>

                <h2 id="aeropuerto">Cercanias al aeropuerto de Barajas</h2>
                <p>
                  La <strong>linea C-1</strong> conecta el aeropuerto Adolfo Suarez Madrid-Barajas
                  (Terminal 4) con el centro de Madrid. Es la forma mas economica de llegar
                  al aeropuerto desde el centro:
                </p>
                <ul>
                  <li><strong>Estacion:</strong> Aeropuerto T4 (subterranea, conectada con la terminal).</li>
                  <li><strong>Tiempo a Atocha:</strong> Aproximadamente 25 minutos.</li>
                  <li><strong>Tiempo a Sol:</strong> Aproximadamente 30 minutos (vía Atocha).</li>
                  <li><strong>Precio:</strong> Billete sencillo + suplemento aeropuerto (total ~3,60 euros).</li>
                  <li><strong>Frecuencia:</strong> Cada 30 minutos aproximadamente.</li>
                  <li><strong>Horario:</strong> Primer tren ~05:50, ultimo tren ~23:35.</li>
                </ul>
                <div className="not-prose my-6">
                  <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800/50 rounded-xl p-4 flex items-start gap-3">
                    <Plane className="w-5 h-5 text-tl-600 dark:text-tl-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-tl-800 dark:text-tl-300 text-sm">Alternativa Metro</p>
                      <p className="text-sm text-tl-700 dark:text-tl-400">
                        La linea 8 de Metro tambien llega a la T4 y T1-T2-T3 con suplemento
                        aeropuerto de 3 euros. Si tu destino esta en la linea 8 directa
                        (Nuevos Ministerios, Colombia), puede ser mas rapido que Cercanias.
                      </p>
                    </div>
                  </div>
                </div>

                <h2 id="conexiones">Conexiones con Metro y otros transportes</h2>
                <p>
                  La red de Cercanias Madrid tiene multiples puntos de conexion con el Metro
                  y otros medios de transporte:
                </p>
                <ul>
                  <li><strong>Atocha:</strong> Metro L1, conexion con AVE/Larga Distancia.</li>
                  <li><strong>Sol:</strong> Metro L1, L2, L3. Nudo central del Metro y Cercanias.</li>
                  <li><strong>Chamartin:</strong> Metro L1, L10, conexion con AVE Norte.</li>
                  <li><strong>Nuevos Ministerios:</strong> Metro L6, L8, L10. Intercambiador con Metro Aeropuerto.</li>
                  <li><strong>Recoletos:</strong> Metro L4 (Serrano).</li>
                  <li><strong>Mendez Alvaro:</strong> Estacion Sur de autobuses (interurbanos y larga distancia).</li>
                  <li><strong>Principe Pio:</strong> Metro L6, L10, intercambiador de autobuses.</li>
                </ul>

                <h2 id="consejos">Consejos practicos</h2>
                <ol>
                  <li>
                    <strong>Evita la hora punta:</strong> De 07:30 a 09:30 y de 18:00 a 20:00
                    los trenes van muy llenos, especialmente en las lineas C-3, C-4 y C-5. Si
                    puedes, viaja antes de las 07:00 o despues de las 10:00.
                  </li>
                  <li>
                    <strong>Sol como transbordo:</strong> La estacion de Sol es el nudo central
                    de la red. Si necesitas cambiar de linea, lo mas probable es que el transbordo
                    mas comodo sea en Sol (o en Atocha/Chamartin).
                  </li>
                  <li>
                    <strong>Carga la Multi con antelacion:</strong> Las colas en las maquinas
                    expendedoras pueden ser largas en hora punta. Recarga tu tarjeta Multi en
                    horarios tranquilos o usa la app para recargas NFC.
                  </li>
                  <li>
                    <strong>Consulta la app antes de viajar:</strong> Las incidencias (obras,
                    averias) son relativamente frecuentes. La app de Renfe Cercanias y nuestra
                    seccion de <Link href="/trenes">trenes en vivo</Link> te informan en tiempo
                    real.
                  </li>
                  <li>
                    <strong>Bicicleta en Cercanias:</strong> Esta permitido viajar con bicicleta
                    en Cercanias en horarios de baja ocupacion (generalmente de 10:00 a 12:30
                    y de 21:00 al cierre, y todo el dia en fines de semana). Hay un espacio
                    habilitado en cada tren.
                  </li>
                  <li>
                    <strong>WiFi a bordo:</strong> Renfe ha ido instalando WiFi en muchos
                    trenes de Cercanias. La cobertura no es completa, pero esta mejorando.
                    En los tuneles centrales la cobertura movil 4G/5G suele ser buena.
                  </li>
                </ol>

                <h2 id="apps">Apps y recursos utiles</h2>
                <ul>
                  <li>
                    <strong>Renfe Cercanias:</strong> App oficial de Renfe para horarios,
                    retrasos en tiempo real y compra de billetes. Disponible en iOS y Android.
                  </li>
                  <li>
                    <strong>CRTM (Consorcio Regional de Transportes):</strong> App oficial
                    del transporte publico madrileno. Incluye planificador de rutas multimodal
                    (Cercanias + Metro + bus).
                  </li>
                  <li>
                    <strong>Google Maps / Apple Maps:</strong> Incluyen horarios de Cercanias
                    Madrid en sus planificadores de rutas.
                  </li>
                  <li>
                    <strong>trafico.live:</strong> Nuestra seccion de{" "}
                    <Link href="/trenes">trenes</Link> muestra posiciones en tiempo real,
                    alertas activas y estadisticas de puntualidad.
                  </li>
                </ul>
              </div>

              {/* CTAs */}
              <div className="mt-10 mb-8 space-y-3">
                <Link
                  href="/trenes/cercanias/madrid"
                  className="flex items-center justify-between bg-purple-600 hover:bg-purple-700 text-white rounded-xl p-5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Train className="w-7 h-7" />
                    <div>
                      <p className="font-semibold">Ver Cercanias Madrid en vivo</p>
                      <p className="text-sm text-purple-200">Posiciones, alertas y puntualidad en tiempo real</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/trenes/estaciones"
                  className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-tl-300 dark:hover:border-tl-700 rounded-xl p-5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Directorio de estaciones</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Busca tu estacion de Cercanias</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              </div>

              <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500">
                <p>
                  Fuentes: Renfe Operadora (GTFS); Consorcio Regional de Transportes de Madrid;
                  ADIF. Datos de lineas actualizados semanalmente.
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
                    href="/trenes"
                    className="flex items-center gap-2 text-sm font-semibold text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:hover:text-tl-300"
                  >
                    <Map className="w-4 h-4" />
                    Mapa de trenes en vivo
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
