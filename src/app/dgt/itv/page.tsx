import Link from "next/link";
import {
  Shield,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Car,
  Clock,
  MapPin,
  Wrench,
  Calendar,
  Info,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { buildPageMetadata } from "@/lib/seo/metadata";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
const CURRENT_YEAR = new Date().getFullYear();
const UPDATED_DATE = "mayo 2026";

export const revalidate = 86400;

export const metadata = buildPageMetadata({
  title: `ITV ${CURRENT_YEAR}: Precio, Cita Previa y Qué Revisan | trafico.live`,
  description:
    "Guía completa de la ITV en España: precio según tipo de vehículo, cómo pedir cita previa por comunidad autónoma, qué documentación llevar, qué aspectos comprueban y consecuencias de pasar la ITV con defectos.",
  path: "/dgt/itv",
  keywords: [
    "ITV España",
    "precio ITV 2026",
    "cita previa ITV",
    "qué revisan en la ITV",
    "ITV coche",
    "ITV moto",
    "ITV defectos",
    "cuándo pasar la ITV",
    "ITV caducada multa",
  ],
});

const ITV_PRICES = [
  { type: "Turismo hasta 3.500 kg (gasolina)", price: "~36–65 €", notes: "Varía por CCAA y estación" },
  { type: "Turismo hasta 3.500 kg (diésel)", price: "~38–68 €", notes: "Ligero recargo por gases" },
  { type: "Turismo eléctrico / híbrido", price: "~34–60 €", notes: "Sin prueba de gases" },
  { type: "Furgoneta / vehículo pesado", price: "~50–110 €", notes: "Por MMA; en vehículos >3.500 kg" },
  { type: "Motocicleta / ciclomotor", price: "~20–45 €", notes: "Menor tiempo de inspección" },
  { type: "Remolque / semirremolque", price: "~30–60 €", notes: "Por peso máximo autorizado" },
  { type: "Inspección periódica GLP / GNC", price: "+10–20 € adicional", notes: "Inspección específica del depósito" },
];

const ITV_FREQUENCY = [
  { type: "Turismos y motocicletas nuevos", rule: "Primeros 4 años: exentos. Del 4.º al 10.º año: cada 2 años. A partir del 10.º año: anual." },
  { type: "Vehículos comerciales ligeros (<3.500 kg)", rule: "Primer año: exento. Del 1.º al 6.º: cada 2 años. A partir del 6.º: anual." },
  { type: "Camiones y autobuses", rule: "Bianual hasta los 2 años. Anual a partir del 2.º año. Semestral en algunas categorías de transporte público." },
  { type: "Remolques y semirremolques", rule: "Primera inspección a los 3 años. Bianual hasta los 6. Anual a partir del 6.º año." },
  { type: "Taxis y vehículos de alquiler", rule: "Anual desde el primer año de matriculación." },
  { type: "Ambulancias y vehículos de emergencias", rule: "Anual desde el primer año." },
];

const INSPECTION_ITEMS = [
  { category: "Frenos", items: ["Eficacia de freno de servicio", "Freno de mano", "Sistema ABS si procede"] },
  { category: "Dirección y suspensión", items: ["Juego en volante", "Rótulas y terminales", "Amortiguadores"] },
  { category: "Visibilidad", items: ["Estado del parabrisas", "Limpiaparabrisas y lavaparabrisas", "Retrovisores"] },
  { category: "Alumbrado y señalización", items: ["Luces de cruce y carretera", "Luces de posición, giro y stop", "Alineación de faros"] },
  { category: "Motor y emisiones", items: ["Opacidad gases diésel", "CO y HC gasolina", "OBD si aplica (Euro 5/6)"] },
  { category: "Carrocería y bastidor", items: ["Corrosión estructural", "Estado de anclajes de cinturones", "Enganche de remolque si aplica"] },
  { category: "Neumáticos y ruedas", items: ["Profundidad del dibujo (mín. 1,6 mm)", "Presión y estado visual", "Llanta y pernos"] },
  { category: "Documentación", items: ["Permiso de circulación en vigor", "Seguro obligatorio vigente", "Tarjeta de inspección anterior"] },
];

const DEFECT_LEVELS = [
  {
    level: "Defecto leve (DL)",
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200",
    icon: <AlertTriangle className="w-4 h-4" />,
    description: "No compromete la seguridad ni el medio ambiente. El vehículo obtiene el resultado FAVORABLE pero debe subsanar el defecto antes de la próxima inspección.",
    examples: ["Bombilla de posición fundida", "Raya superficial en parabrisas fuera del campo de visión"],
  },
  {
    level: "Defecto grave (DG)",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20 border-orange-200",
    icon: <XCircle className="w-4 h-4" />,
    description: "Puede comprometer la seguridad, afectar al medio ambiente o poner en peligro a otros usuarios. Resultado DESFAVORABLE. El vehículo puede circular hasta la siguiente inspección, pero debe subsanar y reinspeccionar.",
    examples: ["Luz de freno inoperativa", "Eficacia de frenos insuficiente (pero dentro de ciertos márgenes)", "Opacidad de gases diésel elevada"],
  },
  {
    level: "Defecto muy grave (DMG)",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20 border-red-200",
    icon: <XCircle className="w-4 h-4" />,
    description: "Constituye un peligro directo e inmediato para la seguridad vial. Resultado NEGATIVO. El vehículo NO puede circular desde el momento de la inspección hasta la subsanación. Circular con resultado negativo es una infracción muy grave.",
    examples: ["Frenos prácticamente inoperativos", "Dirección sin control", "Rotura estructural del chasis"],
  },
];

const CCAA_LINKS = [
  { name: "Madrid", url: "https://itvcorredor.es" },
  { name: "Cataluña", url: "https://citas.applus.com" },
  { name: "Andalucía", url: "https://www.itvandalucia.es" },
  { name: "C. Valenciana", url: "https://itvs.gva.es" },
  { name: "País Vasco", url: "https://itvgipuzkoa.eus" },
  { name: "Galicia", url: "https://itvgalicia.xunta.gal" },
  { name: "Castilla y León", url: "https://itvcastillayleon.jcyl.es" },
  { name: "Aragón", url: "https://itvaragon.es" },
];

const FAQ_ITEMS = [
  {
    question: "¿Cuánto cuesta la ITV en España en 2026?",
    answer:
      "El precio de la ITV en España varía según la comunidad autónoma, el tipo de vehículo y la estación ITV concreta. Para un turismo de gasolina, el rango habitual es de 36 a 65 euros. Los vehículos diésel pagan un ligero recargo por la prueba de opacidad de gases. Las motos suelen ser más económicas (20–45 €) y los vehículos pesados más caros (50–110 €). Las CCAA con precios regulados (Madrid, Andalucía) tienden a ser más económicas que las que tienen el servicio liberalizado.",
  },
  {
    question: "¿Qué pasa si se me pasa la fecha de la ITV?",
    answer:
      "Circular con la ITV caducada es una infracción grave según la Ley de Tráfico (art. 76.j), con una multa de hasta 200 €. Si la ITV lleva más de dos meses caducada, la sanción puede ascender a 500 €. Además, si tienes un accidente con la ITV caducada, tu compañía aseguradora puede reclamar el importe de los daños que cubra. Lo recomendable es pedir cita antes de la fecha de vencimiento que figura en la pegatina o en la tarjeta de inspección.",
  },
  {
    question: "¿Qué documentos necesito llevar a la ITV?",
    answer:
      "Para pasar la ITV necesitas: (1) El permiso de circulación original en vigor. (2) El DNI o NIE del titular o una autorización firmada si acude un tercero. (3) Justificante del seguro obligatorio de circulación en vigor. (4) La tarjeta de inspección técnica de la última ITV pasada (si no es la primera). (5) En vehículos adaptados, el certificado de adaptación. No es necesario llevar la ficha técnica (permiso de circulación) en papel si el vehículo está actualizado en el registro de la DGT.",
  },
  {
    question: "¿Puedo circular después de obtener un resultado desfavorable (defecto grave)?",
    answer:
      "Sí. Con defecto grave puedes circular durante un plazo máximo de dos meses (el tiempo que tienes para subsanar el defecto y acudir a una reinspección). Sin embargo, si obtienes un resultado negativo por defecto muy grave, el vehículo queda inmovilizado y no puede circular hasta que se subsane y supere una nueva inspección. En ese caso debes llamar a una grúa.",
  },
  {
    question: "¿Cuánto cuesta una reinspección de ITV?",
    answer:
      "Si el vehículo suspende la ITV y debes volver a inspeccionarlo, la reinspección (dentro del plazo de dos meses) suele costar entre el 30 % y el 60 % del precio de la inspección completa, dependiendo de la comunidad autónoma y la estación. Si dejas pasar los dos meses sin reinspeccionar, tendrás que pagar una inspección completa de nuevo.",
  },
  {
    question: "¿Con qué antelación puedo pasar la ITV antes de su vencimiento?",
    answer:
      "Puedes pasar la ITV hasta tres meses antes de la fecha de vencimiento sin perder el periodo de vigencia. Es decir, si tu ITV vence el 1 de octubre, puedes pasarla desde el 1 de julio y la nueva fecha de vencimiento se calculará desde el 1 de octubre, no desde el día de la inspección. Esto te permite planificar la cita con tranquilidad y evitar colas en fechas límite.",
  },
  {
    question: "¿Qué es la ITV periódica y en qué se diferencia de la ITV voluntaria?",
    answer:
      "La ITV periódica es la inspección obligatoria que todos los vehículos deben pasar con la frecuencia establecida según su tipo y antigüedad. La ITV voluntaria es la que realiza el titular por decisión propia, por ejemplo antes de comprar o vender un vehículo de segunda mano, para verificar su estado. El resultado de una ITV voluntaria no modifica la fecha de vencimiento de la ITV periódica.",
  },
  {
    question: "¿Qué revisan exactamente en la ITV de un vehículo eléctrico?",
    answer:
      "Los vehículos eléctricos pasan una ITV adaptada: no se realiza la prueba de emisiones de escape (no la hay), pero sí se comprueban el estado del sistema de batería de tracción y sus protecciones, los cables de alta tensión y conectores, el aislamiento eléctrico del sistema de propulsión, el estado de los frenos (incluido el freno regenerativo), iluminación, suspensión y el resto de elementos comunes a cualquier vehículo. El precio suele ser ligeramente inferior al de un turismo de combustión.",
  },
];

export default function ITVPage() {
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
    name: `ITV ${CURRENT_YEAR}: Precio, Cita Previa y Qué Revisan`,
    description:
      "Guía completa sobre la Inspección Técnica de Vehículos en España: precios por tipo, frecuencia, documentación y defectos.",
    url: `${BASE_URL}/dgt/itv`,
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
    dateModified: new Date().toISOString(),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "DGT", item: `${BASE_URL}/dgt` },
        { "@type": "ListItem", position: 3, name: "ITV", item: `${BASE_URL}/dgt/itv` },
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
              { name: "ITV", href: "/dgt/itv" },
            ]}
          />

          {/* Disclaimer */}
          <div className="mb-6 flex items-start gap-3 bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-tl-amber-800 dark:text-tl-amber-200 leading-relaxed">
              <strong>trafico.live es un servicio independiente.</strong> Para trámites oficiales
              acude a{" "}
              <a href="https://www.dgt.es" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                dgt.es
              </a>{" "}
              o pide cita directamente en tu estación ITV. Actualizado: {UPDATED_DATE}.
            </p>
          </div>

          {/* Hero */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="p-3 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">
                <Shield className="w-8 h-8 text-tl-600 dark:text-tl-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  ITV {CURRENT_YEAR}: Precio, Cita Previa y Qué Revisan
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
                  La <strong>Inspección Técnica de Vehículos (ITV)</strong> es obligatoria para todos
                  los vehículos que circulan por España. Esta guía responde a todas las preguntas
                  habituales: cuánto cuesta, con qué frecuencia hay que pasarla, qué documentación
                  llevar, qué comprueba el inspector y qué consecuencias tiene suspender.
                </p>
              </div>
            </div>
          </div>

          {/* TOC */}
          <nav className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 mb-8" aria-label="Índice de contenidos">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">En esta guía</h2>
            <ol className="space-y-1 text-sm text-tl-600 dark:text-tl-400">
              {[
                ["#precio", "Precio de la ITV por tipo de vehículo"],
                ["#frecuencia", "Con qué frecuencia hay que pasar la ITV"],
                ["#documentacion", "Qué documentación llevar"],
                ["#que-revisan", "Qué revisan en la ITV"],
                ["#defectos", "Tipos de defecto: leve, grave y muy grave"],
                ["#cita-previa", "Cómo pedir cita previa por CCAA"],
                ["#caducada", "Qué pasa si la ITV está caducada"],
                ["#faq", "Preguntas frecuentes"],
              ].map(([href, label]) => (
                <li key={href}>
                  <a href={href} className="hover:underline">
                    {label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Section 1: Precio */}
          <section id="precio" className="mb-10" aria-labelledby="h-precio">
            <h2 id="h-precio" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Precio de la ITV por tipo de vehículo ({CURRENT_YEAR})
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              El precio de la ITV no está unificado a nivel nacional. Cada comunidad autónoma fija
              las tarifas máximas y, en muchas de ellas, el servicio está liberalizado, por lo que
              los precios varían de una estación a otra. Como referencia, estos son los rangos
              habituales en {CURRENT_YEAR}:
            </p>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Tipo de vehículo</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Precio orientativo</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {ITV_PRICES.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-2.5 px-4 text-gray-800 dark:text-gray-200 font-medium">{row.type}</td>
                        <td className="py-2.5 px-4 font-mono text-tl-700 dark:text-tl-300 font-bold">{row.price}</td>
                        <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400 text-xs">{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                Precios orientativos para {CURRENT_YEAR}. Consulta el precio exacto en tu estación ITV antes de acudir.
              </p>
            </div>
            <div className="flex items-start gap-3 bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-lg p-4">
              <Info className="w-5 h-5 text-tl-600 dark:text-tl-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-tl-700 dark:text-tl-300 leading-relaxed">
                En Madrid, Andalucía y algunas otras comunidades los precios están regulados por
                decreto autonómico. En Cataluña, la Comunidad Valenciana y el País Vasco las
                estaciones tienen mayor libertad de tarificación. Siempre puedes comparar precios
                llamando directamente a varias estaciones ITV de tu zona.
              </p>
            </div>
          </section>

          {/* Section 2: Frecuencia */}
          <section id="frecuencia" className="mb-10" aria-labelledby="h-frecuencia">
            <h2 id="h-frecuencia" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Con qué frecuencia hay que pasar la ITV
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              La periodicidad de la ITV está regulada por el Real Decreto 920/2017, de 23 de octubre,
              sobre la inspección técnica de vehículos, que transpone la Directiva 2014/45/UE del
              Parlamento Europeo. El calendario varía según el tipo de vehículo y su antigüedad:
            </p>
            <div className="space-y-3">
              {ITV_FREQUENCY.map((row, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-tl-500 dark:text-tl-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{row.type}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{row.rule}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
              La fecha de vencimiento de tu ITV figura en la pegatina del parabrisas y en la tarjeta
              de inspección técnica que te entregan al pasar la ITV. También puedes consultarla en la
              app <strong>miDGT</strong> o en la Sede Electrónica de la DGT introduciendo tu
              matrícula.
            </p>
          </section>

          {/* Section 3: Documentación */}
          <section id="documentacion" className="mb-10" aria-labelledby="h-documentacion">
            <h2 id="h-documentacion" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Qué documentación llevar a la ITV
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Antes de acudir a la estación ITV, comprueba que llevas toda la documentación en vigor.
              Acudir sin alguno de estos documentos puede suponer que la estación no realice la
              inspección:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  title: "Permiso de circulación original",
                  detail: "El documento azul de la DGT que acredita que el vehículo está matriculado a tu nombre. No vale una fotocopia.",
                },
                {
                  title: "DNI / NIE del conductor",
                  detail: "Si no es el titular quien lleva el vehículo, será necesaria una autorización firmada por el titular.",
                },
                {
                  title: "Seguro obligatorio en vigor",
                  detail: "El recibo del seguro o el certificado de cobertura. Las estaciones ITV consultan automáticamente el Fichero Informativo de Vehículos Asegurados (FIVA).",
                },
                {
                  title: "Tarjeta de inspección técnica anterior",
                  detail: "La tarjeta verde (o blanca) de la última ITV. Para la primera inspección de un vehículo nuevo no es necesaria.",
                },
                {
                  title: "Certificado de reformas (si aplica)",
                  detail: "Si el vehículo ha sido reformado (kit gas, llantas fuera de especificación, barras antivuelco…) debes aportar la documentación de la homologación de la reforma.",
                },
                {
                  title: "Placa de matrícula legible",
                  detail: "Aunque no es un documento, es obligatorio que la placa esté limpia y legible antes de entrar en la estación. Las cámaras de registro automático deben poder leerla.",
                },
              ].map((doc, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{doc.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{doc.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Qué revisan */}
          <section id="que-revisan" className="mb-10" aria-labelledby="h-que-revisan">
            <h2 id="h-que-revisan" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Qué revisan en la ITV: los 8 bloques de inspección
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              La inspección técnica de vehículos en España sigue el protocolo establecido en el Real
              Decreto 920/2017 y las instrucciones técnicas complementarias del Ministerio de
              Transportes. Se divide en ocho grandes bloques que cubren más de 190 ítems de
              comprobación:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {INSPECTION_ITEMS.map((block, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="w-4 h-4 text-tl-500 dark:text-tl-400" />
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{block.category}</h3>
                  </div>
                  <ul className="space-y-1">
                    {block.items.map((item, j) => (
                      <li key={j} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-tl-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
              El inspector también comprobará que el número de bastidor visible en el vehículo
              coincide con el que figura en el permiso de circulación, para verificar que no hay
              manipulaciones fraudulentas.
            </p>
          </section>

          {/* Section 5: Defectos */}
          <section id="defectos" className="mb-10" aria-labelledby="h-defectos">
            <h2 id="h-defectos" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Tipos de defecto: leve, grave y muy grave
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Si el inspector detecta anomalías en algún elemento del vehículo, las clasifica en
              tres categorías según su gravedad. Esta clasificación determina el resultado oficial de
              la inspección y si el vehículo puede seguir circulando:
            </p>
            <div className="space-y-4">
              {DEFECT_LEVELS.map((d, i) => (
                <div key={i} className={`rounded-lg border ${d.bg} p-5`}>
                  <div className={`flex items-center gap-2 mb-2 font-bold ${d.color}`}>
                    {d.icon}
                    {d.level}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 leading-relaxed">{d.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <strong>Ejemplos:</strong> {d.examples.join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 6: Cita previa */}
          <section id="cita-previa" className="mb-10" aria-labelledby="h-cita">
            <h2 id="h-cita" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Cómo pedir cita previa por comunidad autónoma
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              La cita previa para la ITV se gestiona directamente con la red de estaciones de cada
              comunidad autónoma. No existe un portal nacional unificado, ya que el servicio de ITV
              está transferido a las comunidades. Las principales redes ofrecen cita online en sus
              webs o por teléfono:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {CCAA_LINKS.map((ccaa) => (
                <a
                  key={ccaa.name}
                  href={ccaa.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-3 hover:border-tl-300 hover:shadow-sm transition-all text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  <MapPin className="w-3.5 h-3.5 text-tl-500 flex-shrink-0" />
                  {ccaa.name}
                  <ExternalLink className="w-3 h-3 text-gray-400 ml-auto" />
                </a>
              ))}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Para comunidades no listadas, busca el nombre de tu comunidad autónoma junto a &quot;cita
              ITV&quot; o consulta directamente en la estación ITV más cercana. Los datos de localización
              de todas las estaciones ITV homologadas están en el portal oficial de la DGT.
            </p>
          </section>

          {/* Section 7: ITV caducada */}
          <section id="caducada" className="mb-10" aria-labelledby="h-caducada">
            <h2 id="h-caducada" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Qué pasa si circulas con la ITV caducada
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Circular sin la ITV en vigor es una infracción que puede tener consecuencias económicas
              y también afectar a tu cobertura del seguro. Aquí están las implicaciones más relevantes:
            </p>
            <div className="space-y-3 mb-6">
              {[
                {
                  title: "Multa de hasta 200 € (infracción grave)",
                  detail: "Según el art. 76.j del texto refundido de la Ley sobre Tráfico (TRLTSV), circular sin ITV en vigor es una infracción grave. Si la ITV lleva menos de dos meses caducada, la sanción habitual es de 200 €.",
                  icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
                },
                {
                  title: "Hasta 500 € si lleva más de dos meses caducada",
                  detail: "Si la ITV supera los dos meses de vencimiento, la sanción puede ser considerada como infracción muy grave, elevando la multa a hasta 500 €. Algunos agentes pueden incluso ordenar la retirada del vehículo hasta que se regularice la situación.",
                  icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
                },
                {
                  title: "Posible reclamación de la aseguradora",
                  detail: "Si sufres un accidente con la ITV caducada, la compañía aseguradora puede reclamarte el importe que ella haya abonado a los perjudicados, al considerarse que el vehículo no estaba en condiciones legales de circular.",
                  icon: <AlertCircle className="w-5 h-5 text-red-600" />,
                },
                {
                  title: "No pierdes puntos del carnet",
                  detail: "Circular con ITV caducada no conlleva deducción de puntos del permiso de conducir. Es una infracción administrativa del vehículo, no una infracción por conducción.",
                  icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
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

            {/* Official link callout */}
            <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-lg p-5">
              <h3 className="font-bold text-tl-800 dark:text-tl-200 mb-2 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Trámite oficial: consulta la fecha de vencimiento de tu ITV
              </h3>
              <p className="text-sm text-tl-700 dark:text-tl-300 mb-3 leading-relaxed">
                Puedes consultar cuándo vence la ITV de tu vehículo en la Sede Electrónica de la DGT
                introduciendo la matrícula. No es necesaria identificación para esta consulta básica.
              </p>
              <a
                href="https://sede.dgt.gob.es/es/tramites-y-multas/vehiculos/itv/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-tl-600 text-white rounded-lg text-sm font-medium hover:bg-tl-700 transition-colors"
              >
                Consultar ITV en sede.dgt.gob.es
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </section>

          {/* Section 8: Preparar el vehículo */}
          <section className="mb-10" aria-labelledby="h-preparar">
            <h2 id="h-preparar" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Cómo preparar el vehículo antes de la ITV
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Aunque la ITV no es un examen que se pueda &quot;estudiar&quot; a última hora, sí puedes revisar
              los puntos más habituales de fallo para llegar con más garantías de superarla a la
              primera, ahorrando el coste de una reinspección:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                "Comprueba que todas las luces funcionan correctamente (incluidas las de freno, marcha atrás y antiniebla)",
                "Verifica la presión y el estado visual de los neumáticos, incluido el de repuesto",
                "Asegúrate de que el claxon funciona y que los limpiaparabrisas no dejan rayas",
                "Comprueba que los retrovisores están bien ajustados y sin roturas",
                "Revisa el nivel de fluidos: líquido de frenos, dirección asistida y agua del limpiaparabrisas",
                "Asegúrate de que los cinturones se enganchan y se sueltan correctamente en todos los asientos",
                "Verifica que la matrícula es legible y está firmemente sujeta",
                "Si tienes el testigo de motor (MIL) encendido en el cuadro, repáralo antes de ir — es un fallo de diagnóstico OBD que provoca resultado desfavorable",
              ].map((tip, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-3 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 9: ITV en segunda mano */}
          <section className="mb-10" aria-labelledby="h-segunda-mano">
            <h2 id="h-segunda-mano" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              ITV y compraventa de vehículos de segunda mano
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Cuando compras o vendes un vehículo de segunda mano, la ITV juega un papel importante.
              Estos son los puntos clave que debes conocer:
            </p>
            <div className="space-y-3">
              {[
                {
                  title: "La ITV en vigor es necesaria para la transferencia",
                  detail: "Para inscribir el cambio de titularidad en la DGT, el vehículo debe tener la ITV vigente (salvo que tenga menos de 4 años de antigüedad y esté exento por su periodicidad). Si está caducada, el comprador tendrá que pasarla antes de poder matricular el vehículo a su nombre.",
                },
                {
                  title: "La ITV voluntaria como garantía en la compraventa",
                  detail: "Antes de comprar un vehículo de ocasión, puedes pedir al vendedor que pase una ITV voluntaria o hacerlo tú mismo. El informe de inspección te revelará los defectos que tiene el vehículo con el nivel de detalle de un inspector oficial, algo que ninguna revisión visual puede ofrecer.",
                },
                {
                  title: "El resultado de la ITV no caduca por cambio de titular",
                  detail: "Si el vehículo tiene la ITV en vigor, el periodo de vigencia se mantiene aunque cambie de propietario. La fecha de vencimiento no se reinicia en el momento de la transferencia.",
                },
                {
                  title: "Consulta el historial de ITV",
                  detail: "En la Sede Electrónica de la DGT puedes consultar el historial de inspecciones de cualquier vehículo con su matrícula. Esto te permitirá ver si el vehículo ha suspendido repetidamente o ha tenido defectos graves recurrentes.",
                },
              ].map((item, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-start gap-2">
                    <Car className="w-4 h-4 text-tl-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{item.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 10: Estadísticas ITV */}
          <section className="mb-10" aria-labelledby="h-estadisticas">
            <h2 id="h-estadisticas" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Datos de ITV en España: cifras clave
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              España cuenta con más de 1.000 estaciones ITV autorizadas distribuidas por todo el
              territorio nacional. Cada año se realizan más de 22 millones de inspecciones técnicas,
              con una tasa de suspensión (resultado desfavorable o negativo en la primera visita)
              que ronda el 30–35 % de los vehículos inspeccionados.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { value: ">1.000", label: "Estaciones ITV en España" },
                { value: "22M+", label: "Inspecciones anuales" },
                { value: "~30 %", label: "Tasa de suspensión" },
                { value: "Real Decreto 920/2017", label: "Base normativa vigente" },
              ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
                  <p className="text-xl font-bold font-mono text-tl-600 dark:text-tl-400">{stat.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="mb-10" aria-labelledby="h-faq">
            <h2 id="h-faq" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Preguntas frecuentes sobre la ITV
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
              Trámite oficial DGT
            </h3>
            <p className="text-sm text-tl-700 dark:text-tl-300 mb-3">
              Para cualquier consulta oficial sobre la ITV de tu vehículo, acude a la Sede Electrónica de la DGT.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="https://sede.dgt.gob.es/es/tramites-y-multas/vehiculos/itv/" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-tl-600 text-white rounded-lg text-sm font-medium hover:bg-tl-700 transition-colors">
                Consulta ITV <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a href="https://www.dgt.es/nuestros-servicios/vehiculos/itv/" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-tl-300 text-tl-700 dark:text-tl-300 rounded-lg text-sm font-medium hover:bg-tl-50 transition-colors">
                Información oficial DGT <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Related links */}
          <RelatedLinks
            title="Páginas relacionadas en trafico.live"
            links={[
              {
                title: "Multas DGT",
                description: "Consulta, pago y recursos de multas de tráfico",
                href: "/dgt/multas",
                icon: <Clock className="w-5 h-5" />,
              },
              {
                title: "Carnet por puntos",
                description: "Saldo de puntos, infracciones y cursos de recuperación",
                href: "/dgt/carnet-puntos",
                icon: <Shield className="w-5 h-5" />,
              },
              {
                title: "Radares DGT",
                description: "Mapa de radares fijos y de tramo en España",
                href: "/radares",
                icon: <MapPin className="w-5 h-5" />,
              },
              {
                title: "Puntos negros de carretera",
                description: "Tramos de mayor accidentalidad en la red viaria española",
                href: "/puntos-negros",
                icon: <AlertTriangle className="w-5 h-5" />,
              },
            ]}
          />

          {/* DGT hub back link */}
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
