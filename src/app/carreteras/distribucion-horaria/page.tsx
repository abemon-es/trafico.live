import { Clock, TrendingUp, BarChart3, Route, AlertTriangle } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { buildPageMetadata } from "@/lib/seo/metadata";
import prisma from "@/lib/db";
import { HourlyCharts } from "./HourlyCharts";

export const revalidate = 900; // 15 min — profile data changes slowly

export const metadata = buildPageMetadata({
  title: "Distribución Horaria del Tráfico en España | Horas Punta DGT",
  description:
    "Consulta cómo se distribuye el tráfico a lo largo del día y la semana en las carreteras españolas. Horas punta, valle y comparativa laborable vs fin de semana. Datos en tiempo real de sensores Madrid.",
  path: "/carreteras/distribucion-horaria",
  keywords: [
    "distribución horaria tráfico",
    "horas punta carretera",
    "tráfico por hora España",
    "patrón tráfico diario",
    "sensores tráfico Madrid",
  ],
});

const DOW_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default async function DistribucionHorariaPage() {
  // Pull hourly profiles for all sensors, averaged across sensors per (dayOfWeek, hour)
  const profiles = await prisma.hourlyTrafficProfile.groupBy({
    by: ["dayOfWeek", "hour"],
    _avg: { avgIntensity: true },
    _sum: { sampleCount: true },
    orderBy: [{ dayOfWeek: "asc" }, { hour: "asc" }],
  });

  // Build a map: dayOfWeek -> hour -> avgIntensity
  const profileMap: Record<number, Record<number, number>> = {};
  for (const p of profiles) {
    if (!profileMap[p.dayOfWeek]) profileMap[p.dayOfWeek] = {};
    profileMap[p.dayOfWeek][p.hour] = Math.round(p._avg.avgIntensity ?? 0);
  }

  // Compute total samples to show data freshness
  const totalSamples = profiles.reduce((acc, p) => acc + (p._sum.sampleCount ?? 0), 0);

  // Find global peak: weekday peak hour (Mon–Fri average)
  const weekdayHours = Array.from({ length: 24 }, (_, h) => {
    const values = [1, 2, 3, 4, 5].map((d) => profileMap[d]?.[h] ?? 0);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { hour: h, avg: Math.round(avg) };
  });
  const peakWeekday = weekdayHours.reduce((best, cur) => (cur.avg > best.avg ? cur : best), weekdayHours[0]);
  const valleyWeekday = weekdayHours.reduce((best, cur) => (cur.avg < best.avg ? cur : best), weekdayHours[0]);

  // Weekend peak (Sat + Sun)
  const weekendHours = Array.from({ length: 24 }, (_, h) => {
    const values = [0, 6].map((d) => profileMap[d]?.[h] ?? 0);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { hour: h, avg: Math.round(avg) };
  });
  const peakWeekend = weekendHours.reduce((best, cur) => (cur.avg > best.avg ? cur : best), weekendHours[0]);

  const faqItems = [
    {
      question: "¿A qué horas hay más tráfico en las carreteras españolas?",
      answer:
        "En días laborables se forman dos picos claros: por la mañana entre las 7:00 y las 9:30 (salida al trabajo) y por la tarde entre las 17:00 y las 20:00 (vuelta a casa). El tráfico nocturno es mínimo entre las 01:00 y las 05:00. En festivos y fines de semana el pico matutino desaparece y el máximo se desplaza a mediodía.",
    },
    {
      question: "¿Cuándo hay menos tráfico si quiero salir a la carretera?",
      answer:
        "Para viajes interurbanos, el mejor momento es entre semana por la mañana (antes de las 7:00) o por la tarde (después de las 21:00). Los sábados por la mañana temprano también registran tráfico bajo. Evita los viernes por la tarde de verano y los domingos por la tarde en el retorno del fin de semana.",
    },
    {
      question: "¿Son los datos de Madrid representativos del resto de España?",
      answer:
        "Los perfiles horarios se calculan a partir de los 6.000+ sensores de Madrid, que ofrecen cobertura en tiempo real con actualizaciones cada 5 minutos. El patrón general (doble pico laborable, pico mediodía en festivos) es similar en todo el país, aunque la intensidad y el horario exacto varían por ciudad.",
    },
    {
      question: "¿Con qué frecuencia se actualizan estos datos?",
      answer:
        "Los perfiles horarios son medias acumuladas de los últimos 30 días de medición. El colector de intensidad recoge datos de los sensores de Madrid cada 5 minutos, y los perfiles se recalculan automáticamente con cada nuevo dato.",
    },
  ];

  // Serialize data for client component (Recharts needs plain JSON)
  const chartData = {
    weekdayHours: weekdayHours.map((h) => ({ hour: h.hour, avg: h.avg })),
    weekendHours: weekendHours.map((h) => ({ hour: h.hour, avg: h.avg })),
    byDow: DOW_LABELS.map((label, dow) => ({
      dow,
      label,
      hours: Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        intensity: profileMap[dow]?.[h] ?? 0,
      })),
    })),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Carreteras", href: "/carreteras" },
            { name: "Distribución horaria", href: "/carreteras/distribucion-horaria" },
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-8 h-8 text-tl-600 dark:text-tl-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Distribución horaria del tráfico
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl text-lg">
            Análisis de los patrones horarios del tráfico en las carreteras españolas. Consulta los
            picos de mayor intensidad, los valles y la diferencia entre días laborables y fin de
            semana.
          </p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="font-data text-2xl font-bold text-tl-600 dark:text-tl-400">
              {peakWeekday ? `${peakWeekday.hour.toString().padStart(2, "0")}:00` : "—"}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Hora punta laborable (tarde)</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="font-data text-2xl font-bold text-amber-600 dark:text-amber-400">
              {peakWeekend ? `${peakWeekend.hour.toString().padStart(2, "0")}:00` : "—"}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Hora punta fin de semana</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="font-data text-2xl font-bold text-green-600 dark:text-green-400">
              {valleyWeekday ? `${valleyWeekday.hour.toString().padStart(2, "0")}:00` : "—"}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Hora valle (menos tráfico)</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="font-data text-2xl font-bold text-gray-900 dark:text-gray-100">
              {(totalSamples / 1_000_000).toFixed(1)}M
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Lecturas de sensor analizadas</div>
          </div>
        </div>

        {/* Charts — client component */}
        {profiles.length > 0 ? (
          <HourlyCharts data={chartData} />
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center mb-8">
            <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              Los perfiles horarios se generan progresivamente a partir de las lecturas de los
              sensores. Vuelve en unos días para ver las gráficas completas.
            </p>
          </div>
        )}

        {/* Contextual explanation */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            Cómo interpretar los patrones de tráfico
          </h2>
          <div className="prose prose-gray dark:prose-invert max-w-none text-sm leading-relaxed">
            <h3>Doble pico laborable</h3>
            <p>
              En días laborables, el perfil de tráfico tiene forma de bimodal con dos máximos bien
              definidos: el pico matutino (entrada al trabajo) y el pico vespertino (regreso a casa).
              El primero suele ser más breve e intenso; el segundo, más largo.
            </p>
            <h3>Patrón de fin de semana</h3>
            <p>
              Los sábados y domingos presentan un único pico centrado a mediodía, sin el pico
              matutino laboral. Los viernes por la tarde se asemejan a los sábados por los
              desplazamientos de ocio de inicio de fin de semana.
            </p>
            <h3>Temporada y climatología</h3>
            <p>
              El verano y los puentes festivos distorsionan el patrón estándar. En julio y agosto
              los accesos a la costa y a zonas de montaña registran intensidades extraordinarias
              los viernes tarde y domingos tarde.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <FAQAccordion items={faqItems} className="mb-8" />

        {/* Related Links */}
        <RelatedLinks
          links={[
            {
              title: "Estaciones de aforo",
              description: "Mapa con 14.400+ puntos de medición de intensidad",
              href: "/estaciones-aforo",
              icon: <BarChart3 className="w-5 h-5" />,
            },
            {
              title: "Intensidad de tráfico IMD",
              description: "Intensidad Media Diaria por carretera y provincia",
              href: "/intensidad",
              icon: <TrendingUp className="w-5 h-5" />,
            },
            {
              title: "Operaciones especiales",
              description: "Tráfico durante Semana Santa, puentes y verano",
              href: "/carreteras/operaciones",
              icon: <Clock className="w-5 h-5" />,
            },
            {
              title: "Incidencias en carretera",
              description: "Estado de la red en tiempo real",
              href: "/incidencias",
              icon: <AlertTriangle className="w-5 h-5" />,
            },
          ]}
        />
      </main>
    </div>
  );
}
