import { Metadata } from "next";
import Link from "next/link";
import {
  Leaf,
  Clock,
  ChevronRight,
  Info,
  CheckCircle,
  XCircle,
  MinusCircle,
  Tag,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildPageMetadata } from "@/lib/seo/metadata";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = buildPageMetadata({
  title: "Zonas de Bajas Emisiones (ZBE) en Espana — Guia Completa 2026",
  description:
    "Guia completa de las Zonas de Bajas Emisiones en Espana: que son, que ciudades las tienen, restricciones por etiqueta, multas, exenciones y futuro de las ZBE.",
  path: "/guias/zonas-bajas-emisiones",
  keywords: [
    "ZBE espana",
    "zonas bajas emisiones",
    "ZBE madrid",
    "ZBE barcelona",
    "restricciones trafico ciudad",
    "multas ZBE",
    "vehiculos permitidos ZBE",
    "etiqueta ambiental ZBE",
  ],
  ogType: "article",
});

export const revalidate = 3600;

const TOC_ITEMS = [
  { id: "que-son", label: "Que son las ZBE" },
  { id: "marco-legal", label: "Marco legal" },
  { id: "ciudades-zbe", label: "Ciudades con ZBE" },
  { id: "datos-en-vivo", label: "Datos de ZBE en vivo" },
  { id: "como-funcionan", label: "Como funcionan" },
  { id: "etiquetas", label: "Etiquetas y restricciones" },
  { id: "exenciones", label: "Exenciones y permisos" },
  { id: "multas", label: "Multas y sanciones" },
  { id: "futuro", label: "Futuro de las ZBE" },
];

interface ZBECity {
  name: string;
  slug: string;
  since: string;
  population: string;
  fine: number;
  schedule: string;
}

const ZBE_CITIES: ZBECity[] = [
  { name: "Madrid", slug: "madrid", since: "2022", population: "3,3 M", fine: 200, schedule: "Permanente" },
  { name: "Barcelona", slug: "barcelona", since: "2020", population: "1,6 M", fine: 200, schedule: "Lun-Vie 07:00-20:00" },
  { name: "Valencia", slug: "valencia", since: "2022", population: "800 K", fine: 200, schedule: "Permanente" },
  { name: "Sevilla", slug: "sevilla", since: "2023", population: "690 K", fine: 200, schedule: "Horarios laborables" },
  { name: "Malaga", slug: "malaga", since: "2023", population: "580 K", fine: 200, schedule: "Lun-Vie 07:00-21:00" },
  { name: "Zaragoza", slug: "zaragoza", since: "2023", population: "675 K", fine: 200, schedule: "Horarios laborables" },
  { name: "Granada", slug: "granada", since: "2023", population: "232 K", fine: 200, schedule: "Lab. 07:00-21:00" },
  { name: "Sabadell", slug: "sabadell", since: "2023", population: "215 K", fine: 200, schedule: "Permanente" },
  { name: "Vitoria-Gasteiz", slug: "vitoria", since: "2023", population: "253 K", fine: 200, schedule: "Horarios laborables" },
  { name: "Valladolid", slug: "valladolid", since: "2023", population: "298 K", fine: 200, schedule: "Horarios laborables" },
];

export default async function GuiaZBEPage() {
  const zones = await prisma.zBEZone.findMany({
    select: {
      id: true,
      name: true,
      cityName: true,
      fineAmount: true,
      effectiveFrom: true,
      effectiveUntil: true,
    },
    orderBy: { cityName: "asc" },
  });

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Zonas de Bajas Emisiones (ZBE) en Espana — Guia Completa 2026",
    description:
      "Guia completa de las Zonas de Bajas Emisiones en Espana.",
    url: `${BASE_URL}/guias/zonas-bajas-emisiones`,
    datePublished: "2026-04-06",
    dateModified: new Date().toISOString(),
    author: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    mainEntityOfPage: `${BASE_URL}/guias/zonas-bajas-emisiones`,
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
              { name: "Zonas de Bajas Emisiones", href: "/guias/zonas-bajas-emisiones" },
            ]}
          />

          <div className="lg:grid lg:grid-cols-[1fr_240px] lg:gap-8">
            <article>
              <header className="mb-8">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-2">
                  <Leaf className="w-4 h-4" />
                  <span>Guia de movilidad urbana</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Zonas de Bajas Emisiones (ZBE): Guia Completa 2026
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  Todo sobre las ZBE en Espana: que son, que ciudades las tienen, como afectan
                  a tu vehiculo, multas por incumplimiento, exenciones y el futuro de la
                  movilidad urbana.
                </p>
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    11 min de lectura
                  </span>
                  <span>Actualizado: abril 2026</span>
                </div>
              </header>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">{ZBE_CITIES.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ciudades con ZBE</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">{zones.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Zonas registradas</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-tl-amber-700 dark:text-tl-amber-300 font-data">200 euros</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Multa estandar</p>
                </div>
              </div>

              <div className="prose prose-lg dark:prose-invert max-w-none">
                <h2 id="que-son">Que son las Zonas de Bajas Emisiones</h2>
                <p>
                  Una Zona de Bajas Emisiones (ZBE) es un area urbana delimitada donde se
                  restringe o prohibe la circulacion de los vehiculos mas contaminantes. El
                  objetivo principal es mejorar la calidad del aire en los nucleos urbanos,
                  reducir las emisiones de gases de efecto invernadero (CO2, NOx, particulas
                  en suspension) y fomentar el uso de medios de transporte sostenibles.
                </p>
                <p>
                  Las ZBE no son una invencion espanola. Existen en mas de 300 ciudades europeas
                  bajo diferentes nombres: Low Emission Zones (LEZ) en el Reino Unido, Umweltzonen
                  en Alemania, ZTL en Italia o Zones a Faibles Emissions en Francia. Lo que
                  diferencia a cada ZBE es el criterio de restriccion (que vehiculos se vetan),
                  el horario de aplicacion y las sanciones por incumplimiento.
                </p>

                <h2 id="marco-legal">Marco legal en Espana</h2>
                <p>
                  La obligatoriedad de las ZBE en Espana viene marcada por dos normas fundamentales:
                </p>
                <ul>
                  <li>
                    <strong>Ley 7/2021 de Cambio Climatico y Transicion Energetica:</strong> Obliga
                    a todos los municipios de mas de 50.000 habitantes (y a los de mas de 20.000
                    con problemas de calidad del aire) a establecer ZBE antes de 2023. Afecta a
                    mas de 150 municipios espanoles.
                  </li>
                  <li>
                    <strong>Real Decreto 1052/2022:</strong> Establece los requisitos minimos de las
                    ZBE en Espana, incluyendo la obligatoriedad de usar el distintivo ambiental de
                    la DGT como criterio de acceso, la necesidad de senalizacion normalizada y la
                    obligacion de informar a los conductores con antelacion.
                  </li>
                </ul>
                <p>
                  A pesar de la obligacion legal, la implantacion ha sido desigual. Mientras
                  ciudades como Madrid y Barcelona llevan anos con ZBE operativas, muchos
                  municipios de mas de 50.000 habitantes todavia estan en fase de estudio o
                  desarrollo de sus propios planes.
                </p>

                <h2 id="ciudades-zbe">Ciudades con ZBE activa en 2026</h2>
                <p>
                  En abril de 2026, las siguientes ciudades tienen ZBE completamente operativas
                  con sistemas de control (camaras LPR) y sanciones activas:
                </p>
              </div>

              {/* LIVE DATA: ZBE cities table */}
              <section id="datos-en-vivo" className="my-10">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Ciudades con ZBE — Datos en vivo
                </h2>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-950 text-left">
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Ciudad</th>
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Desde</th>
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Horario</th>
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right">Multa</th>
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 text-center">Sin etiqueta</th>
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 text-center">Etiqueta B</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {ZBE_CITIES.map((city) => (
                          <tr key={city.slug} className="hover:bg-gray-50 dark:hover:bg-gray-950">
                            <td className="px-4 py-3">
                              <Link
                                href={`/zbe/${city.slug}`}
                                className="font-semibold text-tl-600 dark:text-tl-400 hover:underline"
                              >
                                {city.name}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-data">{city.since}</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{city.schedule}</td>
                            <td className="px-4 py-3 text-right font-data font-semibold text-tl-amber-700 dark:text-tl-amber-300">
                              {city.fine} euros
                            </td>
                            <td className="px-4 py-3 text-center">
                              <XCircle className="w-4 h-4 text-red-500 inline" />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <MinusCircle className="w-4 h-4 text-amber-500 inline" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {zones.length > 0 && (
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-950 text-xs text-gray-400">
                      {zones.length} zonas registradas en la base de datos. Fuente: Ayuntamientos, DGT.
                    </div>
                  )}
                </div>
              </section>

              <div className="prose prose-lg dark:prose-invert max-w-none">
                <h2 id="como-funcionan">Como funcionan las ZBE</h2>
                <p>
                  El funcionamiento de una ZBE en Espana sigue un patron comun, aunque cada
                  ciudad puede tener particularidades:
                </p>
                <ol>
                  <li>
                    <strong>Delimitacion:</strong> El ayuntamiento define el perimetro de la ZBE,
                    generalmente el centro historico o las areas con mayor contaminacion. Se
                    senaliza con carteles normalizados que indican la entrada y salida de la zona.
                  </li>
                  <li>
                    <strong>Criterio de acceso:</strong> Se utiliza el distintivo ambiental de la
                    DGT como criterio. Los vehiculos sin etiqueta estan prohibidos; los de etiqueta
                    B tienen acceso restringido; los de C, ECO y 0 pueden circular libremente.
                  </li>
                  <li>
                    <strong>Control:</strong> Se instalan camaras de lectura automatica de
                    matriculas (LPR/ANPR) en los accesos a la ZBE. El sistema cruza la matricula
                    con la base de datos de la DGT para verificar la etiqueta ambiental del vehiculo.
                  </li>
                  <li>
                    <strong>Sancion:</strong> Si un vehiculo no autorizado accede a la ZBE, se
                    genera automaticamente una denuncia. La multa estandar es de 200 euros,
                    reducible al 50% por pago voluntario en 20 dias.
                  </li>
                </ol>

                <h2 id="etiquetas">Etiquetas ambientales y restricciones</h2>
                <p>
                  El acceso a las ZBE depende directamente del distintivo ambiental DGT que
                  tenga tu vehiculo. Existen cinco categorias:
                </p>
              </div>

              {/* Label access table */}
              <div className="my-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                <div className="space-y-3">
                  {[
                    { label: "0 Emisiones", color: "bg-teal-100 dark:bg-teal-900/20 border-teal-300", access: "Libre en todas las ZBE", icon: <CheckCircle className="w-4 h-4 text-teal-600" /> },
                    { label: "ECO", color: "bg-green-100 dark:bg-green-900/20 border-green-300", access: "Libre en todas las ZBE", icon: <CheckCircle className="w-4 h-4 text-green-600" /> },
                    { label: "C", color: "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300", access: "Libre (restricciones en episodios de contaminacion)", icon: <CheckCircle className="w-4 h-4 text-yellow-600" /> },
                    { label: "B", color: "bg-amber-100 dark:bg-amber-900/20 border-amber-300", access: "Restringido segun horario y ciudad", icon: <MinusCircle className="w-4 h-4 text-amber-600" /> },
                    { label: "Sin etiqueta", color: "bg-red-100 dark:bg-red-900/20 border-red-300", access: "Prohibido en todas las ZBE activas", icon: <XCircle className="w-4 h-4 text-red-600" /> },
                  ].map((item) => (
                    <div key={item.label} className={`flex items-center gap-3 p-3 rounded-lg border ${item.color}`}>
                      {item.icon}
                      <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 w-28">{item.label}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.access}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="prose prose-lg dark:prose-invert max-w-none">
                <div className="not-prose my-6">
                  <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800/50 rounded-xl p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-tl-600 dark:text-tl-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-tl-800 dark:text-tl-300 text-sm">Consulta tu etiqueta</p>
                      <p className="text-sm text-tl-700 dark:text-tl-400">
                        Si no sabes que etiqueta tiene tu vehiculo, consulta nuestra{" "}
                        <Link href="/guias/etiqueta-ambiental" className="underline">guia de etiquetas ambientales</Link>{" "}
                        o visita la web de la DGT para comprobarlo con tu matricula.
                      </p>
                    </div>
                  </div>
                </div>

                <h2 id="exenciones">Exenciones y permisos especiales</h2>
                <p>
                  Todas las ZBE espanolas contemplan exenciones para determinados vehiculos y
                  situaciones. Aunque cada ciudad puede tener reglas propias, las exenciones
                  mas comunes son:
                </p>
                <ul>
                  <li><strong>Vehiculos de emergencia:</strong> Ambulancias, bomberos, policia.</li>
                  <li><strong>Personas con movilidad reducida (PMR):</strong> Vehiculos con tarjeta de estacionamiento para personas con discapacidad.</li>
                  <li><strong>Residentes:</strong> Muchas ZBE permiten el acceso a vehiculos de residentes empadronados dentro de la zona, aunque con restricciones horarias.</li>
                  <li><strong>Transporte publico:</strong> Autobuses urbanos, taxis y VTC.</li>
                  <li><strong>Vehiculos profesionales:</strong> Servicios esenciales como recogida de residuos, mudanzas (con permiso), carga y descarga en horarios autorizados.</li>
                  <li><strong>Vehiculos historicos:</strong> En algunas ciudades, vehiculos con catalogacion de vehiculo historico pueden obtener un permiso temporal.</li>
                </ul>
                <p>
                  Para solicitar una exencion o permiso temporal, generalmente hay que tramitarlo
                  a traves de la sede electronica del ayuntamiento correspondiente.
                </p>

                <h2 id="multas">Multas y sanciones</h2>
                <p>
                  La sancion estandar por acceder a una ZBE sin autorizacion es de <strong>200
                  euros</strong> en la mayoria de ciudades espanolas. Sin embargo, hay matices:
                </p>
                <ul>
                  <li>
                    <strong>Pago voluntario:</strong> Si pagas en los primeros 20 dias, la multa
                    se reduce al 50% (100 euros).
                  </li>
                  <li>
                    <strong>Reincidencia:</strong> En Madrid, las infracciones reiteradas pueden
                    elevarse hasta 2.000 euros.
                  </li>
                  <li>
                    <strong>No retira puntos:</strong> Las infracciones ZBE son sanciones
                    municipales de trafico, no retiran puntos del carnet de conducir.
                  </li>
                  <li>
                    <strong>Deteccion automatica:</strong> El control es mediante camaras LPR,
                    por lo que la multa se genera automaticamente al acceder sin autorizacion.
                  </li>
                </ul>

                <h2 id="futuro">El futuro de las ZBE en Espana</h2>
                <p>
                  Las ZBE son solo el primer paso en una transicion hacia ciudades con menos
                  trafico motorizado. Se esperan las siguientes evoluciones:
                </p>
                <ul>
                  <li>
                    <strong>Expansion a mas municipios:</strong> La ley obliga a mas de 150
                    municipios a tener ZBE. Muchos siguen en fase de desarrollo. En los proximos
                    anos se esperan decenas de nuevas ZBE, especialmente en ciudades medianas
                    (Murcia, Alicante, Gijon, Hospitalet, etc.).
                  </li>
                  <li>
                    <strong>Restricciones mas estrictas:</strong> Es previsible que las ZBE
                    existentes vayan endureciendo los criterios: prohibir la etiqueta B
                    (no solo restringirla) y eventualmente la etiqueta C en las ciudades mas
                    grandes.
                  </li>
                  <li>
                    <strong>Peajes urbanos:</strong> Siguiendo el modelo de Londres (Congestion
                    Charge) o Estocolmo, algunas ciudades estan estudiando la posibilidad de
                    cobrar una tasa por circular por el centro, independientemente de la etiqueta
                    ambiental.
                  </li>
                  <li>
                    <strong>Integracion con transporte publico:</strong> Las ZBE se estan
                    disenando junto con mejoras del transporte publico, creacion de carriles
                    bici y expansion de infraestructura de recarga electrica.
                  </li>
                </ul>
              </div>

              {/* CTA */}
              <div className="mt-10 mb-8">
                <Link
                  href="/zbe"
                  className="flex items-center justify-between bg-green-600 hover:bg-green-700 text-white rounded-xl p-5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Leaf className="w-7 h-7" />
                    <div>
                      <p className="font-semibold">Ver todas las ZBE de Espana</p>
                      <p className="text-sm text-green-200">Restricciones, horarios y multas por ciudad</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>

              <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500">
                <p>
                  Fuentes: Ley 7/2021 de Cambio Climatico; Real Decreto 1052/2022;
                  Ayuntamientos de Madrid, Barcelona, Valencia, Sevilla; DGT.
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
                    href="/guias/etiqueta-ambiental"
                    className="flex items-center gap-2 text-sm font-semibold text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:hover:text-tl-300"
                  >
                    <Tag className="w-4 h-4" />
                    Guia de etiquetas DGT
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
