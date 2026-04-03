import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Camera,
  CloudRain,
  ChevronRight,
  Clock,
  Construction,
  MapPin,
  Navigation,
  Fuel,
  Radio,
  Activity,
  Route,
  Train,
  Wind,
  Plane,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 120;

// -------------------------------------------------------------------------
// City registry — 10 major cities targeting "tráfico [city] hoy"
// -------------------------------------------------------------------------
const TRAFFIC_CITIES: Record<
  string,
  { name: string; province: string; provinceCode: string }
> = {
  madrid: { name: "Madrid", province: "Madrid", provinceCode: "28" },
  barcelona: { name: "Barcelona", province: "Barcelona", provinceCode: "08" },
  valencia: { name: "Valencia", province: "Valencia", provinceCode: "46" },
  sevilla: { name: "Sevilla", province: "Sevilla", provinceCode: "41" },
  malaga: { name: "Málaga", province: "Málaga", provinceCode: "29" },
  zaragoza: { name: "Zaragoza", province: "Zaragoza", provinceCode: "50" },
  bilbao: { name: "Bilbao", province: "Vizcaya", provinceCode: "48" },
  alicante: { name: "Alicante", province: "Alicante", provinceCode: "03" },
  murcia: { name: "Murcia", province: "Murcia", provinceCode: "30" },
  granada: { name: "Granada", province: "Granada", provinceCode: "18" },
};

// City-specific FAQ content
const CITY_FAQ: Record<string, { q1: string; a1: string; q2: string; a2: string }> = {
  madrid: {
    q1: "¿Cuáles son las horas punta en Madrid?",
    a1: "En Madrid las horas punta más intensas son de 7:30 a 9:30 y de 18:00 a 20:30 en días laborables. Los accesos más congestionados son la A-1, A-2, A-3, A-4, A-5 y la M-30/M-40. Los viernes por la tarde y los domingos por la noche la M-40 y los accesos al centro acumulan retenciones importantes.",
    q2: "¿Qué tramos de Madrid tienen más incidencias de tráfico?",
    a2: "Los tramos con mayor frecuencia de incidencias en Madrid son la M-30 a su paso por el túnel de Plaza de España, la A-1 en el acceso por San Sebastián de los Reyes, la A-6 en Las Rozas y la A-4 en Valdemoro. La Gran Vía y la Castellana también registran cortes frecuentes por eventos.",
  },
  barcelona: {
    q1: "¿Cuáles son las horas punta en Barcelona?",
    a1: "Barcelona registra su mayor densidad de tráfico entre las 7:00 y las 9:30 por la mañana y entre las 17:30 y las 20:00 por la tarde. La Ronda de Dalt (B-20), la Ronda Litoral y los accesos por la AP-7 y la C-31 concentran la mayor parte de las retenciones.",
    q2: "¿Cómo afecta el tráfico pesado en Barcelona?",
    a2: "El tráfico pesado tiene restricciones en la ZBE (Zona de Bajas Emisiones) de Barcelona. Camiones y vehículos de más de 3,5 t no pueden circular por determinadas vías en horas punta. Las entradas desde el Vallès por la C-17 y la A-18 son especialmente afectadas los lunes por la mañana.",
  },
  valencia: {
    q1: "¿Cuáles son las zonas con más tráfico en Valencia?",
    a1: "Las zonas con mayor congestión en Valencia son la V-30 (Pista de Silla), el acceso por la V-21 hacia el norte y la conexión con la A-3 hacia Madrid. El núcleo urbano registra mayores retenciones en Avenida del Puerto, Blasco Ibáñez y Avenida de Fernando Poo durante las horas punta.",
    q2: "¿Hay restricciones de tráfico en Valencia ciudad?",
    a2: "Valencia cuenta con una Zona de Bajas Emisiones (ZBE) en el centro histórico que limita la circulación de vehículos sin etiqueta ambiental o con etiqueta B durante los días laborables. Consulta nuestra sección de ZBE para los horarios y perímetros exactos actualizados.",
  },
  sevilla: {
    q1: "¿Cuáles son las carreteras más congestionadas en Sevilla?",
    a1: "En Sevilla las mayores retenciones se producen en la SE-30 (Ronda de Circunvalación), los accesos por la A-92 desde el aeropuerto y la A-4 hacia Cádiz. La Ronda Histórica y los puentes sobre el Guadalquivir también sufren cortes habituales durante la Semana Santa y la Feria de Abril.",
    q2: "¿Cómo afectan los eventos a la circulación en Sevilla?",
    a2: "Sevilla tiene varios eventos anuales que generan restricciones masivas: la Semana Santa (cierre del casco histórico), la Feria de Abril (cortes en Los Remedios y Triana) y los partidos del Betis/Sevilla en el Estadio Olímpico. Consulta la sección de operaciones especiales para fechas concretas.",
  },
  malaga: {
    q1: "¿Cuáles son los puntos de mayor congestión en Málaga?",
    a1: "Los puntos más conflictivos en Málaga son la A-7 (autovía del Mediterráneo) a su paso por Marbella y Estepona, la entrada por la MA-20 (Ronda Oeste) y el Paseo Marítimo Antonio Machado durante el verano. El aeropuerto genera picos de tráfico especialmente en julio y agosto.",
    q2: "¿Hay peajes en las carreteras de la provincia de Málaga?",
    a2: "La AP-46 (Málaga-Las Pedrizas) es una autopista de peaje que conecta Málaga con el interior. La AP-7 fue liberada de peaje en 2020 y actualmente es de uso gratuito. La MA-20 es autovía de libre acceso y la principal alternativa al centro.",
  },
  zaragoza: {
    q1: "¿Cuáles son las vías más afectadas por retenciones en Zaragoza?",
    a1: "En Zaragoza los puntos de mayor congestión son el nudo de La Almozara en la Z-30, el acceso por la A-2 (Madrid-Barcelona) y la conexión con la A-68 hacia Bilbao. El puente de Santiago y los accesos al Actur registran retenciones frecuentes en hora punta.",
    q2: "¿Qué obras afectan al tráfico en Zaragoza actualmente?",
    a2: "Zaragoza está sometida periódicamente a obras de mejora de la red viaria interior. Los proyectos más recurrentes afectan a la Z-40 y a los accesos al polígono industrial de Plaza. Consulta la sección de incidencias activas arriba para ver el estado en tiempo real.",
  },
  bilbao: {
    q1: "¿Cuáles son los túneles y viaductos más congestionados en Bilbao?",
    a1: "El túnel de Artxanda, el viaducto de La Salve y los accesos por la A-8 (autovía del Cantábrico) son los puntos más saturados en el área metropolitana de Bilbao. Los accesos desde Barakaldo y Basauri por la BI-625 también acumulan retenciones en horas punta.",
    q2: "¿Cómo se gestiona el tráfico pesado en Bilbao?",
    a2: "Los camiones con origen o destino al Puerto de Bilbao tienen itinerarios recomendados que evitan el centro. La A-8 dispone de carril habilitado para vehículos pesados. Eventos en el BEC (Bilbao Exhibition Centre) generan puntas de tráfico en los accesos por Barakaldo.",
  },
  alicante: {
    q1: "¿Cuáles son las horas punta en Alicante?",
    a1: "Alicante registra mayor congestión entre las 7:30 y las 9:00 y entre las 14:00 y las 16:00 en días laborables. El eje de la Avenida de la Estación, la AP-7 en verano hacia Benidorm y la N-332 litoral son los puntos habitualmente más lentos.",
    q2: "¿Qué afecta al tráfico en Alicante en verano?",
    a2: "Entre junio y septiembre el tráfico hacia la Costa Blanca se multiplica. La AP-7 y la N-332 entre Alicante, El Campello y Benidorm registran retenciones de varios kilómetros los viernes tarde y domingos. Se recomienda usar la CV-70 como alternativa interior.",
  },
  murcia: {
    q1: "¿Cuáles son los accesos más saturados de Murcia?",
    a1: "Los accesos más congestionados en Murcia son la A-30 desde Albacete, la RM-3 en el nudo con la A-7 y los accesos al campus universitario de Espinardo. El puente del Paso de la Cadena y la Ronda de Garay concentran la mayor parte de las retenciones en hora punta.",
    q2: "¿Hay obras importantes que afecten al tráfico en Murcia ahora?",
    a2: "Consulta las incidencias activas de la sección superior para ver el estado actualizado. Las obras de ampliación de la Ronda de Garay y los trabajos periódicos en la RM-19 son los que más afectan habitualmente a la circulación en el municipio.",
  },
  granada: {
    q1: "¿Cuáles son los puntos con más tráfico en Granada?",
    a1: "El nudo de la Circunvalación (A-44 con la GR-30) y el acceso desde la autovía A-92 son los puntos más congestionados en Granada. La Avenida de la Constitución y los accesos a la Alhambra registran picos importantes durante el verano y en Semana Santa.",
    q2: "¿Cómo afecta el turismo al tráfico en Granada?",
    a2: "Granada recibe millones de visitantes anuales, especialmente para visitar la Alhambra. Los domingos y festivos los accesos al barrio del Albaicín y el aparcamiento de la Alhambra generan retenciones en Paseo del Violón y la Cuesta de Gomérez. Se recomienda el aparcamiento de la Alhambra en la A-395 o el uso del autobús urbano.",
  },
};

// -------------------------------------------------------------------------
// Incident type labels in Spanish
// -------------------------------------------------------------------------
const INCIDENT_TYPE_LABELS: Record<string, string> = {
  ACCIDENT: "Accidente",
  ROADWORK: "Obras",
  CONGESTION: "Retención",
  HAZARD: "Peligro",
  VEHICLE_BREAKDOWN: "Avería",
  WEATHER: "Meteorología",
  EVENT: "Evento",
  CLOSURE: "Corte",
  OTHER: "Incidencia",
};

const INCIDENT_TYPE_COLORS: Record<string, string> = {
  ACCIDENT: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200",
  ROADWORK: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200",
  CONGESTION: "bg-tl-amber-100 text-tl-amber-700 dark:text-tl-amber-300 border-tl-amber-200 dark:border-tl-amber-800",
  HAZARD: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200",
  VEHICLE_BREAKDOWN: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200",
  WEATHER: "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 border-tl-200 dark:border-tl-800",
  EVENT: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200",
  CLOSURE: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200",
  OTHER: "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800",
};

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Ahora mismo";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays}d`;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------
type Props = {
  params: Promise<{ city: string }>;
};

// -------------------------------------------------------------------------
// Metadata
// -------------------------------------------------------------------------
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const cityData = TRAFFIC_CITIES[city];

  if (!cityData) {
    return { title: "Ciudad no encontrada" };
  }

  const title = `Tráfico en ${cityData.name} Hoy — Incidencias en Tiempo Real`;
  const description = `Estado del tráfico en ${cityData.name} ahora mismo. Incidencias activas, obras, retenciones y alertas meteorológicas en las carreteras de ${cityData.province} en tiempo real.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/trafico/${city}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `${BASE_URL}/trafico/${city}`,
    },
  };
}

// -------------------------------------------------------------------------
// Page component
// -------------------------------------------------------------------------
export default async function TraficoCityPage({ params }: Props) {
  const { city } = await params;
  const cityData = TRAFFIC_CITIES[city];

  if (!cityData) {
    notFound();
  }

  const now = new Date();
  const faq = CITY_FAQ[city] ?? {
    q1: `¿Cuáles son las horas punta en ${cityData.name}?`,
    a1: `El tráfico en ${cityData.name} es más denso durante las horas punta de la mañana (7:30-9:30) y de la tarde (17:30-20:00) en días laborables. Consulta las incidencias activas arriba para ver el estado en tiempo real.`,
    q2: `¿Cómo consultar el estado del tráfico en ${cityData.name} ahora?`,
    a2: `Puedes consultar el estado del tráfico en ${cityData.name} en tiempo real en trafico.live. Esta página se actualiza automáticamente con los datos de la DGT y otras fuentes oficiales.`,
  };

  // Live data — parallel queries
  const [incidents, incidentCount, cameraCount, weatherCount, railwayStationCount, airQualityStations, airports] = await Promise.all([
    prisma.trafficIncident.findMany({
      where: {
        isActive: true,
        province: { contains: cityData.name, mode: "insensitive" },
      },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: {
        id: true,
        description: true,
        roadNumber: true,
        startedAt: true,
        type: true,
        province: true,
      },
    }),
    prisma.trafficIncident.count({
      where: {
        isActive: true,
        province: { contains: cityData.name, mode: "insensitive" },
      },
    }),
    prisma.camera.count({
      where: { province: cityData.provinceCode },
    }),
    prisma.weatherAlert.count({
      where: { isActive: true, province: cityData.provinceCode },
    }),
    prisma.railwayStation.count({
      where: { province: cityData.provinceCode },
    }),
    prisma.airQualityStation.findMany({
      where: { province: cityData.provinceCode },
      include: { readings: { orderBy: { createdAt: "desc" }, take: 1 } },
      take: 5,
      orderBy: { name: "asc" },
    }),
    prisma.airport.findMany({
      where: { province: cityData.provinceCode },
      include: { statistics: { where: { metric: "pax" }, orderBy: { periodStart: "desc" }, take: 1 } },
    }),
  ]);

  // Derive status colour for the header badge
  const statusColor =
    incidentCount === 0
      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200"
      : incidentCount < 5
      ? "bg-tl-amber-100 text-tl-amber-700 dark:text-tl-amber-300 border-tl-amber-200 dark:border-tl-amber-800"
      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200";

  const statusLabel =
    incidentCount === 0
      ? "Sin incidencias"
      : incidentCount < 5
      ? "Tráfico con incidencias leves"
      : "Tráfico con incidencias graves";

  // JSON-LD structured data
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `Tráfico en ${cityData.name} Hoy`,
      description: `Estado del tráfico en ${cityData.name} en tiempo real. ${incidentCount} incidencias activas.`,
      url: `${BASE_URL}/trafico/${city}`,
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Tráfico", item: `${BASE_URL}/incidencias` },
          { "@type": "ListItem", position: 3, name: cityData.name },
        ],
      },
      mainEntity: {
        "@type": "ItemList",
        name: `Incidencias de tráfico en ${cityData.name}`,
        numberOfItems: incidentCount,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "City",
      name: cityData.name,
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: cityData.province,
        addressCountry: "ES",
      },
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Tráfico", href: "/incidencias" },
              { name: cityData.name, href: `/trafico/${city}` },
            ]}
          />

          {/* Header */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Tráfico en {cityData.name} Hoy
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {/* Live badge */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-50 dark:bg-green-900/200 animate-pulse" />
                    Actualizado en tiempo real
                  </span>
                  {/* Timestamp */}
                  <span className="text-gray-400 text-xs">
                    {formatTimestamp(now)} (hora Madrid)
                  </span>
                </div>
              </div>

              {/* Status pill */}
              <div
                className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold ${statusColor}`}
              >
                <Activity className="w-4 h-4" />
                {statusLabel}
              </div>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                Incidencias activas
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {incidentCount.toLocaleString("es-ES")}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">en {cityData.province}</div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
                <Camera className="w-3.5 h-3.5 text-tl-500" />
                Cámaras DGT
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {cameraCount.toLocaleString("es-ES")}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                <Link
                  href={`/camaras/${city}`}
                  className="text-tl-600 dark:text-tl-400 hover:underline"
                >
                  Ver cámaras
                </Link>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
                <CloudRain className="w-3.5 h-3.5 text-sky-500" />
                Alertas meteo
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {weatherCount.toLocaleString("es-ES")}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                <Link href="/alertas-meteo" className="text-tl-600 dark:text-tl-400 hover:underline">
                  Ver alertas
                </Link>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                Última actualización
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {formatTimestamp(now)}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Fuente DGT</div>
            </div>
          </div>

          {/* Incident list */}
          <section className="mb-6" aria-labelledby="incidencias-heading">
            <div className="flex items-center justify-between mb-3">
              <h2
                id="incidencias-heading"
                className="text-lg font-semibold text-gray-900 dark:text-gray-100"
              >
                Incidencias activas en {cityData.name}
              </h2>
              {incidentCount > 20 && (
                <Link
                  href="/incidencias"
                  className="text-sm text-tl-600 dark:text-tl-400 hover:underline flex items-center gap-1"
                >
                  Ver todas ({incidentCount})
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {incidents.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-green-200 p-8 text-center">
                <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Navigation className="w-6 h-6 text-green-500" />
                </div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Sin incidencias en {cityData.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No hay incidencias de tráfico activas en este momento en la provincia de{" "}
                  {cityData.province}. La circulación es fluida.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {incidents.map((inc) => {
                  const typeLabel =
                    INCIDENT_TYPE_LABELS[inc.type] ?? "Incidencia";
                  const typeColor =
                    INCIDENT_TYPE_COLORS[inc.type] ??
                    INCIDENT_TYPE_COLORS.OTHER;
                  return (
                    <div
                      key={inc.id}
                      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 flex items-start gap-3"
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {inc.type === "ACCIDENT" || inc.type === "CLOSURE" ? (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        ) : inc.type === "ROADWORK" ? (
                          <Construction className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                        ) : inc.type === "CONGESTION" ? (
                          <Activity className="w-4 h-4 text-tl-amber-500" />
                        ) : inc.type === "WEATHER" ? (
                          <CloudRain className="w-4 h-4 text-tl-500" />
                        ) : (
                          <Radio className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${typeColor}`}
                          >
                            {typeLabel}
                          </span>
                          {inc.roadNumber && (
                            <span className="text-xs font-semibold text-tl-700 dark:text-tl-300 bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 px-2 py-0.5 rounded">
                              {inc.roadNumber}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 ml-auto">
                            {formatRelativeTime(new Date(inc.startedAt))}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {inc.description ?? `${typeLabel} en ${inc.province ?? cityData.name}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Quick links */}
          <section className="mb-6" aria-labelledby="enlaces-heading">
            <h2
              id="enlaces-heading"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3"
            >
              Recursos de tráfico en {cityData.name}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Link
                href="/mapa"
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-tl-300 hover:shadow-sm transition-all group"
              >
                <MapPin className="w-5 h-5 text-tl-600 dark:text-tl-400 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-700 dark:text-tl-300">
                    Mapa en vivo
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">España completa</div>
                </div>
              </Link>

              <Link
                href="/incidencias"
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-red-300 hover:shadow-sm transition-all group"
              >
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-red-700 dark:text-red-400">
                    Incidencias
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Todas las vías</div>
                </div>
              </Link>

              <Link
                href={`/camaras/${city}`}
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-indigo-300 hover:shadow-sm transition-all group"
              >
                <Camera className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-700">
                    Cámaras
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{cityData.name}</div>
                </div>
              </Link>

              <Link
                href="/radares"
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-orange-300 hover:shadow-sm transition-all group"
              >
                <Radio className="w-5 h-5 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-orange-700 dark:text-orange-400">
                    Radares
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">DGT España</div>
                </div>
              </Link>

              <Link
                href={`/gasolineras/baratas/${city}`}
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-green-300 hover:shadow-sm transition-all group"
              >
                <Fuel className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-green-700 dark:text-green-400">
                    Gasolineras baratas
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{cityData.name}</div>
                </div>
              </Link>

              <Link
                href="/alertas-meteo"
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-sky-300 hover:shadow-sm transition-all group"
              >
                <CloudRain className="w-5 h-5 text-sky-500 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-sky-700">
                    Alertas meteo
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">AEMET</div>
                </div>
              </Link>
            </div>
          </section>

          {/* Multimodal transport data */}
          {(railwayStationCount > 0 || airQualityStations.length > 0 || airports.length > 0) && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Transporte e infraestructura en {cityData.name}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {railwayStationCount > 0 && (
                  <Link
                    href="/trenes/estaciones"
                    className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-tl-300 hover:shadow-sm transition-all group"
                  >
                    <Train className="w-5 h-5 text-tl-500 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <span className="font-mono">{railwayStationCount}</span> estaciones de tren
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Renfe · Cercanías · AVE</div>
                    </div>
                  </Link>
                )}
                {airQualityStations.length > 0 && (
                  <Link
                    href="/calidad-aire"
                    className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-green-300 hover:shadow-sm transition-all group"
                  >
                    <Wind className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <span className="font-mono">{airQualityStations.length}</span> estaciones calidad aire
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ICA: {airQualityStations[0]?.readings?.[0]?.icaLabel ?? "Buena"}
                      </div>
                    </div>
                  </Link>
                )}
                {airports.map((apt) => (
                  <Link
                    key={apt.id}
                    href="/aviacion"
                    className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-sky-300 hover:shadow-sm transition-all group"
                  >
                    <Plane className="w-5 h-5 text-sky-500 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {apt.name} {apt.iata && <span className="font-mono text-xs text-gray-400 ml-1">({apt.iata})</span>}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {apt.statistics?.[0] ? `${(Number(apt.statistics[0].value) / 1_000_000).toFixed(1)}M pax/año` : "AENA"}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Other cities */}
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Tráfico en otras ciudades
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(TRAFFIC_CITIES)
                .filter(([slug]) => slug !== city)
                .map(([slug, data]) => (
                  <Link
                    key={slug}
                    href={`/trafico/${slug}`}
                    className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:border-tl-300 hover:text-tl-700 dark:text-tl-300 transition-colors"
                  >
                    {data.name}
                  </Link>
                ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-6" aria-labelledby="faq-heading">
            <h2
              id="faq-heading"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3"
            >
              Preguntas frecuentes sobre el tráfico en {cityData.name}
            </h2>
            <div className="space-y-3">
              <details className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden group">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:bg-gray-950 transition-colors select-none text-sm">
                  {faq.q1}
                  <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90 flex-shrink-0 ml-2" />
                </summary>
                <div className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 leading-relaxed">
                  {faq.a1}
                </div>
              </details>

              <details className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden group">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:bg-gray-950 transition-colors select-none text-sm">
                  {faq.q2}
                  <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90 flex-shrink-0 ml-2" />
                </summary>
                <div className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 leading-relaxed">
                  {faq.a2}
                </div>
              </details>
            </div>
          </section>

          {/* Data source note */}
          <div className="bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Fuente y actualización de datos
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Los datos de incidencias proceden de la Dirección General de Tráfico (DGT) y
                  fuentes autonómicas (SCT Cataluña, Tráfico Euskadi, Tráfico Madrid). Las alertas
                  meteorológicas son de AEMET. Esta página no usa caché y muestra el estado en tiempo
                  real en cada carga.
                </p>
              </div>
            </div>
          </div>

          <RelatedLinks links={[
            { title: "Tráfico en España", description: "Índice de ciudades con incidencias en tiempo real", href: "/trafico", icon: <MapPin className="w-5 h-5" /> },
            { title: "Cámaras en " + cityData.name, description: "Imágenes en vivo de las cámaras DGT de la provincia", href: `/camaras/${city}`, icon: <Camera className="w-5 h-5" /> },
            { title: "Incidencias nacionales", description: "Mapa y listado de todas las incidencias activas", href: "/incidencias", icon: <AlertTriangle className="w-5 h-5" /> },
            { title: "Carreteras de España", description: "Red viaria nacional por tipo y provincia", href: "/carreteras", icon: <Route className="w-5 h-5" /> },
          ]} />
        </main>
      </div>
    </>
  );
}
