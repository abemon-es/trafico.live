import Link from "next/link";
import {
  FileText,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Smartphone,
  Info,
  Shield,
  Car,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { buildPageMetadata } from "@/lib/seo/metadata";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
const CURRENT_YEAR = new Date().getFullYear();
const UPDATED_DATE = "mayo 2026";

export const revalidate = 86400;

export const metadata = buildPageMetadata({
  title: `Multas DGT ${CURRENT_YEAR}: Consulta, Pago y Recursos | trafico.live`,
  description:
    "Guía completa sobre multas de tráfico DGT en España: cómo consultar por matrícula, cómo pagar con el 50% de descuento, plazos, cómo recurrir, prescripción y el sistema DEV de notificación electrónica.",
  path: "/dgt/multas",
  keywords: [
    "multas DGT",
    "consultar multas por matrícula",
    "pagar multa DGT",
    "recurrir multa tráfico",
    "multa 50 por ciento",
    "prescripción multas tráfico",
    "DEV DGT notificaciones",
    "multas tráfico plazos",
  ],
});

const FINE_SEVERITY = [
  {
    level: "Infracción leve",
    color: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200",
    amount: "Hasta 100 €",
    points: "Sin deducción de puntos",
    examples: ["Exceso de velocidad de 1 a 20 km/h sobre el límite en vía urbana", "No llevar puesto el cinturón de seguridad en zona urbana", "Usar el móvil sin manos libres en vía urbana"],
  },
  {
    level: "Infracción grave",
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20 border-orange-200",
    amount: "Hasta 500 €",
    points: "2 a 4 puntos según infracción",
    examples: ["Exceso de velocidad de 21 a 40 km/h en vía convencional", "ITV caducada", "No respetar señal de STOP"],
  },
  {
    level: "Infracción muy grave",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20 border-red-200",
    amount: "501 € a 20.000 €",
    points: "4 a 6 puntos según infracción",
    examples: ["Conducir con una tasa de alcohol > 0,60 mg/l en aire espirado", "Exceso de velocidad > 50 km/h sobre el límite", "Conducir habiendo perdido todos los puntos"],
  },
];

const PAYMENT_STEPS = [
  { step: "01", title: "Recibe la notificación", detail: "Puedes recibir la denuncia in situ (el agente te entrega el boletín) o por correo (carta certificada al domicilio del titular del vehículo) o mediante notificación al DEV si estás suscrito." },
  { step: "02", title: "Verifica los datos", detail: "Comprueba que la matrícula, la fecha, la hora, el lugar y la infracción descrita son correctos. Cualquier error formal puede ser motivo de anulación en recurso." },
  { step: "03", title: "Decide si pagar o recurrir", detail: "Si pagas en los primeros 20 días hábiles (pronto pago), obtienes un 50% de descuento pero pierdes el derecho a recurrir. Si quieres recurrir, no pagues: el pago implica reconocimiento de la infracción." },
  { step: "04", title: "Paga o presenta alegaciones", detail: "Para pagar: Sede Electrónica DGT, app miDGT, banca online o en entidades colaboradoras (Correos, algunos bancos). Para recurrir: presenta escrito de alegaciones en el plazo de 20 días hábiles desde la notificación." },
  { step: "05", title: "Resolución del expediente", detail: "Si pagaste con descuento, el expediente se cierra. Si presentaste alegaciones, la DGT emite una resolución provisional que puedes impugnar ante el órgano sancionador y, en última instancia, por vía contencioso-administrativa." },
];

const FAQ_ITEMS = [
  {
    question: "¿Cómo puedo consultar si tengo multas pendientes por matrícula?",
    answer:
      "Puedes consultar tus multas pendientes en la Sede Electrónica de la DGT (sede.dgt.gob.es) en el apartado 'Consulta de sanciones'. Necesitas identificarte con DNI electrónico, Cl@ve PIN o certificado digital. También puedes consultar desde la app miDGT. Si eres el titular del vehículo, verás todas las denuncias asociadas a tu matrícula, incluyendo el estado del expediente (en proceso, firme, prescrita, etc.).",
  },
  {
    question: "¿Cuánto tiempo tengo para pagar una multa con el 50 % de descuento?",
    answer:
      "El plazo para pagar con el descuento del 50 % (el denominado 'pronto pago') es de 20 días hábiles desde la notificación de la denuncia. Los días hábiles no cuentan sábados, domingos ni festivos nacionales. Por ejemplo, si te notifican un lunes, tienes cuatro semanas laborales completas. Si pagas dentro de este plazo, la multa queda reducida a la mitad y el expediente se cierra, pero renuncias al derecho de recurso.",
  },
  {
    question: "¿Puede prescribir una multa de tráfico?",
    answer:
      "Sí. Las infracciones leves prescriben a los 3 meses desde la comisión de la infracción. Las infracciones graves y muy graves prescriben a los 6 meses. El plazo de prescripción se interrumpe cuando la DGT intenta notificar al infractor (si el agente te entregó el boletín en el momento, el plazo empieza a contar desde ese día). Las sanciones firmes (ya definitivas) prescriben al año de quedar firmes. Si no has recibido ninguna comunicación en esos plazos, la multa puede estar prescrita.",
  },
  {
    question: "¿Qué es el DEV y para qué sirve?",
    answer:
      "El DEV (Dirección Electrónica Vial) es el sistema de notificación electrónica de la DGT. Permite recibir todas las notificaciones de multas y expedientes sancionadores de forma electrónica, en lugar de por correo postal. Su uso es voluntario para los particulares, pero obligatorio para las empresas que cuenten con una flota de vehículos. La ventaja es que puedes consultar tus notificaciones en cualquier momento desde la sede electrónica o la app miDGT. El DEV no altera los plazos legales de pago o recurso.",
  },
  {
    question: "¿Cómo se recurre una multa de tráfico?",
    answer:
      "Tienes dos vías: (1) Recurso de reposición o alegaciones durante el trámite de audiencia, si la denuncia aún no es firme. Plazo: 20 días hábiles desde la notificación. (2) Recurso de alzada si ya existe una resolución sancionadora provisional. Plazo: 1 mes. Si el órgano sancionador desestima el recurso, puedes acudir a la vía contencioso-administrativa (juzgados). Recuerda que pagar la multa —aunque sea parcialmente— implica renuncia tácita al recurso.",
  },
  {
    question: "¿Qué pasa si no identifico al conductor cuando me llega una multa por radar?",
    answer:
      "Cuando la denuncia se impone al titular del vehículo por una infracción captada por un sistema automático (radar, semáforo fotográfico), el titular tiene la obligación de identificar al conductor real. Si no lo hace, se le imputa la responsabilidad de la infracción como si fuera el conductor. La no identificación del conductor en plazo es, a su vez, una infracción muy grave que puede suponer una multa del doble de la sanción original y hasta 6 puntos de deducción.",
  },
  {
    question: "¿Qué es la multa DEV y por qué es distinta?",
    answer:
      "No existe una 'multa DEV' como tal. El DEV es el canal de notificación (electrónico), no un tipo de multa. La confusión surge porque muchos conductores reciben notificaciones en su DEV sin haberlo activado voluntariamente: la DGT puede habilitar el DEV para determinadas categorías de conductores. Si tienes el DEV activo y no lo revisas, los plazos corren igual que si hubieras recibido una carta certificada en mano.",
  },
];

const RADAR_FINES = [
  { excess: "1 – 20 km/h", city: "100 €", conventional: "100 €", motorway: "100 €", points: "0" },
  { excess: "21 – 30 km/h", city: "300 €", conventional: "300 €", motorway: "300 €", points: "2" },
  { excess: "31 – 40 km/h", city: "400 €", conventional: "400 €", motorway: "400 €", points: "4" },
  { excess: "41 – 50 km/h", city: "500 €", conventional: "500 €", motorway: "500 €", points: "4" },
  { excess: "51 – 60 km/h", city: "500 € + 6 pt", conventional: "500 € + 6 pt", motorway: "500 € + 4 pt", points: "4–6" },
  { excess: "> 60 km/h", city: "500 € + 6 pt", conventional: "500 € + 6 pt", motorway: "500 € + 6 pt", points: "6" },
];

export default function MultasPage() {
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
    name: `Multas DGT ${CURRENT_YEAR}: Consulta, Pago y Recursos`,
    description:
      "Guía completa sobre multas de tráfico: cómo consultar, pagar con descuento, recurrir y plazos de prescripción.",
    url: `${BASE_URL}/dgt/multas`,
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    dateModified: new Date().toISOString(),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "DGT", item: `${BASE_URL}/dgt` },
        { "@type": "ListItem", position: 3, name: "Multas", item: `${BASE_URL}/dgt/multas` },
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
              { name: "Multas", href: "/dgt/multas" },
            ]}
          />

          {/* Disclaimer */}
          <div className="mb-6 flex items-start gap-3 bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-tl-amber-800 dark:text-tl-amber-200 leading-relaxed">
              <strong>trafico.live es un servicio independiente.</strong> Para consultar y pagar multas
              oficialmente acude a{" "}
              <a href="https://sede.dgt.gob.es" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                sede.dgt.gob.es
              </a>
              . Actualizado: {UPDATED_DATE}.
            </p>
          </div>

          {/* Hero */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex-shrink-0">
                <FileText className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Multas DGT {CURRENT_YEAR}: Consulta, Pago y Recursos
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
                  Si te han puesto una multa de tráfico en España, tienes plazos estrictos para
                  actuar. Esta guía explica cómo <strong>consultar tus multas</strong> por matrícula,
                  cómo <strong>pagar con el 50 % de descuento</strong>, cuándo y cómo <strong>recurrir</strong>,
                  cuáles son los <strong>plazos de prescripción</strong> y cómo funciona el sistema de
                  <strong> notificación electrónica DEV</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* TOC */}
          <nav className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 mb-8" aria-label="Índice">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">En esta guía</h2>
            <ol className="space-y-1 text-sm text-tl-600 dark:text-tl-400">
              {[
                ["#tipos", "Tipos de infracción y cuantías"],
                ["#consultar", "Cómo consultar tus multas"],
                ["#pagar", "Cómo pagar: pasos y descuento del 50 %"],
                ["#radares", "Tabla de multas por exceso de velocidad"],
                ["#recurrir", "Cómo recurrir una multa"],
                ["#plazos", "Plazos: pago, recurso y prescripción"],
                ["#dev", "El sistema DEV: notificación electrónica"],
                ["#faq", "Preguntas frecuentes"],
              ].map(([href, label]) => (
                <li key={href}><a href={href} className="hover:underline">{label}</a></li>
              ))}
            </ol>
          </nav>

          {/* Section 1: Tipos */}
          <section id="tipos" className="mb-10" aria-labelledby="h-tipos">
            <h2 id="h-tipos" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Tipos de infracción de tráfico y cuantías
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              La Ley sobre Tráfico, Circulación de Vehículos a Motor y Seguridad Vial (Real Decreto
              Legislativo 6/2015, TRLTSV) clasifica las infracciones en tres niveles de gravedad.
              Cada nivel tiene un techo de sanción económica distinto y puede conllevar —o no—
              deducción de puntos del carnet:
            </p>
            <div className="space-y-4">
              {FINE_SEVERITY.map((f) => (
                <div key={f.level} className={`rounded-lg border ${f.bg} p-5`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <h3 className={`font-bold text-lg ${f.color}`}>{f.level}</h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-mono font-bold text-gray-900 dark:text-gray-100">{f.amount}</span>
                      <span className="text-gray-500 dark:text-gray-400">{f.points}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ejemplos:</p>
                  <ul className="space-y-1">
                    {f.examples.map((e, i) => (
                      <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
              Importante: las cuantías mostradas son los importes <em>antes</em> del descuento de
              pronto pago (50 %). Las multas de radar suelen imponerse como infracción grave (hasta
              500 €) o muy grave para excesos notables, con deducción de puntos adicional.
            </p>
          </section>

          {/* Section 2: Consultar */}
          <section id="consultar" className="mb-10" aria-labelledby="h-consultar">
            <h2 id="h-consultar" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Cómo consultar tus multas pendientes
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Existen tres formas oficiales de consultar si tienes multas de tráfico pendientes en
              España. En todos los casos se accede a los datos reales del expediente sancionador de
              la DGT:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {[
                {
                  title: "Sede Electrónica DGT",
                  url: "https://sede.dgt.gob.es",
                  detail: "Accede al apartado 'Consulta de sanciones'. Necesitas DNI electrónico, Cl@ve PIN o certificado digital. Puedes ver el estado de cada expediente: en proceso, firme o prescrito.",
                  icon: <FileText className="w-5 h-5 text-tl-600 dark:text-tl-400" />,
                },
                {
                  title: "App miDGT",
                  url: null,
                  detail: "La aplicación oficial de la DGT (iOS y Android) permite consultar multas y notificaciones pendientes con identificación biométrica o Cl@ve. Muestra también el saldo de puntos y el estado de la ITV.",
                  icon: <Smartphone className="w-5 h-5 text-tl-600 dark:text-tl-400" />,
                },
                {
                  title: "Dirección Electrónica Vial (DEV)",
                  url: "https://sede.dgt.gob.es",
                  detail: "Si tienes activada la DEV, recibes notificaciones de multas en tu buzón electrónico, evitando esperas de correo certificado. Los plazos de recurso empiezan a contar desde la apertura del aviso.",
                  icon: <Info className="w-5 h-5 text-tl-600 dark:text-tl-400" />,
                },
              ].map((item, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-lg border border-tl-200 dark:border-tl-800 p-5">
                  <div className="p-2.5 bg-tl-50 dark:bg-tl-900/20 rounded-lg w-fit mb-3">
                    {item.icon}
                  </div>
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

          {/* Section 3: Pagar */}
          <section id="pagar" className="mb-10" aria-labelledby="h-pagar">
            <h2 id="h-pagar" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Cómo pagar una multa: pasos y descuento del 50 %
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Una vez notificada la denuncia, tienes exactamente <strong>20 días hábiles</strong> para
              pagar con el 50 % de descuento. Este beneficio está recogido en el art. 80 del TRLTSV.
              Pasado este plazo, deberás pagar el importe íntegro o recurrir.
            </p>

            {/* Discount callout */}
            <div className="flex items-start gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg p-4 mb-6">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-green-800 dark:text-green-200 text-sm mb-0.5">
                  Descuento del 50 % — pronto pago
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">
                  Plazo: 20 días hábiles desde la notificación. Al pagar, aceptas los hechos y renuncias
                  al recurso. La multa queda cancelada y el expediente se cierra. Si había deducción de
                  puntos, se aplica igualmente aunque pagues con descuento.
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {PAYMENT_STEPS.map((step) => (
                <div key={step.step} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 flex items-start gap-3">
                  <span className="text-2xl font-black font-mono text-tl-200 dark:text-tl-800 flex-shrink-0 leading-none">{step.step}</span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{step.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Puedes pagar a través de la Sede Electrónica de la DGT con tarjeta bancaria, mediante
              transferencia bancaria con el código de referencia del expediente, o en oficinas de
              Correos y entidades financieras colaboradoras con el justificante de la multa.
            </p>
          </section>

          {/* Section 4: Radares */}
          <section id="radares" className="mb-10" aria-labelledby="h-radares">
            <h2 id="h-radares" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Tabla de multas por exceso de velocidad ({CURRENT_YEAR})
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Las sanciones por exceso de velocidad se calculan en función del exceso sobre el límite
              de la vía y del tipo de vía. Los importes que se muestran son <em>antes</em> del
              descuento de pronto pago:
            </p>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Exceso</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Vía urbana</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Vía convencional</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Autopista/Autovía</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Puntos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {RADAR_FINES.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-gray-800 dark:text-gray-200">{row.excess}</td>
                        <td className="py-2.5 px-4 text-gray-700 dark:text-gray-300">{row.city}</td>
                        <td className="py-2.5 px-4 text-gray-700 dark:text-gray-300">{row.conventional}</td>
                        <td className="py-2.5 px-4 text-gray-700 dark:text-gray-300">{row.motorway}</td>
                        <td className="py-2.5 px-4 font-semibold text-red-600 dark:text-red-400">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                Fuente: TRLTSV (RDL 6/2015). Importes antes de la reducción del 50 % por pronto pago.
                Las velocidades incluyen el margen de tolerancia del equipo de medición, que varía por fabricante y calibración.
              </p>
            </div>
          </section>

          {/* Section 5: Recurrir */}
          <section id="recurrir" className="mb-10" aria-labelledby="h-recurrir">
            <h2 id="h-recurrir" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Cómo recurrir una multa de tráfico
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Si consideras que la multa es injusta, puedes recurrirla. El proceso tiene distintas
              fases administrativas antes de llegar, si es necesario, a la vía judicial. Es
              fundamental <strong>no pagar</strong> si vas a recurrir: el pago implica conformidad
              con la sanción y cierra la vía del recurso.
            </p>
            <div className="space-y-3 mb-6">
              {[
                {
                  title: "1. Alegaciones en período de audiencia (antes de la resolución)",
                  detail: "Si la denuncia aún no es firme, tienes 20 días hábiles para presentar un escrito de alegaciones ante el órgano sancionador indicado en la notificación. Puedes hacerlo por escrito o de forma electrónica desde la sede.dgt.gob.es.",
                  tag: "Plazo: 20 días hábiles",
                  tagColor: "text-tl-600 dark:text-tl-400 bg-tl-50 dark:bg-tl-900/20",
                },
                {
                  title: "2. Recurso de reposición (tras la resolución sancionadora)",
                  detail: "Si el órgano sancionador emite una resolución y la desestima, puedes presentar un recurso de reposición de carácter potestativo. Plazo: 1 mes desde la notificación de la resolución.",
                  tag: "Plazo: 1 mes",
                  tagColor: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20",
                },
                {
                  title: "3. Recurso contencioso-administrativo",
                  detail: "Si el recurso de reposición es desestimado —o si lo omites—, puedes recurrir ante los juzgados de lo contencioso-administrativo. Este paso requiere abogado y procurador si el importe supera los 30.000 €, pero para multas de tráfico normales es posible actuar sin representación legal si la cuantía es reducida. Plazo: 2 meses desde la resolución del recurso de reposición.",
                  tag: "Plazo: 2 meses",
                  tagColor: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
                },
              ].map((step, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{step.title}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${step.tagColor}`}>{step.tag}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{step.detail}</p>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-3 bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-lg p-4">
              <Info className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-tl-amber-700 dark:text-tl-amber-300 leading-relaxed">
                <strong>Motivos habituales de anulación en recurso:</strong> error en los datos de la
                denuncia (matrícula, hora, lugar), falta de calibración homologada del radar, ausencia
                de señalización previa al radar o notificación defectuosa (si no se siguió el
                procedimiento correcto).
              </p>
            </div>
          </section>

          {/* Section 6: Plazos */}
          <section id="plazos" className="mb-10" aria-labelledby="h-plazos">
            <h2 id="h-plazos" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Plazos clave: pago, recurso y prescripción
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Pronto pago (50 % descuento)", value: "20 días hábiles", color: "text-green-600 dark:text-green-400", detail: "Desde la notificación de la denuncia" },
                { label: "Plazo para alegaciones", value: "20 días hábiles", color: "text-tl-600 dark:text-tl-400", detail: "Desde la notificación. Incompatible con el pago" },
                { label: "Prescripción de infracción leve", value: "3 meses", color: "text-gray-600 dark:text-gray-400", detail: "Desde la comisión de la infracción" },
                { label: "Prescripción de infracción grave/muy grave", value: "6 meses", color: "text-orange-600 dark:text-orange-400", detail: "Desde la comisión de la infracción" },
                { label: "Prescripción de la sanción firme", value: "1 año", color: "text-red-600 dark:text-red-400", detail: "Desde que la multa adquirió firmeza" },
                { label: "Recurso de reposición", value: "1 mes", color: "text-purple-600 dark:text-purple-400", detail: "Desde la notificación de la resolución" },
              ].map((item, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                  <p className={`text-2xl font-black font-mono ${item.color}`}>{item.value}</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mt-1">{item.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 7: DEV */}
          <section id="dev" className="mb-10" aria-labelledby="h-dev">
            <h2 id="h-dev" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              El sistema DEV: Dirección Electrónica Vial
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              La <strong>Dirección Electrónica Vial (DEV)</strong> es el buzón electrónico oficial de
              la DGT para la recepción de notificaciones de multas, expedientes y comunicaciones
              administrativas relacionadas con vehículos y permisos de conducción.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {[
                {
                  title: "¿Para quién es obligatorio el DEV?",
                  detail: "Para personas jurídicas (empresas y flotas de vehículos) es obligatorio desde 2015. Para particulares es voluntario, aunque la DGT puede activarlo para determinadas categorías.",
                },
                {
                  title: "¿Qué ventajas ofrece?",
                  detail: "Recibes la notificación al instante (sin esperar el correo postal), puedes acceder al expediente completo desde el primer día y los plazos quedan registrados con exactitud.",
                },
                {
                  title: "¿Cuándo empieza a correr el plazo?",
                  detail: "El plazo de recurso y pago empieza a contar desde que abres la notificación en el DEV, o a los 10 días naturales si no la abres (desde que estuvo disponible en el buzón).",
                },
                {
                  title: "¿Cómo activar o desactivar el DEV?",
                  detail: "Accede a sede.dgt.gob.es con identificación electrónica, entra en 'Mi DEV' y gestiona las suscripciones. También puedes darte de alta presencialmente en cualquier Jefatura Provincial de Tráfico.",
                },
              ].map((item, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">{item.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>

            {/* Official link callout */}
            <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-lg p-5">
              <h3 className="font-bold text-tl-800 dark:text-tl-200 mb-2 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Trámite oficial: consulta y pago de multas
              </h3>
              <p className="text-sm text-tl-700 dark:text-tl-300 mb-3">
                El canal oficial para consultar, pagar y recurrir multas de tráfico es la Sede
                Electrónica de la DGT. Necesitarás DNI electrónico, Cl@ve o certificado digital.
              </p>
              <div className="flex flex-wrap gap-2">
                <a href="https://sede.dgt.gob.es/es/tramites-y-multas/sanciones-de-trafico/" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-tl-600 text-white rounded-lg text-sm font-medium hover:bg-tl-700 transition-colors">
                  Consultar sanciones <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a href="https://sede.dgt.gob.es/es/tramites-y-multas/sanciones-de-trafico/pago-de-sanciones/" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-tl-300 text-tl-700 dark:text-tl-300 rounded-lg text-sm font-medium hover:bg-tl-50 transition-colors">
                  Pagar multa <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </section>

          {/* Section 8: Identificación conductor */}
          <section className="mb-10" aria-labelledby="h-identificacion">
            <h2 id="h-identificacion" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Obligación de identificar al conductor en multas por radar
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Cuando una infracción es captada por un sistema automático (radar, cámara semafórica,
              control de tramo), la denuncia se dirige inicialmente al titular del vehículo. Si el
              titular no era el conductor en el momento de la infracción, tiene la obligación legal
              de identificar quién conducía.
            </p>
            <div className="space-y-3">
              {[
                {
                  title: "El titular debe identificar al conductor real",
                  detail: "En el plazo indicado en la notificación (habitualmente 20 días hábiles), el titular debe comunicar el nombre, DNI y domicilio del conductor. Esta comunicación se puede hacer en la sede.dgt.gob.es o por escrito ante la Jefatura Provincial.",
                  icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
                },
                {
                  title: "No identificar al conductor es una infracción muy grave",
                  detail: "La negativa a identificar al conductor (o la identificación de una persona que no estaba conduciendo) se sanciona como infracción muy grave, con una multa del doble de la sanción original y hasta 6 puntos de deducción.",
                  icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
                },
                {
                  title: "Empresas de alquiler de vehículos (rent-a-car)",
                  detail: "Las empresas de alquiler tienen la obligación de tener disponibles los contratos de arrendamiento y facilitar los datos del conductor. La falta de identificación por parte de una empresa se sanciona con mayor rigor que en el caso de particulares.",
                  icon: <Car className="w-4 h-4 text-orange-500" />,
                },
              ].map((item, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{item.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="mb-10" aria-labelledby="h-faq">
            <h2 id="h-faq" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Preguntas frecuentes sobre multas DGT
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

          {/* Related links */}
          <RelatedLinks
            title="Páginas relacionadas en trafico.live"
            links={[
              {
                title: "Carnet por puntos",
                description: "Consulta tu saldo y la tabla de infracciones",
                href: "/dgt/carnet-puntos",
                icon: <Shield className="w-5 h-5" />,
              },
              {
                title: "Radares DGT en España",
                description: "Mapa interactivo de radares fijos, de tramo y móviles",
                href: "/radares",
                icon: <MapPin className="w-5 h-5" />,
              },
              {
                title: "Puntos negros de carretera",
                description: "Tramos de mayor accidentalidad por vía",
                href: "/puntos-negros",
                icon: <AlertTriangle className="w-5 h-5" />,
              },
              {
                title: "ITV: precio y cita previa",
                description: "Todo sobre la inspección técnica de vehículos",
                href: "/dgt/itv",
                icon: <Clock className="w-5 h-5" />,
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
