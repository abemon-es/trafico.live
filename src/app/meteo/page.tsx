import type { Metadata } from "next";
import {
  CloudSun,
  CloudRain,
  Wind,
  Thermometer,
  AlertTriangle,
  MapPin,
  Map as MapIcon,
  Snowflake,
  Droplets,
} from "lucide-react";
import prisma from "@/lib/db";
import { VerticalHub } from "@/components/ui/VerticalHub";
import { StatCard } from "@/components/ui/StatCard";
import { TickerStrip, type TickerItem } from "@/components/ui/TickerStrip";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RelatedLinks } from "@/components/ui/RelatedLinks";
import { ButtonLink } from "@/components/ui/Button";
import { StructuredData } from "@/components/seo/StructuredData";
import { MeteoHeroMap } from "./MeteoHeroMap";

export const revalidate = 900;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Meteorología España — Alertas AEMET y estaciones climáticas",
  description:
    "Mapa de alertas AEMET activas, red de estaciones climáticas históricas y observaciones diarias. Lluvia, nieve, viento, temperaturas y oleaje en tiempo real.",
  alternates: { canonical: `${BASE_URL}/meteo` },
  openGraph: {
    title: "Meteorología España — AEMET en vivo",
    description: "Alertas AEMET, estaciones climáticas y observaciones diarias.",
    url: `${BASE_URL}/meteo`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

async function getHubData() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [
    totalStations,
    activeAlerts,
    alertsByType,
    highSeverity,
    recentAlerts,
    recordsToday,
  ] = await Promise.all([
    prisma.climateStation.count({ where: { isActive: true } }),
    prisma.weatherAlert.count({ where: { isActive: true } }),
    prisma.weatherAlert.groupBy({
      by: ["type"],
      where: { isActive: true },
      _count: true,
    }),
    prisma.weatherAlert.count({ where: { isActive: true, severity: "HIGH" } }),
    prisma.weatherAlert.findMany({
      where: { isActive: true },
      orderBy: [{ severity: "desc" }, { startedAt: "desc" }],
      take: 5,
      select: {
        id: true,
        type: true,
        provinceName: true,
        province: true,
        severity: true,
        description: true,
      },
    }),
    prisma.climateRecord.count({ where: { date: { gte: since24h } } }),
  ]);

  const byType = new Map<string, number>(alertsByType.map((a) => [a.type, a._count]));

  return {
    totalStations,
    activeAlerts,
    highSeverity,
    rainAlerts: byType.get("RAIN") ?? 0,
    snowAlerts: byType.get("SNOW") ?? 0,
    windAlerts: byType.get("WIND") ?? 0,
    tempAlerts: byType.get("TEMPERATURE") ?? 0,
    stormAlerts: byType.get("STORM") ?? 0,
    coastalAlerts: byType.get("COASTAL") ?? 0,
    recentAlerts,
    recordsToday,
  };
}

const TYPE_LABELS: Record<string, string> = {
  RAIN: "Lluvia",
  SNOW: "Nieve",
  ICE: "Hielo",
  FOG: "Niebla",
  WIND: "Viento",
  TEMPERATURE: "Temperatura",
  STORM: "Tormenta",
  COASTAL: "Fenómenos costeros",
  OTHER: "Otros",
};

const FAQ_ITEMS = [
  {
    question: "¿De dónde proceden los datos meteorológicos?",
    answer:
      "Usamos exclusivamente AEMET (Agencia Estatal de Meteorología): feed de alertas CAP para los avisos por lluvia, nieve, viento, tormenta o temperaturas extremas, y el OpenData API para las observaciones climáticas diarias de las ~900 estaciones sinópticas. Los datos se actualizan cada 5 minutos (alertas) y cada 24 horas (observaciones).",
  },
  {
    question: "¿Qué significan los niveles de alerta AEMET?",
    answer:
      "AEMET clasifica los avisos en tres niveles: amarillo (riesgo), naranja (riesgo importante) y rojo (riesgo extremo), que en trafico.live se mapean a LOW, MEDIUM y HIGH respectivamente. Cada aviso incluye umbrales meteorológicos específicos: por ejemplo, lluvia roja = >180 mm en 12 h.",
  },
  {
    question: "¿Puedo consultar la climatología histórica de un lugar?",
    answer:
      "Sí. Para cada estación tenemos registros diarios desde 2019 con temperatura mínima/media/máxima, precipitación, nieve, viento, horas de sol, humedad y presión. Las páginas de provincia y ciudad muestran la climatología agregada del mes.",
  },
  {
    question: "¿Incluís previsión por horas?",
    answer:
      "Todavía no publicamos previsión horaria por municipio — AEMET la ofrece en su web. trafico.live se centra en el diagnóstico (alertas activas + climatología) y prevemos integrar la previsión MUNICIPIOS AEMET en próximas versiones.",
  },
  {
    question: "¿Cómo consulto alertas en mi provincia?",
    answer:
      "El ticker superior muestra las alertas activas más graves. El mapa superpone los avisos por provincia. También puedes ir a /espana/[provincia] para ver el resumen climático de tu zona junto con incidencias de tráfico y calidad del aire.",
  },
];

export default async function MeteoHubPage() {
  const data = await getHubData();

  const breadcrumbs = [{ name: "Meteorología", href: "/meteo" }];

  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: "Territorio nacional — meteorología y clima",
    description: "España peninsular, Baleares, Canarias, Ceuta y Melilla.",
    url: `${BASE_URL}/meteo`,
    geo: { "@type": "GeoShape", box: "27.6 -18.3 43.8 4.3" },
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Meteorología y alertas en España",
    url: `${BASE_URL}/meteo`,
    inLanguage: "es",
    about: { "@type": "Place", name: "España" },
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
  };

  const ticker: TickerItem[] = [
    { id: "active", icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Alertas activas", value: data.activeAlerts, tone: data.activeAlerts > 0 ? "warning" : "default" },
    { id: "severe", icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Nivel rojo", value: data.highSeverity, tone: data.highSeverity > 0 ? "danger" : "default" },
    { id: "stations", icon: <MapPin className="w-3.5 h-3.5" />, label: "Estaciones AEMET", value: data.totalStations.toLocaleString("es-ES") },
    ...data.recentAlerts.map((a): TickerItem => ({
      id: `alert-${a.id}`,
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      label: `${TYPE_LABELS[a.type] ?? a.type} · ${a.provinceName ?? a.province}`,
      tone: a.severity === "HIGH" ? "danger" : a.severity === "MEDIUM" ? "warning" : "default",
    })),
  ];

  const hero = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 max-w-3xl">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400">
          <CloudSun className="w-4 h-4" />
          trafico.live · Meteorología
        </span>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 dark:text-gray-50 leading-tight">
          Meteorología en España
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          Alertas AEMET por provincia, red de {data.totalStations.toLocaleString("es-ES")}{" "}
          estaciones climáticas y observaciones diarias con histórico desde 2019.
        </p>
        <div className="flex flex-wrap gap-3 mt-2">
          <ButtonLink href="/meteo/mapa" variant="primary" icon={<MapIcon className="w-4 h-4" />}>
            Mapa AEMET
          </ButtonLink>
          <ButtonLink href="/meteo/alertas" variant="secondary">
            Alertas activas
          </ButtonLink>
          <ButtonLink href="/calidad-aire" variant="ghost">
            Calidad del aire
          </ButtonLink>
        </div>
      </div>
      <MeteoHeroMap />
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Alertas activas" value={data.activeAlerts} hint={`${data.highSeverity} nivel rojo`} icon={AlertTriangle} accent={data.activeAlerts > 0 ? "tl-amber" : "tl"} />
      <StatCard label="Estaciones" value={data.totalStations.toLocaleString("es-ES")} hint="AEMET OpenData" icon={MapPin} accent="tl" />
      <StatCard label="Registros 24 h" value={data.recordsToday.toLocaleString("es-ES")} hint="observaciones diarias" icon={Thermometer} accent="tl" />
      <StatCard label="Tipos de aviso" value={6} hint="lluvia, nieve, viento…" icon={Wind} accent="tl" />
    </div>
  );

  const sections = [
    {
      id: "tipos",
      title: "Alertas por tipo",
      description: "Desglose por fenómeno meteorológico adverso.",
      content: (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { icon: CloudRain, label: "Lluvia", value: data.rainAlerts, color: "text-tl-sea-500" },
            { icon: Snowflake, label: "Nieve", value: data.snowAlerts, color: "text-tl-400" },
            { icon: Wind, label: "Viento", value: data.windAlerts, color: "text-gray-500" },
            { icon: Thermometer, label: "Temperatura", value: data.tempAlerts, color: "text-tl-amber-500" },
            { icon: AlertTriangle, label: "Tormenta", value: data.stormAlerts, color: "text-signal-red" },
            { icon: Droplets, label: "Costeros", value: data.coastalAlerts, color: "text-tl-sea-600" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex flex-col items-center text-center gap-1"
            >
              <item.icon className={`w-6 h-6 ${item.color}`} />
              <span className="font-data text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {item.value}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">{item.label}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "graves",
      title: "Alertas destacadas",
      description: "Avisos naranjas y rojos con fecha de activación.",
      content:
        data.recentAlerts.length > 0 ? (
          <ul className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            {data.recentAlerts.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-5 py-4">
                <AlertTriangle
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    a.severity === "HIGH"
                      ? "text-signal-red"
                      : a.severity === "MEDIUM"
                        ? "text-tl-amber-500"
                        : "text-gray-400"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {TYPE_LABELS[a.type] ?? a.type} · {a.provinceName ?? a.province}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                    {a.description ?? "Sin descripción"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Sin alertas AEMET activas.</p>
        ),
    },
    {
      id: "red",
      title: "Red de estaciones",
      description: "Observaciones diarias desde 2019: temperatura, precipitación, viento y más.",
      content: (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Sincronizamos los registros diarios de cada estación sinóptica AEMET
            (indicativos como 3195 — Madrid Retiro, 0076 — Barcelona Fabra). Los datos alimentan
            las páginas de provincia y los cálculos de climatología histórica.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href="/meteo/estaciones" variant="primary" icon={<MapPin className="w-4 h-4" />}>
              Directorio de estaciones
            </ButtonLink>
            <ButtonLink href="/espana" variant="ghost">
              Clima por provincia
            </ButtonLink>
          </div>
        </div>
      ),
    },
  ];

  const faq = <FAQAccordion items={FAQ_ITEMS} title="Preguntas frecuentes — meteorología" />;

  return (
    <>
      <StructuredData data={[placeSchema, collectionSchema]} />
      <VerticalHub
        breadcrumbs={<Breadcrumbs items={breadcrumbs} />}
        hero={hero}
        ticker={<TickerStrip items={ticker} label="Alertas AEMET" />}
        stats={stats}
        sections={sections}
        faq={faq}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <RelatedLinks
          columns={3}
          items={[
            { title: "Calidad del aire", description: "ICA por estación MITECO", href: "/calidad-aire", icon: Wind },
            { title: "Tráfico vial", description: "Impacto de la meteorología en la red viaria", href: "/trafico", icon: MapPin },
            { title: "Marítimo", description: "Oleaje, viento y alertas costeras", href: "/maritimo", icon: Droplets },
          ]}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          Fuente: AEMET (CAP alerts + OpenData). Actualización: alertas cada 5 min, observaciones
          diarias.
        </p>
      </div>
    </>
  );
}
