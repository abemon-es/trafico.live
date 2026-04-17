import type { Metadata } from "next";
import Link from "next/link";
import {
  Anchor,
  Ship,
  Waves,
  Fuel,
  MapPin,
  AlertTriangle,
  Navigation,
  Radio,
  Compass,
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
import { MaritimoHeroMap } from "./MaritimoHeroMap";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Tráfico Marítimo España — AIS en vivo, puertos y ferries",
  description:
    "Posiciones AIS de buques en tiempo real, puertos del Estado, rutas de ferries, combustible náutico y alertas costeras AEMET. Datos oficiales actualizados.",
  alternates: { canonical: `${BASE_URL}/maritimo` },
  openGraph: {
    title: "Tráfico Marítimo España — AIS en vivo, puertos y ferries",
    description:
      "Posiciones AIS, puertos, ferries, combustible náutico y alertas costeras.",
    url: `${BASE_URL}/maritimo`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

async function getHubData() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    vesselsActive,
    portsOperational,
    ferryRoutes,
    maritimeStations,
    coastalAlerts,
    recentAlerts,
    cheapestFuel,
  ] = await Promise.all([
    prisma.vesselPosition.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
      distinct: ["mmsi"],
      select: { mmsi: true },
    }).then((r) => r.length),
    prisma.spanishPort.count(),
    prisma.ferryRoute.count(),
    prisma.maritimeStation.count(),
    prisma.weatherAlert.count({ where: { type: "COASTAL", isActive: true } }),
    prisma.weatherAlert.findMany({
      where: { type: "COASTAL", isActive: true },
      orderBy: [{ severity: "desc" }, { startedAt: "desc" }],
      take: 5,
      select: { id: true, severity: true, provinceName: true, province: true, description: true, startedAt: true },
    }),
    prisma.maritimeStation.findMany({
      where: { priceGasoleoA: { not: null } },
      orderBy: { priceGasoleoA: "asc" },
      take: 5,
      select: { id: true, name: true, port: true, provinceName: true, priceGasoleoA: true },
    }),
  ]);

  return {
    vesselsActive,
    portsOperational,
    ferryRoutes,
    maritimeStations,
    coastalAlerts,
    recentAlerts,
    cheapestFuel,
    since24h,
  };
}

const FAQ_ITEMS = [
  {
    question: "¿Qué es el sistema AIS?",
    answer:
      "El AIS (Automatic Identification System) es un sistema obligatorio en buques mayores de 300 TRB en viajes internacionales y en todos los buques de pasaje. Cada barco emite por VHF su identificador MMSI, posición, rumbo y velocidad, permitiendo su seguimiento en tiempo real. trafico.live recibe estas emisiones vía aisstream.io bajo licencia CC-BY.",
  },
  {
    question: "¿Por qué no veo todos los barcos en el mapa?",
    answer:
      "No todos los buques emiten AIS: embarcaciones pequeñas, deportivas o militares pueden estar exentas o apagarlo voluntariamente. Además, la cobertura costera depende de receptores terrestres y satélite; zonas alejadas pueden tener actualizaciones más espaciadas. Mostramos únicamente las posiciones recibidas en las últimas horas.",
  },
  {
    question: "¿Con qué frecuencia se actualizan los datos marítimos?",
    answer:
      "Las posiciones AIS se reciben de forma continua vía WebSocket (varios miles por minuto). Los puertos, rutas de ferries y catálogos GTFS se sincronizan a diario. Los precios de combustible náutico del MITERD se actualizan cada 24 horas y las alertas costeras AEMET cada 5 minutos.",
  },
  {
    question: "¿Qué cubre la red de puertos del Estado?",
    answer:
      "España cuenta con 46 puertos de interés general gestionados por Puertos del Estado, más decenas de puertos autonómicos deportivos y pesqueros. El catálogo de trafico.live integra los 46 estatales (WFS INSPIRE) y añade puertos de recreo derivados del catálogo AENA.",
  },
  {
    question: "¿Puedo consultar ferries y horarios?",
    answer:
      "Sí. Integramos los GTFS de Fred. Olsen, Baleària y Vizcaya, con rutas, escalas y horarios oficiales. Para rutas internacionales no cubiertas por GTFS mostramos el catálogo estático de travesías comerciales. Consulta /maritimo/ferries para el detalle.",
  },
];

export default async function MaritimoHubPage() {
  const data = await getHubData();

  const breadcrumbs = [{ name: "Marítimo", href: "/maritimo" }];

  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: "Litoral y puertos de España",
    description: "Aguas jurisdiccionales españolas, red de puertos del Estado y principales rutas de ferry.",
    geo: { "@type": "GeoShape", box: "35.0 -10.0 44.0 5.0" },
    url: `${BASE_URL}/maritimo`,
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Tráfico Marítimo España",
    url: `${BASE_URL}/maritimo`,
    inLanguage: "es",
    about: { "@type": "Place", name: "España" },
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
  };

  const ticker: TickerItem[] = [
    { id: "vessels", icon: <Ship className="w-3.5 h-3.5" />, label: "Buques AIS última hora", value: data.vesselsActive.toLocaleString("es-ES") },
    { id: "ports", icon: <Anchor className="w-3.5 h-3.5" />, label: "Puertos del Estado", value: data.portsOperational },
    { id: "ferries", icon: <Navigation className="w-3.5 h-3.5" />, label: "Rutas de ferry", value: data.ferryRoutes },
    { id: "stations", icon: <Fuel className="w-3.5 h-3.5" />, label: "Estaciones náuticas", value: data.maritimeStations.toLocaleString("es-ES") },
    ...data.recentAlerts.map((a) => ({
      id: `alert-${a.id}`,
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      label: `Alerta costera · ${a.provinceName ?? a.province}`,
      tone: (a.severity === "HIGH" ? "danger" : a.severity === "MEDIUM" ? "warning" : "default") as TickerItem["tone"],
    })),
  ];

  const hero = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 max-w-3xl">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-tl-sea-600 dark:text-tl-sea-400">
          <Anchor className="w-4 h-4" />
          trafico.live · Marítimo
        </span>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 dark:text-gray-50 leading-tight">
          Tráfico marítimo en España
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          Posiciones AIS en directo, red de puertos del Estado, rutas de ferries y
          combustible náutico. Alertas costeras AEMET actualizadas cada 5 minutos.
        </p>
        <div className="flex flex-wrap gap-3 mt-2">
          <ButtonLink href="/maritimo/mapa" variant="primary" icon={<Navigation className="w-4 h-4" />}>
            Abrir mapa completo
          </ButtonLink>
          <ButtonLink href="/maritimo/puertos" variant="secondary">
            Ver puertos
          </ButtonLink>
          <ButtonLink href="/maritimo/ferries" variant="ghost">
            Rutas de ferry
          </ButtonLink>
        </div>
      </div>
      <div className="h-[500px] md:h-[600px] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
        <MaritimoHeroMap />
      </div>
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Buques activos" value={data.vesselsActive.toLocaleString("es-ES")} hint="última hora" icon={Ship} accent="tl-sea" />
      <StatCard label="Puertos" value={data.portsOperational} hint="del Estado" icon={Anchor} accent="tl-sea" />
      <StatCard label="Rutas de ferry" value={data.ferryRoutes} hint="activas" icon={Navigation} accent="tl-sea" />
      <StatCard label="Alertas costeras" value={data.coastalAlerts} hint="AEMET ahora" icon={AlertTriangle} accent={data.coastalAlerts > 0 ? "tl-amber" : "tl-sea"} />
    </div>
  );

  const sections = [
    {
      id: "buques",
      title: "Buques en tiempo real",
      description: "Posiciones AIS en aguas españolas, actualizadas de forma continua vía aisstream.io.",
      content: (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <Radio className="w-4 h-4 text-signal-green animate-pulse" />
            <span>
              <span className="font-data font-semibold">{data.vesselsActive.toLocaleString("es-ES")}</span>{" "}
              buques recibidos en la última hora
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href="/barcos" variant="secondary">Tracker live</ButtonLink>
            <ButtonLink href="/maritimo/mapa" variant="ghost">Abrir en mapa</ButtonLink>
          </div>
        </div>
      ),
    },
    {
      id: "ferries",
      title: "Ferries y travesías",
      description: "Rutas GTFS de Fred. Olsen, Baleària y Vizcaya, con escalas y horarios oficiales.",
      content: (
        <RelatedLinks
          columns={3}
          title=""
          items={[
            { title: "Fred. Olsen Express", description: "Canarias · rápidos interinsulares", href: "/maritimo/ferries", icon: Ship },
            { title: "Baleària", description: "Baleares, Ceuta y Algeria", href: "/maritimo/ferries", icon: Ship },
            { title: "Naviera Armas", description: "Canarias y norte de África", href: "/maritimo/ferries", icon: Ship },
          ]}
        />
      ),
    },
    {
      id: "puertos",
      title: "Puertos del Estado",
      description: `Catálogo INSPIRE de ${data.portsOperational} puertos de interés general.`,
      content: (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Geometría oficial de muelles, dársenas y zonas portuarias importada desde el WFS
            de Puertos del Estado, con las 28 Autoridades Portuarias que gestionan la red.
          </p>
          <div className="mt-4">
            <ButtonLink href="/maritimo/puertos" variant="primary" icon={<Anchor className="w-4 h-4" />}>
              Ver directorio de puertos
            </ButtonLink>
          </div>
        </div>
      ),
    },
    {
      id: "combustible",
      title: "Combustible marítimo",
      description: "Precios diarios del MITERD en estaciones náuticas: gasóleo A, gasóleo B y gasolina 95.",
      content:
        data.cheapestFuel.length > 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            {data.cheapestFuel.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                <span className="w-7 h-7 rounded-full bg-tl-sea-100 dark:bg-tl-sea-900/30 text-tl-sea-700 dark:text-tl-sea-300 font-data font-bold text-sm inline-flex items-center justify-center">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{s.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {s.port ? `${s.port} · ${s.provinceName ?? ""}` : s.provinceName ?? "—"}
                  </div>
                </div>
                <div className="text-right font-data font-semibold text-tl-sea-700 dark:text-tl-sea-300">
                  {s.priceGasoleoA ? `${Number(s.priceGasoleoA).toFixed(3)} €` : "—"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Sin datos de precios disponibles.</p>
        ),
    },
    {
      id: "calidad-mar",
      title: "Meteorología y calidad del mar",
      description: "Alertas costeras AEMET, oleaje, viento y temperatura superficial del agua.",
      content: (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-tl-sea-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-data font-semibold">{data.coastalAlerts}</span> alertas costeras activas
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-tl-sea-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">AEMET · MITERD</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href="/maritimo/meteorologia" variant="primary">Meteorología marítima</ButtonLink>
            <ButtonLink href="/maritimo/seguridad" variant="ghost">SASEMAR</ButtonLink>
          </div>
        </div>
      ),
    },
  ];

  const faq = <FAQAccordion items={FAQ_ITEMS} title="Preguntas frecuentes — tráfico marítimo" />;

  return (
    <>
      <StructuredData data={[placeSchema, collectionSchema]} />
      <VerticalHub
        breadcrumbs={<Breadcrumbs items={breadcrumbs} />}
        hero={hero}
        ticker={<TickerStrip items={ticker} label="Datos marítimos en vivo" />}
        stats={stats}
        sections={sections}
        faq={faq}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <RelatedLinks
          columns={3}
          items={[
            { title: "Aviación en España", description: "Aeronaves sobre el espacio aéreo y aeropuertos AENA", href: "/aviacion", icon: MapPin },
            { title: "Red ferroviaria", description: "Trenes en vivo, estaciones y líneas de Cercanías/AVE", href: "/trenes", icon: MapPin },
            { title: "Transporte público", description: "Metro, autobús y tranvía con datos GTFS", href: "/transporte-publico", icon: MapPin },
          ]}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6 flex items-center gap-1.5">
          <Waves className="w-3 h-3" />
          Fuentes: aisstream.io (AIS, CC-BY), Puertos del Estado (WFS INSPIRE), MITERD (combustible), AEMET (alertas costeras), MobilityData (ferries GTFS).
        </p>
      </div>
    </>
  );
}
