import Link from "next/link";
import prisma from "@/lib/db";
import {
  CalendarDays,
  AlertTriangle,
  Clock,
  Car,
  TrendingUp,
  Route,
  ChevronRight,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

const CURRENT_YEAR = new Date().getFullYear();

export const metadata = buildPageMetadata({
  title: `Operaciones Especiales de Tráfico ${CURRENT_YEAR} | DGT Calendario`,
  description:
    `Calendario de operaciones especiales de tráfico DGT ${CURRENT_YEAR}: Semana Santa, Puente de Mayo, Verano, Navidad y todos los puentes. Horas punta, previsión de desplazamientos y consejos para circular.`,
  path: "/carreteras/operaciones",
  keywords: [
    "operaciones especiales tráfico",
    "operación salida DGT",
    "tráfico semana santa 2026",
    "tráfico puentes festivos",
    "tráfico verano carretera",
    "operaciones navidad tráfico",
  ],
});

interface OperationPeriod {
  name: string;
  slug: string;
  dates: string;
  salida: string;
  retorno: string;
  desplazamientos: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  available: boolean;
}

const OPERATIONS_2026: OperationPeriod[] = [
  {
    name: "Semana Santa 2026",
    slug: "semana-santa-2026",
    dates: "28 mar – 5 abr 2026",
    salida: "Jue 26 mar (tarde) y Vie 27 mar",
    retorno: "Dom 5 abr (tarde) y Lun 6 abr",
    desplazamientos: "~10 millones de desplazamientos previstos",
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    borderColor: "border-purple-200 dark:border-purple-800",
    icon: "✝",
    available: true,
  },
  {
    name: "Puente de Mayo 2026",
    slug: "puente-mayo-2026",
    dates: "1–4 may 2026",
    salida: "Jue 30 abr (tarde)",
    retorno: "Dom 3 may (tarde) – Lun 4 may",
    desplazamientos: "~3,5 millones de desplazamientos previstos",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800",
    icon: "🌿",
    available: true,
  },
  {
    name: "Operación Verano 2026",
    slug: "operaciones",
    dates: "27 jun – 7 sep 2026",
    salida: "Vie 27 jun (tarde) y sábados de julio–agosto",
    retorno: "Domingos de julio–agosto y Dom 6 sep",
    desplazamientos: "~90 millones de desplazamientos en el período",
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    icon: "☀",
    available: false,
  },
  {
    name: "Puente del Pilar 2026",
    slug: "operaciones",
    dates: "10–13 oct 2026",
    salida: "Vie 9 oct (tarde)",
    retorno: "Lun 13 oct (tarde)",
    desplazamientos: "~4 millones de desplazamientos previstos",
    color: "text-orange-700 dark:text-orange-300",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: "🏛",
    available: false,
  },
  {
    name: "Operación Navidad 2026",
    slug: "operaciones",
    dates: "22 dic 2026 – 7 ene 2027",
    salida: "Vie 22 dic (tarde)",
    retorno: "Dom 4 ene – Mié 7 ene 2027",
    desplazamientos: "~18 millones de desplazamientos previstos",
    color: "text-tl-700 dark:text-tl-300",
    bgColor: "bg-tl-50 dark:bg-tl-900/20",
    borderColor: "border-tl-200 dark:border-tl-800",
    icon: "❄",
    available: false,
  },
];

const TIPS = [
  "Consulta la previsión de tráfico de la DGT antes de salir: infocar.dgt.es",
  "Sale fuera de las horas punta (mañana temprano o tarde-noche) para evitar retenciones",
  "Comprueba el estado del vehículo: neumáticos, luces y nivel de combustible",
  "Lleva agua y snacks para el trayecto; los descansos en áreas de servicio reducen la fatiga",
  "Activa las notificaciones de tráfico en tu GPS o app de navegación",
  "Si viajas con niños, planifica paradas cada 2 horas",
  "Respeta siempre los límites de velocidad y mantén la distancia de seguridad",
];

export default async function OperacionesSubPage() {
  // Pull historical accident intensity during holiday periods as context
  // We use AccidentMicrodata to find months with more accidents (proxy for high traffic)
  const accidentsByMonth = await prisma.accidentMicrodata.groupBy({
    by: ["year"],
    _count: true,
    orderBy: { year: "asc" },
    take: 6,
  }).catch(() => []);

  const faqItems = [
    {
      question: "¿Qué es una operación especial de tráfico de la DGT?",
      answer:
        "Una operación especial es un plan de actuación reforzado que la DGT activa durante períodos con alta concentración de desplazamientos: Semana Santa, puentes, verano y Navidad. Incluye aumento del número de agentes en carretera, gestión del tráfico con paneles de mensaje variable, restricciones a camiones en horas punta y comunicación activa a los conductores.",
    },
    {
      question: "¿Cuándo se activan las restricciones de circulación para camiones?",
      answer:
        "Durante las operaciones especiales, la DGT prohíbe la circulación de vehículos pesados (más de 7.500 kg) en determinadas vías y horarios. Generalmente las restricciones se aplican los viernes y sábados por la tarde (operación salida) y los domingos y lunes de retorno. Consulta la Orden Ministerial publicada antes de cada operación para los detalles exactos.",
    },
    {
      question: "¿Cómo puedo consultar el estado del tráfico antes de salir?",
      answer:
        "Puedes consultar el estado de la red en tiempo real en trafico.live (/incidencias y /trafico), en la web de la DGT (infocar.dgt.es), en Radio Nacional de España con los boletines de tráfico, o a través de la app Mi DGT. Además, la Guardia Civil de Tráfico emite alertas en @guardiacivil en X (Twitter).",
    },
    {
      question: "¿Cuáles son los tramos con más retenciones durante Semana Santa?",
      answer:
        "Históricamente los tramos con mayor densidad durante Semana Santa son: A-7 (litoral mediterráneo), A-4 (Madrid–Sevilla/Cádiz), A-6 (Madrid–La Coruña), N-340 y N-332 (costa levantina), accesos a Madrid por A-1, A-2 y A-3, y la A-3 en la salida hacia la Comunitat Valenciana.",
    },
    {
      question: "¿Se puede consultar el historial de operaciones anteriores?",
      answer:
        "Sí. La DGT publica el balance de cada operación en su web oficial (dgt.es) con el número de desplazamientos, accidentes y fallecidos. En trafico.live puedes ver el histórico de siniestralidad en /estadisticas.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Carreteras", href: "/carreteras" },
            { name: "Operaciones especiales", href: "/carreteras/operaciones" },
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <CalendarDays className="w-8 h-8 text-tl-600 dark:text-tl-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Operaciones especiales de tráfico {CURRENT_YEAR}
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl text-lg">
            Calendario completo de operaciones especiales de la DGT: Semana Santa, Puente de Mayo,
            Verano, El Pilar y Navidad. Horas punta, restricciones de camiones y consejos para
            circular con seguridad.
          </p>
        </div>

        {/* Operations grid */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            Operaciones {CURRENT_YEAR}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {OPERATIONS_2026.map((op) => (
              <div
                key={op.name}
                className={`${op.bgColor} border ${op.borderColor} rounded-xl p-5`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{op.icon}</span>
                      <h3 className={`font-bold text-base ${op.color}`}>{op.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{op.dates}</p>
                  </div>
                  {op.available && (
                    <Link
                      href={`/${op.slug}`}
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${op.color} hover:underline flex-shrink-0`}
                    >
                      Ver guía
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                <dl className="space-y-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="font-semibold text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">
                      Salida:
                    </dt>
                    <dd className="text-gray-600 dark:text-gray-400">{op.salida}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-semibold text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">
                      Retorno:
                    </dt>
                    <dd className="text-gray-600 dark:text-gray-400">{op.retorno}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-semibold text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">
                      Estimación:
                    </dt>
                    <dd className={`font-semibold ${op.color}`}>{op.desplazamientos}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>

        {/* Tips section */}
        <section className="mb-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Consejos para circular en operaciones especiales
          </h2>
          <ul className="space-y-3">
            {TIPS.map((tip, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold flex items-center justify-center font-data mt-0.5">
                  {i + 1}
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Historical context */}
        {accidentsByMonth.length > 0 && (
          <section className="mb-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              Accidentes con víctimas por año (histórico DGT)
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              El aumento del tráfico en festivos y verano se refleja en un incremento de la
              siniestralidad. Datos microdatos DGT.
            </p>
            <div className="flex items-end gap-3 h-24">
              {accidentsByMonth.map((row) => {
                const max = Math.max(...accidentsByMonth.map((r) => r._count));
                const height = Math.round((row._count / max) * 100);
                return (
                  <div key={row.year} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-tl-500 dark:bg-tl-600 transition-all"
                      style={{ height: `${height}%` }}
                    />
                    <div className="font-data text-xs text-gray-600 dark:text-gray-400">
                      {row.year}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* DGT Info block */}
        <div className="mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm mb-1">
              Restricciones de camiones en operaciones especiales
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Durante las operaciones de salida y retorno, la DGT prohíbe la circulación de
              vehículos pesados (≥ 7.500 kg) en autopistas y autovías en determinadas franjas
              horarias. Consulta la{" "}
              <a
                href="https://www.dgt.es"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold"
              >
                web oficial de la DGT
              </a>{" "}
              para la orden ministerial actualizada de cada operación.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <FAQAccordion items={faqItems} className="mb-8" />

        {/* Related Links */}
        <RelatedLinks
          links={[
            {
              title: "Semana Santa 2026",
              description: "Guía completa de tráfico para Semana Santa",
              href: "/semana-santa-2026",
              icon: <CalendarDays className="w-5 h-5" />,
            },
            {
              title: "Puente de Mayo 2026",
              description: "Previsión de tráfico para el Puente de Mayo",
              href: "/puente-mayo-2026",
              icon: <CalendarDays className="w-5 h-5" />,
            },
            {
              title: "Incidencias en carretera",
              description: "Estado de la red en tiempo real — cortes y retenciones",
              href: "/incidencias",
              icon: <AlertTriangle className="w-5 h-5" />,
            },
            {
              title: "Operaciones DGT (completo)",
              description: "Calendario completo con todas las operaciones del año",
              href: "/operaciones",
              icon: <Route className="w-5 h-5" />,
            },
          ]}
        />
      </main>
    </div>
  );
}
