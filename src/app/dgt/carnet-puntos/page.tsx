import Link from "next/link";
import {
  Star,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Smartphone,
  FileText,
  Info,
  Shield,
  MapPin,
  TrendingDown,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { buildPageMetadata } from "@/lib/seo/metadata";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
const CURRENT_YEAR = new Date().getFullYear();
const UPDATED_DATE = "mayo 2026";

export const revalidate = 86400;

export const metadata = buildPageMetadata({
  title: `Carnet por Puntos ${CURRENT_YEAR}: Consulta, Pérdida y Recuperación | trafico.live`,
  description:
    "Guía completa del carnet por puntos en España: cómo consultar tu saldo, tabla de infracciones y puntos detraídos, qué ocurre al llegar a cero y cómo recuperar puntos mediante cursos de sensibilización.",
  path: "/dgt/carnet-puntos",
  keywords: [
    "carnet por puntos España",
    "consulta puntos carnet",
    "cuántos puntos tengo",
    "perder puntos carnet conducir",
    "recuperar puntos carnet",
    "cursos puntos DGT",
    "conductor novel puntos",
    "tabla infracciones puntos",
  ],
});

const POINTS_TABLE = [
  { infraction: "Conducir con tasa de alcohol 0,25–0,50 mg/l (general) o 0,15–0,30 mg/l (novel/profesional)", points: 4, severity: "grave" },
  { infraction: "Conducir con tasa de alcohol 0,50–0,60 mg/l (general) o > 0,30 mg/l (novel/profesional)", points: 4, severity: "grave" },
  { infraction: "Conducir con tasa de alcohol > 0,60 mg/l (general)", points: 6, severity: "muy grave" },
  { infraction: "Conducir bajo los efectos de drogas o estupefacientes", points: 6, severity: "muy grave" },
  { infraction: "Negativa a someterse a pruebas de alcoholemia o drogas", points: 6, severity: "muy grave" },
  { infraction: "Exceso de velocidad > 50 km/h sobre el límite en cualquier vía", points: 6, severity: "muy grave" },
  { infraction: "Exceso de velocidad de 41 a 50 km/h sobre el límite en vía urbana o convencional", points: 4, severity: "grave" },
  { infraction: "Exceso de velocidad de 30 a 50 km/h sobre el límite en autopista/autovía", points: 4, severity: "grave" },
  { infraction: "Exceso de velocidad de 21 a 40 km/h sobre el límite en vía urbana o convencional", points: 2, severity: "grave" },
  { infraction: "Circular en sentido contrario", points: 6, severity: "muy grave" },
  { infraction: "Realizar adelantamientos antirreglamentarios de riesgo", points: 6, severity: "muy grave" },
  { infraction: "No respetar señal de stop o ceda el paso en cruce con riesgo", points: 4, severity: "grave" },
  { infraction: "Conducir usando el teléfono móvil sin dispositivo manos libres", points: 6, severity: "muy grave" },
  { infraction: "No utilizar el cinturón de seguridad, casco o sistemas de retención", points: 4, severity: "grave" },
  { infraction: "No respetar prioridad de paso en paso de peatones", points: 4, severity: "grave" },
  { infraction: "Saltarse semáforo en rojo", points: 4, severity: "grave" },
  { infraction: "No identificar al conductor infractor cuando se es titular del vehículo", points: 6, severity: "muy grave" },
  { infraction: "Conducir habiendo perdido todos los puntos (o sin permiso)", points: 6, severity: "muy grave" },
];

const RECOVERY_COURSES = [
  {
    type: "Curso de sensibilización y reeducación vial",
    points: "+2 puntos",
    duration: "12 horas (2 días)",
    when: "Cuando tienes entre 1 y 14 puntos y no has realizado el curso en los últimos 2 años.",
    max: "Solo permite recuperar puntos hasta el máximo original (12 o 8 para noveles). No superar el límite.",
  },
  {
    type: "Curso de sensibilización especial (pérdida total)",
    points: "Recuperas 8 puntos (permiso ordinario) o 4 puntos (novel)",
    duration: "Duración ampliada, normalmente 3 días o más",
    when: "Cuando has perdido todos los puntos y tu permiso ha sido anulado. Debes esperar 6 meses antes de realizar el curso y obtener un nuevo permiso.",
    max: "Tras superar el curso, deberás superar el examen teórico y obtener un permiso provisional con puntuación reducida.",
  },
];

const FAQ_ITEMS = [
  {
    question: "¿Cómo consulto mis puntos del carnet de conducir?",
    answer:
      "Puedes consultar tu saldo de puntos en la Sede Electrónica de la DGT (sede.dgt.gob.es) con tu DNI electrónico o Cl@ve. También puedes usar la app miDGT (iOS y Android), que muestra el saldo actualizado al instante. Otra opción es llamar al número de información de la DGT o acudir presencialmente a cualquier Jefatura Provincial de Tráfico. El saldo se actualiza de forma automática cuando la sanción que motivó la deducción queda firme (es decir, cuando se paga o cuando vence el plazo de recurso sin que hayas recurrido).",
  },
  {
    question: "¿Cuántos puntos parte un conductor con el carnet nuevo?",
    answer:
      "Un conductor novel comienza con 8 puntos. Durante el período de prueba (2 años desde la obtención del permiso definitivo, salvo el permiso provisional B previo), el máximo de puntos son 8 y la recuperación de puntos mediante cursos permite llegar hasta un máximo de 4 puntos. Si el conductor novel supera el período de prueba sin incidentes, pasa a disponer de los 12 puntos ordinarios del permiso de conducción estándar.",
  },
  {
    question: "¿Cuándo se descuentan los puntos del carnet?",
    answer:
      "Los puntos se descuentan cuando la sanción que motivó la infracción adquiere firmeza administrativa. Esto ocurre cuando: (a) pagas la multa (aunque sea con el descuento del 50 %), (b) vence el plazo para recurrir sin que hayas presentado recurso, o (c) se resuelve el recurso confirmando la sanción. En la práctica, si pagas con el descuento de pronto pago, los puntos se descuentan en ese momento, ya que el pago equivale a la conformidad con los hechos.",
  },
  {
    question: "¿Qué pasa si pierdo todos los puntos del carnet?",
    answer:
      "Si llegas a 0 puntos, la DGT te notifica la anulación del permiso de conducir. A partir de ese momento no puedes conducir legalmente. Tendrás que esperar 6 meses antes de poder iniciar el proceso de recuperación, que consiste en: (1) realizar un curso de sensibilización y reeducación vial especial, y (2) superar de nuevo el examen de tráfico teórico. Si superas estos pasos, obtienes un nuevo permiso con 8 puntos (periodo de prueba). Si vuelves a perderlos todos en este nuevo período, el plazo de espera se extiende a 2 años.",
  },
  {
    question: "¿Cuántos puntos puedo recuperar al año con cursos?",
    answer:
      "Mediante el curso de sensibilización y reeducación vial (12 horas, dos días) recuperas 2 puntos. Solo puedes hacer este curso una vez cada dos años, y solo si tienes entre 1 y 14 puntos. La recuperación está limitada al máximo original: si tienes 12 puntos no puedes obtener 14. Si tienes puntos del bonus de buen conductor (que puede llegar a 15 puntos tras varios años sin infracciones), tampoco puedes superar ese límite con los cursos.",
  },
  {
    question: "¿Los puntos se recuperan solos con el tiempo?",
    answer:
      "Sí, de forma automática. Cada dos años consecutivos sin que se te descuenten puntos recuperas 2 puntos adicionales, hasta un máximo de 15 puntos (el bonus de buen conductor). Si en esos dos años te descontaron algún punto, el contador vuelve a cero y el plazo de recuperación automática empieza de nuevo. Este sistema premia a los conductores con un historial limpio durante varios años.",
  },
  {
    question: "¿Las multas de radar siempre quitan puntos?",
    answer:
      "No siempre. Solo pierdes puntos cuando el exceso de velocidad supera los 20 km/h sobre el límite en vía convencional o urbana, o los 30 km/h en autopista o autovía. Excesos menores (1–20 km/h) se sancionan solo económicamente, sin deducción de puntos. La tabla detallada de infracciones y puntos figure en el anexo II del TRLTSV (Real Decreto Legislativo 6/2015).",
  },
  {
    question: "¿Puedo llevar el permiso de conducir en el móvil?",
    answer:
      "Sí. Desde 2021, la app miDGT permite llevar la versión digital del permiso de conducir, reconocida por la DGT como documento equivalente al físico en el territorio nacional. Puedes mostrarla a los agentes de tráfico durante controles en carretera. Para viajes al extranjero, sin embargo, sigue siendo necesario el permiso físico o el permiso internacional.",
  },
];

export default function CarnetPuntosPage() {
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
    name: `Carnet por Puntos ${CURRENT_YEAR}: Consulta, Pérdida y Recuperación`,
    description:
      "Guía completa sobre el sistema de carnet por puntos en España.",
    url: `${BASE_URL}/dgt/carnet-puntos`,
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    dateModified: new Date().toISOString(),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "DGT", item: `${BASE_URL}/dgt` },
        { "@type": "ListItem", position: 3, name: "Carnet por puntos", item: `${BASE_URL}/dgt/carnet-puntos` },
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
              { name: "Carnet por puntos", href: "/dgt/carnet-puntos" },
            ]}
          />

          {/* Disclaimer */}
          <div className="mb-6 flex items-start gap-3 bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-tl-amber-800 dark:text-tl-amber-200 leading-relaxed">
              <strong>trafico.live es un servicio independiente.</strong> Para consultar tu saldo de
              puntos oficial acude a{" "}
              <a href="https://sede.dgt.gob.es" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                sede.dgt.gob.es
              </a>
              . Actualizado: {UPDATED_DATE}.
            </p>
          </div>

          {/* Hero */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="p-3 bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded-lg flex-shrink-0">
                <Star className="w-8 h-8 text-tl-amber-600 dark:text-tl-amber-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Carnet por Puntos {CURRENT_YEAR}: Consulta, Pérdida y Recuperación
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
                  El <strong>permiso de conducir por puntos</strong> entró en vigor en España el 1 de
                  julio de 2006 (Ley 17/2005). Cada conductor empieza con <strong>12 puntos</strong> (8 si
                  es novel) que puede perder por infracciones y recuperar con buena conducción o
                  mediante cursos homologados. Esta guía explica cómo funciona, qué infracciones quitan
                  puntos y qué hacer si los pierdes.
                </p>
              </div>
            </div>
          </div>

          {/* TOC */}
          <nav className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 mb-8" aria-label="Índice">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">En esta guía</h2>
            <ol className="space-y-1 text-sm text-tl-600 dark:text-tl-400">
              {[
                ["#cómo-funciona", "Cómo funciona el sistema de puntos"],
                ["#consultar", "Cómo consultar tu saldo de puntos"],
                ["#tabla", "Tabla de infracciones y puntos detraídos"],
                ["#pérdida", "Qué pasa si pierdes todos los puntos"],
                ["#recuperar", "Cómo recuperar puntos: cursos y tiempo"],
                ["#novel", "Conductores noveles: reglas especiales"],
                ["#bonus", "El bonus del buen conductor (hasta 15 puntos)"],
                ["#faq", "Preguntas frecuentes"],
              ].map(([href, label]) => (
                <li key={href}><a href={href} className="hover:underline">{label}</a></li>
              ))}
            </ol>
          </nav>

          {/* Section 1: Cómo funciona */}
          <section id="cómo-funciona" className="mb-10" aria-labelledby="h-como-funciona">
            <h2 id="h-como-funciona" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Cómo funciona el sistema de puntos en España
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              El permiso de conducir por puntos es un mecanismo de control de la conducción que
              funciona como una cuenta regresiva: empiezas con un saldo máximo de puntos y las
              infracciones graves o muy graves lo van reduciendo. Si el saldo llega a cero, pierdes
              el permiso.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                {
                  value: "12",
                  label: "Puntos iniciales (conductor ordinario)",
                  color: "text-green-600 dark:text-green-400",
                  bg: "bg-green-50 dark:bg-green-900/20 border-green-200",
                },
                {
                  value: "8",
                  label: "Puntos iniciales (conductor novel)",
                  color: "text-tl-amber-600 dark:text-tl-amber-400",
                  bg: "bg-tl-amber-50 dark:bg-tl-amber-900/20 border-tl-amber-200",
                },
                {
                  value: "15",
                  label: "Máximo alcanzable (bonus buen conductor)",
                  color: "text-tl-600 dark:text-tl-400",
                  bg: "bg-tl-50 dark:bg-tl-900/20 border-tl-200",
                },
              ].map((stat, i) => (
                <div key={i} className={`rounded-lg border ${stat.bg} p-4 text-center`}>
                  <p className={`text-4xl font-black font-mono ${stat.color}`}>{stat.value}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-snug">{stat.label}</p>
                </div>
              ))}
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Los puntos <strong>solo se descuentan cuando la sanción es firme</strong>. Si pagas la
              multa con el descuento del 50 % (pronto pago), aceptas los hechos y los puntos se
              detraen automáticamente. Si recurres y ganas, no se descuenta ningún punto. La
              información sobre puntos es personal y está protegida: solo el titular del permiso, sus
              representantes legales y determinadas autoridades judiciales pueden acceder al saldo.
            </p>
          </section>

          {/* Section 2: Consultar */}
          <section id="consultar" className="mb-10" aria-labelledby="h-consultar">
            <h2 id="h-consultar" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Cómo consultar tu saldo de puntos
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              La consulta de puntos del carnet es personal e intransferible. Solo el titular del
              permiso (o su representante legal) puede acceder a esta información:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {[
                {
                  title: "Sede Electrónica DGT",
                  detail: "En sede.dgt.gob.es, dentro del apartado 'Consulta de puntos del permiso de conducir'. Necesitas DNI electrónico, Cl@ve o certificado digital.",
                  icon: <FileText className="w-5 h-5 text-tl-600 dark:text-tl-400" />,
                  url: "https://sede.dgt.gob.es/es/permisos-de-conducir/consulta-de-puntos/",
                },
                {
                  title: "App miDGT",
                  detail: "La app oficial de la DGT muestra tu saldo de puntos en tiempo real, actualizándose cada vez que una sanción queda firme. Disponible para iOS y Android.",
                  icon: <Smartphone className="w-5 h-5 text-tl-600 dark:text-tl-400" />,
                  url: null,
                },
                {
                  title: "Presencialmente",
                  detail: "Puedes acudir a cualquier Jefatura Provincial de Tráfico con tu DNI. Te imprimirán un certificado de puntos con fecha y hora de expedición.",
                  icon: <MapPin className="w-5 h-5 text-tl-600 dark:text-tl-400" />,
                  url: null,
                },
              ].map((item, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-lg border border-tl-200 dark:border-tl-800 p-5">
                  <div className="p-2.5 bg-tl-50 dark:bg-tl-900/20 rounded-lg w-fit mb-3">{item.icon}</div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 text-sm">{item.title}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">{item.detail}</p>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-tl-600 dark:text-tl-400 text-xs font-medium hover:underline">
                      Consultar <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: Tabla */}
          <section id="tabla" className="mb-10" aria-labelledby="h-tabla">
            <h2 id="h-tabla" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Tabla de infracciones y puntos detraídos
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              La siguiente tabla recoge las principales infracciones que conllevan deducción de puntos,
              según el anexo II del texto refundido de la Ley sobre Tráfico (TRLTSV, RDL 6/2015).
              Las infracciones leves no restan puntos:
            </p>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Infracción</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Puntos</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Gravedad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {POINTS_TABLE.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-2.5 px-4 text-gray-700 dark:text-gray-300 text-xs leading-relaxed">{row.infraction}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`font-black font-mono text-lg ${row.points === 6 ? "text-red-600 dark:text-red-400" : row.points === 4 ? "text-orange-500 dark:text-orange-400" : "text-yellow-600 dark:text-yellow-400"}`}>
                            -{row.points}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${row.severity === "muy grave" ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" : "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"}`}>
                            {row.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                Fuente: Anexo II del TRLTSV (RDL 6/2015). Los puntos se descuentan cuando la sanción es firme.
              </p>
            </div>
          </section>

          {/* Section 4: Pérdida total */}
          <section id="pérdida" className="mb-10" aria-labelledby="h-perdida">
            <h2 id="h-perdida" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Qué pasa si pierdes todos los puntos
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Llegar a cero puntos conlleva la anulación del permiso de conducir. El proceso es el
              siguiente:
            </p>
            <div className="space-y-3 mb-6">
              {[
                {
                  step: "1",
                  title: "Notificación de pérdida total",
                  detail: "La DGT te notifica la pérdida total de puntos y la consecuente anulación del permiso. Desde ese momento, circular con el vehículo es ilegal.",
                  icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
                },
                {
                  step: "2",
                  title: "Período de espera de 6 meses",
                  detail: "Debes esperar 6 meses antes de poder iniciar el proceso de recuperación. Si vuelves a perder todos los puntos dentro de los dos años siguientes a recuperar el permiso, el período de espera se extiende a 2 años.",
                  icon: <AlertCircle className="w-5 h-5 text-orange-500" />,
                },
                {
                  step: "3",
                  title: "Realizar el curso de sensibilización especial",
                  detail: "Transcurridos los 6 meses, debes realizar un curso de sensibilización y reeducación vial especial en un centro autorizado por la DGT. El curso tiene mayor duración que el ordinario.",
                  icon: <CheckCircle2 className="w-5 h-5 text-tl-600 dark:text-tl-400" />,
                },
                {
                  step: "4",
                  title: "Superar el examen teórico",
                  detail: "Además del curso, debes superar de nuevo el examen de circulación teórico en la Jefatura de Tráfico. Si lo suspendes, debes esperar para volver a examinarte.",
                  icon: <CheckCircle2 className="w-5 h-5 text-tl-600 dark:text-tl-400" />,
                },
                {
                  step: "5",
                  title: "Obtención del nuevo permiso con 8 puntos",
                  detail: "Superadas las dos pruebas, obtienes un nuevo permiso de conducir en período de prueba con 8 puntos. Este período dura 2 años, durante los cuales los límites de alcohol y velocidad son más estrictos.",
                  icon: <Star className="w-5 h-5 text-green-500" />,
                },
              ].map((item) => (
                <div key={item.step} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{item.step}. {item.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
                <strong>Conducir sin permiso válido</strong> (o habiéndolo perdido por saldo cero)
                constituye un delito penal en España (art. 384 del Código Penal), sancionable con
                pena de prisión de 3 a 6 meses o multa de 12 a 24 meses, además de trabajos en
                beneficio de la comunidad.
              </p>
            </div>
          </section>

          {/* Section 5: Recuperar */}
          <section id="recuperar" className="mb-10" aria-labelledby="h-recuperar">
            <h2 id="h-recuperar" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Cómo recuperar puntos: cursos y tiempo
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Existen dos formas de recuperar puntos del carnet en España: mediante los cursos de
              sensibilización homologados por la DGT, o automáticamente con el paso del tiempo si
              mantienes una conducción sin infracciones:
            </p>
            <div className="space-y-4 mb-6">
              {RECOVERY_COURSES.map((course, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{course.type}</h3>
                    <span className="font-mono font-black text-green-600 dark:text-green-400 text-lg whitespace-nowrap">{course.points}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">Duración</p>
                      <p className="text-gray-700 dark:text-gray-300">{course.duration}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">Cuándo puedo hacerlo</p>
                      <p className="text-gray-700 dark:text-gray-300">{course.when}</p>
                    </div>
                  </div>
                  <p className="text-xs text-tl-600 dark:text-tl-400 mt-3 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    {course.max}
                  </p>
                </div>
              ))}
            </div>

            {/* Automatic recovery */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg p-5">
              <h3 className="font-bold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 rotate-180" />
                Recuperación automática con el tiempo
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">
                Si llevas <strong>2 años consecutivos sin que te descuenten puntos</strong>,
                recuperas automáticamente 2 puntos adicionales, hasta el máximo original de tu
                permiso. Si en esos 2 años te descuentan aunque sea 1 punto, el contador de
                recuperación se reinicia. Esta recuperación automática es compatible con los cursos
                de sensibilización.
              </p>
            </div>
          </section>

          {/* Section 6: Conductores noveles */}
          <section id="novel" className="mb-10" aria-labelledby="h-novel">
            <h2 id="h-novel" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Conductores noveles: reglas especiales
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Los conductores que acaban de obtener el permiso de conducir definitivo (no el
              provisional) pasan por un <strong>período de prueba de 2 años</strong> con condiciones
              más estrictas:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  title: "Saldo inicial: 8 puntos",
                  detail: "En lugar de los 12 puntos ordinarios, el conductor novel empieza con 8. Esto significa que tiene menos margen de error ante infracciones.",
                  icon: <Star className="w-4 h-4 text-tl-amber-500" />,
                },
                {
                  title: "Tasa de alcohol reducida: 0,15 mg/l",
                  detail: "La tasa de alcohol permitida en aire espirado es 0,15 mg/l (0,25 g/l en sangre), frente al 0,25 mg/l de los conductores ordinarios. Superar estos límites conlleva deducción inmediata de puntos.",
                  icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
                },
                {
                  title: "Velocidad máxima en autopista: 100 km/h",
                  detail: "Durante el período de prueba, la velocidad máxima permitida en autopistas y autovías es de 100 km/h (en lugar de los 120 km/h habituales). El exceso sobre este límite se calcula igualmente.",
                  icon: <AlertCircle className="w-4 h-4 text-orange-500" />,
                },
                {
                  title: "Recuperación limitada a 4 puntos mediante cursos",
                  detail: "Durante el período de prueba, los cursos de sensibilización solo permiten llegar hasta un máximo de 4 puntos (no hasta 8). Al superar el período de prueba, el saldo pasa automáticamente a 12 puntos si no has incurrido en infracciones graves.",
                  icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
                },
              ].map((item, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{item.title}</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed pl-6">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 7: Bonus */}
          <section id="bonus" className="mb-10" aria-labelledby="h-bonus">
            <h2 id="h-bonus" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              El bonus del buen conductor: hasta 15 puntos
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              El sistema premia a los conductores con una trayectoria limpia permitiéndoles superar
              los 12 puntos iniciales hasta un máximo de 15. El mecanismo es el siguiente:
            </p>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Años sin infracciones (con puntos detraídos)</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Puntos recuperados</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Saldo máximo posible</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {[
                      { years: "2 años consecutivos", gain: "+2 puntos", max: "Hasta 12 (saldo inicial)" },
                      { years: "4 años consecutivos sin infracciones con puntos", gain: "+4 puntos total", max: "Hasta 14" },
                      { years: "6 años consecutivos sin infracciones con puntos", gain: "+3 puntos adicional", max: "Hasta 15 (máximo absoluto)" },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-2.5 px-4 text-gray-700 dark:text-gray-300">{row.years}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-green-600 dark:text-green-400">{row.gain}</td>
                        <td className="py-2.5 px-4 text-gray-700 dark:text-gray-300">{row.max}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                La recuperación se aplica desde los 12 puntos hacia arriba. Los conductores noveles
                acceden al bonus solo tras superar el período de prueba.
              </p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              El saldo máximo de puntos que puede tener un conductor en España es <strong>15 puntos</strong>.
              Cuando el saldo está en 15 y se comete una infracción que descuenta puntos, el saldo baja
              normalmente con la resta correspondiente. El bonus solo se aplica si no has sufrido
              ninguna deducción de puntos durante el período acumulado.
            </p>
          </section>

          {/* FAQ */}
          <section id="faq" className="mb-10" aria-labelledby="h-faq">
            <h2 id="h-faq" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Preguntas frecuentes sobre el carnet por puntos
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
              Consulta oficial de puntos
            </h3>
            <p className="text-sm text-tl-700 dark:text-tl-300 mb-3">
              La única fuente oficial para conocer tu saldo de puntos actualizado es la Sede
              Electrónica de la DGT. Ningún servicio de terceros (como trafico.live) tiene acceso
              a esta información privada.
            </p>
            <a href="https://sede.dgt.gob.es/es/permisos-de-conducir/consulta-de-puntos/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-tl-600 text-white rounded-lg text-sm font-medium hover:bg-tl-700 transition-colors">
              Consultar puntos en sede.dgt.gob.es <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Related links */}
          <RelatedLinks
            title="Páginas relacionadas en trafico.live"
            links={[
              {
                title: "Multas DGT",
                description: "Consulta, pago y recursos de multas de tráfico",
                href: "/dgt/multas",
                icon: <FileText className="w-5 h-5" />,
              },
              {
                title: "Radares DGT en España",
                description: "Mapa de radares fijos, de tramo y móviles",
                href: "/radares",
                icon: <MapPin className="w-5 h-5" />,
              },
              {
                title: "Límites de velocidad",
                description: "Guía de límites por tipo de vía en España",
                href: "/guias/limites-velocidad-espana",
                icon: <Shield className="w-5 h-5" />,
              },
              {
                title: "Permisos de conducir",
                description: "Tipos, renovación y permiso internacional",
                href: "/dgt/permisos",
                icon: <Star className="w-5 h-5" />,
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
