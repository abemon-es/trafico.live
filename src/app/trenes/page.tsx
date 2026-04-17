import type { Metadata } from "next";
import {
  Train,
  Route,
  MapPin,
  Radio,
  AlertTriangle,
  Map as MapIcon,
  Accessibility,
  Clock,
  Trophy,
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
import { TrenesHeroMap } from "./TrenesHeroMap";
import { TrenesAnalytics } from "./TrenesAnalytics";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Red Ferroviaria España — Trenes en directo, estaciones y líneas",
  description:
    "Posiciones GPS en tiempo real de trenes Renfe, catálogo de 2.100 estaciones, 1.250 rutas y 12 redes de Cercanías. Alertas GTFS-RT y puntualidad histórica.",
  alternates: { canonical: `${BASE_URL}/trenes` },
  openGraph: {
    title: "Red Ferroviaria España — Trenes en directo",
    description:
      "Trenes en vivo, estaciones, líneas Cercanías/AVE y alertas GTFS-RT.",
    url: `${BASE_URL}/trenes`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

async function getHubData() {
  const [
    stationCount,
    routeCount,
    brandGroups,
    networkGroups,
    accessibleStations,
    activeAlertsCount,
    recentAlerts,
    latestSnapshot,
  ] = await Promise.all([
    prisma.railwayStation.count({ where: { locationType: 0 } }),
    prisma.railwayRoute.count(),
    prisma.railwayRoute.groupBy({
      by: ["brand"],
      _count: true,
      where: { brand: { not: null } },
      orderBy: { _count: { brand: "desc" } },
    }),
    prisma.railwayStation.groupBy({
      by: ["network"],
      _count: true,
      where: { network: { not: null } },
    }),
    prisma.railwayStation.count({ where: { wheelchair: 1 } }),
    prisma.railwayAlert.count({ where: { isActive: true } }),
    prisma.railwayAlert.findMany({
      where: { isActive: true },
      orderBy: { activePeriodStart: "desc" },
      take: 5,
      select: { id: true, headerText: true, description: true, effect: true },
    }),
    prisma.railwayDelaySnapshot.findFirst({
      orderBy: { recordedAt: "desc" },
      select: { totalTrains: true, punctualityRate: true, avgDelay: true, recordedAt: true },
    }),
  ]);

  return {
    stationCount,
    routeCount,
    brandCount: brandGroups.length,
    networkCount: networkGroups.length,
    accessibleStations,
    activeAlertsCount,
    recentAlerts,
    trainsNow: latestSnapshot?.totalTrains ?? 0,
    punctuality: Number(latestSnapshot?.punctualityRate ?? 0),
    avgDelay: Number(latestSnapshot?.avgDelay ?? 0),
  };
}

const FAQ_ITEMS = [
  {
    question: "¿De dónde se obtienen las posiciones de los trenes?",
    answer:
      "Las posiciones de Cercanías provienen del feed oficial GTFS-RT VehiclePositions de Renfe (gtfsrt.renfe.com/vehicle_positions.json). Para trenes de Larga Distancia (AVE, Alvia, Avlo…) usamos el visor de tiempo real de Renfe (tiempo-real.largorecorrido.renfe.com), que publica un flotaLD con latitud/longitud y retraso. Licencia CC-BY 4.0, actualización cada 15-30 s.",
  },
  {
    question: "¿Qué operadores y marcas se incluyen?",
    answer:
      "Mostramos las 14 marcas comerciales que operan sobre infraestructura ADIF: AVE, AVLO, Alvia, Euromed, Intercity, Avant, MD, Regional, REG.EXP, Proximidad, Trencelta, Cercanías, Rodalies y FEVE. Aún no incluimos Iryo ni Ouigo (feeds privados).",
  },
  {
    question: "¿Qué significa la puntualidad del dashboard?",
    answer:
      "Calculamos el porcentaje de trenes cuyo retraso acumulado frente al horario oficial es ≤5 minutos en la captura actual. Los snapshots se registran cada 2 minutos y se agregan en ventanas de 24 h, 7 y 30 días. Excluimos trenes con retraso desconocido (no reportan GPS).",
  },
  {
    question: "¿Puedo consultar líneas y estaciones concretas?",
    answer:
      "Sí. /trenes/estaciones lista las 2.154 estaciones con búsqueda y filtros por red. /trenes/lineas reúne las 1.248 rutas agrupadas por marca y red. Para Cercanías, /trenes/cercanias ofrece una vista por red (Madrid, Barcelona, Valencia…) con mapas dedicados.",
  },
  {
    question: "¿Con qué frecuencia se actualizan las alertas?",
    answer:
      "Las alertas GTFS-RT se recogen cada 2 minutos desde gtfsrt.renfe.com/alerts.json. Incluyen cancelaciones, desvíos, servicios reducidos y retrasos significativos, con periodo activo, causa y descripción en castellano.",
  },
];

export default async function TrenesHubPage() {
  const data = await getHubData();

  const breadcrumbs = [{ name: "Red Ferroviaria", href: "/trenes" }];

  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: "Red ferroviaria de España",
    description:
      "Red de alta velocidad, Larga Distancia, Media Distancia y Cercanías gestionada por Renfe sobre infraestructura ADIF.",
    url: `${BASE_URL}/trenes`,
    geo: { "@type": "GeoShape", box: "35.9 -9.3 43.8 4.3" },
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Red Ferroviaria de España",
    url: `${BASE_URL}/trenes`,
    inLanguage: "es",
    about: { "@type": "Place", name: "España" },
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
  };

  const ticker: TickerItem[] = [
    { id: "trains", icon: <Train className="w-3.5 h-3.5" />, label: "Trenes en circulación", value: data.trainsNow },
    { id: "stations", icon: <MapPin className="w-3.5 h-3.5" />, label: "Estaciones", value: data.stationCount.toLocaleString("es-ES") },
    { id: "routes", icon: <Route className="w-3.5 h-3.5" />, label: "Rutas", value: data.routeCount.toLocaleString("es-ES") },
    { id: "punct", icon: <Clock className="w-3.5 h-3.5" />, label: "Puntualidad 24 h", value: `${data.punctuality.toFixed(1)}%`, tone: data.punctuality >= 80 ? "positive" : data.punctuality >= 60 ? "warning" : "danger" },
    ...data.recentAlerts.map((a): TickerItem => ({
      id: `alert-${a.id}`,
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      label: a.headerText ?? a.description.slice(0, 80),
      tone: "warning",
    })),
  ];

  const hero = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 max-w-3xl">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400">
          <Train className="w-4 h-4" />
          trafico.live · Ferroviario
        </span>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 dark:text-gray-50 leading-tight">
          Trenes en tiempo real
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          Posiciones GPS de trenes Renfe, {data.stationCount.toLocaleString("es-ES")} estaciones
          y {data.routeCount.toLocaleString("es-ES")} rutas sobre red ADIF. Alertas y puntualidad
          desde GTFS-RT Renfe.
        </p>
        <div className="flex flex-wrap gap-3 mt-2">
          <ButtonLink href="/trenes/mapa" variant="primary" icon={<MapIcon className="w-4 h-4" />}>
            Abrir mapa completo
          </ButtonLink>
          <ButtonLink href="/trenes/estaciones" variant="secondary">
            Ver estaciones
          </ButtonLink>
          <ButtonLink href="/trenes/cercanias" variant="ghost">
            Redes Cercanías
          </ButtonLink>
        </div>
      </div>
      <TrenesHeroMap />
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Trenes ahora" value={data.trainsNow.toLocaleString("es-ES")} hint="snapshot Renfe" icon={Radio} accent="tl" />
      <StatCard label="Estaciones" value={data.stationCount.toLocaleString("es-ES")} hint={`${data.accessibleStations} accesibles`} icon={MapPin} accent="tl" />
      <StatCard label="Rutas" value={data.routeCount.toLocaleString("es-ES")} hint={`${data.brandCount} marcas`} icon={Route} accent="tl" />
      <StatCard label="Alertas activas" value={data.activeAlertsCount} hint="GTFS-RT" icon={AlertTriangle} accent={data.activeAlertsCount > 0 ? "tl-amber" : "tl"} />
    </div>
  );

  const sections = [
    {
      id: "analytics",
      title: "Puntualidad y flota en vivo",
      description: "Snapshots cada 2 minutos · puntualidad agregada últimas 24 h · leaderboard por marca.",
      content: <TrenesAnalytics />,
    },
    {
      id: "cercanias",
      title: "Cercanías por red",
      description: `${data.networkCount} redes Cercanías activas en España.`,
      content: (
        <RelatedLinks
          columns={3}
          title=""
          items={[
            { title: "Madrid", description: "96 estaciones · C-1 a C-10", href: "/trenes/cercanias/madrid", icon: Train },
            { title: "Barcelona (Rodalies)", description: "111 estaciones · R1-R8", href: "/trenes/cercanias/barcelona", icon: Train },
            { title: "Valencia", description: "57 estaciones · C-1 a C-6", href: "/trenes/cercanias/valencia", icon: Train },
            { title: "Bilbao + Asturias", description: "65 + 161 estaciones", href: "/trenes/cercanias/bilbao", icon: Train },
            { title: "Sevilla", description: "31 estaciones · C-1 a C-5", href: "/trenes/cercanias/sevilla", icon: Train },
            { title: "Ver las 12 redes", description: "Catálogo completo", href: "/trenes/cercanias", icon: MapIcon },
          ]}
        />
      ),
    },
    {
      id: "brands",
      title: "Marcas comerciales",
      description: `${data.brandCount} marcas operan sobre infraestructura ADIF.`,
      content: (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <div className="flex flex-wrap gap-2">
            {["AVE", "AVLO", "Alvia", "Euromed", "Intercity", "Avant", "MD", "Regional", "Cercanías", "Rodalies", "FEVE"].map((b) => (
              <span key={b} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-tl-50 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 text-xs font-semibold">
                <Trophy className="w-3 h-3" />
                {b}
              </span>
            ))}
          </div>
          <div className="mt-4">
            <ButtonLink href="/trenes/lineas" variant="primary" icon={<Route className="w-4 h-4" />}>
              Ver todas las líneas
            </ButtonLink>
          </div>
        </div>
      ),
    },
    {
      id: "accessibility",
      title: "Accesibilidad",
      description: "Estaciones con accesibilidad certificada (boarding sin barreras).",
      content: (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 flex items-center gap-4">
          <Accessibility className="w-10 h-10 text-tl-sea-500" />
          <div>
            <p className="font-data text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {data.accessibleStations.toLocaleString("es-ES")}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              estaciones con acceso PMR según GTFS wheelchair_boarding
            </p>
          </div>
        </div>
      ),
    },
  ];

  const faq = <FAQAccordion items={FAQ_ITEMS} title="Preguntas frecuentes — red ferroviaria" />;

  return (
    <>
      <StructuredData data={[placeSchema, collectionSchema]} />
      <VerticalHub
        breadcrumbs={<Breadcrumbs items={breadcrumbs} />}
        hero={hero}
        ticker={<TickerStrip items={ticker} label="Ferrocarril en vivo" />}
        stats={stats}
        sections={sections}
        faq={faq}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <RelatedLinks
          columns={3}
          items={[
            { title: "Tráfico vial", description: "Incidencias, cámaras y sensores en carretera", href: "/trafico", icon: MapPin },
            { title: "Transporte público", description: "Metro, autobús y tranvía con datos GTFS", href: "/transporte-publico", icon: MapPin },
            { title: "Aviación", description: "Aeronaves sobre el espacio aéreo y aeropuertos AENA", href: "/aviacion", icon: MapPin },
          ]}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          Fuentes: Renfe (GTFS + GTFS-RT, CC-BY 4.0), ADIF (infraestructura), Renfe visor tiempo
          real LD. Snapshots Node.js cada 2 minutos.
        </p>
      </div>
    </>
  );
}
