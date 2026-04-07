import { Metadata } from "next";
import Link from "next/link";
import {
  Gauge,
  Clock,
  ChevronRight,
  Shield,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildPageMetadata } from "@/lib/seo/metadata";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = buildPageMetadata({
  title: "Limites de Velocidad en Espana 2026 — Guia Completa por Tipo de Via",
  description:
    "Guia completa de limites de velocidad en Espana: por tipo de via, vehiculo y condiciones. Sanciones, puntos del carnet y limites especiales en zonas 30, obras y lluvia.",
  path: "/guias/limites-velocidad-espana",
  keywords: [
    "limites velocidad espana",
    "velocidad maxima autopista",
    "velocidad maxima autovia",
    "velocidad zona urbana",
    "multa exceso velocidad",
    "puntos carnet velocidad",
    "velocidad lluvia espana",
    "zona 30 velocidad",
  ],
  ogType: "article",
});

export const revalidate = 3600;

const TOC_ITEMS = [
  { id: "limites-generales", label: "Limites generales" },
  { id: "por-tipo-via", label: "Por tipo de via" },
  { id: "por-vehiculo", label: "Por tipo de vehiculo" },
  { id: "condiciones-especiales", label: "Condiciones especiales" },
  { id: "datos-en-vivo", label: "Limites variables (datos)" },
  { id: "zona-30", label: "Zonas 30" },
  { id: "sanciones", label: "Sanciones y puntos" },
  { id: "minima", label: "Velocidad minima" },
  { id: "consejos", label: "Consejos practicos" },
];

export default async function GuiaLimitesVelocidadPage() {
  const [totalLimits, variableLimits, byType] = await Promise.all([
    prisma.speedLimit.count(),
    prisma.speedLimit.count({ where: { speedLimitType: "VARIABLE" } }),
    prisma.speedLimit.groupBy({
      by: ["speedLimitType"],
      _count: true,
      orderBy: { _count: { speedLimitType: "desc" } },
    }),
  ]);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Limites de Velocidad en Espana 2026 — Guia Completa",
    description: "Guia completa de limites de velocidad en Espana por tipo de via, vehiculo y condiciones.",
    url: `${BASE_URL}/guias/limites-velocidad-espana`,
    datePublished: "2026-04-06",
    dateModified: new Date().toISOString(),
    author: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    mainEntityOfPage: `${BASE_URL}/guias/limites-velocidad-espana`,
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
              { name: "Limites de Velocidad", href: "/guias/limites-velocidad-espana" },
            ]}
          />

          <div className="lg:grid lg:grid-cols-[1fr_240px] lg:gap-8">
            <article>
              <header className="mb-8">
                <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 mb-2">
                  <Gauge className="w-4 h-4" />
                  <span>Guia de trafico</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Limites de Velocidad en Espana: Guia Completa 2026
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  Todos los limites de velocidad por tipo de via y vehiculo, condiciones
                  especiales (lluvia, obras, zonas 30), sanciones y puntos del carnet.
                </p>
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    10 min de lectura
                  </span>
                  <span>Actualizado: abril 2026</span>
                </div>
              </header>

              <div className="prose prose-lg dark:prose-invert max-w-none">
                <h2 id="limites-generales">Limites de velocidad generales en Espana</h2>
                <p>
                  Los limites de velocidad en Espana estan regulados por el Reglamento General
                  de Circulacion (Real Decreto 1428/2003) y la Ley de Trafico. Definen la
                  velocidad maxima permitida en funcion del tipo de via, el tipo de vehiculo
                  y las condiciones de circulacion. Respetar estos limites es fundamental para
                  la seguridad vial: el exceso de velocidad es el factor concurrente en mas
                  del 30% de los accidentes mortales en carretera.
                </p>

                <h2 id="por-tipo-via">Limites por tipo de via</h2>
              </div>

              {/* Speed limits table */}
              <div className="my-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-950">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Tipo de via</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Turismos</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Camiones</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Con lluvia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">Autopista / Autovia</td>
                      <td className="px-4 py-3 text-center font-data font-bold text-gray-900 dark:text-gray-100">120 km/h</td>
                      <td className="px-4 py-3 text-center font-data text-gray-600 dark:text-gray-400">90 km/h</td>
                      <td className="px-4 py-3 text-center font-data text-tl-600 dark:text-tl-400">110 km/h</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">Carretera convencional (1 carril/sentido)</td>
                      <td className="px-4 py-3 text-center font-data font-bold text-gray-900 dark:text-gray-100">90 km/h</td>
                      <td className="px-4 py-3 text-center font-data text-gray-600 dark:text-gray-400">80 km/h</td>
                      <td className="px-4 py-3 text-center font-data text-tl-600 dark:text-tl-400">80 km/h</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">Carretera convencional (2+ carriles/sentido)</td>
                      <td className="px-4 py-3 text-center font-data font-bold text-gray-900 dark:text-gray-100">100 km/h</td>
                      <td className="px-4 py-3 text-center font-data text-gray-600 dark:text-gray-400">90 km/h</td>
                      <td className="px-4 py-3 text-center font-data text-tl-600 dark:text-tl-400">90 km/h</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">Via urbana (ciudad)</td>
                      <td className="px-4 py-3 text-center font-data font-bold text-gray-900 dark:text-gray-100">50 km/h</td>
                      <td className="px-4 py-3 text-center font-data text-gray-600 dark:text-gray-400">50 km/h</td>
                      <td className="px-4 py-3 text-center font-data text-tl-600 dark:text-tl-400">50 km/h</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">Via urbana (1 carril/sentido)</td>
                      <td className="px-4 py-3 text-center font-data font-bold text-gray-900 dark:text-gray-100">30 km/h</td>
                      <td className="px-4 py-3 text-center font-data text-gray-600 dark:text-gray-400">30 km/h</td>
                      <td className="px-4 py-3 text-center font-data text-tl-600 dark:text-tl-400">30 km/h</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">Via residencial / peatonal</td>
                      <td className="px-4 py-3 text-center font-data font-bold text-gray-900 dark:text-gray-100">20 km/h</td>
                      <td className="px-4 py-3 text-center font-data text-gray-600 dark:text-gray-400">20 km/h</td>
                      <td className="px-4 py-3 text-center font-data text-tl-600 dark:text-tl-400">20 km/h</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="prose prose-lg dark:prose-invert max-w-none">
                <h2 id="por-vehiculo">Limites por tipo de vehiculo</h2>
                <p>
                  No todos los vehiculos tienen el mismo limite de velocidad en la misma via.
                  Los vehiculos mas pesados o con remolque tienen limites reducidos:
                </p>
                <ul>
                  <li><strong>Turismos y motocicletas:</strong> 120 km/h en autopista/autovia.</li>
                  <li><strong>Autobuses:</strong> 100 km/h en autopista/autovia.</li>
                  <li><strong>Camiones (+ 3.500 kg):</strong> 90 km/h en autopista/autovia, 80 km/h en carretera convencional.</li>
                  <li><strong>Vehiculos con remolque:</strong> Limite reducido en 10 km/h respecto al turismo (maximo 80 km/h en convencional).</li>
                  <li><strong>Vehiculos de transporte de mercancias peligrosas:</strong> 70 km/h en autopista, 60 km/h en convencional.</li>
                  <li><strong>Ciclomotores:</strong> 45 km/h (no pueden circular por autopista ni autovia).</li>
                </ul>

                <h2 id="condiciones-especiales">Condiciones especiales</h2>
                <h3>Lluvia, niebla o nieve</h3>
                <p>
                  Cuando las condiciones meteorologicas reducen la visibilidad o la adherencia,
                  el Reglamento General de Circulacion establece que los limites genericos deben
                  reducirse. En la practica:
                </p>
                <ul>
                  <li><strong>Lluvia:</strong> Se recomienda reducir la velocidad en 10-20 km/h. En autopista, el limite efectivo se considera 110 km/h.</li>
                  <li><strong>Niebla densa:</strong> Circular a una velocidad que permita detener el vehiculo dentro de la distancia de visibilidad. En casos extremos, la DGT puede establecer limites temporales de 60-80 km/h.</li>
                  <li><strong>Nieve o hielo:</strong> Reducir significativamente la velocidad. Uso obligatorio de cadenas o neumaticos de invierno cuando se senalice.</li>
                </ul>
                <h3>Zonas de obras</h3>
                <p>
                  En zonas de obras, los limites se reducen temporalmente y se senalizan con
                  paneles naranjas. Los limites habituales en obras son 60-80 km/h en autopista
                  y 40-60 km/h en convencional. Los radares moviles son frecuentes en estas zonas.
                </p>
              </div>

              {/* LIVE DATA: Variable speed limits */}
              <section id="datos-en-vivo" className="my-10">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Limites de velocidad — Datos en vivo
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
                      {totalLimits.toLocaleString("es-ES")}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Segmentos con limite registrado</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 font-data">
                      {variableLimits.toLocaleString("es-ES")}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Limites variables (PMV)</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
                      {byType.length}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Tipos de limite</p>
                  </div>
                </div>
                {byType.length > 0 && (
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm uppercase tracking-wide">
                      Segmentos por tipo de limite
                    </h3>
                    {byType.map((t) => {
                      const labels: Record<string, string> = {
                        GENERAL: "General",
                        URBAN: "Urbano",
                        RESIDENTIAL: "Residencial (30 km/h)",
                        SCHOOL: "Zona escolar",
                        WORK_ZONE: "Zona de obras",
                        WEATHER: "Condicion meteorologica",
                        VARIABLE: "Variable (PMV)",
                        TUNNEL: "Tunel",
                        BRIDGE: "Puente",
                      };
                      return (
                        <div
                          key={t.speedLimitType}
                          className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                        >
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {labels[t.speedLimitType] ?? t.speedLimitType}
                          </span>
                          <span className="text-sm font-data font-semibold text-gray-900 dark:text-gray-100">
                            {t._count.toLocaleString("es-ES")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Fuente: DGT (formato ROSATTE/NAP). Datos actualizados automaticamente.
                </p>
              </section>

              <div className="prose prose-lg dark:prose-invert max-w-none">
                <h2 id="zona-30">Zonas 30 en ciudades</h2>
                <p>
                  Desde mayo de 2021, el Real Decreto 970/2020 establecio que <strong>todas
                  las calles de un unico carril por sentido en ciudades tienen un limite de
                  30 km/h</strong>. Esta medida, conocida como "Ciudad 30", afecta al 70-80%
                  de las calles urbanas en Espana.
                </p>
                <p>
                  El objetivo es reducir la siniestralidad urbana. A 30 km/h, la probabilidad
                  de muerte de un peaton atropellado es del 10%, frente al 90% a 50 km/h.
                  La medida tambien reduce el ruido y la contaminacion en los nucleos urbanos.
                </p>
                <p>
                  Excepciones: las calles de dos o mas carriles por sentido mantienen el limite
                  de 50 km/h. Las vias de acceso y rondas de circunvalacion pueden tener limites
                  superiores (60-80 km/h) si estan adecuadamente senalizadas.
                </p>

                <h2 id="sanciones">Sanciones por exceso de velocidad</h2>
                <p>
                  Las multas por exceso de velocidad en Espana se gradan segun la superacion
                  del limite:
                </p>
                <div className="not-prose my-6">
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-950">
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Exceso</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Multa</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Puntos</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Tipo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        <tr>
                          <td className="px-4 py-2">1-20 km/h</td>
                          <td className="px-4 py-2 text-right font-data text-tl-amber-700 dark:text-tl-amber-300">100 euros</td>
                          <td className="px-4 py-2 text-right font-data">0</td>
                          <td className="px-4 py-2 text-gray-500">Leve</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">21-30 km/h</td>
                          <td className="px-4 py-2 text-right font-data text-tl-amber-700 dark:text-tl-amber-300">300 euros</td>
                          <td className="px-4 py-2 text-right font-data">2</td>
                          <td className="px-4 py-2 text-gray-500">Grave</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">31-40 km/h</td>
                          <td className="px-4 py-2 text-right font-data text-tl-amber-700 dark:text-tl-amber-300">400 euros</td>
                          <td className="px-4 py-2 text-right font-data">4</td>
                          <td className="px-4 py-2 text-gray-500">Grave</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">41-50 km/h</td>
                          <td className="px-4 py-2 text-right font-data text-tl-amber-700 dark:text-tl-amber-300">500 euros</td>
                          <td className="px-4 py-2 text-right font-data">6</td>
                          <td className="px-4 py-2 text-gray-500">Muy grave</td>
                        </tr>
                        <tr className="bg-red-50 dark:bg-red-900/10">
                          <td className="px-4 py-2 text-red-800 dark:text-red-300 font-semibold">+80 km/h</td>
                          <td className="px-4 py-2 text-right font-data text-red-700 dark:text-red-400">Penal</td>
                          <td className="px-4 py-2 text-right font-data text-red-700 dark:text-red-400">6</td>
                          <td className="px-4 py-2 text-red-700 dark:text-red-400">Delito</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <h2 id="minima">Velocidad minima</h2>
                <p>
                  Ademas de los limites maximos, en Espana tambien existe una <strong>velocidad
                  minima</strong>. Como regla general, ningun vehiculo puede circular por
                  autopista o autovia a menos de la mitad de la velocidad maxima permitida en
                  esa via. En una autopista a 120 km/h, la velocidad minima es 60 km/h.
                </p>
                <p>
                  Circular por debajo de la velocidad minima sin causa justificada es una
                  infraccion que puede ser sancionada con multa de 200 euros. Las excepciones
                  incluyen situaciones de trafico denso, condiciones meteorologicas adversas
                  o vehiculos especiales con autorizacion.
                </p>

                <h2 id="consejos">Consejos practicos</h2>
                <ol>
                  <li>
                    <strong>Usa el control de crucero:</strong> Mantener una velocidad constante
                    con control de crucero evita infracciones involuntarias y reduce el consumo.
                  </li>
                  <li>
                    <strong>Atencion a las zonas de obras:</strong> Los limites temporales en
                    obras son obligatorios aunque no veas operarios. Los radares moviles son
                    habituales en estos tramos.
                  </li>
                  <li>
                    <strong>30 km/h en ciudad:</strong> Recuerda que la mayoria de calles
                    urbanas con un carril por sentido estan limitadas a 30 km/h desde 2021.
                  </li>
                  <li>
                    <strong>Reduce con lluvia:</strong> Aunque no hay un limite formal reducido
                    para lluvia, la DGT recomienda reducir entre 10 y 20 km/h. A efectos de
                    responsabilidad en caso de accidente, circular a 120 km/h bajo lluvia
                    puede considerarse velocidad inadecuada.
                  </li>
                  <li>
                    <strong>Consulta los paneles variables (PMV):</strong> En autopistas con
                    paneles de mensaje variable, el limite mostrado en el panel prevalece sobre
                    la senalizacion fija. Estos paneles se activan por trafico, obras, meteorologia
                    o accidentes.
                  </li>
                </ol>
              </div>

              {/* CTA */}
              <div className="mt-10 mb-8">
                <Link
                  href="/guias/radares-espana"
                  className="flex items-center justify-between bg-orange-500 hover:bg-orange-600 text-white rounded-xl p-5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-7 h-7" />
                    <div>
                      <p className="font-semibold">Guia de radares en Espana</p>
                      <p className="text-sm text-orange-100">Tipos, margenes de tolerancia y multas</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>

              <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500">
                <p>
                  Fuentes: Reglamento General de Circulacion (RD 1428/2003); Real Decreto
                  970/2020 (Ciudad 30); DGT. Datos de limites actualizados automaticamente.
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
                    href="/guias/radares-espana"
                    className="flex items-center gap-2 text-sm font-semibold text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:hover:text-tl-300"
                  >
                    <Gauge className="w-4 h-4" />
                    Guia de radares
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
