import { Metadata } from "next";
import Link from "next/link";
import { Activity, AlertTriangle, Anchor, Ban, BarChart3, Bus, Camera, Cloud, Fuel, Map, MapPin, Newspaper, Plane, Radar, Route, Train, Wind, Zap } from "lucide-react";
import prisma from "@/lib/db";
import { HomeClient } from "./HomeClient";
import {
  StructuredData,
  generateDatasetSchema,
  generateBreadcrumbSchema,
  generateServiceSchema,
  generateSpeakableSchema,
  generateItemListSchema,
  generateFAQSchema,
} from "@/components/seo/StructuredData";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Tráfico en Tiempo Real en España — Mapa, Incidencias, Cámaras DGT",
  description:
    "Consulta el estado del tráfico en España ahora: incidencias activas, cámaras DGT en directo, radares de velocidad, precios de combustible y cargadores eléctricos. Datos oficiales actualizados cada 60 segundos.",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: "trafico.live — Tráfico España en Tiempo Real",
    description:
      "Mapa interactivo del tráfico español: incidencias, cámaras, radares, combustible y cargadores EV. Datos oficiales DGT.",
    url: BASE_URL,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

const SECTION_LINKS = [
  { href: "/trafico", label: "Tráfico por ciudad", Icon: Activity },
  { href: "/incidencias", label: "Incidencias activas", Icon: AlertTriangle },
  { href: "/camaras", label: "Cámaras DGT", Icon: Camera },
  { href: "/radares", label: "Radares de velocidad", Icon: Radar },
  { href: "/gasolineras", label: "Gasolineras", Icon: Fuel },
  { href: "/carreteras", label: "Carreteras", Icon: Route },
  { href: "/carga-ev", label: "Cargadores EV", Icon: Zap },
  { href: "/noticias", label: "Noticias", Icon: Newspaper },
  { href: "/zbe", label: "Zonas de Bajas Emisiones", Icon: Ban },
  { href: "/electrolineras", label: "Electrolineras", Icon: Zap },
  { href: "/maritimo", label: "Marítimo", Icon: Anchor },
  { href: "/estadisticas", label: "Estadísticas", Icon: BarChart3 },
  { href: "/mapa", label: "Mapa en vivo", Icon: Map },
  { href: "/alertas-meteo", label: "Alertas meteorológicas", Icon: Cloud },
  { href: "/intensidad", label: "Intensidad de tráfico", Icon: BarChart3 },
  { href: "/estaciones-aforo", label: "Estaciones de aforo", Icon: MapPin },
  { href: "/puntos-negros", label: "Puntos negros", Icon: AlertTriangle },
  { href: "/andorra", label: "Andorra", Icon: Map },
  { href: "/portugal", label: "Portugal", Icon: Map },
  { href: "/trenes", label: "Trenes Renfe en vivo", Icon: Train },
  { href: "/aviacion", label: "Vuelos en tiempo real", Icon: Plane },
  { href: "/calidad-aire", label: "Calidad del aire", Icon: Wind },
  { href: "/transporte-publico", label: "Transporte público", Icon: Bus },
  { href: "/estadisticas-transporte", label: "Estadísticas multimodales", Icon: BarChart3 },
  { href: "/accidentes", label: "Puntos negros y accidentes", Icon: AlertTriangle },
  { href: "/clima", label: "Clima histórico", Icon: Cloud },
  { href: "/corredores", label: "Corredores de transporte", Icon: Route },
  { href: "/insights", label: "Insights de movilidad", Icon: Newspaper },
];

async function getHomeStats() {
  try {
    const [incidentCount, cameraCount, radarCount, stationCount, v16Count, chargerCount, detectorCount] =
      await Promise.all([
        prisma.trafficIncident.count({ where: { isActive: true } }),
        prisma.camera.count(),
        prisma.radar.count(),
        prisma.gasStation.count(),
        prisma.v16BeaconEvent.count({ where: { isActive: true } }),
        prisma.eVCharger.count(),
        prisma.trafficDetector.count({ where: { isActive: true } }),
      ]);
    return { incidentCount, cameraCount, radarCount, stationCount, v16Count, chargerCount, detectorCount };
  } catch {
    return { incidentCount: 0, cameraCount: 0, radarCount: 0, stationCount: 0, v16Count: 0, chargerCount: 0, detectorCount: 0 };
  }
}

async function getCommunitiesWithProvinces() {
  try {
    return await prisma.community.findMany({
      select: {
        slug: true,
        name: true,
        provinces: {
          select: { slug: true, name: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const stats = await getHomeStats();
  const communities = await getCommunitiesWithProvinces();

  const faqSchema = generateFAQSchema({
    questions: [
      {
        question: "¿Qué es trafico.live?",
        answer:
          "trafico.live es la plataforma de inteligencia multimodal más completa de España. Integra datos en tiempo real de tráfico, trenes Renfe, vuelos, barcos, calidad del aire, combustible y transporte público desde 18+ fuentes oficiales en una única plataforma.",
      },
      {
        question: "¿De dónde provienen los datos?",
        answer:
          "De 18+ fuentes oficiales: DGT (tráfico), AEMET (meteorología), Renfe (trenes GTFS + GPS), AENA (aeropuertos), MITECO (calidad del aire ICA), Ministerio de Transportes y Movilidad Sostenible, MINETUR + CNMC (combustible), INE (estadísticas), MobilityData (GTFS transporte público), OpenSky Network (aviación ADS-B), aisstream.io (barcos AIS), Puertos del Estado, más SCT Catalunya, Euskadi, Madrid Informo, Barcelona Transit, Valencia, Zaragoza, IPMA Portugal, DGEG Portugal y Mobilitat Andorra.",
      },
      {
        question: "¿Con qué frecuencia se actualizan los datos?",
        answer:
          "Depende de la fuente: barcos AIS en streaming continuo, tráfico e incidencias cada 60-120 segundos, intensidad de sensores de Madrid cada 5 minutos, aviones OpenSky cada 15 minutos, calidad del aire cada hora, combustible diario, estadísticas INE mensuales, climáticos históricos diarios.",
      },
      {
        question: "¿Qué territorios cubre?",
        answer:
          "52 provincias y 19 comunidades autónomas de España (incluyendo Ceuta, Melilla y Canarias), Portugal (meteorología IPMA + 3.000 gasolineras DGEG), Andorra (Mobilitat) y Gibraltar. Cobertura marítima en las tres fachadas (Mediterráneo, Atlántico, Cantábrico) con 197 puertos.",
      },
      {
        question: "¿Qué datos únicos ofrece trafico.live frente a otras apps?",
        answer:
          "Combinación multimodal única: 14.400 estaciones de aforo DGT con IMD histórico, GPS en directo de ~115 trenes de largo recorrido Renfe, flujos origen-destino del estudio BigData del Ministerio, microdatos per-accidente 2019-2023, precios pre-tax CNMC desde 2016, 900 estaciones AEMET desde 2019, 565 estaciones de calidad del aire MITECO, tracking AIS de barcos en tiempo real, datos GTFS de 15+ operadores de transporte público y API pública con tiers gratuito/PRO/Enterprise.",
      },
    ],
  });

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [{ name: "Inicio", url: BASE_URL }],
  });

  const serviceSchema = generateServiceSchema({
    name: "Inteligencia de tráfico y movilidad multimodal",
    description:
      "Servicio de información en tiempo real de tráfico, trenes, vuelos, barcos, calidad del aire y combustible para toda España, Portugal y Andorra.",
    url: BASE_URL,
    provider: { name: "trafico.live", url: BASE_URL },
    serviceType: "Traffic and mobility intelligence",
    areaServed: "España",
  });

  const speakableSchema = generateSpeakableSchema({
    url: BASE_URL,
    cssSelector: ["h1", ".sr-only p", ".hero-headline"],
  });

  const datasets = [
    generateDatasetSchema({
      name: "Incidencias de tráfico DGT en tiempo real",
      description:
        "Catálogo unificado de incidencias viales activas en España (DATEX II). Cobertura: autopistas, autovías y nacionales gestionadas por la DGT, más Cataluña (SCT), Euskadi y Canarias.",
      url: `${BASE_URL}/incidencias`,
      keywords: ["tráfico", "incidencias", "DATEX II", "DGT"],
      temporalCoverage: "2024-01-01/..",
      spatialCoverage: "España",
      creator: { name: "Dirección General de Tráfico", url: "https://www.dgt.es" },
      distribution: [{ encodingFormat: "application/json", contentUrl: `${BASE_URL}/api/incidents` }],
      variableMeasured: ["incidencias activas", "tipo", "severidad", "ubicación"],
    }),
    generateDatasetSchema({
      name: "Intensidad Media Diaria (IMD) de carreteras españolas",
      description:
        "14.400 estaciones de aforo con datos de Intensidad Media Diaria por tramo. Mapa Tráfico del Ministerio de Transportes.",
      url: `${BASE_URL}/intensidad`,
      keywords: ["IMD", "aforo", "intensidad tráfico"],
      temporalCoverage: "2017-01-01/..",
      spatialCoverage: "España",
      creator: {
        name: "Ministerio de Transportes y Movilidad Sostenible",
        url: "https://www.transportes.gob.es",
      },
      distribution: [{ encodingFormat: "application/json", contentUrl: `${BASE_URL}/api/trafico/imd` }],
      variableMeasured: ["IMD vehículos/día", "tipo de vía", "provincia"],
    }),
    generateDatasetSchema({
      name: "Precios de combustible España (histórico CNMC)",
      description:
        "Precios diarios provinciales de gasolina 95, 98, diésel A y diésel Premium desde 2016, incluyendo precios pre-tax (PAI).",
      url: `${BASE_URL}/gasolineras`,
      keywords: ["combustible", "gasolina", "diésel", "CNMC"],
      temporalCoverage: "2016-01-01/..",
      spatialCoverage: "España",
      creator: { name: "CNMC - MINETUR", url: "https://www.cnmc.es" },
      distribution: [
        { encodingFormat: "application/json", contentUrl: `${BASE_URL}/api/combustible/historico` },
      ],
      variableMeasured: [
        "precio gasolina 95",
        "precio gasolina 98",
        "precio diésel",
        "precio diésel Premium",
      ],
    }),
    generateDatasetSchema({
      name: "Calidad del aire ICA en España",
      description:
        "565 estaciones de calidad del aire con Índice de Calidad del Aire (ICA 1-6) y mediciones de NO2, PM10, PM2.5, O3, SO2 y CO.",
      url: `${BASE_URL}/calidad-aire`,
      keywords: ["calidad del aire", "ICA", "NO2", "PM10", "MITECO"],
      temporalCoverage: "2024-01-01/..",
      spatialCoverage: "España",
      creator: { name: "MITECO", url: "https://www.miteco.gob.es" },
      distribution: [{ encodingFormat: "application/json", contentUrl: `${BASE_URL}/api/calidad-aire` }],
      variableMeasured: ["ICA", "NO2", "PM10", "PM2.5", "O3", "SO2", "CO"],
    }),
    generateDatasetSchema({
      name: "Red ferroviaria española (Renfe)",
      description:
        "2.154 estaciones, 1.248 rutas, 14 marcas comerciales y ~115 trenes de largo recorrido con GPS en directo.",
      url: `${BASE_URL}/trenes`,
      keywords: ["Renfe", "trenes", "GTFS", "ferrocarril", "Cercanías"],
      temporalCoverage: "2024-01-01/..",
      spatialCoverage: "España",
      creator: { name: "Renfe Operadora", url: "https://www.renfe.com" },
      distribution: [
        { encodingFormat: "application/json", contentUrl: `${BASE_URL}/api/trenes/estaciones` },
      ],
      variableMeasured: ["estaciones", "rutas", "posiciones GPS", "alertas de servicio"],
    }),
  ];

  const multimodalItemList = generateItemListSchema({
    name: "Verticales de datos trafico.live",
    items: [
      { name: "Tráfico en carretera", url: `${BASE_URL}/trafico` },
      { name: "Trenes Renfe", url: `${BASE_URL}/trenes` },
      { name: "Aviación", url: `${BASE_URL}/aviacion` },
      { name: "Marítimo", url: `${BASE_URL}/maritimo` },
      { name: "Calidad del aire", url: `${BASE_URL}/calidad-aire` },
      { name: "Transporte público", url: `${BASE_URL}/transporte-publico` },
      { name: "Combustible", url: `${BASE_URL}/gasolineras` },
      { name: "Cargadores EV", url: `${BASE_URL}/carga-ev` },
    ],
    itemListOrder: "Unordered",
  });

  // Build province items: communities with provinces that have valid slugs
  const provinceItems = communities.flatMap((c) =>
    c.slug
      ? c.provinces
          .filter((p) => p.slug)
          .map((p) => ({
            name: p.name,
            url: `${BASE_URL}/espana/${c.slug}/${p.slug}`,
          }))
      : []
  );

  const provincesItemList = generateItemListSchema({
    name: "Provincias de España",
    numberOfItems: 52,
    items: provinceItems,
    itemListOrder: "Ascending",
  });

  const ccaaItems = communities
    .filter((c) => c.slug)
    .map((c) => ({
      name: c.name,
      url: `${BASE_URL}/comunidad-autonoma/${c.slug}`,
    }));

  const ccaaItemList = generateItemListSchema({
    name: "Comunidades Autónomas de España",
    numberOfItems: 19,
    items: ccaaItems,
    itemListOrder: "Ascending",
  });

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* SSR content — hidden visually, crawlable by search engines */}
      <div className="sr-only">
        <h2>Plataforma de inteligencia multimodal para España, Portugal y Andorra</h2>
        <p>
          trafico.live es la plataforma de inteligencia multimodal más completa de la Península Ibérica.
          Agrega datos oficiales en tiempo real de 18+ fuentes: DGT, AEMET, Renfe, AENA, MITECO,
          Ministerio de Transportes y Movilidad Sostenible, MINETUR, CNMC, INE, SCT Catalunya, Euskadi,
          Madrid Informo, SCT Valencia, Barcelona Transit, Zaragoza, IPMA Portugal, DGEG Portugal,
          Mobilitat Andorra, MobilityData, OpenSky, aisstream.io y Puertos del Estado.
          Cobertura: {stats.incidentCount.toLocaleString("es-ES")} incidencias, {stats.cameraCount.toLocaleString("es-ES")} cámaras,{" "}
          {stats.radarCount.toLocaleString("es-ES")} radares, {stats.stationCount.toLocaleString("es-ES")} gasolineras,{" "}
          {stats.chargerCount.toLocaleString("es-ES")} puntos de carga, 2.154 estaciones de tren, 46 aeropuertos AENA,
          565 estaciones de calidad del aire, 197 puertos y 15+ operadores de transporte público.
        </p>
        <nav aria-label="Secciones principales">
          {SECTION_LINKS.map(({ href, label }) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>
        {/* Per-entity discovery surface — every train, vessel, charger,
         *  fuel station, transit route and accident-road has its own
         *  landing page. These links anchor the entity URL pattern for
         *  crawlers and seed internal link equity into the deep pages
         *  shipped in this PR. */}
        <nav aria-label="Páginas individuales">
          <h2>Páginas por entidad</h2>
          <p>
            Cada tren en circulación, cada buque AIS, cada cargador EV, cada gasolinera y cada
            línea de transporte público tiene su propia página de aterrizaje con datos en vivo,
            historial y mapa.
          </p>
          <ul>
            <li><Link href="/trenes">Mapa de trenes en vivo</Link> → cada tren tiene página individual (ej. <Link href="/trenes/tren/03241">tren 03241</Link>) con posición, próxima parada y recorrido</li>
            <li><Link href="/trenes/estaciones">Estaciones de tren</Link> con próximas llegadas en vivo</li>
            <li><Link href="/maritimo/buques">Directorio AIS de buques</Link> + ficha por MMSI + recorrido histórico</li>
            <li><Link href="/aviacion/aeropuertos">Aeropuertos AENA</Link> con aviones cercanos en vivo</li>
            <li><Link href="/gasolineras">Gasolineras</Link> con precios + cargadores cerca + misma marca</li>
            <li><Link href="/carga-ev">Cargadores EV</Link> 12.000+ puntos con potencia, conectores y gasolineras cerca</li>
            <li><Link href="/transporte-publico">Transporte público</Link> 15 operadores con páginas por ruta y por parada</li>
            <li><Link href="/accidentes">Siniestralidad DGT</Link> con análisis por carretera (ej. <Link href="/accidentes/carretera/AP-7">AP-7</Link>, <Link href="/accidentes/carretera/A-7">A-7</Link>, <Link href="/accidentes/carretera/N-340">N-340</Link>)</li>
            <li><Link href="/calidad-aire">Calidad del aire</Link> en vivo + <Link href="/calidad-aire/prevision">previsión CAMS 5 días</Link></li>
            <li><Link href="/maritimo/seguridad/estadisticas">Estadísticas SASEMAR</Link> de rescates marítimos</li>
          </ul>
        </nav>
        <StructuredData
          data={[faqSchema, breadcrumbSchema, serviceSchema, speakableSchema, multimodalItemList, provincesItemList, ccaaItemList, ...datasets]}
        />
      </div>

      {/* Client-side interactive homepage */}
      <HomeClient initialStats={stats} />
    </div>
  );
}
