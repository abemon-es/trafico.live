import { MetadataRoute } from "next";
import prisma from "@/lib/db";
import { PROVINCES } from "@/lib/geo/ine-codes";
import { provinceSlug } from "@/lib/geo/slugify";

// Revalidate every 60s so shards re-render with live DB data after deploy.
// (Coolify builds with DATABASE_URL='' → build-time renders are empty shells.)
// Do NOT use force-dynamic — generateSitemaps() must run at build time to
// register shard IDs.
export const revalidate = 60;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// Shard size for paginated sitemaps
const SHARD_SIZE = 5000;

// ID ranges: 0 = core, 1-99 = gas stations, 100-199 = municipalities, 200-299 = postal codes, 300 = insights
const GAS_STATION_OFFSET = 1;
const MUNICIPALITY_OFFSET = 100;
const POSTAL_CODE_OFFSET = 200;
const INSIGHTS_OFFSET = 300;
const MARITIME_OFFSET = 400;

// Fixed upper bounds used when the DB is unreachable at build time.
// These are generous overestimates — empty shards return [] gracefully.
// Gas stations: ~12,000 → 3 shards of 5000; municipalities ~8,200 → 2 shards;
// postal codes ~10,000 → 2 shards; maritime ~90 → 1 shard.
const FALLBACK_STATION_SHARDS = 3;
const FALLBACK_MUNICIPALITY_SHARDS = 2;
const FALLBACK_POSTAL_CODE_SHARDS = 2;
const FALLBACK_MARITIME_SHARDS = 1;

/**
 * Generates sitemap index entries.
 * Next.js automatically creates /sitemap.xml as the index,
 * with individual sitemaps at /sitemap/{id}.xml
 *
 * This function MUST NOT throw — it is called at build time to register routes.
 * If the DB is unavailable (e.g., build-time proxy not running), fall back to
 * a fixed set of shard IDs that cover all known data volumes.
 */
export async function generateSitemaps() {
  try {
    const [stationCount, municipalityCount, postalCodeCount, maritimeCount] = await Promise.all([
      prisma.gasStation.count(),
      prisma.municipality.count(),
      prisma.gasStation.findMany({
        select: { postalCode: true },
        distinct: ["postalCode"],
        where: { postalCode: { not: null } },
      }).then((r) => r.length),
      prisma.maritimeStation.count(),
    ]);

    // When DB proxy returns 0 (build time with DATABASE_URL=''), use fallbacks
    // so all shard routes are registered and available for ISR revalidation.
    const stationShards = stationCount > 0 ? Math.ceil(stationCount / SHARD_SIZE) : FALLBACK_STATION_SHARDS;
    const municipalityShards = municipalityCount > 0 ? Math.ceil(municipalityCount / SHARD_SIZE) : FALLBACK_MUNICIPALITY_SHARDS;
    const postalCodeShards = postalCodeCount > 0 ? Math.ceil(postalCodeCount / SHARD_SIZE) : FALLBACK_POSTAL_CODE_SHARDS;
    const maritimeShards = maritimeCount > 0 ? Math.ceil(maritimeCount / SHARD_SIZE) : FALLBACK_MARITIME_SHARDS;

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
      ...Array.from({ length: maritimeShards }, (_, i) => ({
        id: MARITIME_OFFSET + i,
      })),
    ];
  } catch {
    // DB unavailable at build time — return fixed shard IDs so the sitemap
    // index is always registered. Shards that return no data simply emit [].
    return [
      { id: 0 }, // Core pages
      ...Array.from({ length: FALLBACK_STATION_SHARDS }, (_, i) => ({
        id: GAS_STATION_OFFSET + i,
      })),
      ...Array.from({ length: FALLBACK_MUNICIPALITY_SHARDS }, (_, i) => ({
        id: MUNICIPALITY_OFFSET + i,
      })),
      ...Array.from({ length: FALLBACK_POSTAL_CODE_SHARDS }, (_, i) => ({
        id: POSTAL_CODE_OFFSET + i,
      })),
      { id: INSIGHTS_OFFSET },
      ...Array.from({ length: FALLBACK_MARITIME_SHARDS }, (_, i) => ({
        id: MARITIME_OFFSET + i,
      })),
    ];
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
  if (id === INSIGHTS_OFFSET) {
    return insightsSitemap();
  }
  if (id >= MARITIME_OFFSET) {
    return maritimeStationSitemap(id - MARITIME_OFFSET);
  }
  return [];
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

// All 52 province slugs for /estadisticas/accidentes/{province}
// Generated from PROVINCES via provinceSlug() (slugify)
const ACCIDENTES_PROVINCE_SLUGS = [
  "almeria", "cadiz", "cordoba", "granada", "huelva", "jaen", "malaga", "sevilla",
  "huesca", "teruel", "zaragoza",
  "asturias",
  "illes-balears",
  "las-palmas", "santa-cruz-de-tenerife",
  "cantabria",
  "avila", "burgos", "leon", "palencia", "salamanca", "segovia", "soria", "valladolid", "zamora",
  "albacete", "ciudad-real", "cuenca", "guadalajara", "toledo",
  "barcelona", "girona", "lleida", "tarragona",
  "alicantealacant", "castelloncastello", "valenciavalencia",
  "badajoz", "caceres",
  "a-coruna", "lugo", "ourense", "pontevedra",
  "madrid",
  "murcia",
  "navarra",
  "alavaaraba", "bizkaia", "gipuzkoa",
  "la-rioja",
  "ceuta",
  "melilla",
];

// All 52 province slugs for /gasolineras/precios/{province}
const PRICE_PROVINCE_SLUGS = [
  "alava", "albacete", "alicante", "almeria", "avila", "badajoz", "baleares",
  "barcelona", "burgos", "caceres", "cadiz", "castellon", "ciudad-real", "cordoba",
  "a-coruna", "cuenca", "girona", "granada", "guadalajara", "gipuzkoa", "huelva",
  "huesca", "jaen", "leon", "lleida", "la-rioja", "lugo", "madrid", "malaga",
  "murcia", "navarra", "ourense", "asturias", "palencia", "las-palmas", "pontevedra",
  "salamanca", "santa-cruz-de-tenerife", "cantabria", "segovia", "sevilla", "soria",
  "tarragona", "teruel", "toledo", "valencia", "valladolid", "bizkaia", "zamora",
  "zaragoza", "ceuta", "melilla",
];

// Province codes 01-52 for /gasolineras/mapa/provincia/{code}
const PROVINCE_MAP_CODES = Array.from({ length: 52 }, (_, i) => String(i + 1).padStart(2, "0"));

const MARITIME_ZONE_SLUGS = [
  "galicia",
  "cantabrico-occidental",
  "cantabrico-oriental",
  "catalano-balear",
  "valencia",
  "alboran",
  "estrecho",
  "canarias",
];

const CAMARAS_CITY_SLUGS = [
  "madrid", "barcelona", "valencia", "sevilla", "zaragoza",
  "malaga", "murcia", "bilbao", "alicante", "cordoba",
  "valladolid", "granada", "oviedo", "santander", "pamplona",
  "san-sebastian", "vitoria", "palma", "las-palmas", "santa-cruz",
];

const FUEL_TYPE_SLUGS = [
  "diesel", "gasolina-95", "gasolina-98", "glp", "gnc", "hidrogeno", "adblue",
];

const COMMUNITIES = [
  "andalucia", "aragon", "asturias", "baleares", "canarias",
  "cantabria", "castilla-la-mancha", "castilla-y-leon", "cataluna",
  "comunidad-valenciana", "extremadura", "galicia", "madrid",
  "murcia", "navarra", "pais-vasco", "la-rioja", "ceuta", "melilla",
];

async function coreSitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  // Stable date for non-realtime pages (avoids lastModified changing every request)
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "hourly", priority: 1.0 },
    { url: `${BASE_URL}/mapa`, lastModified: now, changeFrequency: "hourly", priority: 0.95 },
    { url: `${BASE_URL}/carreteras`, lastModified: today, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/carreteras/autopistas`, lastModified: today, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/carreteras/autovias`, lastModified: today, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/carreteras/nacionales`, lastModified: today, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/carreteras/regionales`, lastModified: today, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/incidencias`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/incidencias/analytics`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/camaras`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/paneles`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/trafico`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/radares`, lastModified: today, changeFrequency: "weekly", priority: 0.9 },
    // Per-road radar pages
    ...([
      "AP-7", "AP-68", "AP-1", "AP-2", "AP-4", "AP-6", "AP-9",
      "A-1", "A-2", "A-3", "A-4", "A-5", "A-6", "A-7", "A-8",
      "A-23", "A-31", "A-42", "A-44", "A-52", "A-62", "A-66", "A-92",
      "N-I", "N-II", "N-III", "N-IV", "N-V", "N-VI", "N-340",
    ].map((road) => ({
      url: `${BASE_URL}/radares/${encodeURIComponent(road)}`,
      lastModified: today,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }))),
    { url: `${BASE_URL}/estadisticas`, lastModified: today, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/estadisticas/accidentes`, lastModified: today, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/espana`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/ciudad`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/precio-gasolina-hoy`, lastModified: today, changeFrequency: "daily", priority: 0.95 },
    { url: `${BASE_URL}/precio-diesel-hoy`, lastModified: today, changeFrequency: "daily", priority: 0.95 },
    { url: `${BASE_URL}/gasolineras`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/gasolineras/terrestres`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/gasolineras/cerca`, lastModified: today, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/gasolineras/precios`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/gasolineras/mapa`, lastModified: today, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/gasolineras/marcas`, lastModified: today, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/zbe`, lastModified: today, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/electrolineras`, lastModified: today, changeFrequency: "daily", priority: 0.85 },
    { url: `${BASE_URL}/carga-ev`, lastModified: today, changeFrequency: "daily", priority: 0.85 },
    { url: `${BASE_URL}/carga-ev/cerca`, lastModified: today, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/profesional`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/profesional/diesel`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/profesional/areas`, lastModified: today, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/profesional/restricciones`, lastModified: today, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/profesional/noticias`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/calculadora`, lastModified: today, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/cuanto-cuesta-cargar`, lastModified: today, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE_URL}/mejor-hora`, lastModified: today, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/puntos-negros`, lastModified: today, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE_URL}/informe-diario`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/ciclistas`, lastModified: today, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/media`, lastModified: today, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/alertas-meteo`, lastModified: now, changeFrequency: "hourly", priority: 0.85 },
    { url: `${BASE_URL}/semana-santa-2026`, lastModified: now, changeFrequency: "hourly", priority: 1.0 },
    { url: `${BASE_URL}/puente-mayo-2026`, lastModified: now, changeFrequency: "hourly", priority: 0.95 },
    { url: `${BASE_URL}/operaciones`, lastModified: today, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/restricciones`, lastModified: today, changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE_URL}/gasolineras-24-horas`, lastModified: today, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/atascos`, lastModified: now, changeFrequency: "hourly", priority: 0.95 },
    { url: `${BASE_URL}/cortes-trafico`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/etiqueta-ambiental`, lastModified: today, changeFrequency: "monthly", priority: 0.95 },
    { url: `${BASE_URL}/estaciones-aforo`, lastModified: today, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE_URL}/intensidad`, lastModified: today, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE_URL}/explorar`, lastModified: today, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/explorar/territorios`, lastModified: today, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/explorar/carreteras`, lastModified: today, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/explorar/infraestructura`, lastModified: today, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/api-docs`, lastModified: today, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/sobre`, lastModified: today, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/aviso-legal`, lastModified: today, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/politica-privacidad`, lastModified: today, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/politica-cookies`, lastModified: today, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/noticias`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/informes`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/gasolineras/baratas`, lastModified: today, changeFrequency: "daily", priority: 0.9 },

    // Maritime section
    { url: `${BASE_URL}/maritimo`, lastModified: today, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/maritimo/combustible`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/maritimo/meteorologia`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/maritimo/puertos`, lastModified: today, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/maritimo/seguridad`, lastModified: today, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/maritimo/mapa`, lastModified: today, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/maritimo/noticias`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    // Maritime meteorology zone pages
    ...MARITIME_ZONE_SLUGS.map((zone) => ({
      url: `${BASE_URL}/maritimo/meteorologia/${zone}`,
      lastModified: today,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];

  // City-based pages
  const cityPages = [
    ...TRAFFIC_CITY_SLUGS.map((c) => ({ url: `${BASE_URL}/trafico/${c}`, lastModified: now, changeFrequency: "hourly" as const, priority: 0.9 })),
    ...ZBE_CITY_SLUGS.map((c) => ({ url: `${BASE_URL}/zbe/${c}`, lastModified: today, changeFrequency: "weekly" as const, priority: 0.88 })),
    ...CITIES.map((c) => ({ url: `${BASE_URL}/ciudad/${c}`, lastModified: today, changeFrequency: "daily" as const, priority: 0.75 })),
    ...CITIES.slice(0, 10).map((c) => ({ url: `${BASE_URL}/carga-ev/${c}`, lastModified: today, changeFrequency: "daily" as const, priority: 0.7 })),
    ...ELECTROLINERAS_CITY_SLUGS.map((c) => ({ url: `${BASE_URL}/electrolineras/${c}`, lastModified: today, changeFrequency: "daily" as const, priority: 0.8 })),
    ...BARATOS_CITY_SLUGS.map((c) => ({ url: `${BASE_URL}/gasolineras/baratas/${c}`, lastModified: today, changeFrequency: "daily" as const, priority: 0.9 })),
    ...CAMARAS_CITY_SLUGS.map((c) => ({ url: `${BASE_URL}/camaras/${c}`, lastModified: today, changeFrequency: "daily" as const, priority: 0.8 })),
    // Province fuel price pages (52 provinces)
    ...PRICE_PROVINCE_SLUGS.map((slug) => ({ url: `${BASE_URL}/gasolineras/precios/${slug}`, lastModified: today, changeFrequency: "daily" as const, priority: 0.8 })),
    // Province gas station map pages (52 provinces)
    ...PROVINCE_MAP_CODES.map((code) => ({ url: `${BASE_URL}/gasolineras/mapa/provincia/${code}`, lastModified: today, changeFrequency: "daily" as const, priority: 0.7 })),
    // Province accident statistics pages (52 provinces)
    ...ACCIDENTES_PROVINCE_SLUGS.map((slug) => ({ url: `${BASE_URL}/estadisticas/accidentes/${slug}`, lastModified: today, changeFrequency: "monthly" as const, priority: 0.6 })),
    // Fuel type pages (7 types)
    ...FUEL_TYPE_SLUGS.map((slug) => ({ url: `${BASE_URL}/gasolineras/tipo/${slug}`, lastModified: today, changeFrequency: "daily" as const, priority: 0.85 })),
    // Radar province pages (52 provinces)
    ...PROVINCES.map((p) => ({ url: `${BASE_URL}/radares/provincia/${provinceSlug(p.name)}`, lastModified: today, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];

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
        lastModified: today,
        changeFrequency: isMainRoad ? "daily" : "weekly",
        priority,
      },
    ];

    if (isMainRoad) {
      const subPriority = Number((priority - 0.1).toFixed(1));
      pages.push(
        {
          url: `${BASE_URL}/carreteras/${encodeURIComponent(road.id)}/camaras`,
          lastModified: today,
          changeFrequency: "daily",
          priority: subPriority,
        },
        {
          url: `${BASE_URL}/carreteras/${encodeURIComponent(road.id)}/radares`,
          lastModified: today,
          changeFrequency: "weekly",
          priority: subPriority,
        },
        {
          url: `${BASE_URL}/carreteras/${encodeURIComponent(road.id)}/estadisticas`,
          lastModified: today,
          changeFrequency: "daily",
          priority: subPriority,
        }
      );
    }
    return pages;
  });

  // Camera-by-road pages (from camera data)
  const cameraRoads = await prisma.camera.groupBy({
    by: ["roadNumber"],
    where: { isActive: true, roadNumber: { not: null } },
    _count: true,
    orderBy: { _count: { roadNumber: "desc" } },
  });

  const cameraRoadPages: MetadataRoute.Sitemap = cameraRoads
    .filter((r) => r.roadNumber && r._count >= 2)
    .map((r) => ({
      url: `${BASE_URL}/camaras/carretera/${encodeURIComponent(r.roadNumber!)}`,
      lastModified: today,
      changeFrequency: "daily" as const,
      priority: 0.75,
    }));

  // Province pages (from camera data)
  const provinces = await prisma.camera.findMany({
    select: { province: true },
    distinct: ["province"],
  });

  const provincePages = provinces
    .filter((p) => p.province)
    .map((p) => ({
      url: `${BASE_URL}/provincias/${encodeURIComponent(p.province!)}`,
      lastModified: today,
      changeFrequency: "daily" as const,
      priority: 0.75,
    }));

  // Community pages
  const communityPages = COMMUNITIES.map((community) => ({
    url: `${BASE_URL}/comunidad-autonoma/${community}`,
    lastModified: today,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  // Maritime port detail pages — unique port names from maritimeStation
  let maritimePortPages: MetadataRoute.Sitemap = [];
  try {
    const uniquePorts = await prisma.maritimeStation.findMany({
      select: { port: true },
      distinct: ["port"],
      where: { port: { not: null } },
      orderBy: { port: "asc" },
    });
    maritimePortPages = uniquePorts
      .filter((p) => p.port)
      .map((p) => ({
        url: `${BASE_URL}/maritimo/puertos/${encodeURIComponent(
          p.port!
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
        )}`,
        lastModified: today,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
  } catch {
    // DB unavailable — skip dynamic port pages
  }

  return [
    ...staticPages,
    ...cityPages,
    ...roadPages,
    ...cameraRoadPages,
    ...provincePages,
    ...communityPages,
    ...maritimePortPages,
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

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return municipalities.map((m) => ({
      url: `${BASE_URL}/municipio/${m.slug}`,
      lastModified: today,
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

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return postalCodes
      .filter((p) => p.postalCode)
      .map((p) => ({
        url: `${BASE_URL}/codigo-postal/${p.postalCode}`,
        lastModified: today,
        changeFrequency: "weekly" as const,
        priority: 0.45,
      }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Maritime station sitemap shards
// ---------------------------------------------------------------------------

async function maritimeStationSitemap(
  shardIndex: number
): Promise<MetadataRoute.Sitemap> {
  try {
    const stations = await prisma.maritimeStation.findMany({
      skip: shardIndex * SHARD_SIZE,
      take: SHARD_SIZE,
      select: { id: true },
      orderBy: { id: "asc" },
    });

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return stations.map((station) => ({
      url: `${BASE_URL}/gasolineras/maritimas/${station.id}`,
      lastModified: today,
      changeFrequency: "daily" as const,
      priority: 0.5,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Noticias sitemap (articles + tags)
// ---------------------------------------------------------------------------

async function insightsSitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [articles, tags, provinces, roads] = await Promise.all([
      prisma.article.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true, isAutoGenerated: true, category: true },
        orderBy: { publishedAt: "desc" },
        take: SHARD_SIZE,
      }),
      prisma.tag.findMany({
        select: { slug: true },
        where: { articles: { some: {} } },
      }),
      prisma.province.findMany({ select: { slug: true } }),
      prisma.trafficFlow.findMany({
        select: { roadNumber: true },
        distinct: ["roadNumber"],
      }),
    ]);

    // Evergreen categories get higher priority
    const evergreenCategories = new Set(["ANNUAL_REPORT", "ROAD_ANALYSIS", "MONTHLY_REPORT"]);

    return [
      {
        url: `${BASE_URL}/noticias`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.8,
      },
      ...articles.map((a) => ({
        url: `${BASE_URL}/noticias/${a.slug}`,
        lastModified: a.updatedAt,
        changeFrequency: (evergreenCategories.has(a.category) ? "monthly" : a.isAutoGenerated ? "daily" : "weekly") as "daily" | "weekly" | "monthly",
        priority: evergreenCategories.has(a.category) ? 0.8 : a.isAutoGenerated ? 0.6 : 0.7,
      })),
      ...tags.map((t: { slug: string }) => ({
        url: `${BASE_URL}/noticias/tag/${t.slug}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.5,
      })),
      // Evergreen analysis pages: accident history per province
      ...provinces.map((p) => ({
        url: `${BASE_URL}/analisis/accidentes/${p.slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
      // Evergreen analysis pages: road IMD
      ...roads.map((r) => ({
        url: `${BASE_URL}/analisis/carreteras/${r.roadNumber.toLowerCase()}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return [];
  }
}
