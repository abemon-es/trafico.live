import type { Metadata } from "next";
import {
  Bus,
  Train,
  MapPin,
  Route,
  Map as MapIcon,
  Building2,
  TrainFront,
  Cable,
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
import { TransporteHeroMap } from "./TransporteHeroMap";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Transporte Público en España — Metro, bus, tranvía (GTFS)",
  description:
    "15+ operadores de metro, autobús, tranvía y funicular con rutas, paradas y horarios GTFS: Metro Madrid, TMB, Metro Bilbao, FGC, EMT, TUSSAM, Ouigo…",
  alternates: { canonical: `${BASE_URL}/transporte-publico` },
  openGraph: {
    title: "Transporte Público en España",
    description: "Metro, autobús, tranvía y funicular con datos GTFS oficiales.",
    url: `${BASE_URL}/transporte-publico`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

async function getHubData() {
  const [
    totalOperators,
    totalStops,
    totalRoutes,
    metroLines,
    busLines,
    tramLines,
    topOperators,
    modeGroups,
  ] = await Promise.all([
    prisma.transitOperator.count(),
    prisma.transitStop.count(),
    prisma.transitRoute.count(),
    prisma.transitRoute.count({ where: { routeType: 1 } }),
    prisma.transitRoute.count({ where: { routeType: 3 } }),
    prisma.transitRoute.count({ where: { routeType: 0 } }),
    prisma.transitOperator.findMany({
      orderBy: { name: "asc" },
      take: 12,
      select: { id: true, name: true, city: true, mode: true },
    }),
    prisma.transitOperator.groupBy({ by: ["mode"], _count: true }),
  ]);

  return {
    totalOperators,
    totalStops,
    totalRoutes,
    metroLines,
    busLines,
    tramLines,
    topOperators,
    modeGroups,
  };
}

const FAQ_ITEMS = [
  {
    question: "¿Qué operadores de transporte público están cubiertos?",
    answer:
      "Integramos 15+ feeds GTFS oficiales gestionados a través de MobilityData: Metro Madrid, EMT Madrid, TMB (Metro y Bus de Barcelona), Metro Bilbao, FGC, Euskotren, TUSSAM (Sevilla), EMT Málaga, EMT Valencia, Ouigo, FEVE-Cercanías y los principales operadores de tranvía.",
  },
  {
    question: "¿Los horarios son oficiales?",
    answer:
      "Sí. Usamos exclusivamente los feeds GTFS publicados por los propios operadores o por MobilityData, que los sincroniza de la fuente oficial. Mostramos la fecha de última sincronización por operador; las desviaciones frente al horario publicado se señalan si el operador expone un feed GTFS-RT.",
  },
  {
    question: "¿Hay datos en tiempo real de autobuses o metros?",
    answer:
      "Depende del operador. Metro Madrid, FGC y TMB publican GTFS-RT con posiciones y alertas; el resto solo emite horarios estáticos. Cuando existe feed en vivo, el mapa muestra vehículos con actualización de 30–60 s.",
  },
  {
    question: "¿Puedo planificar un trayecto entre ciudades?",
    answer:
      "Todavía no ofrecemos routing multi-modal (metro + bus + ferry). Mostramos los catálogos por operador y planeamos abrir un endpoint de routing público en los próximos meses. Mientras tanto consulta cada operador desde /transporte-publico.",
  },
  {
    question: "¿Qué diferencia hay con las apps oficiales de cada operador?",
    answer:
      "Las apps oficiales tienen más funcionalidades (compra de billetes, alertas push, datos en vivo propietarios). trafico.live es un agregador SEO-friendly con datos GTFS normalizados y geocodificados para comparar y descubrir operadores por ciudad.",
  },
];

export default async function TransportePublicoHubPage() {
  const data = await getHubData();

  const breadcrumbs = [{ name: "Transporte público", href: "/transporte-publico" }];

  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: "Red de transporte público de España",
    description:
      "Operadores urbanos e interurbanos de metro, autobús, tranvía y funicular en España.",
    url: `${BASE_URL}/transporte-publico`,
    geo: { "@type": "GeoShape", box: "35.9 -9.3 43.8 4.3" },
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Transporte Público en España",
    url: `${BASE_URL}/transporte-publico`,
    inLanguage: "es",
    about: { "@type": "Place", name: "España" },
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
  };

  const ticker: TickerItem[] = [
    { id: "ops", icon: <Building2 className="w-3.5 h-3.5" />, label: "Operadores", value: data.totalOperators },
    { id: "stops", icon: <MapPin className="w-3.5 h-3.5" />, label: "Paradas", value: data.totalStops.toLocaleString("es-ES") },
    { id: "routes", icon: <Route className="w-3.5 h-3.5" />, label: "Rutas", value: data.totalRoutes.toLocaleString("es-ES") },
    { id: "metro", icon: <TrainFront className="w-3.5 h-3.5" />, label: "Líneas de metro", value: data.metroLines },
    { id: "bus", icon: <Bus className="w-3.5 h-3.5" />, label: "Líneas de autobús", value: data.busLines },
    { id: "tram", icon: <Cable className="w-3.5 h-3.5" />, label: "Líneas de tranvía", value: data.tramLines },
  ];

  const hero = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 max-w-3xl">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400">
          <Bus className="w-4 h-4" />
          trafico.live · Transporte público
        </span>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 dark:text-gray-50 leading-tight">
          Metro, autobús y tranvía en España
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          {data.totalOperators} operadores GTFS con {data.totalRoutes.toLocaleString("es-ES")} rutas
          y {data.totalStops.toLocaleString("es-ES")} paradas. Metro Madrid, TMB, Metro Bilbao,
          FGC, Euskotren, EMT, TUSSAM…
        </p>
        <div className="flex flex-wrap gap-3 mt-2">
          <ButtonLink href="/transporte-publico/mapa" variant="primary" icon={<MapIcon className="w-4 h-4" />}>
            Mapa de operadores
          </ButtonLink>
          <ButtonLink href="/transporte-publico#operadores" variant="secondary">
            Ver lista
          </ButtonLink>
        </div>
      </div>
      <TransporteHeroMap />
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Operadores" value={data.totalOperators} hint="GTFS oficiales" icon={Building2} accent="tl" />
      <StatCard label="Líneas metro" value={data.metroLines} hint="routeType 1" icon={TrainFront} accent="tl" />
      <StatCard label="Líneas bus" value={data.busLines.toLocaleString("es-ES")} hint="routeType 3" icon={Bus} accent="tl" />
      <StatCard label="Paradas totales" value={data.totalStops.toLocaleString("es-ES")} hint="GTFS stops" icon={MapPin} accent="tl" />
    </div>
  );

  const sections = [
    {
      id: "operadores",
      title: "Principales operadores",
      description: "Selección de operadores destacados. Consulta el detalle de rutas y paradas por operador.",
      content: (
        <RelatedLinks
          columns={3}
          title=""
          items={data.topOperators.map((op) => ({
            title: op.name,
            description: [op.mode, op.city].filter(Boolean).join(" · "),
            href: `/transporte-publico/${op.id}`,
            icon: op.mode === "rail" || op.mode === "metro" ? Train : op.mode === "tram" ? Cable : Bus,
          }))}
        />
      ),
    },
    {
      id: "modos",
      title: "Distribución por modo",
      description: "Desglose de operadores por tipo de servicio.",
      content: (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {data.modeGroups.map((m) => (
            <div
              key={m.mode}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {m.mode}
              </p>
              <p className="mt-1 text-2xl font-data font-semibold text-gray-900 dark:text-gray-100">
                {m._count}
              </p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "gtfs",
      title: "Datos GTFS",
      description: "Archivos GTFS sincronizados semanalmente desde MobilityData.",
      content: (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Los feeds se validan con gtfs-validator antes de la importación. Los operadores con
            GTFS-RT (Metro Madrid, FGC, TMB) publican posiciones en vivo cada 30–60 s.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href="/transporte-publico/mapa" variant="primary">
              Explorar el mapa
            </ButtonLink>
            <ButtonLink href="/estadisticas-transporte" variant="ghost">
              Estadísticas modales
            </ButtonLink>
          </div>
        </div>
      ),
    },
  ];

  const faq = <FAQAccordion items={FAQ_ITEMS} title="Preguntas frecuentes — transporte público" />;

  return (
    <>
      <StructuredData data={[placeSchema, collectionSchema]} />
      <VerticalHub
        breadcrumbs={<Breadcrumbs items={breadcrumbs} />}
        hero={hero}
        ticker={<TickerStrip items={ticker} label="Datos GTFS" />}
        stats={stats}
        sections={sections}
        faq={faq}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <RelatedLinks
          columns={3}
          items={[
            { title: "Red ferroviaria", description: "Trenes Renfe en vivo y alertas GTFS-RT", href: "/trenes", icon: Train },
            { title: "Tráfico vial", description: "Incidencias, cámaras y obras", href: "/trafico", icon: MapPin },
            { title: "Aviación", description: "Vuelos y aeropuertos AENA", href: "/aviacion", icon: MapPin },
          ]}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          Fuentes: MobilityData (GTFS), operadores oficiales (GTFS-RT), INE (estadísticas modales).
        </p>
      </div>
    </>
  );
}
