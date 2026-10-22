import { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Euro,
  Clock,
  ChevronRight,
  ExternalLink,
  Smartphone,
  Info,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = buildPageMetadata({
  title: "Baliza V-16 conectada DGT 2026: homologadas y normativa",
  description:
    "Todo sobre la baliza V-16 conectada, la única válida desde el 1 de enero de 2026 (DGT 3.0): qué es, cómo funciona y cómo comprobar si la tuya está homologada.",
  path: "/baliza-v-16",
  keywords: [
    "baliza v16",
    "baliza v-16 homologadas",
    "dgt baliza v16",
    "baliza v16 precio",
    "baliza v16 obligatoria 2026",
    "nueva baliza dgt",
    "baliza v16 tiempo real",
    "dgt 3.0 baliza",
    "comprobar baliza dgt",
  ],
});

const FAQ_ITEMS = [
  {
    q: "¿Es obligatoria la baliza V-16 en 2026?",
    a: "Sí. Desde el 1 de enero de 2026 solo es válida la V-16 conectada (disposición transitoria primera del Real Decreto 159/2021); los triángulos y las V-16 sin conexión ya no sirven, salvo vehículos con matrícula de otro país en circulación internacional.",
  },
  {
    q: "¿Cuánto cuesta una baliza V-16 homologada?",
    a: "El precio incluye la conectividad durante al menos 12 años (Real Decreto 159/2021), sin cuotas a una operadora.",
  },
  {
    q: "¿Qué diferencia hay entre una baliza V-16 conectada y no conectada?",
    a: "La baliza V-16 conectada (DGT 3.0) transmite en tiempo real las coordenadas GPS al Centro de Gestión del Tráfico de la DGT, lo que permite alertar a otros conductores a través de la plataforma DGT 3.0. La no conectada solo emite luz LED visible, sin transmisión. Desde el 1 de enero de 2026 solo es válido el modelo conectado.",
  },
  {
    q: "¿Qué pasa si no llevo la baliza V-16 conectada?",
    a: "Desde el 1 de enero de 2026 solo es válida la V-16 conectada (disposición transitoria primera del Real Decreto 159/2021); los triángulos y las V-16 sin conexión ya no sirven, salvo vehículos con matrícula de otro país en circulación internacional. Sin ella, en caso de accidente o avería expones a otros conductores a un mayor riesgo.",
  },
  {
    q: "¿Cómo saber si mi baliza V-16 está homologada por la DGT?",
    a: "Puedes verificar si un modelo está homologado buscando el número de homologación en la etiqueta o caja del dispositivo y consultando el listado oficial de dispositivos de la DGT en su sede electrónica.",
  },
  {
    q: "¿Puede la baliza V-16 reemplazar a los triángulos de emergencia?",
    a: "Sí: los ha sustituido. Desde el 1 de enero de 2026 solo es válida la V-16 conectada (disposición transitoria primera del Real Decreto 159/2021); los triángulos y las V-16 sin conexión ya no sirven, salvo vehículos con matrícula de otro país en circulación internacional.",
  },
  {
    q: "¿Con qué frecuencia envía la posición GPS la baliza V-16?",
    a: "Las balizas V-16 conectadas envían su posición cada 100 segundos (Real Decreto 159/2021) a la plataforma DGT 3.0, que actualiza con ella el mapa de alertas.",
  },
  {
    q: "¿Sirve la baliza V-16 si no tengo cobertura móvil?",
    a: "La transmisión de posición GPS requiere cobertura 4G o 3G. En zonas sin cobertura, la baliza seguirá emitiendo luz LED visible para los conductores que se aproximen, pero no transmitirá datos al sistema DGT 3.0.",
  },
  {
    q: "¿La baliza V-16 tiene que ir colocada en el techo?",
    a: "Sí. La normativa exige que la baliza V-16 se coloque en la parte más alta del vehículo (techo) mediante imán o soporte, de forma que sea visible a 1 kilómetro de distancia en condiciones favorables. No se puede usar en el suelo como los triángulos.",
  },
  {
    q: "¿Cuánto dura la batería de una baliza V-16?",
    a: "La normativa exige un mínimo de 30 minutos de funcionamiento. Los modelos con batería recargable USB (microUSB o USB-C) son los más prácticos para tener siempre cargados.",
  },
  {
    q: "¿Puedo usar la misma baliza en varios vehículos?",
    a: "Sí. Según la DGT, no hay que registrar la baliza ni pagar cuotas a una operadora, así que puede usarse en cualquier vehículo.",
  },
  {
    q: "¿Dónde comprar una baliza V-16 homologada?",
    a: "Las balizas V-16 homologadas están disponibles en grandes superficies (El Corte Inglés, Carrefour, Leroy Merlin), tiendas de automoción (Norauto, Aurgi), estaciones de servicio y Amazon España. Verifica siempre el número de homologación antes de comprar.",
  },
  {
    q: "¿Funciona la baliza V-16 con la app DGT 3.0?",
    a: "Sí. Las balizas V-16 conectadas aparecen automáticamente en el mapa de la app DGT 3.0 cuando están activas, alertando a los conductores que se aproximen. También son visibles en trafico.live y otras plataformas que consumen el feed DGT.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────
function buildSchemas() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Baliza V-16", item: `${BASE_URL}/baliza-v-16` },
    ],
  };

  return [faqSchema, breadcrumbSchema];
}

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function BalizaV16Page() {
  const schemas = buildSchemas();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Baliza V-16", href: "/baliza-v-16" },
          ]}
        />

        {/* ── Hero ── */}
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="p-3 bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded-xl flex-shrink-0">
              <AlertTriangle className="w-8 h-8 text-tl-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                Baliza V-16 DGT 2026
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                Qué es, cómo funciona y cómo comprobar si la tuya está homologada
              </p>
            </div>
          </div>

        </header>

        {/* ── Summary box — AI Overview friendly ── */}
        <section
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-8"
          aria-label="Resumen normativo"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            ¿Qué es la baliza V-16 y cuándo es obligatoria?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            La <strong>baliza de señalización V-16</strong> es un dispositivo luminoso homologado que
            se coloca en el techo del vehículo en caso de avería o accidente. A diferencia de los
            triángulos, transmite la posición GPS en tiempo real al Centro de Gestión del Tráfico de
            la DGT (plataforma DGT 3.0), alertando a otros conductores. Desde el{" "}
            <strong>1 de enero de 2026</strong> es la única válida (disposición transitoria primera
            del Real Decreto 159/2021): los triángulos y las V-16 sin conexión ya no sirven, salvo
            vehículos con matrícula de otro país en circulación internacional.
            El precio incluye la conectividad durante al menos <strong>12 años</strong> (Real Decreto 159/2021).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {[
              { label: "Única válida desde", value: "1 ene 2026", icon: Clock },
              { label: "Conectividad incluida", value: "Al menos 12 años", icon: Euro },
              { label: "Colocación", value: "En el techo", icon: ShieldCheck },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="bg-gray-50 dark:bg-gray-950 rounded-lg p-3 text-center"
              >
                <Icon className="w-4 h-4 mx-auto text-tl-600 dark:text-tl-400 mb-1" />
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 font-data">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Homologation checker ── */}
        <section
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-8"
          aria-labelledby="heading-checker"
        >
          <h2
            id="heading-checker"
            className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2"
          >
            <Info className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            ¿Está homologada mi baliza?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Comprueba si tu baliza V-16 está oficialmente homologada consultando el listado de
            dispositivos de la DGT. Necesitas el modelo exacto.
          </p>
          <div className="bg-tl-50 dark:bg-tl-900/20 rounded-lg p-4 border border-tl-200 dark:border-tl-800">
            <p className="text-sm font-medium text-tl-800 dark:text-tl-300 mb-3">
              Verifica en la sede electrónica de la DGT:
            </p>
            <a
              href="https://sede.dgt.gob.es/es/vehiculos/dispositivos-v16/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-tl-600 hover:bg-tl-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Smartphone className="w-4 h-4" />
              Consultar homologación DGT
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-green-800 dark:text-green-300">
                  Homologada si…
                </p>
                <p className="text-xs text-green-700 dark:text-green-500 mt-0.5">
                  Aparece en el listado oficial de la DGT, tiene número de homologación en la caja y
                  transmite su posición.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-800 dark:text-red-300">No válida si…</p>
                <p className="text-xs text-red-700 dark:text-red-500 mt-0.5">
                  Solo emite luz, sin conexión (ya no sirve desde el 1 de enero de 2026), o no aparece
                  en el listado oficial de la DGT.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Legal disclaimer ── */}
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-8 text-xs text-gray-500 dark:text-gray-400">
          <p>
            <strong>Aviso:</strong> La información de esta página es orientativa y se actualiza
            regularmente. Verifica siempre los requisitos vigentes en la{" "}
            <a
              href="https://www.dgt.es"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              web oficial de la DGT
            </a>
            .
          </p>
        </div>

        {/* ── FAQ ── */}
        <section aria-labelledby="heading-faq" className="mb-8">
          <h2
            id="heading-faq"
            className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
          >
            Preguntas frecuentes sobre la baliza V-16
          </h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => (
              <div
                key={item.q}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
              >
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-2">
                  {item.q}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Related links ── */}
        <nav aria-label="Páginas relacionadas" className="mb-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Más información de tráfico
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Incidencias DGT hoy", href: "/incidencias" },
              { label: "Radares en carreteras", href: "/radares" },
              { label: "Cámaras de tráfico", href: "/camaras" },
              { label: "Atascos en España", href: "/atascos" },
              { label: "Carreteras de España", href: "/carreteras" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:border-tl-300 hover:text-tl-600 transition-all"
              >
                {link.label}
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              </Link>
            ))}
          </div>
        </nav>
      </main>
    </div>
  );
}
