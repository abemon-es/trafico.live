import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { IndemnizacionCalc } from "./IndemnizacionCalc";
import {
  AlertTriangle,
  Train,
  ArrowRight,
  Clock,
  FileText,
  Euro,
  CheckCircle,
  Info,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Reclamaciones Renfe — Guía + calculadora de indemnización",
  description:
    "Cómo reclamar a Renfe por retraso: derecho a indemnización del 25–50 % (Reglamento UE 1371/2007). Calculadora gratuita, plazos, formulario oficial y servicios de reclamación automatizada.",
  keywords: [
    "renfe reclamaciones",
    "reclamacion renfe retraso",
    "reclamar retraso renfe",
    "indemnizacion renfe",
    "reembolso renfe retraso",
    "derechos viajero tren españa",
  ],
  alternates: { canonical: `${BASE_URL}/trenes/reclamaciones` },
  openGraph: {
    title: "Reclamaciones Renfe — Guía + calculadora de indemnización",
    description:
      "Si tu tren llegó tarde, la ley te protege. Calcula tu indemnización y sigue el proceso paso a paso.",
    url: `${BASE_URL}/trenes/reclamaciones`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ─── FAQ data ──────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    question: "¿Cuándo tengo derecho a indemnización por retraso de tren?",
    answer:
      "Según el Reglamento (CE) n.º 1371/2007 del Parlamento Europeo, tienes derecho a indemnización si el tren llega a tu destino final con 60 o más minutos de retraso. El porcentaje depende del tiempo de retraso: 25 % del precio del billete entre 60 y 119 minutos; 50 % del precio si el retraso es igual o superior a 120 minutos.",
  },
  {
    question: "¿Qué plazo tengo para reclamar a Renfe?",
    answer:
      "Para trenes de Alta Velocidad (AVE, Alvia, Avlo, Avant, Euromed): tienes 1 mes desde la fecha del viaje para presentar la reclamación. Para Cercanías y Media Distancia: el plazo es de 3 meses. Es recomendable reclamar cuanto antes, conservando siempre el billete como justificante.",
  },
  {
    question: "¿Cómo se calcula la indemnización si tengo un abono o billete de ida y vuelta?",
    answer:
      "En caso de abono de transporte, la indemnización se calcula en función del precio proporcional del trayecto afectado sobre el total del abono. Para billetes de ida y vuelta, solo se tiene en cuenta el precio del tramo con retraso.",
  },
  {
    question: "¿Se puede reclamar si el retraso fue por causas meteorológicas?",
    answer:
      "Sí, la normativa europea no excluye las condiciones meteorológicas del derecho a indemnización. Renfe puede alegar circunstancias extraordinarias para reducir la responsabilidad, pero la jurisprudencia europea tiende a proteger al viajero. Si Renfe deniega la reclamación, puedes acudir al sistema de mediación del Ministerio de Transportes.",
  },
  {
    question: "¿Dónde presento la reclamación a Renfe?",
    answer:
      "Puedes reclamar: (1) en la propia estación el día del viaje, pidiendo el formulario de hojas de reclamaciones; (2) en renfe.com/content/renfe/es/es/contactar → Reclamaciones; (3) por escrito (correo certificado) a la dirección del Servicio de Atención al Cliente de Renfe. Siempre conserva justificante de envío.",
  },
  {
    question: "¿Cuánto tarda Renfe en responder a una reclamación?",
    answer:
      "Renfe está obligada a responder en el plazo de 1 mes. Si no recibes respuesta o esta es negativa, puedes escalar la reclamación a la Agencia Estatal de Seguridad Ferroviaria (AESF) o al sistema arbitral de consumo.",
  },
  {
    question: "¿Existe una compensación adicional por pérdida de conexión?",
    answer:
      "Sí, si el retraso en un tren internacional o de largo recorrido provoca la pérdida de un tren de conexión adquirido en el mismo billete, Renfe está obligada a ofrecerte transporte alternativo o el reembolso íntegro del billete (no solo el 25–50 %).",
  },
];

// ─── Structured data ──────────────────────────────────────────────────────────

function buildStructuredData(baseUrl: string) {
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Cómo reclamar indemnización a Renfe por retraso",
    description:
      "Guía paso a paso para reclamar la indemnización que prevé el Reglamento UE 1371/2007 cuando tu tren Renfe llega tarde.",
    step: [
      {
        "@type": "HowToStep",
        name: "Conserva el billete",
        text: "Guarda el billete en papel o descarga el PDF. Es el justificante imprescindible.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Verifica el retraso",
        text: "Confirma el retraso en la aplicación de Renfe o en el panel de la estación. El retraso debe ser ≥ 60 minutos en el destino final.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Calcula tu indemnización",
        text: "25 % del precio del billete si el retraso es de 60-119 minutos. 50 % si es ≥ 120 minutos.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Presenta la reclamación",
        text: "Rellena el formulario en renfe.com o en la taquilla de la estación. Guarda el acuse de recibo.",
        position: 4,
      },
      {
        "@type": "HowToStep",
        name: "Espera la resolución",
        text: "Renfe tiene 1 mes para responder. Si la respuesta es negativa o no hay respuesta, escala a la AESF.",
        position: 5,
      },
    ],
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "EUR",
      value: "0",
    },
    tool: [
      {
        "@type": "HowToTool",
        name: "Calculadora de indemnización trafico.live",
      },
      {
        "@type": "HowToTool",
        name: "Formulario de reclamación Renfe",
      },
    ],
  };

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

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Trenes", item: `${baseUrl}/trenes` },
      {
        "@type": "ListItem",
        position: 3,
        name: "Reclamaciones",
        item: `${baseUrl}/trenes/reclamaciones`,
      },
    ],
  };

  return [howToSchema, faqSchema, breadcrumbSchema];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReclamacionesPage() {
  return (
    <>
      <StructuredData data={buildStructuredData(BASE_URL)} />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-10">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Trenes", href: "/trenes" },
            { name: "Reclamaciones", href: "/trenes/reclamaciones" },
          ]}
        />

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400">
              <Train className="w-4 h-4" />
              trafico.live · Derechos del viajero
            </span>
          </div>
          <h1 className="font-heading text-3xl font-bold text-gray-900 dark:text-gray-50 leading-tight">
            Reclamar a Renfe por retraso
          </h1>
          <p className="font-body text-gray-600 dark:text-gray-300 mt-3 leading-relaxed text-lg">
            Si tu tren llegó con <strong>60 minutos o más de retraso</strong>, el Reglamento europeo{" "}
            <abbr title="Reglamento (CE) n.º 1371/2007 sobre los derechos y las obligaciones de los viajeros de ferrocarril">
              UE&nbsp;1371/2007
            </abbr>{" "}
            te da derecho a una indemnización de hasta el 50&nbsp;% del precio del billete.
          </p>
        </section>

        {/* ── Quick reference banner ─────────────────────────────────────── */}
        <section
          className="grid sm:grid-cols-2 gap-3"
          aria-label="Baremo de indemnización"
        >
          <div className="rounded-xl border border-tl-amber-200 dark:border-tl-amber-800/40 bg-tl-amber-50/60 dark:bg-tl-amber-900/10 p-5 flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-tl-amber-100 dark:bg-tl-amber-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
            </div>
            <div>
              <p className="font-data text-2xl font-bold text-tl-amber-700 dark:text-tl-amber-300">25 %</p>
              <p className="font-body text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                del precio del billete · retraso de <strong>60–119 min</strong>
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50/60 dark:bg-red-900/10 p-5 flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="font-data text-2xl font-bold text-red-700 dark:text-red-300">50 %</p>
              <p className="font-body text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                del precio del billete · retraso <strong>≥ 120 min</strong>
              </p>
            </div>
          </div>
        </section>

        {/* ── Calculator ────────────────────────────────────────────────── */}
        <section>
          <h2 className="font-heading text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Euro className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            Calculadora de indemnización
          </h2>
          <IndemnizacionCalc />
        </section>

        {/* ── Step-by-step guide ─────────────────────────────────────────── */}
        <section>
          <h2 className="font-heading text-xl font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
            <FileText className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            Cómo reclamar paso a paso
          </h2>

          <ol className="space-y-4">
            {[
              {
                n: 1,
                title: "Conserva el billete",
                body: "Guarda el billete en papel o descarga el PDF desde la app de Renfe. Sin billete no hay reclamación.",
              },
              {
                n: 2,
                title: "Confirma el retraso",
                body: "Verifica en el panel de la estación o en la app de Renfe que el tren llegó con ≥ 60 minutos de retraso en el destino final.",
              },
              {
                n: 3,
                title: "Calcula tu indemnización",
                body: "Usa la calculadora de arriba para saber el importe exacto. 25 % del billete (60–119 min) o 50 % (≥ 120 min).",
              },
              {
                n: 4,
                title: "Presenta la reclamación",
                body: "Puedes hacerlo en renfe.com → Contacto → Reclamaciones, en la taquilla de la estación o por correo certificado al Servicio de Atención al Cliente de Renfe.",
              },
              {
                n: 5,
                title: "Espera y, si es necesario, escala",
                body: "Renfe tiene 1 mes para responderte. Si la respuesta es negativa o no hay respuesta, acude a la Agencia Estatal de Seguridad Ferroviaria (AESF) o al sistema arbitral de consumo.",
              },
            ].map((step) => (
              <li key={step.n} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-tl-600 dark:bg-tl-500 flex items-center justify-center font-data text-sm font-bold text-white">
                  {step.n}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="font-heading text-base font-semibold text-gray-900 dark:text-gray-100">
                    {step.title}
                  </h3>
                  <p className="font-body text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Plazos card ────────────────────────────────────────────────── */}
        <section className="rounded-xl border border-tl-100 dark:border-tl-900/40 bg-tl-50/60 dark:bg-tl-900/10 p-5">
          <h2 className="font-heading text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-tl-600 dark:text-tl-400" />
            Plazos para reclamar
          </h2>
          <dl className="grid sm:grid-cols-2 gap-3 text-sm font-body">
            <div className="flex flex-col">
              <dt className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide font-semibold mb-1">
                AVE · Alvia · Avlo · Avant · Euromed · Intercity
              </dt>
              <dd className="font-data font-bold text-gray-900 dark:text-gray-100 text-base">
                1 mes
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide font-semibold mb-1">
                Cercanías · Rodalies · Media Distancia · Regional
              </dt>
              <dd className="font-data font-bold text-gray-900 dark:text-gray-100 text-base">
                3 meses
              </dd>
            </div>
          </dl>
        </section>

        {/* ── External resources ─────────────────────────────────────────── */}
        <section>
          <h2 className="font-heading text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            Recursos y formularios oficiales
          </h2>

          <div className="space-y-3">
            <a
              href="https://www.renfe.com/content/renfe/es/es/contactar.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-tl-400 dark:hover:border-tl-600 transition-colors group"
            >
              <Train className="w-5 h-5 text-gray-400 group-hover:text-tl-500" />
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Formulario de reclamaciones Renfe
                </p>
                <p className="font-body text-xs text-gray-500 dark:text-gray-400">
                  renfe.com → Contacto → Reclamaciones
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-tl-500 flex-shrink-0" />
            </a>

            <a
              href="https://www.mitma.gob.es/transporte-terrestre/viajeros/ferroviario"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-tl-400 dark:hover:border-tl-600 transition-colors group"
            >
              <FileText className="w-5 h-5 text-gray-400 group-hover:text-tl-500" />
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Ministerio de Transportes — Derechos del viajero ferroviario
                </p>
                <p className="font-body text-xs text-gray-500 dark:text-gray-400">
                  mitma.gob.es
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-tl-500 flex-shrink-0" />
            </a>

            {/* TODO: conectar afiliado AirHelp/ReclamaVuelo o equivalente para trenes cuando esté configurado */}
            <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
              <Info className="w-5 h-5 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Servicios de reclamación automatizada
                </p>
                <p className="font-body text-xs text-gray-500 dark:text-gray-400">
                  Próximamente: comparador de servicios legaltech para reclamaciones de trenes en España.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Normativa ─────────────────────────────────────────────────── */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <h2 className="font-heading text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-[var(--tl-success)]" />
            Normativa aplicable
          </h2>
          <ul className="space-y-2 text-sm font-body text-gray-600 dark:text-gray-400">
            <li>
              <strong className="text-gray-800 dark:text-gray-200">
                Reglamento (CE) n.º 1371/2007
              </strong>{" "}
              — sobre los derechos y las obligaciones de los viajeros de ferrocarril (arts. 16–17).
            </li>
            <li>
              <strong className="text-gray-800 dark:text-gray-200">
                Real Decreto Ley 14/2010
              </strong>{" "}
              — complementa la transposición del Reglamento europeo en España.
            </li>
            <li>
              <strong className="text-gray-800 dark:text-gray-200">
                Reglamento (UE) 2021/782
              </strong>{" "}
              — versión actualizada del Reglamento 1371/2007, aplicable desde junio 2023.
            </li>
          </ul>
        </section>

        {/* ── FAQ accordion ─────────────────────────────────────────────── */}
        <section>
          <h2 className="font-heading text-xl font-semibold text-gray-900 dark:text-gray-100 mb-5">
            Preguntas frecuentes
          </h2>
          <ReclamacionesFAQ items={FAQ_ITEMS} />
        </section>

        {/* ── Related links ─────────────────────────────────────────────── */}
        <nav aria-label="Páginas relacionadas" className="flex flex-wrap gap-3">
          <Link
            href="/trenes/incidencias"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-body text-gray-700 dark:text-gray-300 hover:border-tl-400 dark:hover:border-tl-600 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Incidencias en tiempo real
          </Link>
          <Link
            href="/trenes"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-body text-gray-700 dark:text-gray-300 hover:border-tl-400 dark:hover:border-tl-600 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
          >
            <Train className="w-4 h-4" />
            Red Ferroviaria
          </Link>
        </nav>

        <p className="text-xs text-gray-400 dark:text-gray-600 font-body">
          Información orientativa basada en el Reglamento (UE) n.º 1371/2007 y su actualización
          2021/782. No constituye asesoramiento jurídico. Para casos complejos, consulta con un
          abogado especializado.
        </p>
      </main>
    </>
  );
}

// ─── Inline FAQ (server component, no state needed) ───────────────────────────

function ReclamacionesFAQ({ items }: { items: { question: string; answer: string }[] }) {
  // Static render — no interactivity needed for SEO value
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
      {items.map((item, i) => (
        <details key={i} className="group px-6 py-4">
          <summary className="flex items-start justify-between gap-4 cursor-pointer font-heading text-sm font-semibold text-gray-900 dark:text-gray-100 list-none">
            <span>{item.question}</span>
            <span className="flex-shrink-0 text-gray-400 group-open:rotate-180 transition-transform duration-150">
              ▾
            </span>
          </summary>
          <p className="font-body text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-3">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
