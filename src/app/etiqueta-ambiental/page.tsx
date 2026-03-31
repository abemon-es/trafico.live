import Link from "next/link";
import {
  Leaf,
  Zap,
  Car,
  ExternalLink,
  Smartphone,
  FileText,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Info,
  Ban,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { buildPageMetadata } from "@/lib/seo/metadata";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
const CURRENT_YEAR = new Date().getFullYear();

export const metadata = {
  ...buildPageMetadata({
    title: `Etiqueta Ambiental DGT: Consulta y Guía Completa ${CURRENT_YEAR}`,
    description:
      "Guía completa de la etiqueta ambiental DGT: distintivos 0, ECO, C, B y sin etiqueta. Cómo consultar tu etiqueta, qué circulación permite cada distintivo en ZBE y multas por incumplimiento.",
    path: "/etiqueta-ambiental",
    ogType: "article",
    keywords: [
      "etiqueta ambiental DGT",
      "cómo saber etiqueta coche",
      "distintivo ambiental DGT",
      "etiqueta 0 emisiones",
      "etiqueta ECO DGT",
      "etiqueta C DGT",
      "etiqueta B DGT",
      "consultar etiqueta medioambiental",
      "etiqueta ambiental vehículo",
      "ZBE etiqueta ambiental",
      "distintivo ambiental 2026",
      "cómo obtener etiqueta ambiental",
    ],
  }),
};

// -------------------------------------------------------------------------
// Data: the 5 labels
// -------------------------------------------------------------------------
const LABELS = [
  {
    code: "0",
    name: "Distintivo 0 Emisiones",
    color: "bg-teal-50 dark:bg-teal-900/200",
    textColor: "text-teal-700",
    bgLight: "bg-teal-50 dark:bg-teal-900/20",
    borderColor: "border-teal-200",
    dot: "bg-teal-50 dark:bg-teal-900/200",
    description:
      "Vehículos de cero emisiones: eléctricos puros (BEV), de hidrógeno (FCEV) e híbridos enchufables (PHEV) con autonomía eléctrica superior a 40 km.",
    vehicles: [
      "Eléctricos puros (BEV) — cualquier año",
      "Pila de combustible / hidrógeno (FCEV)",
      "Híbridos enchufables (PHEV) con ≥ 40 km autonomía eléctrica",
    ],
    zbeAccess: "Acceso libre en todas las ZBE, incluso en episodios de contaminación alta",
    perks: [
      "Estacionamiento gratuito o reducido en zonas reguladas (municipio a municipio)",
      "Exención de restricciones en todos los episodios de contaminación",
      "Uso del carril bus-VAO en Madrid y otras ciudades",
      "Reducción en impuesto de matriculación y rodaje",
    ],
  },
  {
    code: "ECO",
    name: "Distintivo ECO",
    color: "bg-green-50 dark:bg-green-900/200",
    textColor: "text-green-700 dark:text-green-400",
    bgLight: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200",
    dot: "bg-green-50 dark:bg-green-900/200",
    description:
      "Híbridos no enchufables, gas natural (GNC/GNL) y GLP. Menos contaminantes que los vehículos de combustión convencional.",
    vehicles: [
      "Híbridos no enchufables (HEV) con motor gasolina Euro 4 o superior",
      "Híbridos no enchufables (HEV) con motor diésel Euro 6",
      "Gas natural comprimido (GNC) y licuado (GNL)",
      "Gas licuado del petróleo (GLP / autogas)",
      "Híbridos enchufables con < 40 km autonomía eléctrica",
    ],
    zbeAccess: "Acceso con restricciones leves. Algunos municipios los equiparan al 0 en días normales",
    perks: [
      "Circulación permitida en ZBE en condiciones normales",
      "Restricciones solo en episodios de contaminación severa o muy severa",
      "Descuentos en peajes en algunas vías concesionadas",
    ],
  },
  {
    code: "C",
    name: "Distintivo C",
    color: "bg-yellow-400",
    textColor: "text-yellow-700 dark:text-yellow-400",
    bgLight: "bg-yellow-50 dark:bg-yellow-900/20",
    borderColor: "border-yellow-200",
    dot: "bg-yellow-400",
    description:
      "Vehículos de gasolina Euro 4 o superior y diésel Euro 6. La etiqueta más extendida entre los turismos recientes de combustión.",
    vehicles: [
      "Gasolina Euro 4 (matriculados desde 2006 aprox.)",
      "Gasolina Euro 5 (matriculados desde 2011 aprox.)",
      "Gasolina Euro 6 (matriculados desde 2015 aprox.)",
      "Diésel Euro 6 (matriculados desde 2015 aprox.)",
    ],
    zbeAccess: "Acceso permitido en condiciones normales. Restricciones en episodios de contaminación alta o muy alta",
    perks: [
      "Circulación libre en ZBE en días sin restricciones",
      "Puede circular por Madrid Central y ZBE Barcelona en períodos normales",
    ],
  },
  {
    code: "B",
    name: "Distintivo B",
    color: "bg-orange-400",
    textColor: "text-orange-700 dark:text-orange-400",
    bgLight: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-200",
    dot: "bg-orange-400",
    description:
      "Gasolina Euro 3 y diésel Euro 5. Vehículos más contaminantes que los de etiqueta C pero que cumplen mínimos.",
    vehicles: [
      "Gasolina Euro 3 (matriculados aprox. 2001-2005)",
      "Diésel Euro 4 (matriculados aprox. 2006-2010)",
      "Diésel Euro 5 (matriculados aprox. 2011-2015)",
    ],
    zbeAccess: "Acceso restringido. Suelen quedar fuera en episodios de contaminación media, alta o muy alta",
    perks: [
      "Circulación permitida fuera de ZBE sin limitaciones por etiqueta",
      "Pueden circular en algunas ZBE solo en días sin restricciones activas",
    ],
  },
  {
    code: "Sin etiqueta",
    name: "Sin distintivo ambiental",
    color: "bg-gray-400",
    textColor: "text-gray-700 dark:text-gray-300",
    bgLight: "bg-gray-50 dark:bg-gray-950",
    borderColor: "border-gray-200 dark:border-gray-800",
    dot: "bg-gray-400",
    description:
      "Vehículos más antiguos o más contaminantes. No cumplen los umbrales mínimos para obtener un distintivo.",
    vehicles: [
      "Gasolina Euro 0, 1 o 2 (matriculados antes de 2001 aprox.)",
      "Diésel Euro 0, 1, 2 o 3 (matriculados antes de 2006 aprox.)",
      "Motocicletas y ciclomotores sin normativa Euro o Euro 1/2",
    ],
    zbeAccess: "Sin acceso a ZBE. Pueden estar restringidos también fuera de ZBE en episodios de contaminación",
    perks: [],
  },
];

// -------------------------------------------------------------------------
// Data: vehicle classification table (year + fuel + norm → label)
// -------------------------------------------------------------------------
const VEHICLE_TABLE = [
  { fuel: "Gasolina", norm: "Euro 6", years: "Desde 2015", label: "C" },
  { fuel: "Gasolina", norm: "Euro 5", years: "2011 – 2015", label: "C" },
  { fuel: "Gasolina", norm: "Euro 4", years: "2006 – 2010", label: "C" },
  { fuel: "Gasolina", norm: "Euro 3", years: "2001 – 2005", label: "B" },
  { fuel: "Gasolina", norm: "Euro 0-2", years: "Antes de 2001", label: "Sin etiqueta" },
  { fuel: "Diésel", norm: "Euro 6", years: "Desde 2015", label: "C" },
  { fuel: "Diésel", norm: "Euro 5", years: "2011 – 2015", label: "B" },
  { fuel: "Diésel", norm: "Euro 4", years: "2006 – 2010", label: "B" },
  { fuel: "Diésel", norm: "Euro 0-3", years: "Antes de 2006", label: "Sin etiqueta" },
  { fuel: "Eléctrico (BEV)", norm: "—", years: "Cualquier año", label: "0" },
  { fuel: "Hidrógeno (FCEV)", norm: "—", years: "Cualquier año", label: "0" },
  { fuel: "Híbrido enchufable (PHEV ≥ 40 km)", norm: "—", years: "Cualquier año", label: "0" },
  { fuel: "Híbrido enchufable (PHEV < 40 km)", norm: "—", years: "Cualquier año", label: "ECO" },
  { fuel: "Híbrido no enchufable (HEV) gasolina", norm: "Euro 4+", years: "Desde 2006", label: "ECO" },
  { fuel: "Híbrido no enchufable (HEV) diésel", norm: "Euro 6", years: "Desde 2015", label: "ECO" },
  { fuel: "Gas natural (GNC/GNL)", norm: "—", years: "Cualquier año", label: "ECO" },
  { fuel: "GLP / Autogas", norm: "—", years: "Cualquier año", label: "ECO" },
];

// -------------------------------------------------------------------------
// Data: fines by city
// -------------------------------------------------------------------------
const CITY_FINES = [
  { city: "Madrid", amount: "200 €", notes: "Madrid Central y ZBE Distrito Centro" },
  { city: "Barcelona", amount: "200 €", notes: "ZBE Rondes Barcelona" },
  { city: "Valencia", amount: "200 €", notes: "ZBE Valencia" },
  { city: "Sevilla", amount: "200 €", notes: "ZBE en trámite" },
  { city: "Zaragoza", amount: "200 €", notes: "ZBE Zaragoza" },
  { city: "Valladolid", amount: "200 €", notes: "ZBE Valladolid" },
  { city: "Vitoria-Gasteiz", amount: "200 €", notes: "ZBE Vitoria" },
];

// -------------------------------------------------------------------------
// Data: FAQ
// -------------------------------------------------------------------------
const FAQ_ITEMS = [
  {
    question: "¿Cómo sé qué etiqueta ambiental le corresponde a mi coche?",
    answer:
      "Puedes consultar la etiqueta de tu vehículo en la Sede Electrónica de la DGT (sede.dgt.gob.es) introduciendo la matrícula. También puedes usar la app miDGT (disponible para iOS y Android). La etiqueta depende del tipo de combustible y de la norma Euro de emisiones del motor, que puedes encontrar en el permiso de circulación (campo 'D.5' o el apartado de emisiones).",
  },
  {
    question: "¿Dónde puedo conseguir el pegatino de la etiqueta ambiental?",
    answer:
      "La etiqueta física (la pegatina para el parabrisas) se vende en las Jefaturas de Tráfico, en gasolineras, estancos y en tiendas de automoción. Su precio es orientativo de 0,80–1,50 €. La etiqueta es informativa; lo que realmente importa para los controles es el registro oficial de la DGT, al que tienen acceso las cámaras de vigilancia y los agentes.",
  },
  {
    question: "¿Qué pasa si circulo sin etiqueta ambiental por una ZBE?",
    answer:
      "Circular por una Zona de Bajas Emisiones sin el distintivo correspondiente puede suponer una multa de 200 € (sanción leve según la Ley de Tráfico). Muchas ZBE se controlan mediante cámaras OCR que leen la matrícula y comprueban automáticamente el registro de la DGT, por lo que no es necesario que un agente te pare en persona.",
  },
  {
    question: "¿Puede circular un vehículo con etiqueta B por Madrid Central?",
    answer:
      "Sí, en condiciones normales los vehículos con etiqueta B pueden circular por Madrid Central, pero están sujetos a restricciones en episodios de contaminación. Cuando se activa el protocolo de contaminación por ozono u otras partículas, Madrid puede restringir la circulación de los vehículos B en ZBE. Consulta siempre el estado del protocolo en tiempo real en esta web o en la web del Ayuntamiento de Madrid.",
  },
  {
    question: "¿Cuánto cuesta la multa por circular sin etiqueta en zona restringida?",
    answer:
      "La sanción base es de 200 € en la mayoría de los municipios españoles. Al tratarse de una infracción leve, no conlleva pérdida de puntos del carné. Si la infracción se paga en los 20 días hábiles siguientes a la notificación, se aplica una reducción del 50 %, quedando en 100 €. Cada municipio puede fijar su propio régimen sancionador dentro del marco estatal.",
  },
];

function LabelBadge({ code, color }: { code: string; color: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${color} text-white text-xs font-black leading-none`}
    >
      {code === "Sin etiqueta" ? "—" : code}
    </span>
  );
}

function TableLabelBadge({ label }: { label: string }) {
  const map: Record<string, string> = {
    "0": "bg-teal-50 dark:bg-teal-900/200",
    ECO: "bg-green-50 dark:bg-green-900/200",
    C: "bg-yellow-400",
    B: "bg-orange-400",
    "Sin etiqueta": "bg-gray-400",
  };
  const cls = map[label] ?? "bg-gray-400";
  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${cls}`}
    >
      {label}
    </span>
  );
}

export default function EtiquetaAmbientalPage() {
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

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Etiqueta Ambiental DGT: Consulta y Guía Completa ${CURRENT_YEAR}`,
    description:
      "Guía completa sobre los distintivos ambientales DGT: tipos, vehículos, cómo consultarlos y restricciones ZBE.",
    url: `${BASE_URL}/etiqueta-ambiental`,
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
    dateModified: new Date().toISOString(),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Etiqueta Ambiental DGT", href: "/etiqueta-ambiental" },
            ]}
          />

          {/* Header */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex-shrink-0">
                <Leaf className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Etiqueta Ambiental DGT: Consulta y Guía Completa {CURRENT_YEAR}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
                  La <strong>etiqueta ambiental de la DGT</strong> (también llamada distintivo
                  ambiental) clasifica los vehículos según sus emisiones contaminantes. Determina si
                  tu vehículo puede circular por <strong>Zonas de Bajas Emisiones (ZBE)</strong> y
                  qué restricciones de tráfico se aplican en episodios de contaminación. En esta
                  guía encontrarás todos los tipos de etiqueta, cómo consultar la tuya y qué
                  implicaciones tiene en cada ciudad.
                </p>
              </div>
            </div>
          </div>

          {/* How to check — 3 methods */}
          <section className="mb-8" aria-labelledby="heading-consulta">
            <h2 id="heading-consulta" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Cómo consultar tu etiqueta ambiental
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-tl-200 dark:border-tl-800 p-5">
                <div className="p-2.5 bg-tl-50 dark:bg-tl-900/20 rounded-lg w-fit mb-3">
                  <FileText className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">1. Sede electrónica DGT</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                  Accede a{" "}
                  <strong>sede.dgt.gob.es</strong> e introduce tu matrícula en el apartado de
                  consulta de distintivo ambiental. Necesitarás identificarte con DNI electrónico o
                  Cl@ve.
                </p>
                <a
                  href="https://sede.dgt.gob.es/es/tramites-y-multas/vehiculos/distintivo-ambiental/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-tl-600 dark:text-tl-400 text-sm font-medium hover:underline"
                >
                  Ir a la Sede DGT
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-lg border border-tl-200 dark:border-tl-800 p-5">
                <div className="p-2.5 bg-tl-50 dark:bg-tl-900/20 rounded-lg w-fit mb-3">
                  <Smartphone className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">2. App miDGT</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                  La app oficial <strong>miDGT</strong> (iOS y Android) te permite ver el distintivo
                  ambiental de tu vehículo, junto con el permiso de circulación digital y el
                  historial de ITV. Descárgala desde las tiendas oficiales de Apple o Google.
                </p>
                <p className="text-xs text-gray-400">
                  Disponible en App Store y Google Play
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-lg border border-tl-200 dark:border-tl-800 p-5">
                <div className="p-2.5 bg-tl-50 dark:bg-tl-900/20 rounded-lg w-fit mb-3">
                  <Car className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">3. Pegatina en el vehículo</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                  Si tu vehículo ya tiene la pegatina en el parabrisas, el color y la letra te
                  indican directamente tu distintivo. La pegatina no es obligatoria pero sí
                  recomendable para facilitar controles visuales.
                </p>
                <p className="text-xs text-gray-400">
                  Disponible en Jefaturas de Tráfico, estancos y gasolineras
                </p>
              </div>
            </div>
          </section>

          {/* The 5 labels explained */}
          <section className="mb-8" aria-labelledby="heading-labels">
            <h2 id="heading-labels" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Los 5 distintivos ambientales DGT
            </h2>
            <div className="space-y-4">
              {LABELS.map((label) => (
                <div
                  key={label.code}
                  className={`bg-white dark:bg-gray-900 rounded-xl border ${label.borderColor} p-5`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Badge */}
                    <div className="flex-shrink-0">
                      <LabelBadge code={label.code} color={label.color} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-lg mb-1 ${label.textColor}`}>
                        {label.name}
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 leading-relaxed">
                        {label.description}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Vehicles */}
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            Vehículos incluidos
                          </h4>
                          <ul className="space-y-1">
                            {label.vehicles.map((v) => (
                              <li key={v} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <CheckCircle2
                                  className={`w-4 h-4 flex-shrink-0 mt-0.5 ${label.textColor}`}
                                />
                                {v}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* ZBE access + perks */}
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            Acceso a ZBE
                          </h4>
                          <p className={`text-sm mb-3 font-medium ${label.textColor}`}>
                            {label.zbeAccess}
                          </p>
                          {label.perks.length > 0 && (
                            <>
                              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                Ventajas adicionales
                              </h4>
                              <ul className="space-y-1">
                                {label.perks.map((perk) => (
                                  <li key={perk} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${label.dot}`} />
                                    {perk}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                          {label.code === "Sin etiqueta" && (
                            <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>Sin acceso a ZBE ni ventajas asociadas</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Classification table */}
          <section className="mb-8" aria-labelledby="heading-table">
            <h2 id="heading-table" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Tabla: qué etiqueta corresponde según combustible y año
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        Combustible / tipo
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        Norma Euro
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        Años orientativos
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        Etiqueta
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {VEHICLE_TABLE.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:bg-gray-950 transition-colors">
                        <td className="py-2.5 px-4 text-gray-800 dark:text-gray-200 font-medium">{row.fuel}</td>
                        <td className="py-2.5 px-4 text-gray-600 dark:text-gray-400">{row.norm}</td>
                        <td className="py-2.5 px-4 text-gray-600 dark:text-gray-400">{row.years}</td>
                        <td className="py-2.5 px-4">
                          <TableLabelBadge label={row.label} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                Los años son orientativos. La norma Euro exacta de tu vehículo consta en el permiso
                de circulación (campo D.5). En caso de duda, consulta la Sede Electrónica de la DGT.
              </p>
            </div>
          </section>

          {/* What each label allows/restricts in ZBE */}
          <section className="mb-8" aria-labelledby="heading-zbe-rules">
            <h2 id="heading-zbe-rules" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Qué permite y qué restringe cada etiqueta en las ZBE
            </h2>

            <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-lg p-4 mb-5 flex items-start gap-3">
              <Info className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-tl-amber-700 dark:text-tl-amber-300 leading-relaxed">
                Las ZBE se implementan de forma progresiva en España. Cada municipio establece sus
                propias reglas dentro del marco de la{" "}
                <strong>Ley de Cambio Climático y Transición Energética (Ley 7/2021)</strong>. Los
                criterios concretos pueden variar entre ciudades. Consulta siempre la normativa
                municipal actualizada.
              </p>
            </div>

            <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Etiqueta</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Sin contaminación
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Episodio leve
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Episodio alto
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Episodio muy alto
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    {
                      label: "0",
                      color: "text-teal-600 font-bold",
                      cols: ["Libre", "Libre", "Libre", "Libre"],
                      icons: ["check", "check", "check", "check"],
                    },
                    {
                      label: "ECO",
                      color: "text-green-600 dark:text-green-400 font-bold",
                      cols: ["Libre", "Libre", "Restringido", "Restringido"],
                      icons: ["check", "check", "warn", "warn"],
                    },
                    {
                      label: "C",
                      color: "text-yellow-600 dark:text-yellow-400 font-bold",
                      cols: ["Libre", "Libre", "Restringido", "Restringido"],
                      icons: ["check", "check", "warn", "warn"],
                    },
                    {
                      label: "B",
                      color: "text-orange-600 dark:text-orange-400 font-bold",
                      cols: ["Libre*", "Restringido", "No acceso", "No acceso"],
                      icons: ["check", "warn", "x", "x"],
                    },
                    {
                      label: "Sin etiqueta",
                      color: "text-gray-600 dark:text-gray-400 font-bold",
                      cols: ["No acceso", "No acceso", "No acceso", "No acceso"],
                      icons: ["x", "x", "x", "x"],
                    },
                  ].map((row) => (
                    <tr key={row.label} className="hover:bg-gray-50 dark:bg-gray-950 transition-colors">
                      <td className={`py-3 px-4 ${row.color}`}>{row.label}</td>
                      {row.cols.map((col, i) => (
                        <td key={i} className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium ${
                              row.icons[i] === "check"
                                ? "text-green-700 dark:text-green-400"
                                : row.icons[i] === "warn"
                                  ? "text-tl-amber-600 dark:text-tl-amber-400"
                                  : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {row.icons[i] === "check" ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : row.icons[i] === "warn" ? (
                              <AlertTriangle className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            {col}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                * Libre en acceso pero con posibles restricciones de estacionamiento o velocidad.
                Cada municipio determina su protocolo exacto.
              </p>
            </div>
          </section>

          {/* Fines by city */}
          <section className="mb-8" aria-labelledby="heading-fines">
            <h2 id="heading-fines" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Multas por circular sin etiqueta en zonas restringidas
            </h2>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 mb-5 flex items-start gap-3">
              <Ban className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-800 font-semibold mb-0.5">
                  Sanción base: 200 € (infracción leve)
                </p>
                <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">
                  Reducción del 50 % (100 €) si se paga en los 20 días hábiles siguientes. No
                  conlleva retirada de puntos del carné de conducir.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CITY_FINES.map((cf) => (
                <div
                  key={cf.city}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 flex items-start gap-3"
                >
                  <MapPin className="w-4 h-4 text-tl-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{cf.city}</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">{cf.amount}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cf.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Related links */}
          <RelatedLinks
            title="Más información sobre ZBE y restricciones"
            links={[
              {
                title: "ZBE Madrid",
                description: "Zona de Bajas Emisiones de Madrid: normas y mapas",
                href: "/zbe/madrid",
                icon: <MapPin className="w-5 h-5" />,
              },
              {
                title: "ZBE Barcelona",
                description: "Zona de Bajas Emisiones de Barcelona: Rondes y área central",
                href: "/zbe/barcelona",
                icon: <MapPin className="w-5 h-5" />,
              },
              {
                title: "Restricciones de circulación",
                description: "Camiones, ZBE y restricciones especiales en España",
                href: "/restricciones",
                icon: <Ban className="w-5 h-5" />,
              },
              {
                title: "Puntos de carga EV",
                description: "Cargadores eléctricos en toda España",
                href: "/carga-ev",
                icon: <Zap className="w-5 h-5" />,
              },
            ]}
          />

          {/* ZBE city quick links */}
          <section className="mt-8 mb-8" aria-labelledby="heading-zbe-cities">
            <h2 id="heading-zbe-cities" className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
              Zonas de Bajas Emisiones por ciudad
            </h2>
            <div className="flex flex-wrap gap-2">
              {[
                { name: "Madrid", slug: "madrid" },
                { name: "Barcelona", slug: "barcelona" },
                { name: "Valencia", slug: "valencia" },
                { name: "Zaragoza", slug: "zaragoza" },
                { name: "Málaga", slug: "malaga" },
                { name: "Sevilla", slug: "sevilla" },
                { name: "Granada", slug: "granada" },
                { name: "Valladolid", slug: "valladolid" },
                { name: "Vitoria", slug: "vitoria" },
                { name: "Sabadell", slug: "sabadell" },
              ].map((city) => (
                <Link
                  key={city.slug}
                  href={`/zbe/${city.slug}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-tl-300 hover:text-tl-600 dark:text-tl-400 hover:shadow-sm transition-all"
                >
                  <Leaf className="w-3.5 h-3.5 text-green-500" />
                  ZBE {city.name}
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                </Link>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section aria-labelledby="heading-faq" className="mt-2">
            <h2 id="heading-faq" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Preguntas frecuentes sobre la etiqueta ambiental DGT
            </h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item) => (
                <div
                  key={item.question}
                  className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-5"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{item.question}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
