import { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Car,
  CheckCircle2,
  ChevronRight,
  Activity,
  Zap,
  Fuel,
  Camera,
  Radar,
  CloudLightning,
  CalendarDays,
  MapPin,
  Lightbulb,
  ShieldAlert,
  TrendingDown,
  Navigation,
  BarChart3,
  Ban,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title:
      "Tráfico Semana Santa 2026 — Operación Salida y Retorno",
    description:
      "Estado del tráfico en Semana Santa 2026 (2-6 abril). Mapa en tiempo real, previsiones DGT, operación salida y retorno, mejores horarios y carreteras alternativas.",
    keywords: [
      "operación salida semana santa 2026",
      "tráfico semana santa",
      "retenciones semana santa",
      "DGT semana santa",
      "semana santa 2026 tráfico",
      "operación retorno semana santa 2026",
      "horas punta semana santa",
      "carreteras semana santa",
      "DGT operación especial semana santa",
      "mejor hora para viajar semana santa 2026",
    ],
    openGraph: {
      title:
        "Tráfico Semana Santa 2026 — Operación Salida y Retorno",
      description:
        "Mapa en tiempo real, previsiones DGT, operación salida y retorno, mejores horarios y carreteras alternativas para Semana Santa 2026.",
      url: "https://trafico.live/semana-santa-2026",
    },
    alternates: {
      canonical: "https://trafico.live/semana-santa-2026",
    },
  };
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const MAIN_ROUTES = [
  {
    id: "A-3",
    name: "A-3 Madrid → Valencia",
    description:
      "Uno de los corredores más saturados. Especial atención entre Motilla del Palancar y el by-pass de Valencia.",
    congestion: "muy alta",
  },
  {
    id: "A-4",
    name: "A-4 Madrid → Córdoba/Cádiz",
    description:
      "Acceso principal a Andalucía. Retenciones habituales a la altura de Bailén y el entorno de Córdoba.",
    congestion: "muy alta",
  },
  {
    id: "AP-7",
    name: "AP-7 Barcelona → Costa Brava/Costa Dorada",
    description:
      "Corredor mediterráneo catalán. Saturación entre Tarragona y Girona durante toda la operación.",
    congestion: "alta",
  },
  {
    id: "A-6",
    name: "A-6 Madrid → Galicia",
    description:
      "Ruta hacia el noroeste con puntos críticos en el puerto de Guadarrama y la bajada a Lugo.",
    congestion: "alta",
  },
  {
    id: "A-1",
    name: "A-1 Madrid → Burgos/País Vasco",
    description:
      "Eje norte con retenciones en Somosierra y los accesos a Vitoria-Gasteiz.",
    congestion: "alta",
  },
  {
    id: "A-92",
    name: "A-92 Granada → Almería",
    description:
      "Vía interior andaluza con alta demanda hacia la Costa de Almería durante Semana Santa.",
    congestion: "alta",
  },
  {
    id: "A-7",
    name: "A-7 Málaga → Almería",
    description:
      "Costa del Sol. Retenciones en la variante de Fuengirola, Marbella y el acceso a Almería.",
    congestion: "muy alta",
  },
  {
    id: "AP-68",
    name: "AP-68 Bilbao → Zaragoza",
    description:
      "Corredor vasco-navarro. Congestión habitual entre Miranda de Ebro y Tudela.",
    congestion: "media",
  },
  {
    id: "A-2",
    name: "A-2 Madrid → Barcelona",
    description:
      "Eje noreste. Puntos críticos en el by-pass de Zaragoza y los accesos a Barcelona por el Vallès.",
    congestion: "alta",
  },
  {
    id: "N-340",
    name: "N-340 Costa Mediterránea",
    description:
      "Alternativa a la AP-7 entre Cataluña y Andalucía. Tráfico intenso en tramos urbanos de Murcia y Alicante.",
    congestion: "media",
  },
];

const AVOID_SLOTS = [
  {
    day: "Viernes 27 de marzo",
    hours: "15:00 – 21:00",
    reason:
      "Inicio de la operación salida. Primer pico de la Semana Santa: salidas masivas desde Madrid, Barcelona y Valencia.",
  },
  {
    day: "Sábado 28 de marzo",
    hours: "9:00 – 14:00",
    reason:
      "Segunda oleada de salidas. Muchos viajeros que no pudieron salir el viernes se incorporan a la carretera por la mañana.",
  },
  {
    day: "Domingo 5 de abril",
    hours: "16:00 – 22:00",
    reason:
      "Operación retorno: el Domingo de Resurrección concentra el mayor flujo de regreso del año. Evitar a toda costa.",
  },
  {
    day: "Lunes 6 de abril",
    hours: "10:00 – 15:00",
    reason:
      "Segundo pico de retorno. Quienes prolongaron el fin de semana se reincorporan a las carreteras en masa.",
  },
];

const RECOMMENDED_SLOTS = [
  {
    day: "Jueves 26 de marzo",
    hours: "Después de las 21:00",
    reason:
      "Los que pueden salir la noche del jueves encuentran carreteras casi despejadas. El 20% del tráfico se adelanta a esta franja.",
  },
  {
    day: "Sábado 28 de marzo",
    hours: "Después de las 16:00",
    reason:
      "Tras el pico de mañana, el tráfico se modera considerablemente. Ventana de 3–4 horas sin grandes retenciones.",
  },
  {
    day: "Lunes 6 de abril",
    hours: "Madrugada (antes de las 7:00)",
    reason:
      "Madrugar en el retorno reduce el tiempo de viaje hasta un 45% respecto a salir a mediodía.",
  },
];

const TIPS = [
  {
    icon: Clock,
    title: "Viaja fuera de las horas punta",
    text: "Las franjas de máxima saturación (viernes 15:00-21:00 en salida, domingo 16:00-22:00 en retorno) pueden triplicar el tiempo de viaje. Salir 2 horas antes o después marca la diferencia.",
  },
  {
    icon: Car,
    title: "Revisa el vehículo antes de salir",
    text: "Presión de neumáticos (incluida la rueda de repuesto), nivel de aceite, refrigerante y líquido de frenos. Comprueba también el funcionamiento de todas las luces. Un fallo mecánico en estas fechas puede generar retenciones de kilómetros.",
  },
  {
    icon: Navigation,
    title: "Activa la navegación con tráfico en tiempo real",
    text: "Usa un GPS con datos de tráfico en vivo (Google Maps, Waze, TomTom) para detectar cortes imprevistos y acceder a rutas alternativas. Actualiza la aplicación antes de salir.",
  },
  {
    icon: Fuel,
    title: "Llena el depósito antes de la hora punta",
    text: "Las gasolineras en accesos a autopistas se colapsan en los momentos de mayor salida. Repostar el día anterior o a primera hora de la mañana te ahorra hasta 30 minutos de espera.",
  },
  {
    icon: ShieldAlert,
    title: "Mantén las distancias de seguridad",
    text: "Con tráfico denso y familias cargadas, los frenazos bruscos son más frecuentes. La DGT recomienda aumentar la distancia de seguridad al doble de lo habitual en estas operaciones.",
  },
  {
    icon: CloudLightning,
    title: "Consulta las alertas meteorológicas",
    text: "En Semana Santa 2026, AEMET prevé inestabilidad en el norte y lluvias puntuales en el centro peninsular. Las carreteras mojadas en los puertos de montaña (Guadarrama, Guadarrama, Navacerrada) exigen velocidad reducida.",
  },
  {
    icon: Lightbulb,
    title: "Planifica las paradas con antelación",
    text: "Las áreas de servicio principales se colapsan en los picos de salida. Identifica 2-3 puntos de descanso alternativos. La DGT recomienda parar cada 2 horas o cada 200 km, especialmente con menores a bordo.",
  },
  {
    icon: TrendingDown,
    title: "Usa carreteras alternativas si las conoces",
    text: "Para trayectos cortos o medios, las carreteras nacionales y comarcales suelen estar menos saturadas que las autopistas durante las horas punta. Consulta el mapa de incidencias antes de decidir la ruta.",
  },
];

const FAQ_ITEMS = [
  {
    question: "¿Cuándo empieza la operación salida de Semana Santa 2026?",
    answer:
      "La operación salida de Semana Santa 2026 comienza el viernes 27 de marzo a partir de las 15:00 horas, cuando se produce el mayor éxodo desde las grandes ciudades. Los picos de máxima intensidad se esperan entre las 17:00 y las 20:00 del viernes. Existe también una significativa operación de salida el sábado 28 de marzo por la mañana (9:00-14:00) para quienes no pudieron salir el viernes.",
  },
  {
    question: "¿Cuáles son las peores horas para viajar en Semana Santa 2026?",
    answer:
      "Las franjas horarias con mayor riesgo de retenciones son: viernes 27 de marzo de 15:00 a 21:00 (operación salida principal), sábado 28 de 9:00 a 14:00 (segunda oleada de salidas), domingo 5 de abril de 16:00 a 22:00 (operación retorno principal) y lunes 6 de abril de 10:00 a 15:00 (retorno tardío). Evitar estas franjas puede reducir el tiempo de viaje hasta un 50%.",
  },
  {
    question:
      "¿Cuántos desplazamientos se prevén en Semana Santa 2026?",
    answer:
      "La DGT prevé aproximadamente 16 millones de desplazamientos de largo recorrido durante la Semana Santa 2026 (27 de marzo – 6 de abril). Esta cifra representa un incremento del 3% respecto al año anterior, impulsado por la recuperación del turismo interior y el alargamiento del período vacacional en varias comunidades autónomas.",
  },
  {
    question: "¿Qué hacer en caso de retención en una carretera?",
    answer:
      "Si te ves atrapado en una retención: mantén el motor al ralentí o apágalo si la parada supera 5 minutos (ahorro de combustible y emisiones). Escucha la radio de tráfico (SER, COPE, Onda Cero emiten información cada hora). En caso de retención por accidente, enciende los intermitentes y prepara el triángulo o la baliza V16 si tuvieras que salir del vehículo. No uses el arcén salvo autorización expresa de la DGT.",
  },
  {
    question:
      "¿Dónde consultar el estado del tráfico en tiempo real durante Semana Santa?",
    answer:
      "Puedes consultar el estado del tráfico en tiempo real en trafico.live, que integra los datos oficiales de la DGT actualizados cada minuto: incidencias activas, cámaras en directo, paneles de mensaje variable (PMV) y alertas meteorológicas. También puedes llamar al teléfono de información de la DGT (011) o consultar la app de la DGT para móviles.",
  },
];

const CONGESTION_COLOR: Record<string, string> = {
  "muy alta": "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200",
  alta: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200",
  media: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SemanaSanta2026Page() {
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
    name: "Operación Semana Santa 2026 — DGT",
    description:
      "Operativo especial de la DGT para los desplazamientos de Semana Santa 2026. Previsión de 16 millones de viajes de largo recorrido entre el 27 de marzo y el 6 de abril.",
    startDate: "2026-03-27",
    endDate: "2026-04-06",
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
    url: "https://trafico.live/semana-santa-2026",
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
              { name: "Semana Santa 2026", href: "/semana-santa-2026" },
            ]}
          />

          {/* ------------------------------------------------------------------ */}
          {/* HERO / H1                                                          */}
          {/* ------------------------------------------------------------------ */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">
                <CalendarDays className="w-8 h-8 text-tl-600 dark:text-tl-400" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    Operación activa
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    27 mar – 6 abr 2026
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Tráfico Semana Santa 2026
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
                  Toda la información para planificar tus desplazamientos en
                  Semana Santa 2026: estado del tráfico en tiempo real,
                  previsiones oficiales de la DGT, operación salida y retorno,
                  mejores y peores horas para circular, carreteras más
                  afectadas y consejos de seguridad.
                </p>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* LIVE STATS STRIP                                                   */}
          {/* ------------------------------------------------------------------ */}
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
                <Zap className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
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

          {/* ------------------------------------------------------------------ */}
          {/* KEY DATES                                                          */}
          {/* ------------------------------------------------------------------ */}
          <section className="mb-8" aria-labelledby="heading-dates">
            <h2
              id="heading-dates"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Fechas clave: operación salida y retorno 2026
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Salida */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-tl-200 dark:border-tl-800 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-tl-50 dark:bg-tl-900/200" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Operación Salida
                  </h3>
                </div>
                <p className="text-tl-700 dark:text-tl-300 font-medium text-sm mb-2">
                  Viernes 27 marzo (15:00) → Domingo 29 marzo
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  El dispositivo arranca el viernes a las 15:00 h y se
                  prolonga durante el fin de semana de Ramos. Los viernes y
                  sábados por la mañana son los momentos más críticos. La DGT
                  despliega más de 5.000 agentes en toda la red viaria.
                </p>
              </div>

              {/* Retorno */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-orange-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-50 dark:bg-orange-900/200" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Operación Retorno
                  </h3>
                </div>
                <p className="text-orange-700 dark:text-orange-400 font-medium text-sm mb-2">
                  Domingo 5 abril → Lunes 6 abril (24:00)
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  El Domingo de Resurrección (5 de abril) y el Lunes de
                  Pascua (6 de abril) concentran el grueso del retorno.
                  El tramo 16:00-22:00 del domingo es el más congestionado
                  de toda la operación.
                </p>
              </div>
            </div>

            {/* Global figure */}
            <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-lg p-4 flex items-center gap-4">
              <div className="p-3 bg-tl-100 dark:bg-tl-900/30 rounded-lg flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-tl-700 dark:text-tl-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-tl-800 dark:text-tl-200">
                  16 millones
                </p>
                <p className="text-sm text-tl-700 dark:text-tl-300">
                  de desplazamientos previstos por la DGT durante la Semana
                  Santa 2026 — un 3% más que en 2025
                </p>
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------------------ */}
          {/* BEST / WORST HOURS                                                 */}
          {/* ------------------------------------------------------------------ */}
          <section className="mb-8" aria-labelledby="heading-hours">
            <h2
              id="heading-hours"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Mejores y peores horas para viajar en Semana Santa 2026
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

                {/* CTA to mejor-hora */}
                <Link
                  href="/mejor-hora"
                  className="mt-4 flex items-center gap-2 text-sm font-medium text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  Calculadora: mejor hora para viajar por carretera
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------------------ */}
          {/* MAIN ROUTES                                                        */}
          {/* ------------------------------------------------------------------ */}
          <section className="mb-8" aria-labelledby="heading-routes">
            <h2
              id="heading-routes"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1"
            >
              Carreteras más afectadas en Semana Santa 2026
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Principales ejes con congestión prevista según histórico DGT.
              Consulta el estado en tiempo real en cada carretera.
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

          {/* ------------------------------------------------------------------ */}
          {/* TIPS                                                               */}
          {/* ------------------------------------------------------------------ */}
          <section className="mb-8" aria-labelledby="heading-tips">
            <h2
              id="heading-tips"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              8 consejos para conducir en Semana Santa 2026
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

          {/* ------------------------------------------------------------------ */}
          {/* FUEL CALLOUT                                                       */}
          {/* ------------------------------------------------------------------ */}
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
                  pueden ser hasta un 20% más caras durante la operación salida.
                  Repostar en tu ciudad o en carreteras secundarias te puede
                  ahorrar 10-15 euros por depósito.
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

          {/* ------------------------------------------------------------------ */}
          {/* QUICK LINKS GRID                                                   */}
          {/* ------------------------------------------------------------------ */}
          <section className="mb-8" aria-labelledby="heading-quicklinks">
            <h2
              id="heading-quicklinks"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Herramientas en tiempo real para Semana Santa
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
                  href: "/radares",
                  label: "Radares",
                  icon: Radar,
                  color: "text-purple-600 dark:text-purple-400",
                  bg: "bg-purple-50 dark:bg-purple-900/20",
                  border: "border-purple-100",
                },
                {
                  href: "/alertas-meteo",
                  label: "Alertas Meteo",
                  icon: CloudLightning,
                  color: "text-sky-600",
                  bg: "bg-sky-50",
                  border: "border-sky-100",
                },
                {
                  href: "/paneles",
                  label: "Paneles PMV",
                  icon: BarChart3,
                  color: "text-teal-600",
                  bg: "bg-teal-50 dark:bg-teal-900/20",
                  border: "border-teal-100",
                },
                {
                  href: "/mejor-hora",
                  label: "Mejor hora para viajar",
                  icon: Clock,
                  color: "text-green-600 dark:text-green-400",
                  bg: "bg-green-50 dark:bg-green-900/20",
                  border: "border-green-100",
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

          {/* ------------------------------------------------------------------ */}
          {/* FAQ                                                                */}
          {/* ------------------------------------------------------------------ */}
          <section className="mb-8" aria-labelledby="heading-faq">
            <h2
              id="heading-faq"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Preguntas frecuentes — Tráfico Semana Santa 2026
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

          {/* ------------------------------------------------------------------ */}
          {/* RELATED LINKS                                                      */}
          {/* ------------------------------------------------------------------ */}
          <RelatedLinks
            title="Otras herramientas para tus desplazamientos"
            links={[
              {
                title: "Operaciones Especiales",
                description: "Calendario de todas las operaciones DGT 2026",
                href: "/operaciones",
                icon: <CalendarDays className="w-5 h-5" />,
              },
              {
                title: "Incidencias en tiempo real",
                description: "Cortes, retenciones y alertas activas ahora",
                href: "/incidencias",
                icon: <AlertTriangle className="w-5 h-5" />,
              },
              {
                title: "Radares DGT",
                description: "Mapa completo de radares de velocidad",
                href: "/radares",
                icon: <Radar className="w-5 h-5" />,
              },
              {
                title: "Mejor Hora para Viajar",
                description: "Análisis de tráfico por franjas horarias",
                href: "/mejor-hora",
                icon: <Clock className="w-5 h-5" />,
              },
              {
                title: "Calculadora de Ruta",
                description: "Coste, peajes y combustible de tu viaje",
                href: "/calculadora",
                icon: <Navigation className="w-5 h-5" />,
              },
            ]}
          />
        </main>
      </div>
    </>
  );
}
