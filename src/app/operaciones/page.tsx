import { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Car,
  ShieldAlert,
  Lightbulb,
  Activity,
  Zap,
  Radar,
  Camera,
  Ban,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";

export const revalidate = 300;

const CURRENT_YEAR = new Date().getFullYear();

export const metadata: Metadata = {
  title: `Operaciones Especiales de Tráfico ${CURRENT_YEAR} — DGT | trafico.live`,
  description:
    "Calendario completo de operaciones especiales de tráfico de la DGT para 2026: Semana Santa, Verano, Navidad, puentes y festivos. Horarios punta, previsión de desplazamientos y recomendaciones.",
  keywords: [
    "operación salida",
    "operación retorno",
    "tráfico semana santa",
    "operaciones especiales DGT",
    "operación verano tráfico",
    "operación navidad DGT",
    "tráfico puentes festivos",
    "DGT operaciones 2026",
  ],
  openGraph: {
    title: `Operaciones Especiales de Tráfico ${CURRENT_YEAR} — DGT | trafico.live`,
    description:
      "Calendario de operaciones especiales DGT 2026: previsión de desplazamientos, horarios punta y recomendaciones para circular con seguridad.",
  },
  alternates: {
    canonical: "https://trafico.live/operaciones",
  },
};

interface Operation {
  name: string;
  dates: string;
  type: "festivo" | "puente";
  description: string;
  status: "completed" | "upcoming" | "active";
}

const OPERATIONS_2026: Operation[] = [
  {
    name: "Operación Semana Santa",
    dates: "27 marzo - 6 abril 2026",
    type: "festivo",
    description:
      "Mayor operativo del primer semestre. Previsión: 15.5M desplazamientos de largo recorrido.",
    status: "completed",
  },
  {
    name: "Puente del 1 de Mayo",
    dates: "30 abril - 3 mayo 2026",
    type: "puente",
    description:
      "Desplazamientos cortos y medios. Especial vigilancia en salidas de grandes ciudades.",
    status: "upcoming",
  },
  {
    name: "Operación Verano (Fase 1)",
    dates: "26 junio - 1 septiembre 2026",
    type: "festivo",
    description:
      "La mayor operación del año. Más de 90M de desplazamientos previstos.",
    status: "upcoming",
  },
  {
    name: "Puente del Pilar",
    dates: "10 - 12 octubre 2026",
    type: "puente",
    description:
      "Último gran puente antes de diciembre.",
    status: "upcoming",
  },
  {
    name: "Puente de la Constitución",
    dates: "5 - 8 diciembre 2026",
    type: "puente",
    description:
      "Operación de invierno. Precaución especial en puertos de montaña.",
    status: "upcoming",
  },
  {
    name: "Operación Navidad",
    dates: "18 diciembre 2026 - 7 enero 2027",
    type: "festivo",
    description:
      "Operación navideña. Retornos concentrados en Reyes.",
    status: "upcoming",
  },
];

const RECOMMENDATIONS = [
  {
    icon: Clock,
    title: "Evita las horas punta",
    text: "Las salidas masivas se concentran los viernes de 15:00 a 21:00 y los retornos los domingos de 17:00 a 21:00. Salir fuera de esas franjas reduce el tiempo de viaje hasta un 40%.",
  },
  {
    icon: ShieldAlert,
    title: "Revisa el estado de las carreteras",
    text: "Antes de salir, consulta el estado del tráfico en tiempo real en trafico.live. La DGT activa corredores y sentidos únicos en los tramos más saturados.",
  },
  {
    icon: Car,
    title: "Comprueba el vehículo",
    text: "Revisa la presión de los neumáticos, los niveles de aceite y refrigerante, y el funcionamiento de luces y frenos. Un vehículo en mal estado multiplica el riesgo en rutas de larga distancia.",
  },
  {
    icon: Lightbulb,
    title: "Prepara el viaje con antelación",
    text: "Descarga mapas sin conexión, lleva botella de agua y ropa de abrigo. Si viajas con menores, planifica paradas cada 2 horas.",
  },
];

const FAQ_ITEMS = [
  {
    question: "¿Qué es una operación especial de tráfico de la DGT?",
    answer:
      "Una operación especial de tráfico es un dispositivo de la Dirección General de Tráfico (DGT) que se activa durante períodos de alta movilidad: Semana Santa, verano, puentes nacionales y Navidad. Incluye despliegue reforzado de agentes, helicópteros, tecnología de gestión del tráfico y medidas de restricción para vehículos pesados, con el objetivo de fluidificar la circulación y reducir la siniestralidad.",
  },
  {
    question: "¿Cuándo es la operación salida de Semana Santa 2026?",
    answer:
      "La operación salida de Semana Santa 2026 comienza el viernes 27 de marzo, con los picos de máxima intensidad entre las 15:00 y las 20:00. La operación retorno se concentra el Domingo de Resurrección, 5 de abril, y el lunes 6 de abril, especialmente en las franjas de 17:00 a 21:00.",
  },
  {
    question: "¿Dónde puedo ver el estado del tráfico en tiempo real durante las operaciones?",
    answer:
      "Puedes consultar el estado actualizado del tráfico en la sección de incidencias de trafico.live, que integra los datos oficiales de la DGT actualizados cada minuto. También puedes ver las cámaras de tráfico en directo y el mapa de incidencias para planificar tu ruta en tiempo real.",
  },
];

export default async function OperacionesPage() {
  const [incidents, v16] = await Promise.all([
    prisma.trafficIncident.count({ where: { isActive: true } }),
    prisma.v16BeaconEvent.count({ where: { isActive: true } }),
  ]);

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Operaciones Especiales", href: "/operaciones" },
            ]}
          />

          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-tl-50 rounded-lg">
                <CalendarDays className="w-8 h-8 text-tl-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Operaciones Especiales de Tráfico
                </h1>
                <p className="text-gray-600 max-w-2xl leading-relaxed">
                  La DGT activa operaciones especiales durante los períodos de mayor movilidad
                  del año: Semana Santa, verano, puentes nacionales y Navidad. Cada operación
                  implica un despliegue reforzado de agentes, tecnología avanzada de gestión del
                  tráfico y restricciones específicas para vehículos pesados.
                </p>
              </div>
            </div>
          </div>

          {/* Live data strip */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-tl-100 p-4 flex items-center gap-3">
              <div className="p-2 bg-tl-50 rounded-lg">
                <Activity className="w-5 h-5 text-tl-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {incidents.toLocaleString("es-ES")}
                </p>
                <p className="text-sm text-gray-500">incidencias activas ahora</p>
              </div>
              <Link
                href="/incidencias"
                className="ml-auto text-xs font-medium text-tl-600 hover:text-tl-700 flex items-center gap-1"
              >
                Ver <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="bg-white rounded-lg border border-amber-100 p-4 flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {v16.toLocaleString("es-ES")}
                </p>
                <p className="text-sm text-gray-500">balizas V16 activas</p>
              </div>
            </div>
          </div>

          {/* Operations Calendar */}
          <section className="mb-8" aria-labelledby="heading-calendar">
            <h2 id="heading-calendar" className="text-xl font-bold text-gray-900 mb-4">
              Calendario de operaciones 2026
            </h2>
            <div className="space-y-3">
              {OPERATIONS_2026.map((op) => (
                <div
                  key={op.name}
                  className={`bg-white rounded-lg shadow-sm border p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
                    op.status === "completed"
                      ? "border-gray-200 opacity-70"
                      : "border-tl-100"
                  }`}
                >
                  {/* Status badge */}
                  <div className="flex-shrink-0">
                    {op.status === "completed" ? (
                      <CheckCircle2 className="w-6 h-6 text-gray-400" />
                    ) : (
                      <div
                        className={`w-3 h-3 rounded-full mt-1 ${
                          op.type === "festivo" ? "bg-tl-500" : "bg-amber-500"
                        }`}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{op.name}</h3>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                          op.type === "festivo"
                            ? "bg-tl-50 text-tl-700 border-tl-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {op.type === "festivo" ? "Operación festiva" : "Puente"}
                      </span>
                      {op.status === "completed" && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                          Finalizada
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-tl-600 font-medium mb-1">{op.dates}</p>
                    <p className="text-sm text-gray-600">{op.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recommendations */}
          <section className="mb-8" aria-labelledby="heading-recommendations">
            <h2 id="heading-recommendations" className="text-xl font-bold text-gray-900 mb-4">
              Recomendaciones de la DGT
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {RECOMMENDATIONS.map((rec) => {
                const Icon = rec.icon;
                return (
                  <div
                    key={rec.title}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-tl-50 rounded-lg flex-shrink-0">
                        <Icon className="w-5 h-5 text-tl-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">{rec.title}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{rec.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Warning banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800">Franjas horarias punta</h3>
              <p className="text-sm text-amber-700 mt-0.5">
                En operaciones de salida, los viernes de{" "}
                <strong>15:00 a 21:00</strong> concentran el mayor volumen de tráfico.
                En operaciones de retorno, los domingos de{" "}
                <strong>17:00 a 21:00</strong>. Planifica tu viaje fuera de estas franjas
                siempre que sea posible.
              </p>
            </div>
          </div>

          <RelatedLinks
            title="Herramientas de tráfico en tiempo real"
            links={[
              {
                title: "Incidencias",
                description: "Cortes, retenciones y alertas activas",
                href: "/incidencias",
                icon: <AlertTriangle className="w-5 h-5" />,
              },
              {
                title: "Restricciones",
                description: "Camiones, ZBE y circulación en festivos",
                href: "/restricciones",
                icon: <Ban className="w-5 h-5" />,
              },
              {
                title: "Radares DGT",
                description: "Mapa completo de radares de velocidad",
                href: "/radares",
                icon: <Radar className="w-5 h-5" />,
              },
              {
                title: "Cámaras de Tráfico",
                description: "Imágenes en directo de la DGT",
                href: "/camaras",
                icon: <Camera className="w-5 h-5" />,
              },
            ]}
          />

          {/* FAQ */}
          <section aria-labelledby="heading-faq">
            <h2 id="heading-faq" className="text-xl font-bold text-gray-900 mb-4">
              Preguntas frecuentes sobre operaciones especiales
            </h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item) => (
                <div
                  key={item.question}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-5"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">{item.question}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
