import { Metadata } from "next";
import Link from "next/link";
import {
  Leaf,
  AlertCircle,
  ChevronRight,
  MapPin,
  Euro,
  Car,
  Shield,
  Zap,
  CheckCircle,
  XCircle,
  MinusCircle,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import {
  generateDatasetSchema,
  generateFAQSchema,
} from "@/components/seo/StructuredData";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 300;

const CURRENT_YEAR = new Date().getFullYear();

// ─────────────────────────────────────────────────────────────────────────────
// Static city data for the index listing
// ─────────────────────────────────────────────────────────────────────────────

type ZBEStatus = "activa" | "planificada" | "en_desarrollo";
type AccessLevel = "permitido" | "restringido" | "prohibido";

interface ZBECityIndex {
  slug: string;
  name: string;
  status: ZBEStatus;
  activeSince: string;
  fineAmount: number;
  schedule: string;
  labelB: AccessLevel;
  sinEtiqueta: AccessLevel;
}

const ZBE_CITIES: ZBECityIndex[] = [
  {
    slug: "madrid",
    name: "Madrid",
    status: "activa",
    activeSince: "2022",
    fineAmount: 200,
    schedule: "Permanente",
    labelB: "restringido",
    sinEtiqueta: "prohibido",
  },
  {
    slug: "barcelona",
    name: "Barcelona",
    status: "activa",
    activeSince: "2020",
    fineAmount: 200,
    schedule: "Lun–Vie 07:00–20:00",
    labelB: "restringido",
    sinEtiqueta: "prohibido",
  },
  {
    slug: "valencia",
    name: "Valencia",
    status: "activa",
    activeSince: "2022",
    fineAmount: 200,
    schedule: "Permanente",
    labelB: "restringido",
    sinEtiqueta: "prohibido",
  },
  {
    slug: "sevilla",
    name: "Sevilla",
    status: "activa",
    activeSince: "2023",
    fineAmount: 200,
    schedule: "Horarios laborables",
    labelB: "restringido",
    sinEtiqueta: "prohibido",
  },
  {
    slug: "malaga",
    name: "Málaga",
    status: "activa",
    activeSince: "2023",
    fineAmount: 200,
    schedule: "Lun–Vie 07:00–21:00",
    labelB: "restringido",
    sinEtiqueta: "prohibido",
  },
  {
    slug: "zaragoza",
    name: "Zaragoza",
    status: "activa",
    activeSince: "2023",
    fineAmount: 200,
    schedule: "Horarios laborables",
    labelB: "restringido",
    sinEtiqueta: "prohibido",
  },
  {
    slug: "granada",
    name: "Granada",
    status: "activa",
    activeSince: "2023",
    fineAmount: 200,
    schedule: "Lab. 07:00–21:00, Sáb 09:00–21:00",
    labelB: "restringido",
    sinEtiqueta: "prohibido",
  },
  {
    slug: "sabadell",
    name: "Sabadell",
    status: "activa",
    activeSince: "2023",
    fineAmount: 200,
    schedule: "Permanente",
    labelB: "restringido",
    sinEtiqueta: "prohibido",
  },
  {
    slug: "vitoria",
    name: "Vitoria-Gasteiz",
    status: "activa",
    activeSince: "2023",
    fineAmount: 200,
    schedule: "Horarios laborables",
    labelB: "restringido",
    sinEtiqueta: "prohibido",
  },
  {
    slug: "valladolid",
    name: "Valladolid",
    status: "activa",
    activeSince: "2023",
    fineAmount: 200,
    schedule: "Horarios laborables",
    labelB: "restringido",
    sinEtiqueta: "prohibido",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DGT label guide data
// ─────────────────────────────────────────────────────────────────────────────

const LABEL_GUIDE = [
  {
    code: "0",
    name: "Cero emisiones",
    bg: "bg-teal-50 dark:bg-teal-900/20",
    border: "border-teal-300 dark:border-teal-700",
    text: "text-teal-800 dark:text-teal-300",
    dot: "bg-teal-500",
    access: "Acceso libre en todas las ZBE",
    accessColor: "text-green-600 dark:text-green-400",
    vehicles: "Eléctricos (BEV), hidrógeno (FCEV), PHEV ≥40 km",
  },
  {
    code: "ECO",
    name: "ECO",
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-300 dark:border-green-700",
    text: "text-green-800 dark:text-green-300",
    dot: "bg-green-500",
    access: "Acceso permitido en condiciones normales",
    accessColor: "text-green-600 dark:text-green-400",
    vehicles: "Híbridos no enchufables, GNC, GNL, GLP",
  },
  {
    code: "C",
    name: "C",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-yellow-300 dark:border-yellow-700",
    text: "text-yellow-800 dark:text-yellow-300",
    dot: "bg-yellow-500",
    access: "Acceso permitido, restringido en episodios",
    accessColor: "text-yellow-600 dark:text-yellow-400",
    vehicles: "Gasolina Euro 4+, diésel Euro 6",
  },
  {
    code: "B",
    name: "B",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-300 dark:border-amber-700",
    text: "text-amber-800 dark:text-amber-300",
    dot: "bg-amber-500",
    access: "Acceso restringido según horario y ciudad",
    accessColor: "text-amber-600 dark:text-amber-400",
    vehicles: "Gasolina Euro 3, diésel Euro 4–5",
  },
  {
    code: "Sin etiqueta",
    name: "Sin etiqueta",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-300 dark:border-red-700",
    text: "text-red-800 dark:text-red-300",
    dot: "bg-red-500",
    access: "Prohibido en todas las ZBE activas",
    accessColor: "text-red-600 dark:text-red-400",
    vehicles: "Gasolina pre-Euro 3, diésel pre-Euro 4",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FAQ data
// ─────────────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    question: "¿Qué es una Zona de Bajas Emisiones (ZBE)?",
    answer:
      "Una Zona de Bajas Emisiones (ZBE) es un área urbana delimitada donde se restringe o prohíbe la circulación de vehículos más contaminantes. En España, la Ley de Cambio Climático y Transición Energética (Ley 7/2021) obliga a todos los municipios de más de 50.000 habitantes a establecer ZBE antes de 2023. El objetivo es reducir la contaminación atmosférica y mejorar la calidad del aire.",
  },
  {
    question: "¿Qué vehículos no pueden entrar a una ZBE?",
    answer:
      "Los vehículos sin etiqueta ambiental DGT (generalmente gasolina anteriores a Euro 3 y diésel anteriores a Euro 4) están prohibidos en todas las ZBE activas de España. Los vehículos con etiqueta B tienen acceso restringido según el horario y la ciudad. Para circular libremente es recomendable tener etiqueta C, ECO o 0 emisiones.",
  },
  {
    question: "¿Cuánto es la multa por circular en una ZBE sin autorización?",
    answer:
      "La sanción habitual por circular en una ZBE sin el distintivo ambiental requerido es de 200 euros en la mayoría de ciudades españolas. En Madrid, la multa por reincidencia puede alcanzar los 2.000 euros. Las infracciones se detectan mediante cámaras de lectura automática de matrículas (LPR).",
  },
  {
    question: "¿Qué ciudades de España tienen ZBE en " + CURRENT_YEAR + "?",
    answer:
      "En " +
      CURRENT_YEAR +
      " tienen ZBE activa: Madrid, Barcelona, Valencia, Sevilla, Málaga, Zaragoza, Granada, Sabadell, Vitoria-Gasteiz y Valladolid. Son las primeras 10 ciudades en implementarlas. Decenas de municipios adicionales están en proceso de desarrollo o planificación de sus propias ZBE.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: `Zonas de Bajas Emisiones (ZBE) en España ${CURRENT_YEAR} — Guía Completa`,
  description:
    "Consulta todas las Zonas de Bajas Emisiones de España: restricciones, multas, horarios y etiquetas permitidas en Madrid, Barcelona, Valencia, Sevilla y más ciudades.",
  keywords: [
    "zonas bajas emisiones España",
    "ZBE España",
    "ZBE Madrid",
    "ZBE Barcelona",
    "restricciones tráfico centro ciudad",
    "etiqueta ambiental DGT",
    "multas ZBE",
    "zona de bajas emisiones",
    `ZBE ${CURRENT_YEAR}`,
    "qué ciudades tienen ZBE",
    "vehículos permitidos ZBE",
  ],
  openGraph: {
    title: `Zonas de Bajas Emisiones (ZBE) en España ${CURRENT_YEAR}`,
    description:
      "Guía completa de ZBE en España: qué vehículos pueden circular, multas, horarios y ciudades afectadas.",
    type: "website",
  },
  alternates: {
    canonical: `${BASE_URL}/zbe`,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function AccessIcon({ level }: { level: AccessLevel }) {
  if (level === "permitido")
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (level === "restringido")
    return <MinusCircle className="w-4 h-4 text-amber-500" />;
  return <XCircle className="w-4 h-4 text-red-500" />;
}

function AccessLabel({ level }: { level: AccessLevel }) {
  if (level === "permitido")
    return (
      <span className="text-green-700 dark:text-green-400 font-medium">
        Permitido
      </span>
    );
  if (level === "restringido")
    return (
      <span className="text-amber-700 dark:text-amber-400 font-medium">
        Restringido
      </span>
    );
  return (
    <span className="text-red-700 dark:text-red-400 font-medium">
      Prohibido
    </span>
  );
}

function StatusBadge({ status }: { status: ZBEStatus }) {
  if (status === "activa")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        Activa
      </span>
    );
  if (status === "planificada")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
        Planificada
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
      En desarrollo
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function ZBEIndexPage() {
  // Fetch live zone data from DB — used for stats aggregation
  const zones = await prisma.zBEZone.findMany({
    select: {
      id: true,
      name: true,
      cityName: true,
      fineAmount: true,
      effectiveFrom: true,
      effectiveUntil: true,
    },
    orderBy: { cityName: "asc" },
  });

  const activeCount = ZBE_CITIES.filter((c) => c.status === "activa").length;
  const avgFine = Math.round(
    ZBE_CITIES.reduce((acc, c) => acc + c.fineAmount, 0) / ZBE_CITIES.length
  );

  const datasetSchema = generateDatasetSchema({
    name: `Zonas de Bajas Emisiones en España ${CURRENT_YEAR}`,
    description:
      "Dataset de ZBE españolas: ciudad, estado, horarios, restricciones por etiqueta ambiental y multas.",
    url: `${BASE_URL}/zbe`,
    keywords: [
      "ZBE",
      "bajas emisiones",
      "tráfico",
      "España",
      "calidad del aire",
    ],
    dateModified: new Date(),
    spatialCoverage: "España",
    temporalCoverage: `${CURRENT_YEAR}`,
  });

  const faqSchema = generateFAQSchema({ questions: FAQ_ITEMS });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Zonas de Bajas Emisiones", href: "/zbe" },
            ]}
          />

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-tl-100 dark:bg-tl-900/30">
                <Leaf className="w-6 h-6 text-tl-600 dark:text-tl-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                Zonas de Bajas Emisiones en España{" "}
                <span className="text-tl-600 dark:text-tl-400">
                  {CURRENT_YEAR}
                </span>
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
              Consulta las restricciones, multas y horarios de todas las ZBE
              españolas. Comprueba si tu vehículo puede circular según su
              etiqueta ambiental DGT.
            </p>
          </div>

          {/* ── Summary stats bar ───────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-tl-500" />
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {ZBE_CITIES.length}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ciudades con ZBE
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {activeCount}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Zonas activas
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Euro className="w-4 h-4 text-amber-500" />
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {avgFine}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Multa media (€)
              </p>
            </div>
          </div>

          {/* ── City cards grid ─────────────────────────────────────────────── */}
          <section aria-labelledby="cities-heading" className="mb-12">
            <h2
              id="cities-heading"
              className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Todas las ZBE de España
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ZBE_CITIES.map((city) => (
                <Link
                  key={city.slug}
                  href={`/zbe/${city.slug}`}
                  className="group bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md hover:border-tl-300 dark:hover:border-tl-700 transition-all"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-tl-700 dark:group-hover:text-tl-300 transition-colors leading-snug">
                        {city.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Desde {city.activeSince}
                      </p>
                    </div>
                    <StatusBadge status={city.status} />
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Euro className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>
                        Multa:{" "}
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {city.fineAmount} €
                        </span>
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <AlertCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span>{city.schedule}</span>
                    </div>
                  </div>

                  {/* Label access quick indicators */}
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mb-3">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Acceso por etiqueta
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs">
                        <CheckCircle className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-300">
                          0 / ECO / C
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <AccessIcon level={city.labelB} />
                        <span className="text-gray-600 dark:text-gray-300">
                          Etiqueta B
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs col-span-2">
                        <AccessIcon level={city.sinEtiqueta} />
                        <span className="text-gray-600 dark:text-gray-300">
                          Sin etiqueta:{" "}
                          <AccessLabel level={city.sinEtiqueta} />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center gap-1 text-sm font-semibold text-tl-600 dark:text-tl-400 group-hover:text-tl-700 dark:group-hover:text-tl-300 transition-colors">
                    Ver restricciones
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ── DGT label guide ─────────────────────────────────────────────── */}
          <section
            aria-labelledby="label-guide-heading"
            className="mb-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Car className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              <h2
                id="label-guide-heading"
                className="text-lg font-bold text-gray-900 dark:text-gray-100"
              >
                Guía de etiquetas ambientales DGT
              </h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              La etiqueta ambiental de la DGT determina si tu vehículo puede
              circular por las ZBE. Aquí tienes un resumen rápido de cada
              distintivo y su nivel de acceso habitual.
            </p>
            <div className="space-y-3">
              {LABEL_GUIDE.map((label) => (
                <div
                  key={label.code}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-4 ${label.bg} ${label.border}`}
                >
                  {/* Label badge */}
                  <div className="flex items-center gap-2 sm:w-36 flex-shrink-0">
                    <span
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${label.dot}`}
                    />
                    <span className={`font-bold text-sm ${label.text}`}>
                      {label.code}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {label.name !== label.code ? label.name : ""}
                    </span>
                  </div>
                  {/* Vehicles */}
                  <div className="flex-1 text-xs text-gray-600 dark:text-gray-400">
                    {label.vehicles}
                  </div>
                  {/* Access */}
                  <div
                    className={`text-xs font-semibold sm:w-64 flex-shrink-0 ${label.accessColor}`}
                  >
                    {label.access}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Fuente: DGT — Dirección General de Tráfico.{" "}
              <Link
                href="/etiqueta-ambiental"
                className="text-tl-600 dark:text-tl-400 hover:underline"
              >
                Consulta la guía completa de etiqueta ambiental
              </Link>
              .
            </p>
          </section>

          {/* ── FAQ section ─────────────────────────────────────────────────── */}
          <section aria-labelledby="faq-heading" className="mb-12">
            <div className="flex items-center gap-2 mb-5">
              <AlertCircle className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              <h2
                id="faq-heading"
                className="text-lg font-bold text-gray-900 dark:text-gray-100"
              >
                Preguntas frecuentes sobre las ZBE
              </h2>
            </div>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">
                    {item.question}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Related links ────────────────────────────────────────────────── */}
          <RelatedLinks
            links={[
              {
                title: "Etiqueta Ambiental DGT",
                description:
                  "Consulta qué etiqueta corresponde a tu vehículo y qué circulación te permite.",
                href: "/etiqueta-ambiental",
                icon: <Leaf className="w-4 h-4" />,
              },
              {
                title: "Cargadores Eléctricos",
                description:
                  "Encuentra puntos de carga para vehículos eléctricos en toda España.",
                href: "/carga-ev",
                icon: <Zap className="w-4 h-4" />,
              },
              {
                title: "Tráfico en tiempo real",
                description:
                  "Incidencias, retenciones y cortes de tráfico en carreteras españolas.",
                href: "/trafico",
                icon: <Car className="w-4 h-4" />,
              },
              {
                title: "Incidencias de tráfico",
                description:
                  "Accidentes, obras y cortes activos en la red de carreteras.",
                href: "/incidencias",
                icon: <AlertCircle className="w-4 h-4" />,
              },
            ]}
          />

          {/* ── SEO copy block ───────────────────────────────────────────────── */}
          <section
            aria-label="Información sobre ZBE en España"
            className="mt-12 prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 pt-8"
          >
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 not-prose mb-3">
              ¿Qué son las Zonas de Bajas Emisiones en España?
            </h2>
            <p className="text-sm leading-relaxed mb-4">
              Las Zonas de Bajas Emisiones (ZBE) son áreas delimitadas dentro
              de los núcleos urbanos donde se restringen o prohíben los
              vehículos más contaminantes. En España, la{" "}
              <strong>Ley 7/2021 de Cambio Climático y Transición
              Energética</strong>{" "}
              obligó a todos los municipios de más de 50.000 habitantes a
              implantar ZBE antes de 2023, con el objetivo de mejorar la
              calidad del aire y reducir las emisiones de gases de efecto
              invernadero.
            </p>
            <p className="text-sm leading-relaxed mb-4">
              El acceso a las ZBE se determina por el{" "}
              <strong>distintivo ambiental de la DGT</strong>, que clasifica
              los vehículos en cinco categorías: 0 emisiones (teal), ECO
              (verde), C (amarillo), B (ámbar) y sin etiqueta. Los vehículos
              con etiqueta 0 y ECO tienen acceso libre en la mayoría de
              ciudades; los vehículos con etiqueta C tienen acceso pero con
              posibles restricciones en episodios de contaminación; los de
              etiqueta B tienen acceso limitado; y los vehículos sin etiqueta
              están prohibidos en todas las ZBE activas.
            </p>
            <p className="text-sm leading-relaxed">
              El control del cumplimiento se realiza mediante{" "}
              <strong>cámaras de lectura automática de matrículas (LPR)</strong>
              , sin barreras físicas. Las sanciones por incumplimiento oscilan
              entre <strong>200 € y 2.000 €</strong> en caso de reincidencia.
              Cada municipio puede definir sus propios horarios, ámbito
              geográfico y excepciones (residentes, vehículos de emergencia,
              personas con movilidad reducida).
            </p>
          </section>
        </main>
      </div>
    </>
  );
}
