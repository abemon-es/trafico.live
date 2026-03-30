import { MetadataRoute } from "next";
import prisma from "@/lib/db";
import { ARTICLES } from "@/app/blog/articles";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// Shard size for paginated sitemaps
const SHARD_SIZE = 5000;

// ID ranges: 0 = core, 1-99 = gas stations, 100-199 = municipalities, 200-299 = postal codes, 300 = insights
const GAS_STATION_OFFSET = 1;
const MUNICIPALITY_OFFSET = 100;
const POSTAL_CODE_OFFSET = 200;
const INSIGHTS_OFFSET = 300;

/**
 * Generates sitemap index entries.
 * Next.js automatically creates /sitemap.xml as the index,
 * with individual sitemaps at /sitemap/{id}.xml
 */
export async function generateSitemaps() {
  try {
    const [stationCount, municipalityCount, postalCodeCount] = await Promise.all([
      prisma.gasStation.count(),
      prisma.municipality.count(),
      prisma.gasStation.findMany({
        select: { postalCode: true },
        distinct: ["postalCode"],
        where: { postalCode: { not: null } },
      }).then((r) => r.length),
    ]);

    const stationShards = Math.max(1, Math.ceil(stationCount / SHARD_SIZE));
    const municipalityShards = Math.max(1, Math.ceil(municipalityCount / SHARD_SIZE));
    const postalCodeShards = Math.max(1, Math.ceil(postalCodeCount / SHARD_SIZE));

    return [
      { id: 0 }, // Core pages
      ...Array.from({ length: stationShards }, (_, i) => ({
        id: GAS_STATION_OFFSET + i,
      })),
      ...Array.from({ length: municipalityShards }, (_, i) => ({
        id: MUNICIPALITY_OFFSET + i,
      })),
      ...Array.from({ length: postalCodeShards }, (_, i) => ({
        id: POSTAL_CODE_OFFSET + i,
      })),
      { id: INSIGHTS_OFFSET }, // Insights (single shard — low volume)
    ];
  } catch {
    return [{ id: 0 }];
  }
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  if (id === 0) return coreSitemap();
  if (id >= GAS_STATION_OFFSET && id < MUNICIPALITY_OFFSET) {
    return gasStationSitemap(id - GAS_STATION_OFFSET);
  }
  if (id >= MUNICIPALITY_OFFSET && id < POSTAL_CODE_OFFSET) {
    return municipalitySitemap(id - MUNICIPALITY_OFFSET);
  }
  if (id >= POSTAL_CODE_OFFSET && id < INSIGHTS_OFFSET) {
    return postalCodeSitemap(id - POSTAL_CODE_OFFSET);
  }
  return insightsSitemap();
}

// ---------------------------------------------------------------------------
// Core sitemap: static pages, roads, communities, cities, blog
// ---------------------------------------------------------------------------

// Per-city live traffic pages
const TRAFFIC_CITY_SLUGS = [
  "madrid", "barcelona", "valencia", "sevilla", "malaga",
  "zaragoza", "bilbao", "alicante", "murcia", "granada",
];

const ELECTROLINERAS_CITY_SLUGS = [
  "madrid", "barcelona", "valencia", "sevilla", "zaragoza",
  "malaga", "murcia", "palma", "bilbao", "alicante",
  "cordoba", "valladolid", "vigo", "gijon", "vitoria",
  "granada", "oviedo", "santander", "san-sebastian", "pamplona",
];

const ZBE_CITY_SLUGS = [
  "madrid", "barcelona", "granada", "malaga", "zaragoza",
  "sabadell", "vitoria", "valladolid", "sevilla", "valencia",
];

const CITIES = [
  "madrid", "barcelona", "valencia", "sevilla", "zaragoza",
  "malaga", "murcia", "palma", "bilbao", "alicante",
  "cordoba", "valladolid", "vigo", "gijon", "granada",
  "vitoria", "oviedo", "san-sebastian", "santander", "pamplona",
];

const BARATOS_CITY_SLUGS = [
  "madrid", "barcelona", "valencia", "sevilla", "zaragoza",
  "malaga", "murcia", "bilbao", "alicante", "cordoba",
  "valladolid", "granada", "oviedo", "santander", "pamplona",
  "san-sebastian", "vitoria", "palma", "las-palmas", "santa-cruz",
];

const CAMARAS_CITY_SLUGS = [
  "madrid", "barcelona", "valencia", "sevilla", "zaragoza",
  "malaga", "murcia", "bilbao", "alicante", "cordoba",
  "valladolid", "granada", "oviedo", "santander", "pamplona",
  "san-sebastian", "vitoria", "palma", "las-palmas", "santa-cruz",
];

const COMMUNITIES = [
  "andalucia", "aragon", "asturias", "baleares", "canarias",
  "cantabria", "castilla-la-mancha", "castilla-y-leon", "cataluna",
  "comunidad-valenciana", "extremadura", "galicia", "madrid",
  "murcia", "navarra", "pais-vasco", "la-rioja", "ceuta", "melilla",
];

async function coreSitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "hourly", priority: 1.0 },
    { url: `${BASE_URL}/carreteras`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/carreteras/autopistas`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/carreteras/autovias`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/carreteras/nacionales`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/carreteras/regionales`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/incidencias`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/incidencias/analytics`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/camaras`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/paneles`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/radares`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    // Per-road radar pages
    ...([
      "AP-7", "AP-68", "AP-1", "AP-2", "AP-4", "AP-6", "AP-9",
      "A-1", "A-2", "A-3", "A-4", "A-5", "A-6", "A-7", "A-8",
      "A-23", "A-31", "A-42", "A-44", "A-52", "A-62", "A-66", "A-92",
      "N-I", "N-II", "N-III", "N-IV", "N-V", "N-VI", "N-340",
    ].map((road) => ({
      url: `${BASE_URL}/radares/${encodeURIComponent(road)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }))),
    { url: `${BASE_URL}/estadisticas`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/historico`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/espana`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/comunidad-autonoma`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/ciudad`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/precio-gasolina-hoy`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${BASE_URL}/precio-diesel-hoy`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${BASE_URL}/gasolineras`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/gasolineras/terrestres`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/gasolineras/maritimas`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/gasolineras/cerca`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/gasolineras/precios`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/gasolineras/mapa`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/gasolineras/marcas`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/carga-ev`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${BASE_URL}/carga-ev/cerca`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/profesional`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/profesional/diesel`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/profesional/areas`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/profesional/restricciones`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/calculadora`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/cuanto-cuesta-cargar`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE_URL}/mejor-hora`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/puntos-negros`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE_URL}/ciclistas`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/municipio`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/alertas-meteo`, lastModified: now, changeFrequency: "hourly", priority: 0.85 },
    { url: `${BASE_URL}/semana-santa-2026`, lastModified: now, changeFrequency: "hourly", priority: 1.0 },
    { url: `${BASE_URL}/puente-mayo-2026`, lastModified: now, changeFrequency: "hourly", priority: 0.95 },
    { url: `${BASE_URL}/operaciones`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/restricciones`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE_URL}/gasolineras-24-horas`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/atascos`, lastModified: now, changeFrequency: "hourly", priority: 0.95 },
    { url: `${BASE_URL}/cortes-trafico`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/etiqueta-ambiental`, lastModified: now, changeFrequency: "monthly", priority: 0.95 },
    { url: `${BASE_URL}/explorar`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/explorar/infraestructura`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/api-docs`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/sobre`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/aviso-legal`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/politica-privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/politica-cookies`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/gasolineras/baratas`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];

  // City-based pages
  const cityPages = [
    ...TRAFFIC_CITY_SLUGS.map((c) => ({ url: `${BASE_URL}/trafico/${c}`, lastModified: now, changeFrequency: "hourly" as const, priority: 0.9 })),
    ...ZBE_CITY_SLUGS.map((c) => ({ url: `${BASE_URL}/zbe/${c}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.88 })),
    ...CITIES.map((c) => ({ url: `${BASE_URL}/ciudad/${c}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.75 })),
    ...CITIES.slice(0, 10).map((c) => ({ url: `${BASE_URL}/carga-ev/${c}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 })),
    ...ELECTROLINERAS_CITY_SLUGS.map((c) => ({ url: `${BASE_URL}/electrolineras/${c}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...BARATOS_CITY_SLUGS.map((c) => ({ url: `${BASE_URL}/gasolineras/baratas/${c}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.9 })),
    ...CAMARAS_CITY_SLUGS.map((c) => ({ url: `${BASE_URL}/camaras/${c}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
  ];

  // Blog articles
  const blogPages = ARTICLES.map((article) => ({
    url: `${BASE_URL}/blog/${article.slug}`,
    lastModified: new Date(article.date),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Dynamic road pages
  const roads = await prisma.road.findMany({
    select: { id: true, type: true },
    orderBy: { id: "asc" },
  });

  const roadPages: MetadataRoute.Sitemap = roads.flatMap((road) => {
    const isMainRoad = ["AUTOPISTA", "AUTOVIA", "NACIONAL"].includes(road.type);
    const priority = road.type === "AUTOPISTA" ? 0.85 : road.type === "AUTOVIA" ? 0.8 : road.type === "NACIONAL" ? 0.75 : 0.6;

    const pages: MetadataRoute.Sitemap = [
      {
        url: `${BASE_URL}/carreteras/${encodeURIComponent(road.id)}`,
        lastModified: now,
        changeFrequency: isMainRoad ? "daily" : "weekly",
        priority,
      },
    ];

    if (isMainRoad) {
      const subPriority = Number((priority - 0.1).toFixed(1));
      pages.push(
        {
          url: `${BASE_URL}/carreteras/${encodeURIComponent(road.id)}/camaras`,
          lastModified: now,
          changeFrequency: "daily",
          priority: subPriority,
        },
        {
          url: `${BASE_URL}/carreteras/${encodeURIComponent(road.id)}/radares`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: subPriority,
        },
        {
          url: `${BASE_URL}/carreteras/${encodeURIComponent(road.id)}/estadisticas`,
          lastModified: now,
          changeFrequency: "daily",
          priority: subPriority,
        }
      );
    }
    return pages;
  });

  // Province pages (from camera data)
  const provinces = await prisma.camera.findMany({
    select: { province: true },
    distinct: ["province"],
  });

  const provincePages = provinces
    .filter((p) => p.province)
    .map((p) => ({
      url: `${BASE_URL}/provincias/${encodeURIComponent(p.province!)}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.75,
    }));

  // Community pages
  const communityPages = COMMUNITIES.map((community) => ({
    url: `${BASE_URL}/comunidad-autonoma/${community}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...cityPages,
    ...blogPages,
    ...roadPages,
    ...provincePages,
    ...communityPages,
  ];
}

// ---------------------------------------------------------------------------
// Gas station sitemap shards — uses lastPriceUpdate for fresh lastModified
// ---------------------------------------------------------------------------

async function gasStationSitemap(
  shardIndex: number
): Promise<MetadataRoute.Sitemap> {
  try {
    const stations = await prisma.gasStation.findMany({
      skip: shardIndex * SHARD_SIZE,
      take: SHARD_SIZE,
      select: { id: true, lastPriceUpdate: true },
      orderBy: { id: "asc" },
    });

    return stations.map((station) => ({
      url: `${BASE_URL}/gasolineras/terrestres/${station.id}`,
      lastModified: station.lastPriceUpdate ?? new Date(),
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Municipality sitemap shards
// ---------------------------------------------------------------------------

async function municipalitySitemap(
  shardIndex: number
): Promise<MetadataRoute.Sitemap> {
  try {
    const municipalities = await prisma.municipality.findMany({
      skip: shardIndex * SHARD_SIZE,
      take: SHARD_SIZE,
      select: { slug: true },
      orderBy: { slug: "asc" },
    });

    return municipalities.map((m) => ({
      url: `${BASE_URL}/municipio/${m.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Postal code sitemap shards
// ---------------------------------------------------------------------------

async function postalCodeSitemap(
  shardIndex: number
): Promise<MetadataRoute.Sitemap> {
  try {
    const postalCodes = await prisma.gasStation.findMany({
      select: { postalCode: true },
      distinct: ["postalCode"],
      where: { postalCode: { not: null } },
      skip: shardIndex * SHARD_SIZE,
      take: SHARD_SIZE,
      orderBy: { postalCode: "asc" },
    });

    return postalCodes
      .filter((p) => p.postalCode)
      .map((p) => ({
        url: `${BASE_URL}/codigo-postal/${p.postalCode}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.45,
      }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Insights sitemap
// ---------------------------------------------------------------------------

async function insightsSitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const insights = await prisma.insight.findMany({
      select: { slug: true, publishedAt: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
      take: SHARD_SIZE,
    });

    return [
      {
        url: `${BASE_URL}/insights`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.7,
      },
      ...insights.map((i) => ({
        url: `${BASE_URL}/insights/${i.slug}`,
        lastModified: i.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return [];
  }
}
