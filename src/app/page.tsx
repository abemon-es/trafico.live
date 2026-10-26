import { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/db";
import { HomeClient } from "./HomeClient";
import type { HomeArticle } from "@/components/home/counts";
import { introCopy } from "@/lib/seo/intro-copy";
import { CITY_SENSOR_WHERE, REPORTED_WHERE, VEHICLE_STOP_WHERE } from "@/lib/incident-classes";
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

// Sections nothing else on the home links visibly (header and footer
// included). They used to sit in a screen-reader-only list.
const MORE_SECTIONS = [
  { href: "/trafico", label: "Tráfico por ciudad" },
  { href: "/noticias", label: "Noticias de tráfico" },
  { href: "/estadisticas", label: "Estadísticas de tráfico" },
  { href: "/intensidad", label: "Intensidad de tráfico (IMD)" },
  { href: "/estaciones-aforo", label: "Estaciones de aforo" },
  { href: "/accidentes", label: "Siniestralidad vial" },
  { href: "/accidentes/carretera/A-7", label: "Accidentes en la A-7" },
  { href: "/accidentes/carretera/N-340", label: "Accidentes en la N-340" },
  { href: "/puntos-negros", label: "Puntos negros" },
  { href: "/zbe", label: "Zonas de Bajas Emisiones" },
  { href: "/corredores", label: "Corredores de transporte" },
  { href: "/calidad-aire", label: "Calidad del aire hoy" },
  { href: "/portugal", label: "Tráfico en Portugal" },
  { href: "/andorra", label: "Tráfico en Andorra" },
];

async function getHomeStats() {
  try {
    const [incidentCount, cameraCount, radarCount, stationCount, v16Count, chargerCount, detectorCount, portugalStationCount, lastIncident, vehicleStopCount, citySensorCount] =
      await Promise.all([
        // «Incidencias» are reported only; the other classes on their own tiles.
        prisma.trafficIncident.count({ where: { AND: [{ isActive: true }, REPORTED_WHERE] } }),
        prisma.camera.count(),
        prisma.radar.count(),
        prisma.gasStation.count(),
        prisma.v16BeaconEvent.count({ where: { isActive: true } }),
        prisma.eVCharger.count(),
        prisma.trafficDetector.count({ where: { isActive: true } }),
        prisma.portugalGasStation.count(),
        // The incident collector stamps fetchedAt on every row it reads.
        prisma.trafficIncident.aggregate({ _max: { fetchedAt: true }, where: { isActive: true } }),
        prisma.trafficIncident.count({ where: { AND: [{ isActive: true }, VEHICLE_STOP_WHERE] } }),
        prisma.trafficIncident.count({ where: { AND: [{ isActive: true }, CITY_SENSOR_WHERE] } }),
      ]);
    // Only while fresh (the incident feed is read every minute or two): a time
    // that looks current but is stale is worse than none.
    const fetched = lastIncident._max.fetchedAt;
    const lastIncidentAt = fetched && Date.now() - fetched.getTime() < 30 * 60_000 ? fetched.toISOString() : null;
    return { incidentCount, cameraCount, radarCount, stationCount, v16Count, chargerCount, detectorCount, portugalStationCount, lastIncidentAt, vehicleStopCount, citySensorCount };
  } catch {
    return { incidentCount: 0, cameraCount: 0, radarCount: 0, stationCount: 0, v16Count: 0, chargerCount: 0, detectorCount: 0, portugalStationCount: 0, lastIncidentAt: null, vehicleStopCount: 0, citySensorCount: 0 };
  }
}

/** The home's «Análisis y noticias»: the latest published, or none at all. */
async function getLatestArticles(): Promise<HomeArticle[]> {
  try {
    const rows = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 4,
      select: { slug: true, title: true, summary: true, category: true, publishedAt: true },
    });
    return rows.map((r) => ({ ...r, publishedAt: r.publishedAt.toISOString() }));
  } catch {
    return [];
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
  const [stats, articles] = await Promise.all([getHomeStats(), getLatestArticles()]);
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
    cssSelector: ["h1", "#home-fuentes", ".hero-headline"],
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
      url: `${BASE_URL}/espana/${c.slug}`,
    }));

  const ccaaItemList = generateItemListSchema({
    name: "Comunidades Autónomas de España",
    numberOfItems: 19,
    items: ccaaItems,
    itemListOrder: "Ascending",
  });

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="sr-only">
        <h2>Plataforma de inteligencia multimodal para España, Portugal y Andorra</h2>
        <StructuredData
          data={[faqSchema, breadcrumbSchema, serviceSchema, speakableSchema, multimodalItemList, provincesItemList, ccaaItemList, ...datasets]}
        />
      </div>

      {/* Client-side interactive homepage */}
      <HomeClient initialStats={stats} articles={articles} intro={introCopy("/")} />

      {/* Visible links and the sources line speakable reads; both used to sit in
          the screen-reader-only block above. */}
      <section aria-labelledby="home-more-heading" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h2 id="home-more-heading" className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
          Más en trafico.live
        </h2>
        <ul className="flex flex-wrap gap-2">
          {MORE_SECTIONS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="inline-block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:border-tl-300 dark:hover:border-tl-700 hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <p id="home-fuentes" className="mt-6 text-sm text-gray-500 dark:text-gray-400 max-w-4xl">
          Fuentes oficiales: DGT, AEMET, Renfe, AENA, MITECO, Ministerio de Transportes, MINETUR, CNMC,
          INE, SCT, Euskadi, Junta de Castilla y León, ayuntamientos de Madrid, Barcelona y Valencia,
          IPMA y DGEG (Portugal), Mobilitat Andorra, MobilityData, OpenSky, aisstream.io y Puertos del
          Estado.
          {stats.cameraCount > 0 && (
            <>
              {" "}Ahora: {stats.incidentCount.toLocaleString("es-ES")} incidencias activas,{" "}
              {stats.cameraCount.toLocaleString("es-ES")} cámaras, {stats.radarCount.toLocaleString("es-ES")} radares,{" "}
              {stats.stationCount.toLocaleString("es-ES")} gasolineras y {stats.chargerCount.toLocaleString("es-ES")} puntos de carga.
            </>
          )}
        </p>
      </section>
    </div>
  );
}
