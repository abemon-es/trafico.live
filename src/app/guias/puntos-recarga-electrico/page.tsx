import { Metadata } from "next";
import Link from "next/link";
import {
  Zap,
  Clock,
  ChevronRight,
  PlugZap,
  Euro,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PROVINCE_NAMES } from "@/lib/geo/ine-codes";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = buildPageMetadata({
  title: "Puntos de Recarga para Coches Electricos en Espana — Guia Completa 2026",
  description:
    "Guia completa de puntos de recarga para vehiculos electricos en Espana: tipos de conectores, redes de carga, aplicaciones, precios y mapa con todos los cargadores.",
  path: "/guias/puntos-recarga-electrico",
  keywords: [
    "puntos de recarga coche electrico",
    "cargadores electricos espana",
    "tipos conectores electricos",
    "CCS CHAdeMO tipo 2",
    "redes recarga espana",
    "precio recarga electrico",
    "mapa cargadores electricos",
    "electrolineras espana",
  ],
  ogType: "article",
});

export const revalidate = 3600;

const TOC_ITEMS = [
  { id: "como-funciona", label: "Como funciona la recarga" },
  { id: "tipos-cargadores", label: "Tipos de cargadores" },
  { id: "conectores", label: "Tipos de conectores" },
  { id: "datos-en-vivo", label: "Cargadores en Espana (datos)" },
  { id: "redes", label: "Redes de recarga" },
  { id: "apps", label: "Apps para encontrar cargadores" },
  { id: "precios", label: "Cuanto cuesta recargar" },
  { id: "recarga-casa", label: "Recarga en casa" },
  { id: "consejos", label: "Consejos para viajes largos" },
];

const CHARGER_TYPE_LABELS: Record<string, string> = {
  AC_TYPE1: "AC Tipo 1",
  AC_TYPE2: "AC Tipo 2",
  DC_CHADEMO: "DC CHAdeMO",
  DC_CCS: "DC CCS",
  DC_CCS2: "DC CCS2",
  TESLA: "Tesla",
  SCHUKO: "Schuko",
  OTHER: "Otro",
};

export default async function GuiaPuntosRecargaPage() {
  const [totalCount, byProvince, byNetwork, publicCount, is24hCount] =
    await Promise.all([
      prisma.eVCharger.count(),
      prisma.eVCharger.groupBy({
        by: ["province"],
        where: { province: { not: null } },
        _count: true,
        orderBy: { _count: { province: "desc" } },
        take: 10,
      }),
      prisma.eVCharger.groupBy({
        by: ["network"],
        where: { network: { not: null } },
        _count: true,
        orderBy: { _count: { network: "desc" } },
        take: 10,
      }),
      prisma.eVCharger.count({ where: { isPublic: true } }),
      prisma.eVCharger.count({ where: { is24h: true } }),
    ]);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Puntos de Recarga para Coches Electricos en Espana — Guia Completa 2026",
    description:
      "Guia completa de puntos de recarga EV en Espana con datos en vivo.",
    url: `${BASE_URL}/guias/puntos-recarga-electrico`,
    datePublished: "2026-04-06",
    dateModified: new Date().toISOString(),
    author: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    mainEntityOfPage: `${BASE_URL}/guias/puntos-recarga-electrico`,
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
              { name: "Puntos de Recarga Electrico", href: "/guias/puntos-recarga-electrico" },
            ]}
          />

          <div className="lg:grid lg:grid-cols-[1fr_240px] lg:gap-8">
            <article>
              <header className="mb-8">
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 mb-2">
                  <Zap className="w-4 h-4" />
                  <span>Guia de movilidad electrica</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Puntos de Recarga Electrico: Guia Completa 2026
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  Todo sobre la recarga de vehiculos electricos en Espana: tipos de conectores,
                  redes de carga, precios, aplicaciones y un mapa con todos los puntos disponibles.
                </p>
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    13 min de lectura
                  </span>
                  <span>Actualizado: abril 2026</span>
                </div>
              </header>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
                    {totalCount.toLocaleString("es-ES")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Puntos de recarga</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
                    {publicCount.toLocaleString("es-ES")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Acceso publico</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
                    {is24hCount.toLocaleString("es-ES")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Disponibles 24h</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
                    {byNetwork.length}+
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Redes de carga</p>
                </div>
              </div>

              <div className="prose prose-lg dark:prose-invert max-w-none">
                <h2 id="como-funciona">Como funciona la recarga de un coche electrico</h2>
                <p>
                  Recargar un vehiculo electrico es conceptualmente sencillo: conectas un cable
                  entre el coche y un punto de carga, y la electricidad fluye hasta la bateria.
                  En la practica, hay varios factores que determinan la velocidad de carga,
                  el coste y la experiencia del usuario: el tipo de corriente (alterna AC o
                  continua DC), la potencia del cargador, el tipo de conector y la capacidad
                  de carga del propio vehiculo.
                </p>
                <p>
                  En Espana, la infraestructura de recarga publica ha crecido exponencialmente
                  en los ultimos anos. En 2026, el pais cuenta con mas de{" "}
                  <strong>{totalCount.toLocaleString("es-ES")} puntos de recarga</strong> registrados,
                  de los cuales {publicCount.toLocaleString("es-ES")} son de acceso publico.
                  La mayor concentracion se da en las grandes ciudades (Madrid, Barcelona, Valencia)
                  y en los principales corredores de autopistas.
                </p>

                <h2 id="tipos-cargadores">Tipos de cargadores</h2>
                <p>
                  Los puntos de recarga se clasifican por su potencia, que determina la
                  velocidad de carga:
                </p>
                <h3>Carga lenta (AC, 3,7–7,4 kW)</h3>
                <p>
                  Es la carga domestica habitual, mediante un enchufe Schuko o un wallbox
                  basico. Tarda entre 8 y 20 horas en cargar completamente un vehiculo. Ideal
                  para cargar en casa durante la noche o en plazas de garaje con wallbox.
                </p>
                <h3>Carga semi-rapida (AC, 11–22 kW)</h3>
                <p>
                  Disponible en muchos puntos publicos urbanos, centros comerciales y
                  aparcamientos. Carga un vehiculo en 2-6 horas. Utiliza conector Tipo 2
                  (Mennekes). Es el tipo mas comun en puntos de carga publicos urbanos.
                </p>
                <h3>Carga rapida (DC, 50 kW)</h3>
                <p>
                  Cargadores de corriente continua que pueden cargar del 10% al 80% en
                  30-60 minutos. Utilizan conectores CCS2 o CHAdeMO. Se encuentran en
                  estaciones de servicio, areas de descanso de autopistas y electrolineras.
                </p>
                <h3>Carga ultra-rapida (DC, 150–350 kW)</h3>
                <p>
                  La generacion mas reciente de cargadores. Pueden cargar del 10% al 80% en
                  15-25 minutos en vehiculos compatibles. Solo usan conector CCS2. Se estan
                  desplegando rapidamente en los principales corredores de autopistas por
                  operadores como Ionity, Tesla Supercharger y Repsol Waylet.
                </p>

                <h2 id="conectores">Tipos de conectores</h2>
                <ul>
                  <li>
                    <strong>Tipo 2 (Mennekes):</strong> El estandar europeo para carga AC.
                    Todos los vehiculos electricos vendidos en Europa lo soportan. Hasta 22 kW
                    en monofasico/trifasico.
                  </li>
                  <li>
                    <strong>CCS2 (Combined Charging System):</strong> El estandar europeo para
                    carga DC rapida. Combina el conector Tipo 2 con dos pines adicionales de
                    corriente continua. Soporta hasta 350 kW. Es el conector dominante en 2026.
                  </li>
                  <li>
                    <strong>CHAdeMO:</strong> Estandar japones de carga DC rapida (hasta 62,5 kW).
                    Usado principalmente por Nissan (Leaf) y algunos Mitsubishi. En declive en
                    Europa, ya que la mayoria de fabricantes han migrado a CCS2.
                  </li>
                  <li>
                    <strong>Tesla (NACS/propietario):</strong> Tesla utiliza su propio conector
                    en los Supercharger, aunque en Europa los Tesla usan CCS2 de fabrica.
                    Los Supercharger europeos tambien tienen CCS2.
                  </li>
                  <li>
                    <strong>Schuko:</strong> El enchufe domestico europeo comun. Solo para
                    emergencias o carga muy lenta (2,3 kW). No recomendado para uso regular
                    ya que puede sobrecalentar la instalacion.
                  </li>
                </ul>
              </div>

              {/* LIVE DATA */}
              <section id="datos-en-vivo" className="my-10">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Puntos de recarga en Espana — Datos en vivo
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Top provinces */}
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm uppercase tracking-wide">
                      Top 10 provincias por cargadores
                    </h3>
                    {byProvince.map((p, i) => (
                      <div
                        key={p.province}
                        className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-5 text-right font-data">{i + 1}</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {(p.province && PROVINCE_NAMES[p.province]) ?? p.province}
                          </span>
                        </div>
                        <span className="text-sm font-data font-semibold text-gray-900 dark:text-gray-100">
                          {p._count.toLocaleString("es-ES")}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Top networks */}
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm uppercase tracking-wide">
                      Principales redes de carga
                    </h3>
                    {byNetwork.map((n, i) => (
                      <div
                        key={n.network}
                        className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-5 text-right font-data">{i + 1}</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{n.network}</span>
                        </div>
                        <span className="text-sm font-data font-semibold text-gray-900 dark:text-gray-100">
                          {n._count.toLocaleString("es-ES")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Fuente: MINETUR, operadores de recarga. Datos actualizados automaticamente.
                </p>
              </section>

              <div className="prose prose-lg dark:prose-invert max-w-none">
                <h2 id="redes">Principales redes de recarga en Espana</h2>
                <p>
                  Espana cuenta con multiples operadores de puntos de recarga. Los mas
                  relevantes en 2026:
                </p>
                <ul>
                  <li><strong>Iberdrola:</strong> Una de las redes mas extensas, con puntos en centros comerciales, hoteles y corredores de autopistas. App: Iberdrola Recarga.</li>
                  <li><strong>Endesa X:</strong> Red extensa con cargadores rapidos en estaciones de servicio y puntos urbanos. App: JuicePass.</li>
                  <li><strong>Repsol Waylet:</strong> Cargadores en estaciones de servicio Repsol. Incluye ultra-rapidos (hasta 400 kW) en los principales corredores.</li>
                  <li><strong>Tesla Supercharger:</strong> La red mas densa de carga ultra-rapida, ahora abierta a vehiculos no-Tesla con conector CCS2 en muchas ubicaciones.</li>
                  <li><strong>Ionity:</strong> Red europea de ultra-rapidos (hasta 350 kW) en autopistas. Respaldada por BMW, Ford, Hyundai, Mercedes y Volkswagen.</li>
                  <li><strong>Wenea:</strong> Especializada en cargadores lentos y semi-rapidos en parkings y centros urbanos.</li>
                  <li><strong>Zunder:</strong> Operador espanol con hubs de carga rapida en corredores de autopistas.</li>
                </ul>

                <h2 id="apps">Apps para encontrar cargadores</h2>
                <ul>
                  <li><strong>Electromaps:</strong> La app mas popular en Espana. Mapa colaborativo con opiniones de usuarios, disponibilidad y estado de cada punto.</li>
                  <li><strong>ABRP (A Better Route Planner):</strong> Planificador de rutas especifico para vehiculos electricos. Calcula las paradas de carga optimas segun tu modelo de coche, estado de la bateria y ruta.</li>
                  <li><strong>PlugShare:</strong> Mapa global de cargadores con informacion de disponibilidad y comentarios.</li>
                  <li><strong>Google Maps:</strong> Muestra puntos de recarga con filtros por tipo de conector y velocidad.</li>
                  <li><strong>Apps de operadores:</strong> Iberdrola Recarga, JuicePass (Endesa), Repsol Waylet, Tesla, etc. Necesarias para iniciar la carga en sus redes.</li>
                </ul>

                <h2 id="precios">Cuanto cuesta recargar un coche electrico</h2>
                <p>
                  El coste de recarga varia enormemente segun el tipo de carga, el operador
                  y si cargas en casa o en la via publica:
                </p>
                <h3>En casa (tarifa regulada)</h3>
                <p>
                  Cargando en horario nocturno con tarifa PVPC (tramo valle, 00:00-08:00),
                  el coste ronda los <strong>0,08-0,12 euros/kWh</strong>. Para un vehiculo medio
                  con consumo de 16 kWh/100 km, esto supone aproximadamente{" "}
                  <strong>1,30-1,90 euros por 100 km</strong>. Es la opcion mas economica con
                  diferencia.
                </p>
                <h3>Carga publica semi-rapida (AC 22 kW)</h3>
                <p>
                  Precios tipicos: <strong>0,30-0,45 euros/kWh</strong>. Coste por 100 km:{" "}
                  <strong>4,80-7,20 euros</strong>. Comparable al coste de un diesel eficiente.
                </p>
                <h3>Carga rapida (DC 50 kW)</h3>
                <p>
                  Precios tipicos: <strong>0,45-0,65 euros/kWh</strong>. Coste por 100 km:{" "}
                  <strong>7,20-10,40 euros</strong>. Mas caro, pero necesario en viajes largos.
                </p>
                <h3>Ultra-rapida (DC 150+ kW)</h3>
                <p>
                  Precios tipicos: <strong>0,55-0,79 euros/kWh</strong>. Algunos operadores
                  cobran por minuto en lugar de por kWh, lo que penaliza a vehiculos con
                  velocidad de carga mas baja.
                </p>

                <h2 id="recarga-casa">Recarga en casa: wallbox e instalacion</h2>
                <p>
                  La forma mas comoda y economica de cargar un vehiculo electrico es en casa.
                  Para ello necesitas un <strong>wallbox</strong> (cargador de pared) instalado
                  en tu plaza de garaje:
                </p>
                <ul>
                  <li><strong>Potencia:</strong> 7,4 kW (monofasico) o 11 kW (trifasico). Suficiente para cargar completamente en 4-8 horas nocturnas.</li>
                  <li><strong>Coste del wallbox:</strong> 400-1.200 euros segun marca y funcionalidades (WiFi, programacion, medidor integrado).</li>
                  <li><strong>Instalacion:</strong> 300-800 euros. Incluye cableado desde el cuadro electrico, protecciones y puesta a tierra. Debe realizarla un electricista autorizado.</li>
                  <li><strong>Ayudas Plan MOVES:</strong> El Plan MOVES subvenciona hasta el 70% del coste de instalacion del wallbox (maximo 600-1.000 euros).</li>
                </ul>

                <h2 id="consejos">Consejos para viajes largos con coche electrico</h2>
                <ol>
                  <li>
                    <strong>Planifica las paradas:</strong> Usa ABRP o Google Maps para planificar
                    las paradas de carga antes de salir. Verifica que los cargadores estan
                    operativos consultando las apps de los operadores.
                  </li>
                  <li>
                    <strong>Carga hasta el 80%:</strong> La velocidad de carga se reduce
                    drasticamente por encima del 80%. Es mas eficiente hacer dos paradas rapidas
                    (20→80%) que una larga (20→100%).
                  </li>
                  <li>
                    <strong>Pre-acondiciona la bateria:</strong> Muchos vehiculos permiten
                    programar el pre-acondicionamiento de la bateria antes de llegar al cargador.
                    Una bateria a temperatura optima carga significativamente mas rapido.
                  </li>
                  <li>
                    <strong>Lleva un cable Tipo 2:</strong> Siempre lleva un cable AC Tipo 2
                    en el maletero. Muchos puntos de carga semi-rapida no proporcionan cable.
                  </li>
                  <li>
                    <strong>Ten varias apps instaladas:</strong> No todos los cargadores son
                    compatibles con la misma app. Lleva instaladas al menos Electromaps,
                    la app de tu red preferida y una alternativa.
                  </li>
                </ol>
              </div>

              {/* CTAs */}
              <div className="mt-10 mb-8 space-y-3">
                <Link
                  href="/carga-ev"
                  className="flex items-center justify-between bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl p-5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Zap className="w-7 h-7" />
                    <div>
                      <p className="font-semibold">Mapa de puntos de recarga</p>
                      <p className="text-sm text-emerald-200">Todos los cargadores de Espana con filtros</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/cuanto-cuesta-cargar"
                  className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-tl-300 dark:hover:border-tl-700 rounded-xl p-5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Euro className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Calculadora de coste de recarga</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Compara precios por kWh y coste por 100 km</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              </div>

              <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500">
                <p>
                  Fuentes: MINETUR (Ministerio de Industria); CNMC; operadores de recarga;
                  IDAE (Plan MOVES). Datos de puntos de recarga actualizados diariamente.
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
                    href="/electrolineras"
                    className="flex items-center gap-2 text-sm font-semibold text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:hover:text-tl-300"
                  >
                    <PlugZap className="w-4 h-4" />
                    Electrolineras
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
