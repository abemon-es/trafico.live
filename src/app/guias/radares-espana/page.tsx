import { Metadata } from "next";
import Link from "next/link";
import {
  Radar,
  AlertTriangle,
  Clock,
  ChevronRight,
  Camera,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PROVINCE_NAMES } from "@/lib/geo/ine-codes";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = buildPageMetadata({
  title: "Radares en Espana 2026 — Guia Completa: Tipos, Multas y Margenes",
  description:
    "Todo sobre radares de velocidad en Espana: radares fijos, de tramo, moviles y semaforicos. Margenes de tolerancia, sistema de multas, puntos del carnet y como recurrir.",
  path: "/guias/radares-espana",
  keywords: [
    "radares fijos espana",
    "radares de tramo",
    "multas radar velocidad",
    "margen tolerancia radar",
    "radares DGT espana",
    "recurrir multa radar",
    "puntos carnet radar",
    "radares moviles espana",
  ],
  ogType: "article",
});

export const revalidate = 3600;

const RADAR_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  FIXED: {
    label: "Fijo",
    color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
  },
  SECTION: {
    label: "Tramo",
    color: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
  },
  MOBILE_ZONE: {
    label: "Zona movil",
    color: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200",
  },
  TRAFFIC_LIGHT: {
    label: "Semaforico",
    color: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
  },
};

const TOC_ITEMS = [
  { id: "tipos-radares", label: "Tipos de radares" },
  { id: "como-funcionan", label: "Como funcionan" },
  { id: "datos-en-vivo", label: "Radares en Espana (datos)" },
  { id: "margenes", label: "Margenes de tolerancia" },
  { id: "multas", label: "Sistema de multas" },
  { id: "puntos-carnet", label: "Puntos del carnet" },
  { id: "recurrir", label: "Como recurrir una multa" },
  { id: "consejos", label: "Consejos practicos" },
];

export default async function GuiaRadaresPage() {
  const [totalCount, byType, topRoads, topProvinces] = await Promise.all([
    prisma.radar.count({ where: { isActive: true } }),
    prisma.radar.groupBy({
      by: ["type"],
      where: { isActive: true },
      _count: true,
      orderBy: { _count: { type: "desc" } },
    }),
    prisma.radar.groupBy({
      by: ["roadNumber"],
      where: { isActive: true },
      _count: true,
      orderBy: { _count: { roadNumber: "desc" } },
      take: 10,
    }),
    prisma.radar.groupBy({
      by: ["province"],
      where: { isActive: true, province: { not: null } },
      _count: true,
      orderBy: { _count: { province: "desc" } },
      take: 10,
    }),
  ]);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Radares en Espana 2026 — Guia Completa",
    description:
      "Guia completa de radares de velocidad en Espana: tipos, multas, margenes de tolerancia y como recurrir.",
    url: `${BASE_URL}/guias/radares-espana`,
    datePublished: "2026-04-06",
    dateModified: new Date().toISOString(),
    author: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    mainEntityOfPage: `${BASE_URL}/guias/radares-espana`,
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
              { name: "Radares en Espana", href: "/guias/radares-espana" },
            ]}
          />

          <div className="lg:grid lg:grid-cols-[1fr_240px] lg:gap-8">
            <article>
              {/* Hero */}
              <header className="mb-8">
                <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400 mb-2">
                  <Radar className="w-4 h-4" />
                  <span>Guia de trafico</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Radares en Espana: Guia Completa 2026
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  Todo lo que necesitas saber sobre los radares de velocidad en las carreteras
                  espanolas: tipos, como funcionan, margenes de tolerancia, multas y como recurrir.
                </p>
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    14 min de lectura
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
                  <p className="text-xs text-gray-500 dark:text-gray-400">Radares activos</p>
                </div>
                {byType.slice(0, 3).map((item) => {
                  const info = RADAR_TYPE_LABELS[item.type] ?? { label: item.type, color: "" };
                  return (
                    <div key={item.type} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
                        {item._count.toLocaleString("es-ES")}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{info.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Prose content */}
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <h2 id="tipos-radares">Tipos de radares de velocidad</h2>
                <p>
                  La DGT (Direccion General de Trafico) utiliza cuatro tipos principales de
                  dispositivos de control de velocidad en las carreteras espanolas. Cada uno
                  funciona de forma diferente y es importante entender sus particularidades
                  para evitar infracciones.
                </p>

                <h3>Radares fijos</h3>
                <p>
                  Son los mas habituales. Estan instalados en puntos fijos de la via, generalmente
                  en postes laterales o porticos sobre la calzada. Miden la velocidad instantanea
                  del vehiculo en el punto exacto donde estan ubicados mediante tecnologia laser
                  o radar Doppler. Si superas el limite en ese instante, se registra la infraccion.
                </p>
                <p>
                  Los radares fijos estan senalizados obligatoriamente con un panel informativo
                  azul con el simbolo de una camara, situado a unos 200-300 metros antes del
                  dispositivo. Esto permite al conductor ajustar su velocidad.
                </p>

                <h3>Radares de tramo</h3>
                <p>
                  Los radares de tramo son el sistema mas temido por los conductores. En lugar
                  de medir la velocidad instantanea, calculan la <strong>velocidad media</strong> del
                  vehiculo entre dos puntos separados por varios kilometros. Una camara registra
                  la matricula a la entrada del tramo y otra a la salida. Si el tiempo transcurrido
                  implica una velocidad media superior al limite, se genera la infraccion.
                </p>
                <p>
                  La ventaja de este sistema es que es imposible de eludir simplemente frenando
                  ante la camara. Si has recorrido el tramo a velocidad excesiva, el sistema
                  lo detectara aunque reduzcas la velocidad justo antes de cada punto de control.
                </p>

                <h3>Radares moviles</h3>
                <p>
                  Los radares moviles (o zonas de control movil) son unidades portatiles que
                  la Guardia Civil o la Policia Local despliegan en ubicaciones variables.
                  Pueden estar en vehiculos camuflados estacionados en el arcen, en tripodes
                  junto a la via, o incluso en helicopteros (Pegasus) y drones.
                </p>
                <p>
                  La DGT publica periodicamente las zonas donde es mas probable encontrar radares
                  moviles, aunque las ubicaciones exactas cambian a diario.
                </p>

                <h3>Radares semaforicos</h3>
                <p>
                  Instalados en cruces regulados por semaforos, detectan vehiculos que pasan
                  en fase roja. Algunos modelos tambien controlan la velocidad. Utilizan
                  sensores inductivos en el asfalto o camaras de vision artificial. Son
                  especialmente frecuentes en grandes ciudades como Madrid, Barcelona y Valencia.
                </p>
              </div>

              {/* LIVE DATA: Radars by type */}
              <section id="datos-en-vivo" className="my-10">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Radares en Espana — Datos en vivo
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  {byType.map((item) => {
                    const info = RADAR_TYPE_LABELS[item.type] ?? { label: item.type, color: "" };
                    return (
                      <div
                        key={item.type}
                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4"
                      >
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${info.color}`}>
                          {info.label}
                        </span>
                        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 font-data mt-2">
                          {item._count.toLocaleString("es-ES")}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Top roads */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm uppercase tracking-wide">
                      Top 10 carreteras con mas radares
                    </h3>
                    {topRoads.map((r, i) => (
                      <div
                        key={r.roadNumber}
                        className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-5 text-right font-data">{i + 1}</span>
                          <Link
                            href={`/carreteras/${encodeURIComponent(r.roadNumber)}/radares`}
                            className="text-sm font-semibold text-tl-600 dark:text-tl-400 hover:underline"
                          >
                            {r.roadNumber}
                          </Link>
                        </div>
                        <span className="text-sm font-data font-semibold text-gray-900 dark:text-gray-100">
                          {r._count.toLocaleString("es-ES")}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Top provinces */}
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm uppercase tracking-wide">
                      Provincias con mas radares
                    </h3>
                    {topProvinces.map((p, i) => (
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
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Fuente: DGT. Datos actualizados automaticamente.
                </p>
              </section>

              <div className="prose prose-lg dark:prose-invert max-w-none">
                <h2 id="como-funcionan">Como funcionan los radares</h2>
                <p>
                  Los radares de velocidad utilizan diferentes tecnologias para medir la velocidad
                  de los vehiculos. Los mas comunes son:
                </p>
                <ul>
                  <li>
                    <strong>Radar Doppler:</strong> Emite una onda electromagnetica que rebota en
                    el vehiculo. La diferencia de frecuencia entre la onda emitida y la reflejada
                    permite calcular la velocidad. Es la tecnologia clasica de los radares fijos.
                  </li>
                  <li>
                    <strong>Laser (LIDAR):</strong> Emite pulsos de luz laser que miden la distancia
                    al vehiculo en intervalos muy cortos. Calculando el cambio de distancia en el
                    tiempo, obtiene la velocidad con gran precision. Se usa en radares moviles.
                  </li>
                  <li>
                    <strong>Camaras ANPR:</strong> Los radares de tramo utilizan camaras de
                    reconocimiento automatico de matriculas (ANPR). Registran la matricula y la
                    hora en dos puntos y calculan la velocidad media dividiendo la distancia por
                    el tiempo transcurrido.
                  </li>
                </ul>

                <h2 id="margenes">Margenes de tolerancia</h2>
                <p>
                  La DGT aplica un margen de tolerancia tecnica para compensar la imprecision
                  inherente a los instrumentos de medicion. Este margen <strong>no es un
                  permiso para exceder el limite</strong>, sino una correccion metrológica:
                </p>
                <ul>
                  <li>
                    <strong>Velocidades hasta 100 km/h:</strong> Margen de 7 km/h. Es decir,
                    en una via limitada a 50 km/h, el radar registra infraccion a partir de 57 km/h.
                  </li>
                  <li>
                    <strong>Velocidades superiores a 100 km/h:</strong> Margen del 7%. En una
                    autopista a 120 km/h, el umbral de infraccion es 128 km/h (120 x 1,07).
                  </li>
                </ul>
                <div className="not-prose my-6">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-800 dark:text-yellow-300 text-sm">Importante</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        Estos margenes son tecnicos, no legales. La infraccion se produce al superar
                        el limite senalizado, independientemente del margen. El margen simplemente
                        determina cuando el radar genera la denuncia.
                      </p>
                    </div>
                  </div>
                </div>

                <h2 id="multas">Sistema de multas por exceso de velocidad</h2>
                <p>
                  Las sanciones por exceso de velocidad en Espana se clasifican segun el grado
                  de superacion del limite. La cuantia de la multa y los puntos retirados
                  dependen de cuanto se haya excedido:
                </p>

                <div className="not-prose my-6">
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-950">
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Exceso sobre limite</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Multa</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Puntos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        <tr>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">Hasta 20 km/h</td>
                          <td className="px-4 py-3 text-right font-data font-semibold text-tl-amber-700 dark:text-tl-amber-300">100 euros</td>
                          <td className="px-4 py-3 text-right font-data text-gray-700 dark:text-gray-300">0</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">De 21 a 30 km/h</td>
                          <td className="px-4 py-3 text-right font-data font-semibold text-tl-amber-700 dark:text-tl-amber-300">300 euros</td>
                          <td className="px-4 py-3 text-right font-data text-gray-700 dark:text-gray-300">2</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">De 31 a 40 km/h</td>
                          <td className="px-4 py-3 text-right font-data font-semibold text-tl-amber-700 dark:text-tl-amber-300">400 euros</td>
                          <td className="px-4 py-3 text-right font-data text-gray-700 dark:text-gray-300">4</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">De 41 a 50 km/h</td>
                          <td className="px-4 py-3 text-right font-data font-semibold text-tl-amber-700 dark:text-tl-amber-300">500 euros</td>
                          <td className="px-4 py-3 text-right font-data text-gray-700 dark:text-gray-300">6</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">Mas de 50 km/h</td>
                          <td className="px-4 py-3 text-right font-data font-semibold text-red-700 dark:text-red-400">600 euros</td>
                          <td className="px-4 py-3 text-right font-data text-red-700 dark:text-red-400">6</td>
                        </tr>
                        <tr className="bg-red-50 dark:bg-red-900/10">
                          <td className="px-4 py-3 text-red-800 dark:text-red-300 font-semibold">Mas de 80 km/h (delito)</td>
                          <td className="px-4 py-3 text-right font-data font-semibold text-red-700 dark:text-red-400">Penal</td>
                          <td className="px-4 py-3 text-right font-data text-red-700 dark:text-red-400">6</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Pago voluntario en 20 dias: 50% de descuento en la multa (no en la retirada de puntos).
                  </p>
                </div>

                <h2 id="puntos-carnet">Puntos del carnet de conducir</h2>
                <p>
                  El carnet de conducir por puntos en Espana otorga 12 puntos iniciales (8 para
                  conductores noveles durante los 2 primeros anos). Cada infraccion de velocidad
                  puede retirar entre 2 y 6 puntos segun la gravedad. Perder todos los puntos
                  supone la perdida del permiso de conducir y la obligacion de realizar un
                  curso de sensibilizacion y reeducacion vial, ademas de superar un examen.
                </p>
                <p>
                  Los puntos se pueden recuperar parcialmente mediante cursos de conduccion
                  segura (2 puntos cada 2 anos, maximo una vez) o por no cometer infracciones:
                  tras 2 anos sin infracciones graves se recupera el saldo completo de 12 puntos.
                </p>

                <h2 id="recurrir">Como recurrir una multa de radar</h2>
                <p>
                  Si recibes una notificacion de denuncia por exceso de velocidad, tienes
                  derecho a presentar alegaciones. Los motivos mas habituales para recurrir son:
                </p>
                <ol>
                  <li>
                    <strong>Identificacion del conductor:</strong> Si no eras tu quien conducia,
                    puedes identificar al conductor real en el plazo de alegaciones (20 dias
                    naturales desde la notificacion).
                  </li>
                  <li>
                    <strong>Defectos de señalizacion:</strong> Si el limite de velocidad no estaba
                    correctamente senalizado o habia discrepancia entre paneles.
                  </li>
                  <li>
                    <strong>Calibracion del radar:</strong> Puedes solicitar el certificado de
                    verificacion metrológica del dispositivo. Si no esta en regla, la denuncia
                    se anula.
                  </li>
                  <li>
                    <strong>Errores en la notificacion:</strong> Datos incorrectos del vehiculo,
                    fecha, hora o lugar.
                  </li>
                  <li>
                    <strong>Estado de necesidad:</strong> En situaciones de emergencia justificada
                    (llevar a alguien al hospital, por ejemplo).
                  </li>
                </ol>
                <p>
                  El plazo para presentar alegaciones es de 20 dias naturales. Si se desestiman,
                  puedes recurrir ante el Tribunal Contencioso-Administrativo en el plazo de
                  2 meses. Si pagas en los primeros 20 dias, obtienes un 50% de descuento en
                  la cuantia, pero renuncias al recurso.
                </p>

                <h2 id="consejos">Consejos practicos</h2>
                <ol>
                  <li>
                    <strong>Respeta los limites:</strong> Parece obvio, pero es la unica forma
                    segura de evitar multas. Los margenes de tolerancia no son un permiso.
                  </li>
                  <li>
                    <strong>Atencion a los radares de tramo:</strong> No basta con frenar ante
                    la camara. Mantén una velocidad constante y legal durante todo el tramo.
                  </li>
                  <li>
                    <strong>Revisa la señalizacion:</strong> En zonas de obras, los limites pueden
                    reducirse temporalmente a 60 o 80 km/h en autopistas.
                  </li>
                  <li>
                    <strong>Cuidado con los radares moviles:</strong> La DGT publica las zonas
                    habituales, pero las ubicaciones exactas cambian a diario.
                  </li>
                  <li>
                    <strong>Usa el limitador de velocidad:</strong> La mayoria de vehiculos modernos
                    incluyen limitador de velocidad o control de crucero adaptativo (ACC). Usalo
                    en autopista para mantener una velocidad constante y legal.
                  </li>
                </ol>
              </div>

              {/* CTA */}
              <div className="mt-10 mb-8">
                <Link
                  href="/radares"
                  className="flex items-center justify-between bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl p-5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Radar className="w-7 h-7" />
                    <div>
                      <p className="font-semibold">Ver todos los radares de Espana</p>
                      <p className="text-sm text-yellow-100">Mapa interactivo con ubicacion exacta</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>

              <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500">
                <p>
                  Fuentes: DGT (Direccion General de Trafico); Ley sobre Trafico, Circulacion
                  de Vehiculos a Motor y Seguridad Vial; Reglamento General de Circulacion.
                  Datos de radares actualizados automaticamente.
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
                    href="/radares"
                    className="flex items-center gap-2 text-sm font-semibold text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:hover:text-tl-300"
                  >
                    <Camera className="w-4 h-4" />
                    Mapa de radares
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
