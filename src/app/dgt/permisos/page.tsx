import Link from "next/link";
import {
  CreditCard,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Car,
  CheckCircle2,
  Info,
  Shield,
  MapPin,
  Smartphone,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { buildPageMetadata } from "@/lib/seo/metadata";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
const CURRENT_YEAR = new Date().getFullYear();
const UPDATED_DATE = "mayo 2026";

export const revalidate = 86400;

export const metadata = buildPageMetadata({
  title: `Permisos de Conducir ${CURRENT_YEAR}: Tipos, Renovación e Internacional | trafico.live`,
  description:
    "Guía completa sobre permisos de conducir en España: todos los tipos (A, B, C, D y subtipos), cómo y cuándo renovar, examen teórico y práctico, permiso internacional y el permiso digital miDGT.",
  path: "/dgt/permisos",
  keywords: [
    "permisos conducir España",
    "tipos carnet conducir",
    "renovar permiso conducir",
    "permiso conducir B",
    "carnet moto España",
    "permiso internacional conducir",
    "examen teórico DGT",
    "permiso digital miDGT",
    "equivalencia carnet extranjero",
  ],
});

const PERMIT_TYPES = [
  {
    code: "AM",
    name: "Ciclomotor y cuatriciclos ligeros",
    age: "15 años",
    color: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-700",
    description: "Permite conducir ciclomotores de dos o tres ruedas y cuatriciclos ligeros (≤ 45 km/h, motor ≤ 50 cc). Es el permiso de entrada para menores de 16 años. No permite conducir en autopistas.",
    allows: ["Ciclomotores de 2 y 3 ruedas (≤ 45 km/h)", "Cuatriciclos ligeros (≤ 45 km/h)"],
  },
  {
    code: "A1",
    name: "Motocicletas ligeras",
    age: "16 años",
    color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
    description: "Permite conducir motocicletas de hasta 125 cc y 11 kW de potencia. Incluye triciclos de motor de hasta 15 kW. Requiere al menos 2 años en autopistas de alto rendimiento.",
    allows: ["Motocicletas ≤ 125 cc y ≤ 11 kW", "Triciclos de motor ≤ 15 kW", "Ciclomotores (autorización AM incluida)"],
  },
  {
    code: "A2",
    name: "Motocicletas de potencia media",
    age: "18 años",
    color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
    description: "Permite conducir motocicletas de hasta 35 kW y con una relación potencia/peso no superior a 0,2 kW/kg. Muy común entre motoristas adultos. No hay restricción de cilindrada, solo de potencia.",
    allows: ["Motocicletas ≤ 35 kW y ≤ 0,2 kW/kg", "Todo lo permitido por A1"],
  },
  {
    code: "A",
    name: "Motocicletas sin limitación",
    age: "24 años (o 20 con A2 durante 2 años)",
    color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    description: "El permiso de moto sin restricciones. Permite conducir cualquier motocicleta independientemente de la cilindrada y potencia, incluidas las de alta cilindrada. También permite conducir triciclos de motor de más de 15 kW.",
    allows: ["Motocicletas de cualquier cilindrada y potencia", "Triciclos de motor > 15 kW", "Todo lo permitido por A2, A1 y AM"],
  },
  {
    code: "B",
    name: "Turismos y furgonetas ligeras",
    age: "18 años (o 17 con B acompañado)",
    color: "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300",
    border: "border-tl-200 dark:border-tl-800",
    description: "El permiso más común en España. Permite conducir vehículos de hasta 3.500 kg de MMA y hasta 8 plazas (sin contar el conductor). También permite remolcar remolques de hasta 750 kg (o superado ese peso si la combinación no supera los 3.500 kg).",
    allows: ["Turismos y furgonetas ≤ 3.500 kg", "Hasta 8 plazas de pasajeros", "Remolques ≤ 750 kg (con ciertas condiciones)", "Cuatriciclos pesados (motocicletas)", "Conductores de AM incluida"],
  },
  {
    code: "BE",
    name: "Vehículo B + remolque",
    age: "18 años",
    color: "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300",
    border: "border-tl-200 dark:border-tl-800",
    description: "Complemento del permiso B para remolques que superen los 750 kg cuando la combinación exceda los 3.500 kg. Necesario para caravanas pesadas o remolques especiales.",
    allows: ["Combinaciones con permiso B cuya MMA conjunta > 3.500 kg"],
  },
  {
    code: "C",
    name: "Camiones (sin pasajeros)",
    age: "21 años (18 con Certificado Competencia Profesional)",
    color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    description: "Permite conducir vehículos de transporte de mercancías de más de 3.500 kg, con un máximo de 8 plazas para pasajeros. Imprescindible para camioneros y transportistas.",
    allows: ["Camiones > 3.500 kg", "Hasta 8 plazas de pasajeros", "Incluye permiso B"],
  },
  {
    code: "C1",
    name: "Vehículos de entre 3.500 y 7.500 kg",
    age: "18 años",
    color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    description: "Permite conducir vehículos con una MMA de entre 3.500 y 7.500 kg. Útil para furgones de mayor tamaño y vehículos especiales de emergencias.",
    allows: ["Vehículos de 3.500 a 7.500 kg", "Hasta 8 plazas", "Incluye permiso B"],
  },
  {
    code: "D",
    name: "Autobuses (más de 8 plazas)",
    age: "24 años (21 con Certificado Competencia Profesional en transporte regular)",
    color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
    description: "Permite conducir autobuses y autocares con más de 8 plazas de pasajeros. Obligatorio para conductores de autobús, autocares de larga distancia y transportes escolares.",
    allows: ["Autobuses y autocares con > 8 plazas", "Incluye permiso B"],
  },
  {
    code: "D1",
    name: "Minibuses (hasta 16 plazas)",
    age: "21 años",
    color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
    description: "Permite conducir vehículos de entre 9 y 16 plazas para pasajeros. Útil para microempresas de transporte o servicios de lanzadera.",
    allows: ["Vehículos de 9 a 16 plazas", "Incluye permiso B"],
  },
];

const RENEWAL_PERIODS = [
  { type: "Permiso B (menores de 65 años)", period: "Cada 10 años" },
  { type: "Permiso B (65 a 70 años)", period: "Cada 5 años" },
  { type: "Permiso B (mayores de 70 años)", period: "Cada 2 años" },
  { type: "Permisos A, A1, A2, AM", period: "Igual que B según edad" },
  { type: "Permisos C, C1, D, D1 (profesionales)", period: "Cada 5 años (sujeto a reconocimiento médico profesional)" },
  { type: "Permisos con restricciones médicas", period: "Según lo indicado por el médico evaluador (puede ser anual)" },
];

const FAQ_ITEMS = [
  {
    question: "¿Cuánto cuesta renovar el permiso de conducir en España?",
    answer:
      "El coste de renovar el permiso de conducir en España incluye la tasa de la DGT (aproximadamente 24 €) y el reconocimiento médico en un centro autorizado (entre 20 y 40 € según el centro). El reconocimiento médico es obligatorio para cualquier renovación y consiste en pruebas visuales, auditivas, de reflejos y psicomotrices. En total, la renovación suele costar entre 45 y 65 €.",
  },
  {
    question: "¿Con cuánta antelación puedo renovar el permiso antes de que caduque?",
    answer:
      "Puedes solicitar la renovación hasta 3 meses antes de la fecha de caducidad que figura en el permiso sin perder el período de vigencia. La nueva fecha de caducidad se calculará siempre desde la fecha de vencimiento del permiso anterior, no desde el día de la renovación. Si el permiso ya ha caducado, la nueva fecha se cuenta desde el momento de la renovación.",
  },
  {
    question: "¿Qué documentos necesito para renovar el permiso de conducir?",
    answer:
      "Para renovar el permiso necesitas: (1) El permiso de conducir actual o, si está caducado, el DNI o NIE. (2) Una fotografía reciente tamaño carné (algunos centros de reconocimiento la toman ellos). (3) El certificado médico de aptitud (te lo entregan tras superar el reconocimiento médico en el centro autorizado). (4) El justificante del pago de la tasa. En muchos casos el trámite puede realizarse íntegramente online desde la Sede Electrónica de la DGT si tienes certificado digital.",
  },
  {
    question: "¿Puedo conducir en España con un permiso de conducir extranjero?",
    answer:
      "Depende del país de expedición. Los permisos de la Unión Europea y el Espacio Económico Europeo son válidos en España sin necesidad de canje, hasta que caduquen. Los permisos de países con los que España tiene convenio de reciprocidad (como Japón, Suiza, Corea del Sur, o varios países latinoamericanos) pueden canjearse por el permiso español sin necesidad de examinarse. Los permisos del resto de países solo son válidos durante los 6 meses posteriores al establecimiento de la residencia en España; pasado ese plazo, deben obtenerse el permiso español mediante el proceso habitual (examen teórico + práctico).",
  },
  {
    question: "¿En qué consiste el examen teórico de la DGT?",
    answer:
      "El examen teórico para el permiso de conducir en España consta de 30 preguntas tipo test para el permiso B (y un número variable para otras categorías). Cada pregunta tiene 3 respuestas posibles, de las cuales solo una es correcta. El tiempo máximo es de 30 minutos. Se aprueban con un máximo de 3 fallos (permiso B). Las preguntas proceden del banco de preguntas oficial de la DGT, actualizado periódicamente. Puede realizarse en varios idiomas además del español.",
  },
  {
    question: "¿Qué es el permiso de conducir internacional?",
    answer:
      "El Permiso Internacional de Conducción (PIC) es un documento complementario al permiso nacional que facilita la conducción en países que no reconocen directamente el formato del permiso español. El más utilizado es el PIC de la Convención de Viena (1968), válido en más de 100 países. Se solicita en cualquier Jefatura Provincial de Tráfico con el permiso de conducir en vigor, una fotografía y el pago de una pequeña tasa (~10 €). Tiene una vigencia de 3 años (o hasta que caduque el permiso nacional si es antes).",
  },
  {
    question: "¿Qué es el permiso digital en miDGT y tiene el mismo valor legal?",
    answer:
      "El permiso digital de miDGT es la versión electrónica del permiso de conducir físico, reconocida legalmente en España como documento equivalente para controles de circulación en carretera (DGT). Se muestra mediante la aplicación oficial miDGT con identificación biométrica. Sin embargo, para conducir en el extranjero sigue siendo necesario el permiso físico o el PIC, ya que la mayoría de países no reconocen el formato digital español. El permiso digital no caduca por separado: su validez es la misma que la del permiso físico.",
  },
  {
    question: "¿Puedo conducir un remolque con el permiso B?",
    answer:
      "Con el permiso B puedes remolcar un remolque de hasta 750 kg sin necesidad de ningún permiso adicional. Si el remolque supera los 750 kg pero el conjunto (vehículo + remolque) no supera los 3.500 kg, tampoco necesitas permiso adicional. Si el conjunto supera los 3.500 kg, necesitas el permiso BE. Para caravanas, furgonetas de carga y remolques de embarcaciones, conviene calcular el peso total del conjunto antes de salir para evitar sanciones.",
  },
];

const FOREIGN_LICENSE_COUNTRIES = [
  "Japón", "Suiza", "Corea del Sur", "Colombia", "Ecuador", "República Dominicana",
  "Turquía", "Filipinas", "Marruecos", "Argentina", "Bolivia", "Chile",
  "México", "Paraguay", "Perú", "Uruguay", "Venezuela",
];

export default function PermisosPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Permisos de Conducir ${CURRENT_YEAR}: Tipos, Renovación e Internacional`,
    description:
      "Guía completa sobre los permisos de conducir en España: tipos, renovación, examen y permiso internacional.",
    url: `${BASE_URL}/dgt/permisos`,
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    dateModified: new Date().toISOString(),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "DGT", item: `${BASE_URL}/dgt` },
        { "@type": "ListItem", position: 3, name: "Permisos de conducir", item: `${BASE_URL}/dgt/permisos` },
      ],
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "DGT", href: "/dgt" },
              { name: "Permisos de conducir", href: "/dgt/permisos" },
            ]}
          />

          {/* Disclaimer */}
          <div className="mb-6 flex items-start gap-3 bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-tl-amber-800 dark:text-tl-amber-200 leading-relaxed">
              <strong>trafico.live es un servicio independiente.</strong> Para trámites oficiales de
              permisos de conducir acude a{" "}
              <a href="https://sede.dgt.gob.es" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                sede.dgt.gob.es
              </a>
              . Actualizado: {UPDATED_DATE}.
            </p>
          </div>

          {/* Hero */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex-shrink-0">
                <CreditCard className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Permisos de Conducir {CURRENT_YEAR}: Tipos, Renovación e Internacional
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
                  España tiene un sistema de permisos de conducir clasificados por tipo de vehículo, con
                  edades mínimas, condiciones de acceso y períodos de vigencia variables. Esta guía
                  cubre todos los tipos de permiso (AM, A, B, C, D y sus subtipos), cómo y cuándo
                  renovar, el examen de acceso, el permiso internacional y el permiso digital de miDGT.
                </p>
              </div>
            </div>
          </div>

          {/* TOC */}
          <nav className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 mb-8" aria-label="Índice">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">En esta guía</h2>
            <ol className="space-y-1 text-sm text-tl-600 dark:text-tl-400">
              {[
                ["#tipos", "Todos los tipos de permiso de conducir"],
                ["#renovar", "Cuándo y cómo renovar el permiso"],
                ["#examen", "El examen teórico y práctico"],
                ["#internacional", "Permiso de conducir internacional"],
                ["#extranjero", "Equivalencia de carnés extranjeros"],
                ["#digital", "Permiso digital en miDGT"],
                ["#faq", "Preguntas frecuentes"],
              ].map(([href, label]) => (
                <li key={href}><a href={href} className="hover:underline">{label}</a></li>
              ))}
            </ol>
          </nav>

          {/* Section 1: Tipos */}
          <section id="tipos" className="mb-10" aria-labelledby="h-tipos">
            <h2 id="h-tipos" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Todos los tipos de permiso de conducir en España
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              El sistema de permisos de conducir en España está regulado por el Real Decreto 818/2009,
              de 8 de mayo, sobre normas procedimentales en materia de tráfico, circulación de
              vehículos a motor y seguridad vial, modificado por el RD 1514/2018 para adaptar la
              normativa a la Directiva 2006/126/CE del Parlamento Europeo.
            </p>
            <div className="space-y-4">
              {PERMIT_TYPES.map((permit) => (
                <div key={permit.code} className={`bg-white dark:bg-gray-900 rounded-xl border ${permit.border} p-5`}>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center justify-center w-12 h-12 rounded-xl font-black text-lg ${permit.color}`}>
                        {permit.code}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100">{permit.name}</h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Edad mínima: <strong>{permit.age}</strong></span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">{permit.description}</p>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">Permite conducir</p>
                        <ul className="space-y-1">
                          {permit.allows.map((item, i) => (
                            <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">
              Los permisos CE, C1E, DE y D1E son las versiones con remolque de los permisos C, C1, D
              y D1 respectivamente. Para vehículos especiales (grúas, hormigoneras, ambulancias) puede
              requerirse además una autorización específica del Ministerio de Transportes.
            </p>
          </section>

          {/* Section 2: Renovar */}
          <section id="renovar" className="mb-10" aria-labelledby="h-renovar">
            <h2 id="h-renovar" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Cuándo y cómo renovar el permiso de conducir
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Todos los permisos de conducir tienen una <strong>fecha de caducidad</strong> que figura
              en el anverso del documento (campo 4b). Es obligatorio renovarlo antes de que venza.
              Circular con el permiso caducado es una infracción administrativa.
            </p>

            {/* Renewal periods table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Tipo de permiso</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Período de vigencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {RENEWAL_PERIODS.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-2.5 px-4 text-gray-700 dark:text-gray-300">{row.type}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-tl-600 dark:text-tl-400">{row.period}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                Los períodos de renovación varían según la edad del titular y el tipo de permiso.
                Para permisos con restricciones médicas, el médico evaluador puede fijar períodos menores.
              </p>
            </div>

            {/* Steps to renew */}
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Pasos para renovar el permiso de conducir</h3>
            <div className="space-y-3 mb-6">
              {[
                {
                  step: "01",
                  title: "Solicita cita en un centro de reconocimiento médico",
                  detail: "El reconocimiento médico es el primer paso obligatorio. Los centros de reconocimiento de conductores (CRC) están autorizados por la DGT. La cita puede pedirse sin antelación en muchos centros. La prueba dura entre 20 y 40 minutos.",
                },
                {
                  step: "02",
                  title: "Supera el reconocimiento médico",
                  detail: "Las pruebas incluyen: agudeza visual (mínimo 0,5 en el ojo de mejor visión), campo visual, visión de colores (especialmente semáforos), audición básica, reflejos psicomotrices y cuestionario sobre historial de enfermedades o medicación que afecte a la conducción.",
                },
                {
                  step: "03",
                  title: "Obtén el certificado de aptitud psicofísica",
                  detail: "Si superas el reconocimiento, el centro te emite un certificado de aptitud. Si tienes alguna limitación (gafas, audífono, etc.), se anotará como restricción en el nuevo permiso.",
                },
                {
                  step: "04",
                  title: "Solicita la renovación en la DGT",
                  detail: "Puedes hacerlo online en sede.dgt.gob.es (con DNI electrónico o Cl@ve), presencialmente en cualquier Jefatura Provincial de Tráfico, o a través de gestorías colaboradoras. Necesitarás el certificado médico, una foto y el justificante de pago de la tasa.",
                },
                {
                  step: "05",
                  title: "Recibe el nuevo permiso",
                  detail: "El nuevo permiso se envía por correo al domicilio del titular en un plazo de 2 a 4 semanas. Mientras tanto, el acuse de recibo de la solicitud sirve como justificante provisional de renovación.",
                },
              ].map((step) => (
                <div key={step.step} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 flex items-start gap-3">
                  <span className="text-2xl font-black font-mono text-tl-200 dark:text-tl-800 flex-shrink-0 leading-none">{step.step}</span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{step.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Official link */}
            <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-lg p-5">
              <h3 className="font-bold text-tl-800 dark:text-tl-200 mb-2 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Trámite oficial: renovación del permiso
              </h3>
              <p className="text-sm text-tl-700 dark:text-tl-300 mb-3">
                Puedes iniciar la renovación online desde la Sede Electrónica de la DGT si cuentas
                con certificado digital o Cl@ve.
              </p>
              <a href="https://sede.dgt.gob.es/es/permisos-de-conducir/renovacion-de-permiso/" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-tl-600 text-white rounded-lg text-sm font-medium hover:bg-tl-700 transition-colors">
                Renovar permiso en sede.dgt.gob.es <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </section>

          {/* Section 3: Examen */}
          <section id="examen" className="mb-10" aria-labelledby="h-examen">
            <h2 id="h-examen" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              El examen teórico y práctico de conducir
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Para obtener un permiso de conducir por primera vez, o para subir de categoría, es
              necesario superar un examen teórico en la Jefatura de Tráfico y una prueba práctica de
              conducción con el examinador de la DGT:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                  Examen teórico (permiso B)
                </h3>
                <ul className="space-y-2 text-sm">
                  {[
                    "30 preguntas de opción múltiple (3 respuestas)",
                    "Tiempo máximo: 30 minutos",
                    "Máximo 3 fallos para aprobar",
                    "Banco oficial de ~3.000 preguntas",
                    "Disponible en varios idiomas",
                    "Prueba ordinaria y prueba de psicotécnicos incluidas",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Car className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                  Prueba práctica (permiso B)
                </h3>
                <ul className="space-y-2 text-sm">
                  {[
                    "Duración mínima: 25 minutos en carretera",
                    "Incluye maniobras en área de maniobras",
                    "El examinador de la DGT acompaña al alumno",
                    "Posibilidad de realizarla en zona urbana e interurbana",
                    "El vehículo debe tener doble mando",
                    "El instructor de la autoescuela puede acompañar (según CCAA)",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-lg p-4">
              <Info className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-tl-amber-700 dark:text-tl-amber-300 leading-relaxed">
                A partir de julio de 2025, la DGT actualizó el temario del examen teórico para
                incorporar preguntas sobre conducción eficiente, vehículos eléctricos y nuevas
                señales de tráfico relacionadas con las Zonas de Bajas Emisiones (ZBE). Si ya tienes
                material de estudio anterior a esa fecha, asegúrate de complementarlo.
              </p>
            </div>
          </section>

          {/* Section 4: Internacional */}
          <section id="internacional" className="mb-10" aria-labelledby="h-internacional">
            <h2 id="h-internacional" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Permiso de conducir internacional
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              El <strong>Permiso Internacional de Conducción (PIC)</strong> es un documento que
              acompaña al permiso nacional para facilitar la conducción en el extranjero, especialmente
              en países que no reconocen directamente el formato europeo del carnet de conducir:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {[
                {
                  title: "¿Dónde se solicita?",
                  detail: "En cualquier Jefatura Provincial de Tráfico. También en algunas comisarías de policía y en las delegaciones del Gobierno (no se tramita online).",
                  icon: <MapPin className="w-5 h-5 text-tl-600 dark:text-tl-400" />,
                },
                {
                  title: "Requisitos",
                  detail: "Permiso de conducir nacional en vigor, DNI o pasaporte, fotografía tamaño carné y pago de tasa (~10 €). El trámite es presencial e inmediato.",
                  icon: <FileText className="w-5 h-5 text-tl-600 dark:text-tl-400" />,
                },
                {
                  title: "Validez",
                  detail: "3 años desde la expedición, o hasta la fecha de caducidad del permiso nacional si es anterior. No sustituye al permiso nacional: siempre deben ir juntos.",
                  icon: <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />,
                },
                {
                  title: "¿En qué países es necesario?",
                  detail: "En general, fuera de la UE/EEE. Países como EE.UU., Canadá, México, Japón, China, la mayoría de Asia, Oriente Medio, África y Latinoamérica requieren o recomiendan el PIC junto al permiso nacional.",
                  icon: <AlertCircle className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />,
                },
              ].map((item, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">{item.icon}</div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">{item.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 5: Carnés extranjeros */}
          <section id="extranjero" className="mb-10" aria-labelledby="h-extranjero">
            <h2 id="h-extranjero" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Equivalencia de carnés extranjeros en España
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              El tratamiento del permiso de conducir extranjero en España depende del país de origen:
            </p>
            <div className="space-y-4 mb-6">
              {[
                {
                  group: "Unión Europea y EEE (Noruega, Islandia, Liechtenstein)",
                  color: "bg-green-50 dark:bg-green-900/20 border-green-200",
                  icon: <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />,
                  detail: "Son plenamente válidos en España sin necesidad de canje ni homologación, hasta su fecha de caducidad. Al renovarlo, el titular puede optar por obtener el permiso español o renovar el de su país.",
                },
                {
                  group: "Países con convenio de reciprocidad",
                  color: "bg-tl-50 dark:bg-tl-900/20 border-tl-200",
                  icon: <CheckCircle2 className="w-5 h-5 text-tl-600 dark:text-tl-400" />,
                  detail: "Pueden canjearse por el permiso español sin examen, cumpliendo ciertos requisitos administrativos. El titular debe ser residente en España. El canje no siempre es inmediato y puede llevar varios meses.",
                },
                {
                  group: "Resto de países",
                  color: "bg-orange-50 dark:bg-orange-900/20 border-orange-200",
                  icon: <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />,
                  detail: "Son válidos durante los 6 primeros meses desde el establecimiento de la residencia en España. Pasado ese plazo, es obligatorio obtener el permiso español superando el examen teórico y la prueba práctica. En algunos casos puede convalidarse la prueba teórica si el país de origen tiene un sistema similar.",
                },
              ].map((item, i) => (
                <div key={i} className={`rounded-lg border ${item.color} p-4`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">{item.group}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
                Países con convenio de canje de permiso de conducir con España (selección)
              </h3>
              <div className="flex flex-wrap gap-2">
                {FOREIGN_LICENSE_COUNTRIES.map((country) => (
                  <span key={country} className="text-xs bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300 border border-tl-100 dark:border-tl-800 px-2.5 py-1 rounded-full">
                    {country}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                La lista completa y actualizada de países con convenio de reciprocidad está disponible
                en el portal oficial de la DGT. Las condiciones de canje varían; consulta los requisitos
                exactos en la Jefatura de Tráfico.
              </p>
            </div>
          </section>

          {/* Section 6: Digital */}
          <section id="digital" className="mb-10" aria-labelledby="h-digital">
            <h2 id="h-digital" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Permiso digital en miDGT
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Desde 2021, la DGT ofrece la posibilidad de llevar el permiso de conducir en formato
              digital a través de la aplicación oficial <strong>miDGT</strong>. Esta función ha ido
              ganando aceptación y, desde 2023, los agentes de tráfico en España están obligados a
              aceptarla como documento válido durante los controles en carretera nacionales.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {[
                {
                  title: "¿Qué documentos incluye miDGT?",
                  detail: "Permiso de conducir, permiso de circulación del vehículo, tarjeta de inspección técnica (ITV), seguro obligatorio de circulación y saldo de puntos del carnet.",
                  icon: <Smartphone className="w-5 h-5 text-tl-600 dark:text-tl-400" />,
                },
                {
                  title: "¿Cómo se verifica la autenticidad?",
                  detail: "La app genera un código QR dinámico con validez de 30 segundos que los agentes leen con su dispositivo para comprobar la autenticidad de la documentación en tiempo real.",
                  icon: <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />,
                },
                {
                  title: "¿Vale en el extranjero?",
                  detail: "No. El permiso digital miDGT solo tiene validez legal dentro de España para controles de la DGT. En el extranjero —incluidos los países de la UE— es obligatorio presentar el permiso físico o el PIC.",
                  icon: <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />,
                },
                {
                  title: "¿Qué pasa si no tengo cobertura?",
                  detail: "Si no tienes conexión a internet o batería suficiente, la app no puede mostrar el documento. En ese caso deberás presentar el permiso físico. Se recomienda tener siempre el permiso físico disponible como respaldo.",
                  icon: <AlertTriangle className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />,
                },
              ].map((item, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">{item.icon}</div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">{item.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="mb-10" aria-labelledby="h-faq">
            <h2 id="h-faq" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Preguntas frecuentes sobre permisos de conducir
            </h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item) => (
                <div key={item.question} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{item.question}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Official link callout */}
          <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-lg p-5 mb-8">
            <h3 className="font-bold text-tl-800 dark:text-tl-200 mb-2 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Trámite oficial de permisos de conducir
            </h3>
            <p className="text-sm text-tl-700 dark:text-tl-300 mb-3">
              Para solicitar, renovar o consultar cualquier aspecto de tu permiso de conducir, el
              canal oficial es la Sede Electrónica de la DGT o la app miDGT.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="https://sede.dgt.gob.es/es/permisos-de-conducir/" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-tl-600 text-white rounded-lg text-sm font-medium hover:bg-tl-700 transition-colors">
                Permisos en sede.dgt.gob.es <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a href="https://www.dgt.es/nuestros-servicios/permisos-de-conducir/" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-tl-300 text-tl-700 dark:text-tl-300 rounded-lg text-sm font-medium hover:bg-tl-50 transition-colors">
                DGT.es — Permisos <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Related links */}
          <RelatedLinks
            title="Páginas relacionadas en trafico.live"
            links={[
              {
                title: "Carnet por puntos",
                description: "Saldo de puntos, infracciones y recuperación",
                href: "/dgt/carnet-puntos",
                icon: <Shield className="w-5 h-5" />,
              },
              {
                title: "Multas DGT",
                description: "Consulta, pago con descuento y recursos",
                href: "/dgt/multas",
                icon: <FileText className="w-5 h-5" />,
              },
              {
                title: "ITV: precio y cita previa",
                description: "Todo sobre la inspección técnica de vehículos",
                href: "/dgt/itv",
                icon: <Car className="w-5 h-5" />,
              },
              {
                title: "Radares en España",
                description: "Mapa de radares fijos y de tramo DGT",
                href: "/radares",
                icon: <MapPin className="w-5 h-5" />,
              },
            ]}
          />

          <div className="mt-6">
            <Link href="/dgt" className="inline-flex items-center gap-1 text-sm text-tl-600 dark:text-tl-400 hover:underline">
              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              Volver a trámites DGT
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
