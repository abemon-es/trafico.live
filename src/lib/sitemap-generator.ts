import prisma from "@/lib/db";
import { PROVINCES } from "@/lib/geo/ine-codes";
import { provinceSlug } from "@/lib/geo/slugify";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// Shard size for paginated sitemaps
const SHARD_SIZE = 5000;

// ID ranges: 0 = core, 1-99 = gas stations, 100-199 = municipalities, 200-299 = postal codes,
// 300 = insights, 400-499 = maritime, 500-599 = radars, 600-699 = cameras, 700-799 = EV chargers
const GAS_STATION_OFFSET = 1;
const MUNICIPALITY_OFFSET = 100;
const POSTAL_CODE_OFFSET = 200;
const INSIGHTS_OFFSET = 300;
const MARITIME_OFFSET = 400;
const RADAR_OFFSET = 500;
const CAMERA_OFFSET = 600;
const CHARGER_OFFSET = 700;

// Fixed upper bounds — generous overestimates, empty shards return [] gracefully.
const FALLBACK_STATION_SHARDS = 3;
const FALLBACK_MUNICIPALITY_SHARDS = 3;
const FALLBACK_POSTAL_CODE_SHARDS = 1;
const FALLBACK_MARITIME_SHARDS = 1;
const FALLBACK_RADAR_SHARDS = 1;
const FALLBACK_CAMERA_SHARDS = 1;
const FALLBACK_CHARGER_SHARDS = 2;

export interface SitemapEntry {
  url: string;
  lastModified: Date;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority: number;
}

/**
 * Returns the list of shard IDs to be included in the sitemap index.
 * Does NOT depend on DB — uses fixed upper bounds so shard routes
 * are always registered, even during builds without a database.
 */
export function getSitemapShardIds(): { id: number }[] {
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
    ...Array.from({ length: FALLBACK_RADAR_SHARDS }, (_, i) => ({
      id: RADAR_OFFSET + i,
    })),
    ...Array.from({ length: FALLBACK_CAMERA_SHARDS }, (_, i) => ({
      id: CAMERA_OFFSET + i,
    })),
    ...Array.from({ length: FALLBACK_CHARGER_SHARDS }, (_, i) => ({
      id: CHARGER_OFFSET + i,
    })),
  ];
}

/**
 * Generates sitemap entries for a specific shard ID.
 * Always queries the DB at runtime — no build-time caching.
 */
export async function generateSitemapForShard(
  id: number
): Promise<SitemapEntry[]> {
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
  if (id >= CHARGER_OFFSET) {
    return chargerSitemap(id - CHARGER_OFFSET);
  }
  if (id >= CAMERA_OFFSET) {
    return cameraSitemap(id - CAMERA_OFFSET);
  }
  if (id >= RADAR_OFFSET) {
    return radarSitemap(id - RADAR_OFFSET);
  }
  if (id >= MARITIME_OFFSET) {
    return maritimeStationSitemap(id - MARITIME_OFFSET);
  }
  return [];
}

/**
 * Converts sitemap entries to XML string.
 */
export function entriesToXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map(
      (e) =>
        `<url><loc>${escapeXml(e.url)}</loc><lastmod>${e.lastModified.toISOString()}</lastmod><changefreq>${e.changeFrequency}</changefreq><priority>${e.priority}</priority></url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---------------------------------------------------------------------------
// Per-city live traffic pages
// ---------------------------------------------------------------------------

const TRAFFIC_CITY_SLUGS = [
  "madrid",
  "barcelona",
  "valencia",
  "sevilla",
  "malaga",
  "zaragoza",
  "bilbao",
  "alicante",
  "murcia",
  "granada",
];

const ELECTROLINERAS_CITY_SLUGS = [
  "madrid",
  "barcelona",
  "valencia",
  "sevilla",
  "zaragoza",
  "malaga",
  "murcia",
  "palma",
  "bilbao",
  "alicante",
  "cordoba",
  "valladolid",
  "vigo",
  "gijon",
  "vitoria",
  "granada",
  "oviedo",
  "santander",
  "san-sebastian",
  "pamplona",
];

const ZBE_CITY_SLUGS = [
  "madrid",
  "barcelona",
  "granada",
  "malaga",
  "zaragoza",
  "sabadell",
  "vitoria",
  "valladolid",
  "sevilla",
  "valencia",
];

const CITIES = [
  "madrid",
  "barcelona",
  "valencia",
  "sevilla",
  "zaragoza",
  "malaga",
  "murcia",
  "palma",
  "bilbao",
  "alicante",
  "cordoba",
  "valladolid",
  "vigo",
  "gijon",
  "granada",
  "vitoria",
  "oviedo",
  "san-sebastian",
  "santander",
  "pamplona",
];

const BARATOS_CITY_SLUGS = [
  "madrid",
  "barcelona",
  "valencia",
  "sevilla",
  "zaragoza",
  "malaga",
  "murcia",
  "bilbao",
  "alicante",
  "cordoba",
  "valladolid",
  "granada",
  "oviedo",
  "santander",
  "pamplona",
  "san-sebastian",
  "vitoria",
  "palma",
  "las-palmas",
  "santa-cruz",
];

const ACCIDENTES_PROVINCE_SLUGS = [
  "almeria",
  "cadiz",
  "cordoba",
  "granada",
  "huelva",
  "jaen",
  "malaga",
  "sevilla",
  "huesca",
  "teruel",
  "zaragoza",
  "asturias",
  "illes-balears",
  "las-palmas",
  "santa-cruz-de-tenerife",
  "cantabria",
  "avila",
  "burgos",
  "leon",
  "palencia",
  "salamanca",
  "segovia",
  "soria",
  "valladolid",
  "zamora",
  "albacete",
  "ciudad-real",
  "cuenca",
  "guadalajara",
  "toledo",
  "barcelona",
  "girona",
  "lleida",
  "tarragona",
  "alicantealacant",
  "castelloncastello",
  "valenciavalencia",
  "badajoz",
  "caceres",
  "a-coruna",
  "lugo",
  "ourense",
  "pontevedra",
  "madrid",
  "murcia",
  "navarra",
  "alavaaraba",
  "bizkaia",
  "gipuzkoa",
  "la-rioja",
  "ceuta",
  "melilla",
];

const PRICE_PROVINCE_SLUGS = [
  "alava",
  "albacete",
  "alicante",
  "almeria",
  "avila",
  "badajoz",
  "baleares",
  "barcelona",
  "burgos",
  "caceres",
  "cadiz",
  "castellon",
  "ciudad-real",
  "cordoba",
  "a-coruna",
  "cuenca",
  "girona",
  "granada",
  "guadalajara",
  "gipuzkoa",
  "huelva",
  "huesca",
  "jaen",
  "leon",
  "lleida",
  "la-rioja",
  "lugo",
  "madrid",
  "malaga",
  "murcia",
  "navarra",
  "ourense",
  "asturias",
  "palencia",
  "las-palmas",
  "pontevedra",
  "salamanca",
  "santa-cruz-de-tenerife",
  "cantabria",
  "segovia",
  "sevilla",
  "soria",
  "tarragona",
  "teruel",
  "toledo",
  "valencia",
  "valladolid",
  "bizkaia",
  "zamora",
  "zaragoza",
  "ceuta",
  "melilla",
];

const PROVINCE_MAP_CODES = Array.from({ length: 52 }, (_, i) =>
  String(i + 1).padStart(2, "0")
);

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
  "madrid",
  "barcelona",
  "valencia",
  "sevilla",
  "zaragoza",
  "malaga",
  "murcia",
  "bilbao",
  "alicante",
  "cordoba",
  "valladolid",
  "granada",
  "oviedo",
  "santander",
  "pamplona",
  "san-sebastian",
  "vitoria",
  "palma",
  "las-palmas",
  "santa-cruz",
];

const FUEL_TYPE_SLUGS = [
  "diesel",
  "gasolina-95",
  "gasolina-98",
  "glp",
  "gnc",
  "hidrogeno",
  "adblue",
];

const COMMUNITIES = [
  "andalucia",
  "aragon",
  "asturias",
  "baleares",
  "canarias",
  "cantabria",
  "castilla-la-mancha",
  "castilla-y-leon",
  "cataluna",
  "comunidad-valenciana",
  "extremadura",
  "galicia",
  "madrid",
  "murcia",
  "navarra",
  "pais-vasco",
  "la-rioja",
  "ceuta",
  "melilla",
];

// ---------------------------------------------------------------------------
// Core sitemap: static pages, roads, communities, cities, blog
// ---------------------------------------------------------------------------

async function coreSitemap(): Promise<SitemapEntry[]> {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const staticPages: SitemapEntry[] = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/mapa`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/carreteras`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/carreteras/autopistas`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/carreteras/autovias`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/carreteras/nacionales`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/carreteras/regionales`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/incidencias`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/incidencias/analytics`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/camaras`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/paneles`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/trafico`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/radares`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...[
      "AP-7",
      "AP-68",
      "AP-1",
      "AP-2",
      "AP-4",
      "AP-6",
      "AP-9",
      "A-1",
      "A-2",
      "A-3",
      "A-4",
      "A-5",
      "A-6",
      "A-7",
      "A-8",
      "A-23",
      "A-31",
      "A-42",
      "A-44",
      "A-52",
      "A-62",
      "A-66",
      "A-92",
      "N-I",
      "N-II",
      "N-III",
      "N-IV",
      "N-V",
      "N-VI",
      "N-340",
    ].map((road) => ({
      url: `${BASE_URL}/radares/${encodeURIComponent(road)}`,
      lastModified: today,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    {
      url: `${BASE_URL}/estadisticas`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/estadisticas/accidentes`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/espana`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/ciudad`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/precio-gasolina-hoy`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/precio-diesel-hoy`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/gasolineras`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/gasolineras/terrestres`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/gasolineras/cerca`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/gasolineras/precios`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/gasolineras/mapa`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/gasolineras/marcas`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/zbe`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.9,
    },
    // NOTE: /electrolineras is 301-redirected to /carga-ev — excluded from sitemap.
    {
      url: `${BASE_URL}/carga-ev`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/carga-ev/cerca`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/profesional`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/profesional/diesel`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/profesional/areas`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/profesional/restricciones`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/profesional/noticias`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/calculadora`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/peajes`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/peajes/gratis-2026`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/peajes/radiales-madrid`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/cuanto-cuesta-cargar`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/mejor-hora`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/puntos-negros`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/informe-diario`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/ciclistas`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/media`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/alertas-meteo`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/semana-santa-2026`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/puente-mayo-2026`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/operaciones`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/restricciones`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/gasolineras-24-horas`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/atascos`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/cortes-trafico`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/etiqueta-ambiental`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/estaciones-aforo`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/intensidad`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/prediccion-trafico`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/trenes`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.85,
    },
    // NOTE: /explorar, /explorar/territorios, /explorar/carreteras are 301-redirected
    //       to /comunidad-autonoma and /carreteras — excluded from sitemap.
    {
      url: `${BASE_URL}/explorar/infraestructura`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/api-docs`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/sobre`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/aviso-legal`,
      lastModified: today,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/politica-privacidad`,
      lastModified: today,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/politica-cookies`,
      lastModified: today,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    // NOTE: /informes is 301-redirected to /noticias — excluded from sitemap.
    {
      url: `${BASE_URL}/gasolineras/baratas`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.9,
    },
    // Maritime section
    {
      url: `${BASE_URL}/maritimo`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/maritimo/combustible`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/maritimo/meteorologia`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/maritimo/puertos`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/maritimo/seguridad`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/maritimo/mapa`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/maritimo/noticias`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...MARITIME_ZONE_SLUGS.map((zone) => ({
      url: `${BASE_URL}/maritimo/meteorologia/${zone}`,
      lastModified: today,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];

  // City-based pages
  // NOTE: /trafico/:city is 301-redirected to /ciudad/:city — excluded from sitemap.
  const cityPages: SitemapEntry[] = [
    ...ZBE_CITY_SLUGS.map((c) => ({
      url: `${BASE_URL}/zbe/${c}`,
      lastModified: today,
      changeFrequency: "weekly" as const,
      priority: 0.88,
    })),
    ...CITIES.map((c) => ({
      url: `${BASE_URL}/ciudad/${c}`,
      lastModified: today,
      changeFrequency: "daily" as const,
      priority: 0.75,
    })),
    ...CITIES.slice(0, 10).map((c) => ({
      url: `${BASE_URL}/carga-ev/${c}`,
      lastModified: today,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    // NOTE: /electrolineras/:city is 301-redirected to /carga-ev/:city — excluded from sitemap.
    ...BARATOS_CITY_SLUGS.map((c) => ({
      url: `${BASE_URL}/gasolineras/baratas/${c}`,
      lastModified: today,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...CAMARAS_CITY_SLUGS.map((c) => ({
      url: `${BASE_URL}/camaras/${c}`,
      lastModified: today,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...PRICE_PROVINCE_SLUGS.map((slug) => ({
      url: `${BASE_URL}/gasolineras/precios/${slug}`,
      lastModified: today,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    // NOTE: /gasolineras/mapa/provincia/:code is 301-redirected to /gasolineras/mapa — excluded from sitemap.
    ...ACCIDENTES_PROVINCE_SLUGS.map((slug) => ({
      url: `${BASE_URL}/estadisticas/accidentes/${slug}`,
      lastModified: today,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...FUEL_TYPE_SLUGS.map((slug) => ({
      url: `${BASE_URL}/gasolineras/tipo/${slug}`,
      lastModified: today,
      changeFrequency: "daily" as const,
      priority: 0.85,
    })),
    ...PROVINCES.map((p) => ({
      url: `${BASE_URL}/radares/provincia/${provinceSlug(p.name)}`,
      lastModified: today,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];

  // Dynamic road pages
  const roads = await prisma.road.findMany({
    select: { id: true, type: true },
    orderBy: { id: "asc" },
  });

  const roadPages: SitemapEntry[] = roads.flatMap((road) => {
    const isMainRoad = ["AUTOPISTA", "AUTOVIA", "NACIONAL"].includes(road.type);
    const priority =
      road.type === "AUTOPISTA"
        ? 0.85
        : road.type === "AUTOVIA"
          ? 0.8
          : road.type === "NACIONAL"
            ? 0.75
            : 0.6;

    const pages: SitemapEntry[] = [
      {
        url: `${BASE_URL}/carreteras/${encodeURIComponent(road.id)}`,
        lastModified: today,
        changeFrequency: isMainRoad ? "daily" : "weekly",
        priority,
      },
    ];

    if (isMainRoad) {
      const subPriority = Number((priority - 0.1).toFixed(1));
      // NOTE: /carreteras/:road/camaras → /camaras/carretera/:road (301)
      // NOTE: /carreteras/:road/radares → /radares/:road (301)
      // Both excluded from sitemap. Only /estadisticas sub-page kept.
      pages.push(
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

  // Camera-by-road pages
  const cameraRoads = await prisma.camera.groupBy({
    by: ["roadNumber"],
    where: { isActive: true, roadNumber: { not: null } },
    _count: true,
    orderBy: { _count: { roadNumber: "desc" } },
  });

  const cameraRoadPages: SitemapEntry[] = cameraRoads
    .filter((r) => r.roadNumber && r._count >= 2)
    .map((r) => ({
      url: `${BASE_URL}/camaras/carretera/${encodeURIComponent(r.roadNumber!)}`,
      lastModified: today,
      changeFrequency: "daily" as const,
      priority: 0.75,
    }));

  // Province pages
  const provinces = await prisma.camera.findMany({
    select: { province: true },
    distinct: ["province"],
  });

  const provincePages: SitemapEntry[] = provinces
    .filter((p) => p.province)
    .map((p) => ({
      url: `${BASE_URL}/provincias/${encodeURIComponent(p.province!)}`,
      lastModified: today,
      changeFrequency: "daily" as const,
      priority: 0.75,
    }));

  // Community pages
  const communityPages: SitemapEntry[] = COMMUNITIES.map((community) => ({
    url: `${BASE_URL}/comunidad-autonoma/${community}`,
    lastModified: today,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  // Maritime port detail pages
  let maritimePortPages: SitemapEntry[] = [];
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
          p
            .port!.toLowerCase()
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
// Gas station sitemap shards
// ---------------------------------------------------------------------------

async function gasStationSitemap(
  shardIndex: number
): Promise<SitemapEntry[]> {
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
}

// ---------------------------------------------------------------------------
// Municipality sitemap shards
// ---------------------------------------------------------------------------

async function municipalitySitemap(
  shardIndex: number
): Promise<SitemapEntry[]> {
  const municipalities = await prisma.municipality.findMany({
    skip: shardIndex * SHARD_SIZE,
    take: SHARD_SIZE,
    select: { slug: true },
    orderBy: { slug: "asc" },
  });

  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  return municipalities.map((m) => ({
    url: `${BASE_URL}/municipio/${m.slug}`,
    lastModified: today,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));
}

// ---------------------------------------------------------------------------
// Postal code sitemap shards
// ---------------------------------------------------------------------------

async function postalCodeSitemap(
  shardIndex: number
): Promise<SitemapEntry[]> {
  const postalCodes = await prisma.gasStation.findMany({
    select: { postalCode: true },
    distinct: ["postalCode"],
    where: { postalCode: { not: null } },
    skip: shardIndex * SHARD_SIZE,
    take: SHARD_SIZE,
    orderBy: { postalCode: "asc" },
  });

  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  return postalCodes
    .filter((p) => p.postalCode)
    .map((p) => ({
      url: `${BASE_URL}/codigo-postal/${p.postalCode}`,
      lastModified: today,
      changeFrequency: "weekly" as const,
      priority: 0.45,
    }));
}

// ---------------------------------------------------------------------------
// Maritime station sitemap shards
// ---------------------------------------------------------------------------

async function maritimeStationSitemap(
  shardIndex: number
): Promise<SitemapEntry[]> {
  const stations = await prisma.maritimeStation.findMany({
    skip: shardIndex * SHARD_SIZE,
    take: SHARD_SIZE,
    select: { id: true },
    orderBy: { id: "asc" },
  });

  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  return stations.map((station) => ({
    url: `${BASE_URL}/maritimo/combustible/${station.id}`,
    lastModified: today,
    changeFrequency: "daily" as const,
    priority: 0.5,
  }));
}

// ---------------------------------------------------------------------------
// Insights sitemap (articles + tags)
// ---------------------------------------------------------------------------

async function insightsSitemap(): Promise<SitemapEntry[]> {
  const [articles, tags, provinces, roads] = await Promise.all([
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: {
        slug: true,
        updatedAt: true,
        isAutoGenerated: true,
        category: true,
      },
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

  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const evergreenCategories = new Set([
    "ANNUAL_REPORT",
    "ROAD_ANALYSIS",
    "MONTHLY_REPORT",
  ]);

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
      changeFrequency: (evergreenCategories.has(a.category)
        ? "monthly"
        : a.isAutoGenerated
          ? "daily"
          : "weekly") as "daily" | "weekly" | "monthly",
      priority: evergreenCategories.has(a.category)
        ? 0.8
        : a.isAutoGenerated
          ? 0.6
          : 0.7,
    })),
    ...tags.map((t: { slug: string }) => ({
      url: `${BASE_URL}/noticias/tag/${t.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
    ...provinces.map((p) => ({
      url: `${BASE_URL}/analisis/accidentes/${p.slug}`,
      lastModified: today,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...roads.map((r) => ({
      url: `${BASE_URL}/analisis/carreteras/${r.roadNumber.toLowerCase()}`,
      lastModified: today,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}

// ---------------------------------------------------------------------------
// Radar sitemap shards
// ---------------------------------------------------------------------------

async function radarSitemap(shardIndex: number): Promise<SitemapEntry[]> {
  const radars = await prisma.radar.findMany({
    skip: shardIndex * SHARD_SIZE,
    take: SHARD_SIZE,
    where: { isActive: true },
    select: { id: true, lastUpdated: true },
    orderBy: { id: "asc" },
  });

  return radars.map((r) => ({
    url: `${BASE_URL}/radares/radar/${r.id}`,
    lastModified: r.lastUpdated ?? new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.55,
  }));
}

// ---------------------------------------------------------------------------
// Camera sitemap shards
// ---------------------------------------------------------------------------

async function cameraSitemap(shardIndex: number): Promise<SitemapEntry[]> {
  const cameras = await prisma.camera.findMany({
    skip: shardIndex * SHARD_SIZE,
    take: SHARD_SIZE,
    where: { isActive: true },
    select: { id: true, lastUpdated: true },
    orderBy: { id: "asc" },
  });

  return cameras.map((c) => ({
    url: `${BASE_URL}/camaras/camara/${c.id}`,
    lastModified: c.lastUpdated ?? new Date(),
    changeFrequency: "daily" as const,
    priority: 0.5,
  }));
}

// ---------------------------------------------------------------------------
// EV Charger sitemap shards
// ---------------------------------------------------------------------------

async function chargerSitemap(shardIndex: number): Promise<SitemapEntry[]> {
  const chargers = await prisma.eVCharger.findMany({
    skip: shardIndex * SHARD_SIZE,
    take: SHARD_SIZE,
    where: { isPublic: true },
    select: { id: true, lastUpdated: true },
    orderBy: { id: "asc" },
  });

  return chargers.map((c) => ({
    url: `${BASE_URL}/carga-ev/punto/${c.id}`,
    lastModified: c.lastUpdated ?? new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));
}
