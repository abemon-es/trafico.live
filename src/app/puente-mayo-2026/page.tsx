import { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Car,
  CheckCircle2,
  ChevronRight,
  Activity,
  Fuel,
  Camera,
  CalendarDays,
  MapPin,
  Lightbulb,
  Ban,
  Navigation,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const revalidate = 300;

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  return {
    title:
      "Tráfico Puente de Mayo 2026 — Operación Salida 1 de Mayo | trafico.live",
    description:
      "Estado del tráfico en el Puente de Mayo 2026 (30 abril – 3 mayo). Incidencias en tiempo real, mejores horarios para viajar, rutas principales y consejos DGT.",
    keywords: [
      "tráfico puente mayo 2026",
      "puente mayo tráfico",
      "operación salida puente mayo",
      "retenciones 1 mayo 2026",
      "puente 1 mayo tráfico",
      "DGT puente mayo",
      "operación retorno puente mayo 2026",
      "tráfico jueves 30 abril 2026",
    ],
    openGraph: {
      title:
        "Tráfico Puente de Mayo 2026 — Operación Salida 1 de Mayo | trafico.live",
      description:
        "Incidencias en tiempo real, mejores horarios, rutas afectadas y consejos para el Puente de Mayo 2026 (30 abril – 3 mayo).",
      url: "https://trafico.live/puente-mayo-2026",
    },
    alternates: {
      canonical: "https://trafico.live/puente-mayo-2026",
    },
  };
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const KEY_DATES = [
  {
    date: "Jueves 30 de abril",
    role: "Inicio del puente",
    note: "Tarde-noche: primera oleada de salidas desde las grandes ciudades. Hora punta 16:00–21:00.",
    color: "border-orange-200 bg-orange-50 dark:bg-orange-900/20",
    badgeColor: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200",
  },
  {
    date: "Viernes 1 de mayo",
    role: "Festivo nacional",
    note: "Día del Trabajador. Jornada completa de desplazamientos. Mayor densidad en carreteras de costa.",
    color: "border-red-200 bg-red-50 dark:bg-red-900/20",
    badgeColor: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200",
  },
  {
    date: "Sábado 2 de mayo",
    role: "Puente largo",
    note: "Segundo día festivo en Madrid (Comunidad de Madrid). Doble festivo eleva el tráfico regional.",
    color: "border-tl-amber-200 dark:border-tl-amber-800 bg-tl-amber-50 dark:bg-tl-amber-900/20",
    badgeColor: "bg-tl-amber-100 text-tl-amber-700 dark:text-tl-amber-300 border-tl-amber-200 dark:border-tl-amber-800",
  },
  {
    date: "Domingo 3 de mayo",
    role: "Operación retorno",
    note: "Retorno masivo. Pico esperado 16:00–22:00 en todos los ejes de acceso a las grandes ciudades.",
    color: "border-tl-200 dark:border-tl-800 bg-tl-50 dark:bg-tl-900/20",
    badgeColor: "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 border-tl-200 dark:border-tl-800",
  },
];

const AVOID_SLOTS = [
  {
    day: "Jueves 30 de abril",
    hours: "16:00 – 21:00",
    reason:
      "Inicio de la operación salida. Salidas masivas desde Madrid, Barcelona y Valencia hacia destinos de costa e interior.",
  },
  {
    day: "Viernes 1 de mayo",
    hours: "9:00 – 14:00",
    reason:
      "Segunda oleada de salidas. Muchos viajeros que no pudieron salir el jueves aprovechan la mañana del festivo.",
  },
  {
    day: "Domingo 3 de mayo",
    hours: "15:00 – 21:00",
    reason:
      "Operación retorno. El mayor flujo de regreso del puente. Todos los accesos a las grandes ciudades afectados.",
  },
];

const RECOMMENDED_SLOTS = [
  {
    day: "Jueves 30 de abril",
    hours: "Antes de las 14:00",
    reason:
      "Salir antes de mediodía permite evitar el grueso de la operación salida. Las carreteras permanecen fluidas hasta la tarde.",
  },
  {
    day: "Viernes 1 de mayo",
    hours: "Después de las 16:00",
    reason:
      "Tras el pico de mañana, el tráfico se modera considerablemente. Ventana de 3-4 horas con circulación fluida.",
  },
  {
    day: "Domingo 3 de mayo",
    hours: "Antes de las 13:00",
    reason:
      "Madrugar en el retorno puede reducir el tiempo de viaje hasta un 40% respecto a salir a la tarde.",
  },
];

const MAIN_ROUTES = [
  {
    id: "A-3",
    name: "A-3 Madrid → Valencia",
    description: "Alta demanda hacia la costa mediterránea durante todo el puente.",
    congestion: "alta",
  },
  {
    id: "AP-7",
    name: "AP-7 Barcelona → Costa Dorada/Brava",
    description: "Corredor mediterráneo catalán con retenciones entre Tarragona y Girona.",
    congestion: "alta",
  },
  {
    id: "A-4",
    name: "A-4 Madrid → Andalucía",
    description: "Eje sur hacia Costa del Sol y Sevilla. Retenciones habituales en Bailén.",
    congestion: "alta",
  },
  {
    id: "A-6",
    name: "A-6 Madrid → Galicia",
    description: "Flujo moderado hacia el noroeste. Atención al puerto de Guadarrama.",
    congestion: "media",
  },
  {
    id: "A-7",
    name: "A-7 Costa del Sol",
    description: "Tramo Málaga-Marbella especialmente congestionado en fin de semana.",
    congestion: "alta",
  },
  {
    id: "A-2",
    name: "A-2 Madrid → Barcelona",
    description: "Eje noreste. Puntos críticos en el by-pass de Zaragoza.",
    congestion: "media",
  },
];

const CONGESTION_COLOR: Record<string, string> = {
  "muy alta": "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200",
  alta: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200",
  media: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200",
};

const TIPS = [
  {
    icon: Clock,
    title: "Sal antes de las horas punta",
    text: "El jueves tarde (16:00-21:00) y el domingo tarde (15:00-21:00) son los peores momentos. Salir 2-3 horas antes puede ahorrarte más de una hora de viaje.",
  },
  {
    icon: Car,
    title: "Revisa el vehículo antes de salir",
    text: "Neumáticos, aceite, refrigerante y luces. Un fallo mecánico en estas fechas puede provocar retenciones de kilómetros y arruinar tu puente.",
  },
  {
    icon: Navigation,
    title: "Activa la navegación con tráfico en vivo",
    text: "Usa Google Maps, Waze o TomTom con datos de tráfico actualizados. Actualiza la app antes de salir para tener los mapas al día.",
  },
  {
    icon: Fuel,
    title: "Llena el depósito antes de la hora punta",
    text: "Las gasolineras en accesos a autopistas se colapsan en los momentos de mayor salida. Repostar el día anterior o a primera hora ahorra tiempo y dinero.",
  },
];

const FAQ_ITEMS = [
  {
    question: "¿Cuándo es el Puente de Mayo 2026?",
    answer:
      "El Puente de Mayo 2026 comprende del jueves 30 de abril al domingo 3 de mayo. El 1 de mayo es festivo nacional (Día del Trabajo) y el 2 de mayo es festivo de la Comunidad de Madrid, lo que crea un puente de cuatro días en gran parte del país. La operación de tráfico especial de la DGT arranca el jueves 30 de abril a partir de las 15:00 horas.",
  },
  {
    question: "¿Cuáles son las peores horas para viajar en el Puente de Mayo?",
    answer:
      "Las franjas con mayor riesgo de retenciones son: jueves 30 de abril de 16:00 a 21:00 (operación salida), viernes 1 de mayo de 9:00 a 14:00 (segunda oleada de salidas) y domingo 3 de mayo de 15:00 a 21:00 (operación retorno). Evitar estas franjas puede reducir el tiempo de viaje hasta un 40%.",
  },
  {
    question: "¿Qué carreteras estarán más afectadas en el Puente de Mayo 2026?",
    answer:
      "Las rutas con mayor previsión de congestión son la A-3 hacia Valencia, la A-4 hacia Andalucía, la A-7 en la Costa del Sol y la AP-7 en el corredor catalán. Los tramos más críticos son los accesos a las capitales de provincia los domingos por la tarde. Consulta el mapa en tiempo real de trafico.live para ver el estado actualizado antes de salir.",
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function PuenteMayo2026Page() {
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

  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Operación Puente de Mayo 2026 — DGT",
    description:
      "Operativo especial de la DGT para los desplazamientos del Puente de Mayo 2026 (1 de mayo). Previsión de 8-10 millones de desplazamientos entre el 30 de abril y el 3 de mayo.",
    startDate: "2026-04-30",
    endDate: "2026-05-03",
    location: {
      "@type": "Place",
      name: "Red de carreteras de España",
      address: {
        "@type": "PostalAddress",
        addressCountry: "ES",
      },
    },
    organizer: {
      "@type": "GovernmentOrganization",
      name: "Dirección General de Tráfico",
      url: "https://www.dgt.es",
    },
    url: "https://trafico.live/puente-mayo-2026",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Operaciones", href: "/operaciones" },
              { name: "Puente de Mayo 2026", href: "/puente-mayo-2026" },
            ]}
          />

          {/* ---------------------------------------------------------------- */}
          {/* HERO / H1                                                        */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">
                <CalendarDays className="w-8 h-8 text-tl-600 dark:text-tl-400" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-semibold bg-tl-amber-100 text-tl-amber-700 dark:text-tl-amber-300 border border-tl-amber-200 dark:border-tl-amber-800 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    Operación especial
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    30 abr – 3 may 2026
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Tráfico Puente de Mayo 2026
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
                  Todo lo que necesitas saber para circular con seguridad en el
                  Puente del 1 de Mayo 2026: incidencias en tiempo real, fechas
                  clave, mejores y peores horas para viajar, rutas afectadas y
                  consejos de la DGT.
                </p>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* LIVE STATS STRIP                                                 */}
          {/* ---------------------------------------------------------------- */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-tl-100 p-4 flex items-center gap-3">
              <div className="p-2 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">
                <Activity className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {incidents.toLocaleString("es-ES")}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  incidencias activas ahora
                </p>
              </div>
              <Link
                href="/incidencias"
                className="ml-auto text-xs font-medium text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 flex items-center gap-1 flex-shrink-0"
              >
                Ver <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-tl-amber-100 p-4 flex items-center gap-3">
              <div className="p-2 bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {v16.toLocaleString("es-ES")}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  balizas V16 activas
                </p>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* KEY DATES                                                        */}
          {/* ---------------------------------------------------------------- */}
          <section className="mb-8" aria-labelledby="heading-dates">
            <h2
              id="heading-dates"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Fechas clave: Puente del 1 de Mayo 2026
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {KEY_DATES.map((d) => (
                <div
                  key={d.date}
                  className={`rounded-lg border p-5 ${d.color}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      {d.date}
                    </span>
                    <span
                      className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${d.badgeColor}`}
                    >
                      {d.role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {d.note}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* BEST / WORST HOURS                                               */}
          {/* ---------------------------------------------------------------- */}
          <section className="mb-8" aria-labelledby="heading-hours">
            <h2
              id="heading-hours"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Mejores y peores horas para viajar en el Puente de Mayo 2026
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Avoid */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <h3 className="font-semibold text-red-700 dark:text-red-400">
                    Franjas a evitar
                  </h3>
                </div>
                <div className="space-y-3">
                  {AVOID_SLOTS.map((slot) => (
                    <div
                      key={slot.day}
                      className="bg-white dark:bg-gray-900 border border-red-100 rounded-lg p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {slot.day}
                        </span>
                        <span className="text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full border border-red-200">
                          {slot.hours}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {slot.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold text-green-700 dark:text-green-400">
                    Franjas recomendadas
                  </h3>
                </div>
                <div className="space-y-3">
                  {RECOMMENDED_SLOTS.map((slot) => (
                    <div
                      key={slot.day}
                      className="bg-white dark:bg-gray-900 border border-green-100 rounded-lg p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {slot.day}
                        </span>
                        <span className="text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-200">
                          {slot.hours}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {slot.reason}
                      </p>
                    </div>
                  ))}
                </div>

                <Link
                  href="/mejor-hora"
                  className="mt-4 flex items-center gap-2 text-sm font-medium text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  Calculadora: mejor hora para viajar
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* MAIN ROUTES                                                      */}
          {/* ---------------------------------------------------------------- */}
          <section className="mb-8" aria-labelledby="heading-routes">
            <h2
              id="heading-routes"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1"
            >
              Rutas más afectadas en el Puente de Mayo 2026
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Principales ejes con mayor previsión de congestión. Consulta el
              estado en tiempo real antes de salir.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MAIN_ROUTES.map((route) => (
                <Link
                  key={route.id}
                  href={`/carreteras/${route.id}`}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md hover:border-tl-300 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-tl-500 flex-shrink-0 group-hover:text-tl-700 dark:text-tl-300" />
                      <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm group-hover:text-tl-700 dark:text-tl-300 transition-colors">
                        {route.name}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${
                        CONGESTION_COLOR[route.congestion]
                      }`}
                    >
                      {route.congestion}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {route.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* TIPS                                                             */}
          {/* ---------------------------------------------------------------- */}
          <section className="mb-8" aria-labelledby="heading-tips">
            <h2
              id="heading-tips"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              4 consejos para el Puente de Mayo 2026
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TIPS.map((tip, i) => {
                const Icon = tip.icon;
                return (
                  <div
                    key={tip.title}
                    className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">
                        <Icon className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 text-sm">
                          <span className="text-tl-400 mr-1">{i + 1}.</span>
                          {tip.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          {tip.text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* FUEL CALLOUT                                                     */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-xl p-5 mb-8">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-tl-amber-100 rounded-lg flex-shrink-0">
                <Fuel className="w-6 h-6 text-tl-amber-700 dark:text-tl-amber-300" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-tl-amber-900 mb-1">
                  Consulta el precio del combustible antes de salir
                </h3>
                <p className="text-sm text-tl-amber-800 leading-relaxed mb-3">
                  Las gasolineras en accesos a autopistas y áreas de servicio
                  suelen ser más caras durante los puentes. Repostar en tu
                  ciudad puede ahorrarte hasta 10 euros por depósito.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/precio-gasolina-hoy"
                    className="inline-flex items-center gap-1.5 text-sm font-medium bg-tl-amber-700 text-white px-3 py-1.5 rounded-lg hover:bg-tl-amber-800 transition-colors"
                  >
                    Precio gasolina hoy
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/precio-diesel-hoy"
                    className="inline-flex items-center gap-1.5 text-sm font-medium bg-white dark:bg-gray-900 text-tl-amber-700 dark:text-tl-amber-300 border border-tl-amber-300 px-3 py-1.5 rounded-lg hover:bg-tl-amber-50 dark:bg-tl-amber-900/20 transition-colors"
                  >
                    Precio diésel hoy
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* QUICK LINKS                                                      */}
          {/* ---------------------------------------------------------------- */}
          <section className="mb-8" aria-labelledby="heading-quicklinks">
            <h2
              id="heading-quicklinks"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Herramientas en tiempo real para el puente
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  href: "/incidencias",
                  label: "Incidencias en vivo",
                  icon: AlertTriangle,
                  color: "text-red-600 dark:text-red-400",
                  bg: "bg-red-50 dark:bg-red-900/20",
                  border: "border-red-100",
                },
                {
                  href: "/camaras",
                  label: "Cámaras DGT",
                  icon: Camera,
                  color: "text-tl-600 dark:text-tl-400",
                  bg: "bg-tl-50 dark:bg-tl-900/20",
                  border: "border-tl-100",
                },
                {
                  href: "/mejor-hora",
                  label: "Mejor hora para viajar",
                  icon: Clock,
                  color: "text-green-600 dark:text-green-400",
                  bg: "bg-green-50 dark:bg-green-900/20",
                  border: "border-green-100",
                },
                {
                  href: "/calculadora",
                  label: "Calculadora de ruta",
                  icon: Navigation,
                  color: "text-purple-600 dark:text-purple-400",
                  bg: "bg-purple-50 dark:bg-purple-900/20",
                  border: "border-purple-100",
                },
              ].map(({ href, label, icon: Icon, color, bg, border }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center gap-2 bg-white dark:bg-gray-900 border ${border} rounded-xl p-4 text-center hover:shadow-md transition-all group`}
                >
                  <div className={`p-2.5 ${bg} rounded-lg`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-snug group-hover:text-gray-900 dark:text-gray-100 transition-colors">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* FAQ                                                              */}
          {/* ---------------------------------------------------------------- */}
          <section className="mb-8" aria-labelledby="heading-faq">
            <h2
              id="heading-faq"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Preguntas frecuentes — Tráfico Puente de Mayo 2026
            </h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item) => (
                <div
                  key={item.question}
                  className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-5"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {item.question}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* RELATED LINKS                                                    */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
              Otras operaciones especiales DGT 2026
            </h3>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/semana-santa-2026"
                className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:border-tl-300 hover:text-tl-700 dark:text-tl-300 transition-colors flex items-center gap-1.5"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Semana Santa 2026
              </Link>
              <Link
                href="/operaciones"
                className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:border-tl-300 hover:text-tl-700 dark:text-tl-300 transition-colors flex items-center gap-1.5"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                Todas las operaciones DGT
              </Link>
              <Link
                href="/incidencias"
                className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:border-tl-300 hover:text-tl-700 dark:text-tl-300 transition-colors flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                Incidencias ahora
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
