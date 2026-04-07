import { Metadata } from "next";
import Link from "next/link";
import {
  Tag,
  Clock,
  ChevronRight,
  Leaf,
  CheckCircle,
  MinusCircle,
  XCircle,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildPageMetadata } from "@/lib/seo/metadata";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = buildPageMetadata({
  title: "Etiqueta Ambiental DGT 2026 — Guia Completa: Tipos, Consulta y Beneficios",
  description:
    "Guia completa de la etiqueta ambiental DGT: los 4 distintivos (0, ECO, C, B), como consultar cual te corresponde, beneficios por ciudad y como solicitarla.",
  path: "/guias/etiqueta-ambiental",
  keywords: [
    "etiqueta ambiental DGT",
    "distintivo ambiental",
    "etiqueta 0 emisiones",
    "etiqueta ECO",
    "etiqueta C",
    "etiqueta B",
    "consultar etiqueta ambiental",
    "beneficios etiqueta ambiental",
  ],
  ogType: "article",
});

export const revalidate = 3600;

const TOC_ITEMS = [
  { id: "que-es", label: "Que es la etiqueta ambiental" },
  { id: "tipos", label: "Los 4 distintivos" },
  { id: "criterios", label: "Criterios de asignacion" },
  { id: "consultar", label: "Como consultar tu etiqueta" },
  { id: "solicitar", label: "Como solicitar la etiqueta" },
  { id: "beneficios", label: "Beneficios por ciudad" },
  { id: "sin-etiqueta", label: "Vehiculos sin etiqueta" },
  { id: "preguntas", label: "Preguntas frecuentes" },
];

const LABELS = [
  {
    code: "0 Emisiones",
    color: "teal",
    bg: "bg-teal-50 dark:bg-teal-900/20",
    border: "border-teal-300 dark:border-teal-700",
    text: "text-teal-800 dark:text-teal-300",
    dot: "bg-teal-500",
    vehicles: [
      "Vehiculos electricos de bateria (BEV)",
      "Vehiculos de pila de combustible de hidrogeno (FCEV)",
      "Vehiculos hibridos enchufables (PHEV) con autonomia electrica >= 40 km",
      "Vehiculos de autonomia extendida (EREV)",
    ],
    benefits: [
      "Acceso libre a todas las ZBE",
      "Descuento o exencion en la zona SER (Madrid: 100% gratuito)",
      "Uso de carril bus-VAO en muchas ciudades",
      "Exencion del impuesto de circulacion (75% en muchos municipios)",
      "Peajes reducidos en Cataluna",
    ],
  },
  {
    code: "ECO",
    color: "green",
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-300 dark:border-green-700",
    text: "text-green-800 dark:text-green-300",
    dot: "bg-green-500",
    vehicles: [
      "Hibridos no enchufables (HEV) gasolina",
      "Vehiculos propulsados por gas natural comprimido (GNC)",
      "Vehiculos propulsados por gas natural licuado (GNL)",
      "Vehiculos propulsados por gas licuado del petroleo (GLP)",
    ],
    benefits: [
      "Acceso libre a las ZBE en condiciones normales",
      "Descuento del 50% en zona SER (Madrid)",
      "Descuento en el impuesto de circulacion (50% en muchos municipios)",
      "Acceso a carril bus-VAO en algunas ciudades",
    ],
  },
  {
    code: "C",
    color: "yellow",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-yellow-300 dark:border-yellow-700",
    text: "text-yellow-800 dark:text-yellow-300",
    dot: "bg-yellow-500",
    vehicles: [
      "Turismos y furgonetas de gasolina matriculados desde enero 2006 (Euro 4, 5 y 6)",
      "Turismos y furgonetas diesel matriculados desde enero 2014 (Euro 6)",
      "Vehiculos de mas de 8 plazas y pesados de gasolina Euro 4/5/6",
      "Vehiculos de mas de 8 plazas y pesados diesel Euro 6",
    ],
    benefits: [
      "Acceso a las ZBE (restricciones solo en episodios de alta contaminacion)",
      "Descuento del 20% en zona SER (Madrid)",
    ],
  },
  {
    code: "B",
    color: "amber",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-300 dark:border-amber-700",
    text: "text-amber-800 dark:text-amber-300",
    dot: "bg-amber-500",
    vehicles: [
      "Turismos y furgonetas de gasolina matriculados desde enero 2000 (Euro 3)",
      "Turismos y furgonetas diesel matriculados desde enero 2006 (Euro 4 y 5)",
      "Vehiculos de mas de 8 plazas y pesados de gasolina Euro 3",
      "Vehiculos de mas de 8 plazas y pesados diesel Euro 4 y 5",
    ],
    benefits: [
      "Acceso restringido a las ZBE segun horario y ciudad",
      "Sin descuento en zona SER",
    ],
  },
];

export default function GuiaEtiquetaAmbientalPage() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Etiqueta Ambiental DGT 2026 — Guia Completa",
    description: "Guia completa de la etiqueta ambiental DGT con los 4 distintivos, criterios y beneficios.",
    url: `${BASE_URL}/guias/etiqueta-ambiental`,
    datePublished: "2026-04-06",
    dateModified: new Date().toISOString(),
    author: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    mainEntityOfPage: `${BASE_URL}/guias/etiqueta-ambiental`,
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
              { name: "Etiqueta Ambiental DGT", href: "/guias/etiqueta-ambiental" },
            ]}
          />

          <div className="lg:grid lg:grid-cols-[1fr_240px] lg:gap-8">
            <article>
              <header className="mb-8">
                <div className="flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400 mb-2">
                  <Tag className="w-4 h-4" />
                  <span>Guia de movilidad</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Etiqueta Ambiental DGT: Guia Completa 2026
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  Todo sobre los distintivos ambientales de la DGT: los 4 tipos de etiqueta,
                  como consultar cual le corresponde a tu vehiculo, como solicitarla y que
                  beneficios ofrece en cada ciudad.
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
                <h2 id="que-es">Que es la etiqueta ambiental de la DGT</h2>
                <p>
                  La etiqueta ambiental (o distintivo ambiental) es una pegatina adhesiva que
                  la Direccion General de Trafico (DGT) asigna a cada vehiculo en funcion de
                  su nivel de emisiones contaminantes. Fue introducida en 2016 y clasifica
                  el parque automovilistico espanol en cuatro categorias: <strong>0 Emisiones</strong>,
                  <strong> ECO</strong>, <strong>C</strong> y <strong>B</strong>. Los vehiculos
                  que no cumplen los requisitos minimos quedan sin etiqueta.
                </p>
                <p>
                  La etiqueta tiene un papel fundamental en la politica de movilidad urbana
                  en Espana. Es el criterio principal para determinar el acceso a las Zonas de
                  Bajas Emisiones (ZBE), los descuentos en zonas de aparcamiento regulado,
                  las bonificaciones fiscales y los privilegios de circulacion en episodios de
                  alta contaminacion.
                </p>
                <p>
                  Es importante entender que la etiqueta no es obligatoria: no te pueden multar
                  por no llevarla pegada en el vehiculo. Sin embargo, si tu vehiculo tiene
                  derecho a una etiqueta y no la llevas visible, perderas los beneficios asociados
                  (descuento SER, acceso a carril VAO, etc.) y, en caso de acceder a una ZBE,
                  el sistema de camaras verificara igualmente tu matricula en la base de datos
                  de la DGT.
                </p>

                <h2 id="tipos">Los 4 distintivos ambientales</h2>
              </div>

              {/* Labels detail cards */}
              <section className="my-8 space-y-5">
                {LABELS.map((label) => (
                  <div
                    key={label.code}
                    className={`rounded-2xl border p-5 ${label.bg} ${label.border}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`w-4 h-4 rounded-full ${label.dot}`} />
                      <h3 className={`text-lg font-bold ${label.text}`}>{label.code}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                          Vehiculos incluidos
                        </p>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                          {label.vehicles.map((v) => (
                            <li key={v} className="flex items-start gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                              {v}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                          Beneficios principales
                        </p>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                          {label.benefits.map((b) => (
                            <li key={b} className="flex items-start gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${label.dot}`} />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Sin etiqueta */}
                <div className="rounded-2xl border p-5 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-4 h-4 rounded-full bg-red-500" />
                    <h3 className="text-lg font-bold text-red-800 dark:text-red-300">Sin etiqueta</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Vehiculos incluidos
                      </p>
                      <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        <li className="flex items-start gap-2"><XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />Turismos gasolina anteriores a Euro 3 (matriculados antes de enero 2000)</li>
                        <li className="flex items-start gap-2"><XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />Turismos diesel anteriores a Euro 4 (matriculados antes de enero 2006)</li>
                        <li className="flex items-start gap-2"><XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />Vehiculos pesados gasolina pre-Euro 3 y diesel pre-Euro 4</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Restricciones
                      </p>
                      <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        <li className="flex items-start gap-2"><XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />Prohibido circular por cualquier ZBE activa</li>
                        <li className="flex items-start gap-2"><XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />Sin acceso a carril bus-VAO</li>
                        <li className="flex items-start gap-2"><XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />Sin descuento en zona SER</li>
                        <li className="flex items-start gap-2"><XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />Restricciones adicionales en episodios de contaminacion</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              <div className="prose prose-lg dark:prose-invert max-w-none">
                <h2 id="criterios">Criterios de asignacion</h2>
                <p>
                  La DGT asigna la etiqueta automaticamente en funcion de la ficha tecnica del
                  vehiculo. Los criterios principales son el <strong>tipo de combustible</strong> (gasolina,
                  diesel, hibrido, electrico, gas) y la <strong>normativa Euro</strong> que cumple el
                  vehiculo (determinada por la fecha de primera matriculacion).
                </p>
                <p>
                  Es importante aclarar que la etiqueta se asigna al vehiculo, no al propietario.
                  Si vendes o compras un vehiculo, la etiqueta no cambia: depende de las
                  caracteristicas tecnicas del coche. Tampoco es posible mejorar la etiqueta
                  de un vehiculo mediante modificaciones mecanicas (por ejemplo, instalar un
                  kit GLP en un gasolina no cambia la etiqueta automaticamente, aunque la DGT
                  esta revisando esta politica).
                </p>
                <div className="not-prose my-6">
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-950">
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Combustible</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Normativa Euro</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Matriculacion aprox.</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Etiqueta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        <tr><td className="px-4 py-2">Gasolina</td><td className="px-4 py-2">Euro 4, 5, 6</td><td className="px-4 py-2">Desde ene 2006</td><td className="px-4 py-2 text-center"><span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">C</span></td></tr>
                        <tr><td className="px-4 py-2">Gasolina</td><td className="px-4 py-2">Euro 3</td><td className="px-4 py-2">Ene 2000 – dic 2005</td><td className="px-4 py-2 text-center"><span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">B</span></td></tr>
                        <tr><td className="px-4 py-2">Diesel</td><td className="px-4 py-2">Euro 6</td><td className="px-4 py-2">Desde sep 2015</td><td className="px-4 py-2 text-center"><span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">C</span></td></tr>
                        <tr><td className="px-4 py-2">Diesel</td><td className="px-4 py-2">Euro 4, 5</td><td className="px-4 py-2">Ene 2006 – ago 2015</td><td className="px-4 py-2 text-center"><span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">B</span></td></tr>
                        <tr><td className="px-4 py-2">Hibrido no enchufable</td><td className="px-4 py-2">Cualquiera</td><td className="px-4 py-2">Cualquiera</td><td className="px-4 py-2 text-center"><span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-semibold">ECO</span></td></tr>
                        <tr><td className="px-4 py-2">Electrico / Hidrogeno</td><td className="px-4 py-2">N/A</td><td className="px-4 py-2">Cualquiera</td><td className="px-4 py-2 text-center"><span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs font-semibold">0</span></td></tr>
                        <tr><td className="px-4 py-2">GNC / GNL / GLP</td><td className="px-4 py-2">Cualquiera</td><td className="px-4 py-2">Cualquiera</td><td className="px-4 py-2 text-center"><span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-semibold">ECO</span></td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <h2 id="consultar">Como consultar tu etiqueta ambiental</h2>
                <p>
                  Hay varias formas de consultar que etiqueta le corresponde a tu vehiculo:
                </p>
                <ol>
                  <li>
                    <strong>Web de la DGT:</strong> Accede a{" "}
                    <code>sede.dgt.gob.es</code> y busca el servicio de consulta de distintivo
                    ambiental. Necesitaras la matricula del vehiculo.
                  </li>
                  <li>
                    <strong>App miDGT:</strong> La aplicacion movil oficial de la DGT muestra
                    la etiqueta ambiental de tus vehiculos directamente. Disponible en iOS y
                    Android.
                  </li>
                  <li>
                    <strong>Informe de vehiculo de la DGT:</strong> En el informe completo
                    del vehiculo (disponible online) aparece la clasificacion ambiental.
                  </li>
                  <li>
                    <strong>Por ano de matriculacion:</strong> Si conoces el ano de matriculacion
                    y el tipo de combustible, puedes determinarlo con la tabla anterior.
                  </li>
                </ol>

                <h2 id="solicitar">Como solicitar la etiqueta fisica</h2>
                <p>
                  Si quieres la pegatina fisica para pegarla en el vehiculo (recomendable
                  para beneficiarte visualmente de los descuentos SER y acceso VAO):
                </p>
                <ul>
                  <li>
                    <strong>Correos:</strong> En cualquier oficina de Correos, solicitala con
                    la documentacion del vehiculo. Coste: 5 euros. Es la forma mas habitual.
                  </li>
                  <li>
                    <strong>Talleres autorizados:</strong> Algunos talleres de la red de ITV
                    tambien la proporcionan durante la inspeccion.
                  </li>
                  <li>
                    <strong>Online:</strong> Puedes pedirla a traves de la web de Correos para
                    recibirla en tu domicilio.
                  </li>
                </ul>

                <h2 id="beneficios">Beneficios por ciudad</h2>
                <p>
                  Cada ciudad define sus propios beneficios para los vehiculos con etiqueta
                  ambiental. Los mas relevantes:
                </p>
                <h3>Madrid</h3>
                <ul>
                  <li>Etiqueta 0: aparcamiento SER gratuito, acceso libre a Madrid 360 (ZBE)</li>
                  <li>Etiqueta ECO: 50% descuento SER, acceso libre a Madrid 360</li>
                  <li>Etiqueta C: 20% descuento SER, acceso a Madrid 360</li>
                  <li>Etiqueta B: acceso restringido a Madrid 360 (solo residentes)</li>
                  <li>Sin etiqueta: prohibido circular por Madrid 360</li>
                </ul>
                <h3>Barcelona</h3>
                <ul>
                  <li>Etiqueta 0 y ECO: acceso libre a la ZBE Rondas, descuento Area Verde</li>
                  <li>Etiqueta C: acceso permitido</li>
                  <li>Etiqueta B: acceso restringido (horario)</li>
                  <li>Sin etiqueta: prohibido Lun-Vie 07:00-20:00</li>
                </ul>
                <h3>Valencia</h3>
                <ul>
                  <li>Etiqueta 0: acceso libre, aparcamiento gratuito en zona ORA</li>
                  <li>Etiqueta ECO: acceso libre, descuento ORA</li>
                  <li>Etiqueta C: acceso permitido</li>
                  <li>Sin etiqueta: prohibido en ZBE</li>
                </ul>

                <h2 id="sin-etiqueta">Que hacer si tu vehiculo no tiene etiqueta</h2>
                <p>
                  Si tu vehiculo es anterior a los criterios minimos (gasolina pre-2000 o diesel
                  pre-2006), no tiene etiqueta ambiental y esta afectado por las restricciones
                  ZBE. Tus opciones son:
                </p>
                <ol>
                  <li>
                    <strong>Renovar el vehiculo:</strong> Acogete al Plan MOVES III (o su sucesor)
                    para obtener ayudas a la compra de vehiculos electricos, hibridos o de gas.
                    Las subvenciones pueden llegar hasta 7.000 euros.
                  </li>
                  <li>
                    <strong>Transporte publico:</strong> En las ciudades con ZBE, la red de
                    transporte publico suele estar bien conectada. Es la alternativa mas directa.
                  </li>
                  <li>
                    <strong>Carsharing/alquiler:</strong> Para desplazamientos puntuales por la
                    ciudad, servicios como ZITY, SHARE NOW o alquiler por horas pueden ser una
                    solucion temporal.
                  </li>
                  <li>
                    <strong>Conversion a GLP:</strong> Instalar un kit de GLP en un vehiculo de
                    gasolina puede ser una opcion para mejorar las emisiones, aunque actualmente
                    no cambia la etiqueta automaticamente. Consulta con la DGT la normativa
                    vigente.
                  </li>
                </ol>

                <h2 id="preguntas">Preguntas frecuentes</h2>
                <h3>Es obligatorio llevar la pegatina en el coche?</h3>
                <p>
                  No. La etiqueta fisica no es obligatoria. Las ZBE verifican la matricula
                  contra la base de datos de la DGT, no la pegatina. Sin embargo, llevarla
                  pegada es recomendable para beneficiarte de descuentos SER y otros
                  privilegios visuales.
                </p>
                <h3>Puedo circular por toda Espana sin etiqueta?</h3>
                <p>
                  Si, pero no podras entrar en las ZBE de las ciudades que las tengan activas.
                  En carreteras interurbanas (autovias, nacionales, etc.) no hay restricciones
                  por etiqueta ambiental.
                </p>
                <h3>Se puede recurrir la asignacion de etiqueta?</h3>
                <p>
                  Si crees que a tu vehiculo le corresponde una etiqueta diferente (por ejemplo,
                  porque tiene una modificacion homologada), puedes presentar una reclamacion
                  ante la DGT con la documentacion tecnica correspondiente.
                </p>
              </div>

              {/* CTAs */}
              <div className="mt-10 mb-8 space-y-3">
                <Link
                  href="/etiqueta-ambiental"
                  className="flex items-center justify-between bg-teal-600 hover:bg-teal-700 text-white rounded-xl p-5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Tag className="w-7 h-7" />
                    <div>
                      <p className="font-semibold">Consultar etiqueta por vehiculo</p>
                      <p className="text-sm text-teal-200">Tabla completa de asignacion</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/guias/zonas-bajas-emisiones"
                  className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-tl-300 dark:hover:border-tl-700 rounded-xl p-5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Leaf className="w-7 h-7 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Guia de ZBE en Espana</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Que ciudades tienen ZBE y como funcionan</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              </div>

              <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500">
                <p>
                  Fuentes: DGT (Direccion General de Trafico); Real Decreto 2822/1998;
                  Reglamento (CE) 715/2007 (normas Euro). Clasificacion actualizada a abril 2026.
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
                    href="/guias/zonas-bajas-emisiones"
                    className="flex items-center gap-2 text-sm font-semibold text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:hover:text-tl-300"
                  >
                    <Leaf className="w-4 h-4" />
                    Guia de ZBE
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
