import { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wifi,
  ShieldCheck,
  Euro,
  Clock,
  ChevronRight,
  ExternalLink,
  Star,
  Smartphone,
  Info,
  FileCheck,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = buildPageMetadata({
  title: "Baliza V-16 DGT 2026 | Homologadas, Precio y Registro Obligatorio",
  description:
    "Todo sobre la baliza V-16 obligatoria desde julio 2026 (DGT 3.0): modelos homologados, cómo registrarla, precio y comparativa top 5. ¿La tuya está homologada?",
  path: "/baliza-v-16",
  keywords: [
    "baliza v16",
    "baliza v-16 homologadas",
    "dgt baliza v16",
    "baliza v16 precio",
    "registrar baliza dgt",
    "baliza v16 obligatoria 2026",
    "nueva baliza dgt",
    "baliza v16 tiempo real",
    "dgt 3.0 baliza",
    "comprobar baliza dgt",
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// Static data — top homologated models (manual list, DGT homolog. registry)
// ─────────────────────────────────────────────────────────────────────────────
interface BeaconModel {
  name: string;
  brand: string;
  connectivity: string;
  batteryHours: number;
  priceEur: number;
  warrantyYears: number;
  homologated: boolean;
  highlight?: string;
  asin?: string; // Amazon ASIN placeholder for affiliate
}

const TOP_BEACONS: BeaconModel[] = [
  {
    name: "Nokin NK-V16",
    brand: "Nokin",
    connectivity: "4G LTE",
    batteryHours: 24,
    priceEur: 49,
    warrantyYears: 2,
    homologated: true,
    highlight: "Más vendida",
    asin: "PLACEHOLDER_ASIN_1",
  },
  {
    name: "Osram LEDguardian Road Flare V16",
    brand: "Osram",
    connectivity: "Bluetooth + GPS",
    batteryHours: 48,
    priceEur: 69,
    warrantyYears: 3,
    homologated: true,
    highlight: "Mejor batería",
    asin: "PLACEHOLDER_ASIN_2",
  },
  {
    name: "Bematik V16-Pro",
    brand: "Bematik",
    connectivity: "4G LTE",
    batteryHours: 20,
    priceEur: 42,
    warrantyYears: 2,
    homologated: true,
    asin: "PLACEHOLDER_ASIN_3",
  },
  {
    name: "Waylet Flash V16",
    brand: "Repsol Waylet",
    connectivity: "4G LTE + GPS",
    batteryHours: 30,
    priceEur: 55,
    warrantyYears: 2,
    homologated: true,
    highlight: "Integrada con app",
    asin: "PLACEHOLDER_ASIN_4",
  },
  {
    name: "Garmin Varia RTL516",
    brand: "Garmin",
    connectivity: "ANT+ / Bluetooth",
    batteryHours: 16,
    priceEur: 89,
    warrantyYears: 2,
    homologated: false,
    highlight: "Alta visibilidad",
    asin: "PLACEHOLDER_ASIN_5",
  },
];

const FAQ_ITEMS = [
  {
    q: "¿Es obligatoria la baliza V-16 en 2026?",
    a: "Sí. El Real Decreto 159/2021 establece que la baliza de señalización V-16 conectada (con transmisión de posición GPS en tiempo real) será obligatoria a partir del 1 de julio de 2026 en sustitución de los triángulos de emergencia. A partir de esa fecha, los triángulos dejarán de ser obligatorios.",
  },
  {
    q: "¿Cuánto cuesta una baliza V-16 homologada?",
    a: "El precio de las balizas V-16 homologadas por la DGT oscila entre 40 y 90 euros dependiendo del modelo y sus prestaciones (duración de batería, conectividad 4G vs Bluetooth, garantía). Las opciones más vendidas se sitúan en torno a los 45-60 euros.",
  },
  {
    q: "¿Hay que registrar la baliza V-16 en la DGT?",
    a: "Sí. Cada baliza V-16 debe ser registrada en la plataforma de la DGT vinculando su número de serie al titular del vehículo. El registro es gratuito y se realiza online a través de la sede electrónica de la DGT (sede.dgt.gob.es). Sin registro, la baliza no transmite la posición al Centro de Gestión del Tráfico.",
  },
  {
    q: "¿Qué diferencia hay entre una baliza V-16 conectada y no conectada?",
    a: "La baliza V-16 conectada (DGT 3.0) transmite en tiempo real las coordenadas GPS al Centro de Gestión del Tráfico de la DGT, lo que permite alertar a otros conductores a través de la plataforma DGT 3.0. La no conectada solo emite luz LED visible, sin transmisión. La ley exige el modelo conectado desde julio de 2026.",
  },
  {
    q: "¿Qué pasa si no llevo baliza V-16 a partir de julio de 2026?",
    a: "No llevar la baliza V-16 a partir del 1 de julio de 2026 constituye una infracción leve sancionable con multa de hasta 200 euros según el artículo 76 de la Ley de Tráfico. Además, en caso de accidente o avería, expones a otros conductores a un mayor riesgo sin la señalización obligatoria.",
  },
  {
    q: "¿Cómo saber si mi baliza V-16 está homologada por la DGT?",
    a: "Puedes verificar si un modelo está homologado buscando el número de homologación en la etiqueta o caja del dispositivo (formato E1 o similar) y consultando el registro oficial de la DGT. En esta página ofrecemos la lista actualizada de modelos verificados.",
  },
  {
    q: "¿Puede la baliza V-16 reemplazar a los triángulos de emergencia?",
    a: "Sí, pero solo a partir del 1 de julio de 2026 y solo si el modelo está homologado como baliza V-16 conectada según la norma UNE 135400. Hasta esa fecha, los triángulos de emergencia siguen siendo obligatorios. Se recomienda llevar ambos durante el período de transición.",
  },
  {
    q: "¿Con qué frecuencia envía la posición GPS la baliza V-16?",
    a: "Las balizas V-16 conectadas envían la posición GPS cada 10-30 segundos al Centro de Gestión del Tráfico de la DGT, dependiendo del modelo. Esto permite actualizar el mapa de alertas de la plataforma DGT 3.0 casi en tiempo real.",
  },
  {
    q: "¿Sirve la baliza V-16 si no tengo cobertura móvil?",
    a: "La transmisión de posición GPS requiere cobertura 4G o 3G. En zonas sin cobertura, la baliza seguirá emitiendo luz LED visible para los conductores que se aproximen, pero no transmitirá datos al sistema DGT 3.0. Por este motivo se recomienda mantener los triángulos como respaldo hasta julio de 2026.",
  },
  {
    q: "¿La baliza V-16 tiene que ir colocada en el techo?",
    a: "Sí. La normativa exige que la baliza V-16 se coloque en la parte más alta del vehículo (techo) mediante imán o soporte, de forma que sea visible desde todas las direcciones en un radio de al menos 1 km. No se puede usar en el suelo como los triángulos.",
  },
  {
    q: "¿Cuánto dura la batería de una baliza V-16?",
    a: "La normativa exige un mínimo de 30 minutos de funcionamiento, pero la mayoría de modelos homologados ofrecen entre 16 y 48 horas de autonomía. Los modelos con batería recargable USB (microUSB o USB-C) son los más prácticos para tener siempre cargados.",
  },
  {
    q: "¿Puedo usar la misma baliza en varios vehículos?",
    a: "Técnicamente sí, una baliza puede trasladarse entre vehículos, pero el registro en la DGT vincula la baliza a un titular, no a un vehículo concreto. Consulta los términos de la plataforma DGT 3.0 para el uso en vehículos de empresa o flota.",
  },
  {
    q: "¿Dónde comprar una baliza V-16 homologada?",
    a: "Las balizas V-16 homologadas están disponibles en grandes superficies (El Corte Inglés, Carrefour, Leroy Merlin), tiendas de automoción (Norauto, Aurgi), estaciones de servicio (Repsol Waylet) y Amazon España. Verifica siempre el número de homologación antes de comprar.",
  },
  {
    q: "¿Cómo registrar la baliza V-16 en la sede electrónica de la DGT?",
    a: "El registro se realiza en sede.dgt.gob.es > Vehículos > Registrar dispositivo V-16. Necesitas: DNI electrónico o certificado digital, número de serie de la baliza y matrícula del vehículo. El proceso tarda menos de 5 minutos.",
  },
  {
    q: "¿Funciona la baliza V-16 con la app DGT 3.0?",
    a: "Sí. Las balizas V-16 conectadas registradas en la plataforma DGT 3.0 aparecen automáticamente en el mapa de la app DGT 3.0 cuando están activas, alertando a los conductores que se aproximen. También son visibles en trafico.live y otras plataformas que consumen el feed DGT.",
  },
];

const HOWTO_STEPS = [
  {
    name: "Comprar una baliza V-16 homologada",
    text: "Adquiere un modelo con número de homologación oficial DGT. Verifica que la caja indica 'V-16 conectada' y muestra el sello de homologación europeo (E1 o equivalente). Precio estimado: 40-90 €.",
  },
  {
    name: "Localizar el número de serie",
    text: "Encuentra el número de serie único de tu baliza en la etiqueta inferior del dispositivo o en el manual. Suele tener formato alfanumérico de 8-12 caracteres. Lo necesitarás para el registro.",
  },
  {
    name: "Acceder a la sede electrónica de la DGT",
    text: "Entra en sede.dgt.gob.es con tu certificado digital, DNI electrónico o Cl@ve. En el menú de vehículos, selecciona 'Registrar dispositivo V-16'.",
  },
  {
    name: "Registrar la baliza",
    text: "Introduce el número de serie de la baliza y la matrícula del vehículo. El sistema verificará que el modelo está homologado y generará un código de confirmación. El proceso dura menos de 5 minutos.",
  },
  {
    name: "Guardar la confirmación",
    text: "Descarga o guarda en pantalla el justificante de registro. A partir de ese momento, tu baliza está activa en la plataforma DGT 3.0 y transmitirá posición GPS al activarla en carretera.",
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

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Cómo registrar una baliza V-16 en la DGT",
    description:
      "Pasos para registrar tu baliza V-16 conectada en la plataforma DGT 3.0 de forma gratuita.",
    totalTime: "PT5M",
    tool: [{ "@type": "HowToTool", name: "Certificado digital o DNI electrónico" }],
    supply: [{ "@type": "HowToSupply", name: "Baliza V-16 homologada" }],
    step: HOWTO_STEPS.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
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

  return [faqSchema, howToSchema, breadcrumbSchema];
}

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

function HomologationBadge({ homologated }: { homologated: boolean }) {
  if (homologated) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle className="w-3 h-3" />
        Homologada DGT
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
      <XCircle className="w-3 h-3" />
      Sin homologar V-16
    </span>
  );
}

/** Affiliate CTA placeholder — TODO: replace ASIN with real affiliate tracking */
function AffiliateCTA({ asin, modelName }: { asin: string; modelName: string }) {
  // TODO: Replace with real Amazon affiliate link (tag=traficolive-21 or similar)
  const amazonUrl = `https://www.amazon.es/dp/${asin}?tag=AFFILIATE_TODO`;
  return (
    <a
      href={amazonUrl}
      target="_blank"
      rel="noopener sponsored"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-tl-amber-500 hover:bg-tl-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
      aria-label={`Ver ${modelName} en Amazon`}
    >
      <ExternalLink className="w-3.5 h-3.5" />
      Ver precio Amazon
      {/* TODO: Add real ASIN before launch */}
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function BalizaV16Page() {
  const schemas = buildSchemas();
  const now = new Date();
  const deadline = new Date("2026-07-01");
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

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
                Modelos homologados, precio, cómo registrarla y comparativa completa
              </p>
            </div>
          </div>

          {/* Deadline countdown */}
          {daysLeft > 0 && (
            <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <Clock className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-tl-amber-800 dark:text-tl-amber-300 text-sm">
                  Obligatoria en{" "}
                  <span className="font-bold text-tl-amber-700 dark:text-tl-amber-400 font-data">
                    {daysLeft}
                  </span>{" "}
                  días — 1 julio 2026
                </p>
                <p className="text-xs text-tl-amber-700 dark:text-tl-amber-500 mt-0.5">
                  La baliza V-16 conectada sustituye a los triángulos de emergencia desde esa fecha.
                  Los triángulos dejan de ser obligatorios.
                </p>
              </div>
            </div>
          )}
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
            la DGT (plataforma DGT 3.0), alertando a otros conductores. Es{" "}
            <strong>obligatoria desde el 1 de julio de 2026</strong> según el Real Decreto 159/2021.
            El precio oscila entre <strong>40 y 90 €</strong> según el modelo.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              { label: "Desde", value: "1 jul 2026", icon: Clock },
              { label: "Precio aprox.", value: "40–90 €", icon: Euro },
              { label: "Colocación", value: "En el techo", icon: ShieldCheck },
              { label: "Registro", value: "Gratuito DGT", icon: FileCheck },
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

        {/* ── Homologated models table ── */}
        <section className="mb-8" aria-labelledby="heading-homologadas">
          <h2
            id="heading-homologadas"
            className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
          >
            Balizas V-16 homologadas DGT — Comparativa top 5
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                      Modelo
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                      Conectividad
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                      Batería
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                      Precio
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                      Estado
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {TOP_BEACONS.map((beacon, i) => (
                    <tr
                      key={beacon.name}
                      className={`border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors ${i === 0 ? "bg-tl-50/50 dark:bg-tl-900/10" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {beacon.name}
                        </div>
                        <div className="text-xs text-gray-400">{beacon.brand}</div>
                        {beacon.highlight && (
                          <span className="inline-flex items-center gap-1 mt-1 text-xs text-tl-amber-600 dark:text-tl-amber-400 font-medium">
                            <Star className="w-3 h-3" />
                            {beacon.highlight}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Wifi className="w-3.5 h-3.5 text-tl-500" />
                          {beacon.connectivity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-data text-gray-700 dark:text-gray-300">
                        {beacon.batteryHours}h
                      </td>
                      <td className="px-4 py-3 text-right font-data font-semibold text-gray-900 dark:text-gray-100">
                        {beacon.priceEur} €
                      </td>
                      <td className="px-4 py-3">
                        <HomologationBadge homologated={beacon.homologated} />
                      </td>
                      <td className="px-4 py-3">
                        {beacon.asin && (
                          <AffiliateCTA asin={beacon.asin} modelName={beacon.name} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 px-4 py-2 border-t border-gray-100 dark:border-gray-800">
              * Precios orientativos. Verifica homologación en{" "}
              <a
                href="https://sede.dgt.gob.es"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                sede.dgt.gob.es
              </a>{" "}
              antes de comprar.
            </p>
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
            Comprueba si tu baliza V-16 está oficialmente homologada por la DGT consultando el
            registro público. Necesitas el número de serie o el modelo exacto.
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
                  Aparece en el registro DGT, tiene número de homologación en la caja y transmite
                  posición GPS.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-800 dark:text-red-300">No válida si…</p>
                <p className="text-xs text-red-700 dark:text-red-500 mt-0.5">
                  Solo emite luz LED sin conectividad, no aparece en el registro DGT o es un modelo
                  anterior a 2021.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── How-To registration ── */}
        <section className="mb-8" aria-labelledby="heading-registro">
          <h2
            id="heading-registro"
            className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
          >
            Cómo registrar la baliza V-16 en la DGT (5 pasos)
          </h2>
          <div className="space-y-3">
            {HOWTO_STEPS.map((step, i) => (
              <div
                key={step.name}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex gap-4"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-tl-100 dark:bg-tl-900/40 flex items-center justify-center text-sm font-bold text-tl-700 dark:text-tl-300">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                    {step.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <a
              href="https://sede.dgt.gob.es"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-tl-600 hover:bg-tl-700 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              <FileCheck className="w-4 h-4" />
              Registrar en sede.dgt.gob.es
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
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
            . Los precios de Amazon son aproximados y pueden variar. Los enlaces a Amazon son enlaces
            de afiliado —{" "}
            <Link href="/divulgacion-afiliados" className="underline">
              más información
            </Link>
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
