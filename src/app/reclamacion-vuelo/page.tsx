/**
 * /reclamacion-vuelo — Guía CE 261/2004 + afiliado AirHelp
 *
 * Target keywords:
 *   "iberia reclamaciones"    12.100/mes KD 0  CPC €3,34
 *   "vueling reclamaciones"    5.400/mes KD 0  CPC €3,56
 *   "reclamacion vuelo"        1.300/mes KD 0  CPC €5,93
 *   "reclamacion vuelo cancelado" 210/mes KD 0 CPC €7,89
 *   Total cluster: ~22K/mes, CPC €3,34-7,89
 *
 * Afiliado: AirHelp — TODO conectar API (comisión 35% del importe recuperado)
 *   Placeholder: <AffiliateCTA program="airhelp" context={...} />
 */

import type { Metadata } from "next";
import Link from "next/link";
import { StructuredData } from "@/components/seo/StructuredData";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  Scale,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Info,
  HelpCircle,
  Plane,
  XCircle,
  Timer,
  Users,
} from "lucide-react";

export const revalidate = 3600; // 1h — mostly static content

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Reclamación de vuelo cancelado o retrasado — Guía CE 261/2004 · trafico.live",
  description:
    "Guía completa para reclamar compensación por vuelo cancelado, retrasado u overbooking según el Reglamento CE 261/2004. Importes: 250€, 400€ o 600€ según distancia. Formulario AESA, plazos por aerolínea e instrucciones paso a paso.",
  keywords: [
    "reclamacion vuelo cancelado",
    "reclamacion vuelo retrasado",
    "iberia reclamaciones",
    "vueling reclamaciones",
    "reclamacion vuelo ryanair",
    "CE 261 2004",
    "AESA reclamacion",
    "compensacion vuelo cancelado",
    "derechos pasajero aereo",
  ],
  alternates: { canonical: `${BASE_URL}/reclamacion-vuelo` },
  openGraph: {
    title: "Reclamación de vuelo cancelado o retrasado — Guía CE 261/2004",
    description:
      "Cómo reclamar compensación por vuelo cancelado o retrasado. Importes 250-600€ según distancia. Formulario AESA + guía paso a paso.",
    url: `${BASE_URL}/reclamacion-vuelo`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "article",
  },
};

// ---------------------------------------------------------------------------
// Structured Data
// ---------------------------------------------------------------------------

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Cómo reclamar compensación por vuelo cancelado o retrasado (CE 261/2004)",
  description:
    "Guía paso a paso para ejercer tus derechos como pasajero aéreo y reclamar compensación económica ante la aerolínea o la AESA.",
  totalTime: "PT30M",
  tool: [
    {
      "@type": "HowToTool",
      name: "Formulario de reclamación AESA",
    },
  ],
  step: [
    {
      "@type": "HowToStep",
      name: "Verifica si tienes derecho a compensación",
      text: "Comprueba que el vuelo salía desde un aeropuerto de la UE o llegaba a la UE en una aerolínea comunitaria, y que la cancelación/retraso no fue por causa de fuerza mayor.",
      position: 1,
    },
    {
      "@type": "HowToStep",
      name: "Reclama directamente a la aerolínea",
      text: "Envía una reclamación por escrito a la aerolínea indicando número de vuelo, fecha, tipo de incidencia (cancelación, retraso, overbooking) y el importe que corresponde según CE 261/2004. Guarda copia de toda la documentación.",
      position: 2,
    },
    {
      "@type": "HowToStep",
      name: "Espera la respuesta (máximo 2 meses)",
      text: "La aerolínea tiene obligación de responder. Si no lo hace en un plazo razonable (habitualmente 2 meses) o deniega la compensación injustificadamente, pasa al siguiente paso.",
      position: 3,
    },
    {
      "@type": "HowToStep",
      name: "Presenta reclamación ante la AESA",
      text: "Si la aerolínea no responde satisfactoriamente, presenta una reclamación ante la Agencia Estatal de Seguridad Aérea (AESA) a través de su formulario online. Es gratuito y obligatorio antes de acudir a los tribunales.",
      position: 4,
    },
    {
      "@type": "HowToStep",
      name: "Vía judicial si la AESA no resuelve",
      text: "Si la resolución de la AESA no es satisfactoria o tarda más de 3 meses, puedes acudir a los juzgados de lo civil. Para reclamaciones menores de 2.000€ no necesitas abogado ni procurador.",
      position: 5,
    },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Cuánto se puede reclamar por un vuelo cancelado?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "La compensación varía según la distancia del vuelo: 250€ para vuelos de hasta 1.500 km, 400€ para vuelos intra-UE de más de 1.500 km y para vuelos entre 1.500 y 3.500 km, y 600€ para vuelos de más de 3.500 km fuera de la UE. El importe puede reducirse un 50% si la aerolínea ofrece transporte alternativo con tiempos de llegada similares.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuánto tiempo tengo para reclamar a Iberia por un vuelo cancelado?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "El plazo general para reclamar a Iberia es de 5 años según el Código Civil español. Sin embargo, es recomendable reclamar lo antes posible para facilitar la documentación. La AESA acepta reclamaciones mientras no haya prescrito el plazo civil.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cómo reclamar a Vueling por cancelación de vuelo?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Puedes reclamar a Vueling a través de su formulario online en vueling.com, por email a customercare@vueling.com, o presentando la reclamación directamente ante la AESA si Vueling no responde satisfactoriamente en 2 meses.",
      },
    },
    {
      "@type": "Question",
      name: "¿Puedo reclamar si el vuelo se retrasó pero no fue cancelado?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. Si el vuelo llegó al destino final con 3 o más horas de retraso, tienes derecho a la misma compensación económica que por cancelación según el Reglamento CE 261/2004 y la jurisprudencia del Tribunal de Justicia de la UE.",
      },
    },
    {
      "@type": "Question",
      name: "¿Qué es la AESA y cómo presenta una reclamación?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "La AESA (Agencia Estatal de Seguridad Aérea) es el organismo español supervisor de los derechos de los pasajeros aéreos. Puedes presentar tu reclamación de forma gratuita en su web oficial reclamaciones.seguridadaerea.es. Es el paso previo obligatorio antes de acudir a los tribunales.",
      },
    },
    {
      "@type": "Question",
      name: "¿Se puede reclamar si el vuelo fue cancelado por mal tiempo?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Las cancelaciones por circunstancias extraordinarias (meteorología extrema, conflictos políticos, huelgas de control aéreo ATC) están exentas de compensación económica. Sin embargo, siempre tienes derecho a reembolso del billete o a vuelo alternativo, independientemente de la causa.",
      },
    },
    {
      "@type": "Question",
      name: "¿Aplica el CE 261/2004 a vuelos de Ryanair?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. El Reglamento CE 261/2004 se aplica a todos los vuelos que salgan de un aeropuerto de la UE, independientemente de la aerolínea, y a los vuelos que lleguen a la UE si la aerolínea tiene sede en la UE. Ryanair, al ser una aerolínea de la UE (Irlanda), está sujeta al reglamento en todos sus vuelos.",
      },
    },
    {
      "@type": "Question",
      name: "¿Qué documentación necesito para reclamar?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Necesitarás: billete o reserva del vuelo, DNI o pasaporte, justificante de embarque (boarding pass), documentación del retraso o cancelación (puede ser el aviso de la aerolínea o confirmación escrita), y facturas de gastos adicionales si solicitas reembolso de comidas o alojamiento.",
      },
    },
    {
      "@type": "Question",
      name: "¿Qué es el overbooking y qué compensación corresponde?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "El overbooking (denegación de embarque por exceso de reservas) también da derecho a la misma compensación económica del CE 261/2004 (250-600€). Además, tienes derecho a elegir entre reembolso completo o vuelo alternativo, y la aerolínea debe ofrecerte asistencia (comidas, bebidas, alojamiento si es necesario).",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuánto tarda en resolverse una reclamación ante la AESA?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "La AESA tiene un plazo de resolución de 3 meses desde la presentación de la reclamación, aunque en la práctica puede tardar entre 3 y 6 meses. Si transcurrido ese plazo no hay resolución, puedes acudir directamente a los tribunales.",
      },
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Aviación", item: `${BASE_URL}/aviacion` },
    { "@type": "ListItem", position: 3, name: "Reclamación de vuelo", item: `${BASE_URL}/reclamacion-vuelo` },
  ],
};

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const COMPENSATION_TABLE = [
  {
    range: "≤ 1.500 km",
    amount: "250 €",
    examples: ["Madrid — Barcelona", "Madrid — Lisboa", "Madrid — París"],
    reducedAmount: "125 €",
  },
  {
    range: "1.500 – 3.500 km (UE) / 1.500 – 3.500 km (extra-UE)",
    amount: "400 €",
    examples: ["Madrid — Londres", "Madrid — Berlín", "Madrid — Roma", "Madrid — Canarias"],
    reducedAmount: "200 €",
  },
  {
    range: "> 3.500 km (extra-UE)",
    amount: "600 €",
    examples: ["Madrid — Nueva York", "Madrid — Buenos Aires", "Madrid — Tokio"],
    reducedAmount: "300 €",
  },
];

const AIRLINE_CONTACTS: {
  name: string;
  url: string;
  email?: string;
  note?: string;
}[] = [
  {
    name: "Iberia",
    url: "https://www.iberia.com/es/informacion/formulario-de-contacto/",
    note: "Plazo respuesta habitual: 4-8 semanas",
  },
  {
    name: "Vueling",
    url: "https://www.vueling.com/es/servicios-vueling/gestiona-tu-viaje/atencion-al-cliente",
    email: "customercare@vueling.com",
    note: "Plazo respuesta habitual: 2-4 semanas",
  },
  {
    name: "Ryanair",
    url: "https://www.ryanair.com/es/es/useful-info/help-centre",
    note: "Solo vía formulario web o chat. Plazo: 4-6 semanas",
  },
  {
    name: "Air Europa",
    url: "https://www.aireuropa.com/es/vuelos/contacta-con-nosotros",
    note: "Plazo respuesta habitual: 3-6 semanas",
  },
  {
    name: "Volotea",
    url: "https://www.volotea.com/es/contacto/",
    note: "Formulario web + chat. Plazo: 2-4 semanas",
  },
  {
    name: "EasyJet",
    url: "https://www.easyjet.com/es/help",
    note: "Formulario web. Plazo: 4-6 semanas",
  },
  {
    name: "Wizz Air",
    url: "https://wizzair.com/es-es/information-and-services/contact-us",
    note: "Formulario web. Plazo: 3-5 semanas",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReclamacionVueloPage() {
  return (
    <>
      <StructuredData data={[howToSchema, faqSchema, breadcrumbSchema]} />

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Aviación", href: "/aviacion" },
            { name: "Reclamación de vuelo", href: "/reclamacion-vuelo" },
          ]}
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-10">

        {/* Hero */}
        <header>
          <div className="flex items-center gap-2 mb-3">
            <Scale className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400">
              Derechos del pasajero · CE 261/2004
            </span>
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-4">
            Reclamación de vuelo cancelado, retrasado o denegado embarque
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            Si tu vuelo fue cancelado, llegó con más de 3 horas de retraso, o fuiste víctima
            de overbooking, tienes derecho a una compensación económica de{" "}
            <strong>250€, 400€ o 600€</strong> según el Reglamento Europeo CE 261/2004. Esta
            guía te explica cómo reclamar paso a paso.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="https://reclamaciones.seguridadaerea.es"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-tl-600 hover:bg-tl-700 text-white font-semibold text-sm transition-colors"
            >
              Formulario AESA <ExternalLink className="w-4 h-4" />
            </a>
            <Link
              href="/aviacion/cancelados"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:border-tl-300 dark:hover:border-tl-700 transition-colors"
            >
              <Plane className="w-4 h-4" />
              Ver vuelos cancelados hoy
            </Link>
          </div>
        </header>

        {/* AirHelp CTA — afiliado placeholder */}
        {/* TODO Team B-10: conectar API AirHelp affiliate */}
        {/* <AffiliateCTA program="airhelp" context={{ source: "reclamacion-vuelo", placement: "hero" }} /> */}
        <div className="rounded-2xl bg-gradient-to-br from-tl-50 to-tl-100 dark:from-tl-900/20 dark:to-tl-900/40 border border-tl-200 dark:border-tl-800 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-tl-100 dark:bg-tl-900/40 flex items-center justify-center flex-shrink-0">
              <Scale className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            </div>
            <div className="flex-1">
              <h2 className="font-heading text-lg font-bold text-tl-800 dark:text-tl-200 mb-1">
                ¿Prefieres que reclamen por ti?
              </h2>
              <p className="text-sm text-tl-700 dark:text-tl-300 mb-3">
                Empresas especializadas como <strong>AirHelp</strong> o{" "}
                <strong>Reclamador.es</strong> gestionan tu reclamación sin coste inicial.
                Solo cobran si ganan (comisión del 25-35% de la compensación obtenida).
              </p>
              {/* TODO Team B-10 afiliado AirHelp — conectar enlace de afiliado */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs text-tl-500 dark:text-tl-400 border border-tl-200 dark:border-tl-700 rounded-lg px-3 py-1.5">
                  Comparador de servicios disponible próximamente
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ¿Qué cubre el CE 261/2004? */}
        <section>
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            ¿Qué cubre el Reglamento CE 261/2004?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: XCircle,
                title: "Vuelo cancelado",
                description:
                  "La aerolínea cancela el vuelo, independientemente del motivo (salvo fuerza mayor). Incluye cancelaciones por razones comerciales o técnicas.",
                color: "text-red-600 dark:text-red-400",
                bg: "bg-red-50 dark:bg-red-900/20",
              },
              {
                icon: Timer,
                title: "Retraso ≥ 3 horas",
                description:
                  "El vuelo aterriza en el destino final con 3 o más horas de retraso sobre el horario programado.",
                color: "text-tl-amber-600 dark:text-tl-amber-400",
                bg: "bg-tl-amber-50 dark:bg-tl-amber-900/20",
              },
              {
                icon: Users,
                title: "Overbooking",
                description:
                  "La aerolínea te deniega el embarque por exceso de reservas (overbooking), no por causas imputables a ti.",
                color: "text-tl-600 dark:text-tl-400",
                bg: "bg-tl-50 dark:bg-tl-900/20",
              },
            ].map(({ icon: Icon, title, description, color, bg }) => (
              <div key={title} className={`rounded-xl ${bg} border border-gray-100 dark:border-gray-800 p-5`}>
                <Icon className={`w-6 h-6 ${color} mb-3`} />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tabla de compensaciones */}
        <section>
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Tabla de compensaciones por distancia
          </h2>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-tl-200 dark:border-tl-800">
                  <th className="text-left py-3 pr-4 font-semibold text-gray-700 dark:text-gray-300">Distancia del vuelo</th>
                  <th className="text-right py-3 pr-4 font-semibold text-gray-700 dark:text-gray-300">Compensación</th>
                  <th className="text-right py-3 pr-4 font-semibold text-gray-700 dark:text-gray-300">
                    <span className="text-xs">Si alternativo similar</span>
                  </th>
                  <th className="text-left py-3 font-semibold text-gray-700 dark:text-gray-300">Ejemplos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {COMPENSATION_TABLE.map((row) => (
                  <tr key={row.range} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="py-4 pr-4 text-gray-800 dark:text-gray-200 font-medium">{row.range}</td>
                    <td className="py-4 pr-4 text-right">
                      <span className="font-mono text-xl font-bold text-tl-600 dark:text-tl-400">
                        {row.amount}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-right font-mono text-sm text-gray-500 dark:text-gray-400">
                      {row.reducedAmount}
                    </td>
                    <td className="py-4 text-xs text-gray-500 dark:text-gray-400">
                      {row.examples.join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1">
            <Info className="w-3 h-3" />
            El importe reducido aplica cuando la aerolínea ofrece transporte alternativo con llegada
            con menos de 2, 3 o 4 horas de diferencia según distancia.
          </p>
        </section>

        {/* Pasos para reclamar */}
        <section>
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Cómo reclamar paso a paso
          </h2>
          <ol className="space-y-6">
            {[
              {
                step: 1,
                title: "Verifica que tienes derecho",
                description:
                  "El reglamento aplica a vuelos que salgan de la UE (cualquier aerolínea) o lleguen a la UE en aerolíneas comunitarias. Asegúrate de que la incidencia no fue por causa de fuerza mayor (meteorología extrema documentada, huelgas ATC).",
                icon: CheckCircle,
              },
              {
                step: 2,
                title: "Reclama a la aerolínea directamente",
                description:
                  "Envía una reclamación escrita a la aerolínea indicando: número de vuelo, fecha, tipo de incidencia y el importe que corresponde. Guarda copia de toda la correspondencia. La aerolínea tiene obligación de responder.",
                icon: Plane,
              },
              {
                step: 3,
                title: "Espera la respuesta (2 meses)",
                description:
                  "Si la aerolínea no responde en 2 meses o deniega la compensación injustificadamente, pasa al siguiente paso. El silencio administrativo equivale a una negativa.",
                icon: Clock,
              },
              {
                step: 4,
                title: "Presenta reclamación ante la AESA",
                description:
                  "La Agencia Estatal de Seguridad Aérea es el organismo supervisor. Su formulario online es gratuito y es el paso previo obligatorio antes de los tribunales. URL: reclamaciones.seguridadaerea.es",
                icon: Scale,
                cta: {
                  href: "https://reclamaciones.seguridadaerea.es",
                  label: "Formulario AESA",
                  external: true,
                },
              },
              {
                step: 5,
                title: "Vía judicial si la AESA no resuelve",
                description:
                  "Si en 3 meses la AESA no resuelve, puedes acudir a los juzgados de lo civil. Para importes menores de 2.000€ no necesitas abogado ni procurador.",
                icon: AlertTriangle,
              },
            ].map(({ step, title, description, icon: Icon, cta }) => (
              <li key={step} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-tl-100 dark:bg-tl-900/40 border-2 border-tl-300 dark:border-tl-700 flex items-center justify-center">
                    <span className="font-mono text-sm font-bold text-tl-600 dark:text-tl-400">
                      {step}
                    </span>
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                    <Icon className="w-4 h-4 text-tl-500 dark:text-tl-400" />
                    {title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {description}
                  </p>
                  {cta && (
                    <a
                      href={cta.href}
                      target={cta.external ? "_blank" : undefined}
                      rel={cta.external ? "noopener noreferrer" : undefined}
                      className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-tl-600 dark:text-tl-400 hover:underline"
                    >
                      {cta.label}
                      {cta.external && <ExternalLink className="w-3.5 h-3.5" />}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Plazos por aerolínea */}
        <section>
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Formularios de reclamación por aerolínea
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AIRLINE_CONTACTS.map((airline) => (
              <a
                key={airline.name}
                href={airline.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex items-start justify-between p-4 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-tl-300 dark:hover:border-tl-700 hover:bg-tl-50/50 dark:hover:bg-tl-900/10 transition-all group"
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-600 dark:group-hover:text-tl-400 transition-colors">
                    {airline.name}
                  </p>
                  {airline.email && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                      {airline.email}
                    </p>
                  )}
                  {airline.note && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {airline.note}
                    </p>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-tl-500 transition-colors flex-shrink-0 mt-1" />
              </a>
            ))}
          </div>
        </section>

        {/* Documentación necesaria */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Documentación que necesitarás
          </h2>
          <ul className="space-y-2">
            {[
              "Billete o confirmación de reserva del vuelo",
              "DNI, NIE o pasaporte del pasajero",
              "Tarjeta de embarque (boarding pass) o confirmación de check-in",
              "Aviso de cancelación o documento de retraso emitido por la aerolínea",
              "Facturas de gastos adicionales (comidas, alojamiento, transporte) si aplica",
              "Correspondencia previa con la aerolínea (correos, respuestas al formulario)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-tl-500 dark:text-tl-400 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100">
              Preguntas frecuentes
            </h2>
          </div>
          <dl className="space-y-5">
            {[
              {
                q: "¿Cuánto se puede reclamar por un vuelo cancelado?",
                a: "250€ para vuelos de hasta 1.500 km, 400€ para vuelos intra-UE de más de 1.500 km y vuelos entre 1.500-3.500 km, y 600€ para vuelos de más de 3.500 km fuera de la UE. El importe puede reducirse un 50% si la aerolínea ofrece un vuelo alternativo similar.",
              },
              {
                q: "¿Cuánto tiempo tengo para reclamar a Iberia por un vuelo cancelado?",
                a: "El plazo general es de 5 años según el Código Civil español. Es recomendable reclamar cuanto antes para facilitar la recopilación de documentación.",
              },
              {
                q: "¿Puedo reclamar si el vuelo se retrasó pero no fue cancelado?",
                a: "Sí. Si el vuelo llegó al destino final con 3 o más horas de retraso, tienes derecho a la misma compensación económica que por cancelación.",
              },
              {
                q: "¿Se puede reclamar si el vuelo fue cancelado por mal tiempo?",
                a: "Las cancelaciones por circunstancias extraordinarias (meteorología extrema, huelgas ATC) están exentas de compensación económica. Sin embargo, siempre tienes derecho a reembolso del billete o a vuelo alternativo.",
              },
              {
                q: "¿Cómo reclamar a Vueling por cancelación de vuelo?",
                a: "A través de su formulario online en vueling.com, por email a customercare@vueling.com, o mediante la AESA si Vueling no responde en 2 meses.",
              },
              {
                q: "¿Aplica el CE 261/2004 a vuelos de Ryanair?",
                a: "Sí. Ryanair, al ser una aerolínea de la UE (Irlanda), está sujeta al reglamento en todos sus vuelos desde o hacia la UE.",
              },
              {
                q: "¿Qué es la AESA y cómo presento una reclamación?",
                a: "La AESA (Agencia Estatal de Seguridad Aérea) es el organismo supervisor de derechos de pasajeros aéreos. Puedes presentar tu reclamación gratuitamente en reclamaciones.seguridadaerea.es.",
              },
              {
                q: "¿Qué es el overbooking y qué compensación corresponde?",
                a: "El overbooking (denegación de embarque por exceso de reservas) da derecho a la misma compensación de 250-600€ según distancia, más la opción de reembolso o vuelo alternativo.",
              },
              {
                q: "¿Cuánto tarda en resolverse una reclamación ante la AESA?",
                a: "La AESA tiene un plazo teórico de 3 meses. En la práctica puede tardar entre 3 y 6 meses. Si no resuelve, puedes acudir a los tribunales.",
              },
              {
                q: "¿Qué documentación necesito para reclamar?",
                a: "Billete o reserva, DNI/pasaporte, boarding pass, documento de cancelación/retraso, facturas de gastos adicionales y correspondencia previa con la aerolínea.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-gray-100 dark:border-gray-800 pb-5 last:border-0 last:pb-0">
                <dt className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">
                  {q}
                </dt>
                <dd className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Bottom CTA vuelos cancelados */}
        <div className="rounded-2xl bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-heading font-bold text-tl-800 dark:text-tl-200 mb-1">
              ¿Tu vuelo fue cancelado hoy?
            </h3>
            <p className="text-sm text-tl-700 dark:text-tl-300">
              Consulta las cancelaciones activas en aeropuertos españoles y portugueses.
            </p>
          </div>
          <Link
            href="/aviacion/cancelados"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-tl-600 hover:bg-tl-700 text-white font-semibold text-sm transition-colors flex-shrink-0"
          >
            Ver vuelos cancelados
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Attribution */}
        <footer className="text-xs text-gray-400 dark:text-gray-500 text-center py-4 border-t border-gray-100 dark:border-gray-800">
          Información basada en el Reglamento (CE) n.º 261/2004 del Parlamento Europeo y del Consejo
          y en la jurisprudencia del Tribunal de Justicia de la UE. No constituye asesoramiento
          jurídico. Para casos complejos consulta a un profesional.
          Organismos: AESA (seguridadaerea.es), OCU (ocu.org).
        </footer>
      </div>
    </>
  );
}
