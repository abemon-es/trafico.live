import prisma from "@/lib/db";
import { CAMERA_CITY_PROVINCES } from "@/lib/geo/area-routes";
import { EPHEMERAL_ARTICLE_CATEGORIES, EPHEMERAL_ARTICLE_MAX_AGE_MS, POSTAL_CODE_MIN_GAS_STATIONS, cameraCityIndexable } from "@/lib/seo/indexability";
import { fingerprintKey, loadChangedAt, type FingerprintFamily } from "@/lib/seo/lastmod";
import { reportApiError } from "@/lib/api-error";
import { PROVINCES } from "@/lib/geo/ine-codes";
import { provinceSlug, slugify } from "@/lib/geo/slugify";
import { PROVINCE_SLUG_TO_COMMUNITY_SLUG } from "@/lib/geo/province-slugs";
import { priorityEntries } from "@/lib/sitemap-priority";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// Shard size for paginated sitemaps
const SHARD_SIZE = 5000;

// ID ranges: 0 = core, 1-99 = gas stations, 100-199 = municipalities,
// 200-299 = postal codes, 300 = insights, 400-499 = maritime,
// 500-599 = radars, 600-699 = cameras, 700-799 = EV chargers,
// 800-899 = railway stations, 900-999 = railway lines,
// 1000-1099 = air quality stations, 1100-1199 = climate stations,
// 1200-1299 = aircraft (ICAO24), 1300-1399 = Spanish ports.
const GAS_STATION_OFFSET = 1;
const MUNICIPALITY_OFFSET = 100;
const POSTAL_CODE_OFFSET = 200;
const INSIGHTS_OFFSET = 300;
const MARITIME_OFFSET = 400;
const RADAR_OFFSET = 500;
const CAMERA_OFFSET = 600;
const CHARGER_OFFSET = 700;
const RAILWAY_STATION_OFFSET = 800;
const RAILWAY_LINE_OFFSET = 900;
const AIR_QUALITY_OFFSET = 1000;
const CLIMATE_STATION_OFFSET = 1100;
const AIRCRAFT_OFFSET = 1200;
const SPANISH_PORT_OFFSET = 1300;

// Fixed upper bounds — generous overestimates, empty shards return [] gracefully.
const FALLBACK_STATION_SHARDS = 3;
const FALLBACK_MUNICIPALITY_SHARDS = 3;
// Spain has ~10 000 postal codes with registered stations; one 5k shard
// truncated a third of them. Three shards provide headroom for new rollups.
const FALLBACK_POSTAL_CODE_SHARDS = 3;
const FALLBACK_MARITIME_SHARDS = 1;
const FALLBACK_RADAR_SHARDS = 1;
const FALLBACK_CAMERA_SHARDS = 1;
const FALLBACK_CHARGER_SHARDS = 2;
const FALLBACK_RAILWAY_STATION_SHARDS = 1; // ~1 506 stations
const FALLBACK_RAILWAY_LINE_SHARDS = 1;    // ~1 251 routes
const FALLBACK_AIR_QUALITY_SHARDS = 1;     // ~565 stations
const FALLBACK_CLIMATE_STATION_SHARDS = 1; // ~900 stations
const FALLBACK_SPANISH_PORT_SHARDS = 1; // 197 Spanish ports

export interface SitemapEntry {
  url: string;
  /** When the page's main content last changed; absent when we don't know (src/lib/seo/lastmod.ts). */
  lastModified?: Date;
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
 * DB-backed shard discovery — emits only shards that will contain URLs.
 * Falls back to fixed upper bounds when DB is unreachable so we never
 * serve an empty sitemap index.
 *
 * Used by /api/sitemap-index. Empty shards waste Googlebot crawl budget
 * and trigger "sitemap has no URLs" warnings in GSC.
 */
export async function getActiveShardIds(): Promise<{ id: number }[]> {
  const staticShards = [{ id: 0 }, { id: INSIGHTS_OFFSET }];

  type Cat = {
    offset: number;
    fallback: number;
    count: () => Promise<number>;
  };

  const categories: Cat[] = [
    {
      offset: GAS_STATION_OFFSET,
      fallback: FALLBACK_STATION_SHARDS,
      count: () => prisma.gasStation.count(),
    },
    {
      offset: MUNICIPALITY_OFFSET,
      fallback: FALLBACK_MUNICIPALITY_SHARDS,
      count: () => prisma.municipality.count(),
    },
    {
      offset: POSTAL_CODE_OFFSET,
      fallback: FALLBACK_POSTAL_CODE_SHARDS,
      count: async () => (await indexablePostalCodes()).length,
    },
    {
      offset: MARITIME_OFFSET,
      fallback: FALLBACK_MARITIME_SHARDS,
      count: () => prisma.maritimeStation.count(),
    },
    {
      offset: RADAR_OFFSET,
      fallback: FALLBACK_RADAR_SHARDS,
      count: () => prisma.radar.count({ where: { isActive: true } }),
    },
    {
      offset: CAMERA_OFFSET,
      fallback: FALLBACK_CAMERA_SHARDS,
      count: () => prisma.camera.count({ where: { isActive: true } }),
    },
    {
      offset: CHARGER_OFFSET,
      fallback: FALLBACK_CHARGER_SHARDS,
      count: () => prisma.eVCharger.count({ where: { isPublic: true } }),
    },
    {
      offset: RAILWAY_STATION_OFFSET,
      fallback: FALLBACK_RAILWAY_STATION_SHARDS,
      count: () => prisma.railwayStation.count({ where: { slug: { not: null } } }),
    },
    {
      offset: RAILWAY_LINE_OFFSET,
      fallback: FALLBACK_RAILWAY_LINE_SHARDS,
      count: () => prisma.railwayRoute.count({ where: { slug: { not: null } } }),
    },
    {
      offset: AIR_QUALITY_OFFSET,
      fallback: FALLBACK_AIR_QUALITY_SHARDS,
      count: () => prisma.airQualityStation.count(),
    },
    {
      offset: CLIMATE_STATION_OFFSET,
      fallback: FALLBACK_CLIMATE_STATION_SHARDS,
      count: () => prisma.climateStation.count(),
    },
    // Aircraft shard (offset 1200) intentionally omitted (2026-06 SEO triage):
    // per-ICAO24 pages rotate with ADS-B traffic and are crawl-budget waste
    // while Google is not even downloading our child sitemaps. The
    // /sitemap/12xx.xml routes still resolve via generateSitemapForShard for
    // any crawler that has them on record — they just aren't advertised.
    {
      offset: SPANISH_PORT_OFFSET,
      fallback: FALLBACK_SPANISH_PORT_SHARDS,
      count: () => prisma.spanishPort.count(),
    },
  ];

  const counts = await Promise.all(
    categories.map(async (c) => {
      try {
        const n = await c.count();
        // Always emit at least 1 shard per category that historically had data,
        // so a transient empty DB doesn't shrink the published sitemap surface.
        const shards = Math.max(1, Math.ceil(n / SHARD_SIZE));
        return { offset: c.offset, shards };
      } catch (err) {
        reportApiError(err, `sitemap shard count offset=${c.offset}`);
        return { offset: c.offset, shards: c.fallback };
      }
    })
  );

  const dynamicShards = counts.flatMap(({ offset, shards }) =>
    Array.from({ length: shards }, (_, i) => ({ id: offset + i }))
  );

  return [...staticShards, ...dynamicShards].sort((a, b) => a.id - b.id);
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
    ...Array.from({ length: FALLBACK_RAILWAY_STATION_SHARDS }, (_, i) => ({
      id: RAILWAY_STATION_OFFSET + i,
    })),
    ...Array.from({ length: FALLBACK_RAILWAY_LINE_SHARDS }, (_, i) => ({
      id: RAILWAY_LINE_OFFSET + i,
    })),
    ...Array.from({ length: FALLBACK_AIR_QUALITY_SHARDS }, (_, i) => ({
      id: AIR_QUALITY_OFFSET + i,
    })),
    ...Array.from({ length: FALLBACK_CLIMATE_STATION_SHARDS }, (_, i) => ({
      id: CLIMATE_STATION_OFFSET + i,
    })),
    ...Array.from({ length: FALLBACK_SPANISH_PORT_SHARDS }, (_, i) => ({
      id: SPANISH_PORT_OFFSET + i,
    })),
  ];
}

/**
 * Is `id` a shard the index could legitimately advertise?
 *
 * The index is built from `getActiveShardIds()` (DB row counts) while the shard
 * route used to validate against `getSitemapShardIds()` (static fallbacks), and
 * the two disagreed: with >10 000 public chargers the index advertised
 * /sitemap/702.xml while FALLBACK_CHARGER_SHARDS = 2 made the route 404 it.
 * A sitemap index pointing at a 404 is an error Google records against the
 * whole index, and it went unnoticed because nothing ever fetched our own
 * sitemaps end to end (found 2026-08-24 while auditing template yield).
 *
 * Categories are spaced 100 apart, so any id inside a category's band belongs
 * to it. Validating on the band instead of an exact count means growth in any
 * table can never again produce an advertised-but-404 shard; a genuinely empty
 * shard just serves a valid empty sitemap.
 */
export function isKnownShardId(id: number): boolean {
  if (!Number.isInteger(id) || id < 0) return false;
  if (id === 0) return true; // core pages
  const CATEGORY_BAND = 100;
  const knownOffsets = [
    GAS_STATION_OFFSET,
    MUNICIPALITY_OFFSET,
    POSTAL_CODE_OFFSET,
    INSIGHTS_OFFSET,
    MARITIME_OFFSET,
    RADAR_OFFSET,
    CAMERA_OFFSET,
    CHARGER_OFFSET,
    RAILWAY_STATION_OFFSET,
    RAILWAY_LINE_OFFSET,
    AIR_QUALITY_OFFSET,
    CLIMATE_STATION_OFFSET,
    AIRCRAFT_OFFSET,
    SPANISH_PORT_OFFSET,
  ];
  return knownOffsets.some(
    (offset) => id >= offset && id < offset + CATEGORY_BAND
  );
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
  if (id >= SPANISH_PORT_OFFSET) {
    return spanishPortSitemap(id - SPANISH_PORT_OFFSET);
  }
  if (id >= AIRCRAFT_OFFSET) {
    return aircraftSitemap(id - AIRCRAFT_OFFSET);
  }
  if (id >= CLIMATE_STATION_OFFSET) {
    return climateStationSitemap(id - CLIMATE_STATION_OFFSET);
  }
  if (id >= AIR_QUALITY_OFFSET) {
    return airQualityStationSitemap(id - AIR_QUALITY_OFFSET);
  }
  if (id >= RAILWAY_LINE_OFFSET) {
    return railwayLineSitemap(id - RAILWAY_LINE_OFFSET);
  }
  if (id >= RAILWAY_STATION_OFFSET) {
    return railwayStationSitemap(id - RAILWAY_STATION_OFFSET);
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

// /sitemap/priority.xml — the list and its rationale live in sitemap-priority.ts.
export async function generatePrioritySitemap(): Promise<SitemapEntry[]> {
  return priorityEntries(await coreSitemap(), BASE_URL);
}

/**
 * Converts sitemap entries to XML string.
 */
export function entriesToXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map(
      (e) =>
        `<url><loc>${escapeXml(e.url)}</loc>${e.lastModified ? `<lastmod>${e.lastModified.toISOString()}</lastmod>` : ""}<changefreq>${e.changeFrequency}</changefreq><priority>${e.priority}</priority></url>`
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

const CERCANIAS_NETWORK_SLUGS = [
  "madrid",
  "barcelona",
  "valencia",
  "sevilla",
  "malaga",
  "bilbao",
  "asturias",
  "santander",
  "cadiz",
  "murcia-alicante",
  "zaragoza",
  "san-sebastian",
];

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

// State road network (autopistas AP-, autovías A-1…A-99, nacionales N-).
// The Road table types regional autovías (A-1000, A-356R1…) as AUTOVIA too.
const NATIONAL_ROAD_RE = /^(AP-\d+[A-Z]?|A-\d{1,2}|N-[0-9IVX]+)$/;

/**
 * Real lastmod dates for these families (src/lib/seo/lastmod.ts). If they can't
 * be read, the URLs go without lastmod: never back to a made-up date.
 */
async function contentChangedAt(families: FingerprintFamily[]): Promise<Map<string, Date>> {
  return loadChangedAt(prisma, families).catch((err) => {
    reportApiError(err, "sitemap content fingerprints");
    return new Map<string, Date>();
  });
}

// ---------------------------------------------------------------------------
// Core sitemap: static pages, roads, communities, cities, blog
// ---------------------------------------------------------------------------

async function coreSitemap(): Promise<SitemapEntry[]> {
  // The SASEMAR stats page is noindex while MaritimeEmergency is empty.
  const hasSasemarData = (await prisma.maritimeEmergency.count().catch(() => 0)) > 0;
  // /camaras/<city> is noindex while its province has no active camera
  // (Barcelona, Bilbao, Vitoria, Las Palmas and Santa Cruz on 2026-10-20: their
  // cameras are not DGT's). A failed count leaves the cities out.
  const camerasByProvince = new Map<string | null, number>(
    (await prisma.camera
      .groupBy({ by: ["province"], where: { isActive: true }, _count: true })
      .catch((err) => {
        reportApiError(err, "sitemap cameras by province");
        return [] as Array<{ province: string | null; _count: number }>;
      })
    ).map((r) => [r.province, r._count]),
  );
  const cityProvince = (city: string) => CAMERA_CITY_PROVINCES[city]?.code ?? "";
  const changedAt = await contentChangedAt(["camera-road", "camera-province", "radar-road", "radar-province"]);

  const staticPages: SitemapEntry[] = [
    {
      url: BASE_URL,
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/mapa`,
      changeFrequency: "hourly",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/carreteras`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/carreteras/autopistas`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/carreteras/autovias`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/carreteras/nacionales`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/carreteras/regionales`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/incidencias`,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/incidencias/analytics`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/camaras`,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/paneles`,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/trafico`,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/radares`,
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
      lastModified: changedAt.get(fingerprintKey("radar-road", road)),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    {
      url: `${BASE_URL}/estadisticas`,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/estadisticas/accidentes`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/espana`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/ciudad`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/precio-gasolina-hoy`,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/precio-diesel-hoy`,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/gasolineras`,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/gasolineras/terrestres`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/gasolineras/cerca`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/gasolineras/precios`,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/gasolineras/mapa`,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/gasolineras/marcas`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/zbe`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    // NOTE: /electrolineras is 301-redirected to /carga-ev — excluded from sitemap.
    {
      url: `${BASE_URL}/carga-ev`,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/carga-ev/cerca`,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/profesional`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/profesional/diesel`,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/profesional/areas`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/profesional/restricciones`,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/profesional/noticias`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/calculadora`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/peajes`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/peajes/gratis-2026`,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/peajes/radiales-madrid`,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    ...["abertis", "seitt", "itinere", "acega"].map((op) => ({
      url: `${BASE_URL}/peajes/operador/${op}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: `${BASE_URL}/peajes/comparativa`,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/cuanto-cuesta-cargar`,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/mejor-hora`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/puntos-negros`,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/informe-diario`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/ciclistas`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/media`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/alertas-meteo`,
      changeFrequency: "hourly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/semana-santa-2026`,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/puente-mayo-2026`,
      changeFrequency: "hourly",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/operaciones`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    // Operativos DGT family (/operativos hub + 6 seasonal slugs)
    {
      url: `${BASE_URL}/operativos`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...[
      "semana-santa",
      "puente-mayo",
      "verano",
      "todos-los-santos",
      "puente-diciembre",
      "navidad",
    ].map((slug) => ({
      url: `${BASE_URL}/operativos/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    // Rondas urbanas family (/rondas hub + 5 ring road slugs)
    {
      url: `${BASE_URL}/rondas`,
      changeFrequency: "hourly" as const,
      priority: 0.85,
    },
    ...[
      "m-30",
      "m-40",
      "ronda-dalt",
      "ronda-litoral",
      "bypass-valencia",
    ].map((slug) => ({
      url: `${BASE_URL}/rondas/${slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
    {
      url: `${BASE_URL}/restricciones`,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/gasolineras-24-horas`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/atascos`,
      changeFrequency: "hourly",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/cortes-trafico`,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/etiqueta-ambiental`,
      changeFrequency: "monthly",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/estaciones-aforo`,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/intensidad`,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/prediccion-trafico`,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/trenes`,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/trenes/cercanias`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    ...CERCANIAS_NETWORK_SLUGS.map((network) => ({
      url: `${BASE_URL}/trenes/cercanias/${network}`,
      changeFrequency: "daily" as const,
      priority: 0.75,
    })),
    // Live service alerts: GA4's #1 landing page (187 sessions in 30 d) and in
    // no sitemap until 2026-10-19.
    {
      url: `${BASE_URL}/trenes/incidencias`,
      changeFrequency: "hourly" as const,
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/trenes/lineas`,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    },
    {
      url: `${BASE_URL}/trenes/estaciones`,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    },
    {
      url: `${BASE_URL}/aviacion`,
      changeFrequency: "daily" as const,
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/aviacion/aeropuertos`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/accidentes`,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/transporte-publico`,
      changeFrequency: "daily" as const,
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/calidad-aire`,
      changeFrequency: "hourly" as const,
      priority: 0.85,
    },
    // 5-day CAMS forecast (iter-4 dark-data unlock — AQForecast collector
    // populates this every 12h; no competitor in ES publishes a 5-day AQ
    // pronóstico at provincial granularity).
    {
      url: `${BASE_URL}/calidad-aire/prevision`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/estadisticas-transporte`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    // NOTE: /explorar, /explorar/territorios, /explorar/carreteras are 301-redirected
    //       to /comunidad-autonoma and /carreteras — excluded from sitemap.
    {
      url: `${BASE_URL}/explorar/infraestructura`,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/api-docs`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/sobre`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/sobre/posicionamiento`,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/sobre/api`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/sobre/contacto`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/aviso-legal`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/politica-privacidad`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/politica-cookies`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    // NOTE: /informes is 301-redirected to /noticias — excluded from sitemap.
    {
      url: `${BASE_URL}/gasolineras/baratas`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    // Maritime section
    {
      url: `${BASE_URL}/maritimo`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/maritimo/combustible`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/maritimo/meteorologia`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/maritimo/puertos`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/maritimo/seguridad`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    // SASEMAR emergency statistics: only once there is SASEMAR data to show.
    // The 2,140 rows it showed until 2026-10-20 were other organisations'
    // layers (services/collector/tasks/sasemar).
    ...(hasSasemarData
      ? [{
          url: `${BASE_URL}/maritimo/seguridad/estadisticas`,
          changeFrequency: "weekly" as const,
          priority: 0.75,
        }]
      : []),
    {
      url: `${BASE_URL}/maritimo/mapa`,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/maritimo/noticias`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...MARITIME_ZONE_SLUGS.map((zone) => ({
      url: `${BASE_URL}/maritimo/meteorologia/${zone}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    // Maritime: buques and zonas
    {
      url: `${BASE_URL}/maritimo/buques`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/maritimo/zonas`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    // Corredores, Pulso, Guías
    {
      url: `${BASE_URL}/corredores`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/pulso`,
      changeFrequency: "hourly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/guias`,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    // Individual guides
    ...["cercanias-madrid", "etiqueta-ambiental", "gasolina-vs-diesel-vs-electrico", "limites-velocidad-espana", "peajes-espana", "puntos-recarga-electrico", "radares-espana", "zonas-bajas-emisiones"].map((slug) => ({
      url: `${BASE_URL}/guias/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    // Intelligence pages
    {
      url: `${BASE_URL}/inteligencia/lluvia-y-accidentes`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/inteligencia/hora-punta-y-accidentes`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/inteligencia/coste-desplazamiento`,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${BASE_URL}/inteligencia/motociclistas`,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${BASE_URL}/inteligencia/camiones`,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${BASE_URL}/inteligencia/ciclistas-y-peatones`,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    // Prediction pages
    {
      url: `${BASE_URL}/prediccion/precio-combustible`,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/prediccion/retrasos-trenes`,
      changeFrequency: "daily",
      priority: 0.85,
    },
    // Clima
    {
      url: `${BASE_URL}/clima`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    // DGT bureaucracy content cluster (iter-8) — 400K+/mo Spain search volume
    {
      url: `${BASE_URL}/dgt`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/dgt/itv`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/dgt/multas`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/dgt/carnet-puntos`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/dgt/permisos`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];

  // City-based pages
  // /trafico/[city] is a real route (10-city registry) and our top organic
  // entry point on Bing — it MUST be in the sitemap so Google discovers it.
  // /ciudad/:city has no dynamic route (soft-404) — 301-redirected to
  // /trafico/:city in next.config.ts and excluded here.
  const cityPages: SitemapEntry[] = [
    ...TRAFFIC_CITY_SLUGS.map((c) => ({
      url: `${BASE_URL}/trafico/${c}`,
      changeFrequency: "hourly" as const,
      priority: 0.95,
    })),
    // /atascos/<city> is a live route with GSC impressions (granada: 15 at
    // position 46) that was in no sitemap until 2026-10-19.
    ...TRAFFIC_CITY_SLUGS.map((c) => ({
      url: `${BASE_URL}/atascos/${c}`,
      changeFrequency: "hourly" as const,
      priority: 0.9,
    })),
    ...ZBE_CITY_SLUGS.map((c) => ({
      url: `${BASE_URL}/zbe/${c}`,
      changeFrequency: "weekly" as const,
      priority: 0.88,
    })),
    ...CITIES.slice(0, 10).map((c) => ({
      url: `${BASE_URL}/carga-ev/${c}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    // NOTE: /electrolineras/:city is 301-redirected to /carga-ev/:city — excluded from sitemap.
    ...BARATOS_CITY_SLUGS.map((c) => ({
      url: `${BASE_URL}/gasolineras/baratas/${c}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...CAMARAS_CITY_SLUGS.filter((c) => cameraCityIndexable(camerasByProvince.get(cityProvince(c)) ?? 0)).map((c) => ({
      url: `${BASE_URL}/camaras/${c}`,
      lastModified: changedAt.get(fingerprintKey("camera-province", cityProvince(c))),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...PRICE_PROVINCE_SLUGS.map((slug) => ({
      url: `${BASE_URL}/gasolineras/precios/${slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    // NOTE: /gasolineras/mapa/provincia/:code is 301-redirected to /gasolineras/mapa — excluded from sitemap.
    ...ACCIDENTES_PROVINCE_SLUGS.map((slug) => ({
      url: `${BASE_URL}/estadisticas/accidentes/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    // Per-road accident drill-down (iter-4 dark-data unlock — DGT microdata
    // 2019-2023). Mirrors the pre-generated set in
    // src/app/accidentes/carretera/[road]/page.tsx. Long-tail SEO surface
    // for queries like "accidentes A-7", "accidentes mortales N-340".
    // 80 roads — every entry has >=276 accident records in the DB.
    ...[
      "AP-1","AP-2","AP-4","AP-6","AP-7","AP-8","AP-9","AP-68",
      "A-1","A-2","A-3","A-4","A-5","A-6","A-7","A-8",
      "A-23","A-30","A-31","A-42","A-44","A-49","A-52","A-55",
      "A-62","A-66","A-67","A-70","A-92",
      "N-I","N-II","N-III","N-IV","N-V","N-VI","N-1","N-2",
      "N-120","N-232","N-240","N-260","N-330","N-332","N-340","N-340a",
      "N-401","N-420","N-432","N-550","N-630","N-634","N-637",
      "C-12","C-14","C-15","C-16","C-17","C-25","C-31","C-32",
      "C-35","C-55","C-58","C-59","C-63","C-66",
      "B-10","B-20","B-23","B-30",
      "M-40","M-45","M-50","M-506","M-607",
      "SE-30","T-11","V-30","V-31","CV-35","AC-552",
      "TF-1","TF-5","GC-1","GC-3",
      "Ma-13","Ma-19","Ma-20","GI-636",
    ].map((road) => ({
      url: `${BASE_URL}/accidentes/carretera/${encodeURIComponent(road)}`,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    ...FUEL_TYPE_SLUGS.map((slug) => ({
      url: `${BASE_URL}/gasolineras/tipo/${slug}`,
      changeFrequency: "daily" as const,
      priority: 0.85,
    })),
    ...PROVINCES.map((p) => ({
      url: `${BASE_URL}/radares/provincia/${provinceSlug(p.name)}`,
      lastModified: changedAt.get(fingerprintKey("radar-province", p.code)),
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
          changeFrequency: "daily",
          priority: subPriority,
        }
      );
    }
    // Today's status page (/carreteras/AP-7/hoy) for the national network.
    // The route serves every road, but it was in no sitemap (CMO 2026-10-18).
    // Only state roads: the DB types regional roads (A-1000…) as AUTOVIA too.
    if (NATIONAL_ROAD_RE.test(road.id)) {
      pages.push({
        url: `${BASE_URL}/carreteras/${encodeURIComponent(road.id)}/hoy`,
        changeFrequency: "hourly",
        priority,
      });
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
      lastModified: changedAt.get(fingerprintKey("camera-road", r.roadNumber!)),
      changeFrequency: "daily" as const,
      priority: 0.75,
    }));

  // Community and province pages, in their canonical form. Until 2026-10-19
  // these were /provincias/<code> (a self-canonical duplicate of the /espana
  // page) and /comunidad-autonoma/<slug> (308 → /espana/<slug>), and no
  // /espana/<community>[/<province>] URL was in any sitemap. Single-province
  // communities have both pages (/espana/cantabria and
  // /espana/cantabria/cantabria, each self-canonical); the province one is
  // where /provincias/39 redirects, so both are listed.
  const communityPages: SitemapEntry[] = [
    ...new Set(Object.values(PROVINCE_SLUG_TO_COMMUNITY_SLUG)),
  ].map((community) => ({
    url: `${BASE_URL}/espana/${community}`,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const provincePages: SitemapEntry[] = Object.entries(PROVINCE_SLUG_TO_COMMUNITY_SLUG)
    .map(([province, community]) => ({
      url: `${BASE_URL}/espana/${community}/${province}`,
      changeFrequency: "daily" as const,
      priority: 0.85,
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
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
  } catch {
    // DB unavailable — skip dynamic port pages
  }

  // Transit operator detail pages (/transporte-publico/[operator]) — emit
  // slugified name for SEO-friendly URLs (e.g. "metro-madrid", not "mdb-794").
  // The page at [operator]/page.tsx resolves both slug and mdbId via fallback,
  // but we only emit the slug to keep the sitemap canonical. Duplicate slugs
  // (same operator registered twice with identical names) are deduped.
  // Only emit operators whose GTFS feed has been successfully ingested
  // (matches the filter used in the page's generateStaticParams).
  // ~73 of 89 catalog entries have no routes/stops because their feeds
  // weren't processed yet — those are thin landing pages.
  const transitOperators = await prisma.transitOperator.findMany({
    where: { routes: { some: {} } },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  const seenOperatorSlugs = new Set<string>();
  const transitOperatorPages: SitemapEntry[] = transitOperators.flatMap((op) => {
    const slug = slugify(op.name);
    if (!slug || seenOperatorSlugs.has(slug)) return [];
    seenOperatorSlugs.add(slug);
    return [
      {
        url: `${BASE_URL}/transporte-publico/${slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      },
    ];
  });

  // Airport detail pages (/aviacion/aeropuertos/[iata])
  const airports = await prisma.airport.findMany({
    select: { iata: true },
    where: { iata: { not: null } },
    orderBy: { iata: "asc" },
  });
  const airportPages: SitemapEntry[] = airports
    .filter((a) => a.iata)
    .map((a) => ({
      url: `${BASE_URL}/aviacion/aeropuertos/${a.iata!.toLowerCase()}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  // Vessel detail pages (/maritimo/buques/[slug], /recorrido, /historial/[year])
  // are deliberately NOT emitted (2026-06 SEO triage): AIS data is ephemeral —
  // thousands of daily-rotating vessel URLs buried the ~2k stable money pages
  // in this shard while Google was already rationing crawl (child sitemaps
  // never downloaded, GSC 2026-06). Pages stay live and internally linked via
  // /maritimo/buques. Re-add behind a shard of their own once the domain has
  // crawl trust.

  return [
    ...staticPages,
    ...cityPages,
    ...roadPages,
    ...cameraRoadPages,
    ...provincePages,
    ...communityPages,
    ...maritimePortPages,
    ...transitOperatorPages,
    ...airportPages,
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
    select: { id: true },
    orderBy: { id: "asc" },
  });

  // When this station's page (its prices) last changed, not when the feed was
  // read (lastPriceUpdate, 3×/day: 4,474 of 5,000 «today» until 2026-10-21).
  const changedAt = await contentChangedAt(["gas-station"]);
  return stations.map((station) => ({
    url: `${BASE_URL}/gasolineras/terrestres/${station.id}`,
    lastModified: changedAt.get(fingerprintKey("gas-station", station.id)),
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
    select: {
      slug: true,
      province: { select: { slug: true, community: { select: { slug: true } } } },
    },
    orderBy: { slug: "asc" },
  });

  // The canonical form, the one the province pages link to. /municipio/<slug>
  // was listed here while both forms answered 200 as their own canonical;
  // since 2026-10-19 the middleware 301s /municipio/<slug> to this URL.
  return municipalities.map((m) => ({
    url: `${BASE_URL}/espana/${m.province.community.slug}/${m.province.slug}/${m.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));
}

// ---------------------------------------------------------------------------
// Postal code sitemap shards
// ---------------------------------------------------------------------------

/**
 * Postcodes whose page is indexable: at least POSTAL_CODE_MIN_GAS_STATIONS
 * gas stations, the page's own rule. Until 2026-10-20 every postcode with one
 * station was listed, and 3,146 of the 4,626 answered noindex.
 */
async function indexablePostalCodes(skip?: number, take?: number): Promise<Array<{ postalCode: string }>> {
  // LIMIT NULL is no limit in Postgres.
  return prisma.$queryRaw<Array<{ postalCode: string }>>`
    SELECT "postalCode" FROM "GasStation"
    WHERE "postalCode" IS NOT NULL
    GROUP BY "postalCode"
    HAVING count(*) >= ${POSTAL_CODE_MIN_GAS_STATIONS}
    ORDER BY "postalCode"
    LIMIT ${take ?? null} OFFSET ${skip ?? 0}`;
}

async function postalCodeSitemap(
  shardIndex: number
): Promise<SitemapEntry[]> {
  const postalCodes = await indexablePostalCodes(shardIndex * SHARD_SIZE, SHARD_SIZE);

  return postalCodes
    .filter((p) => p.postalCode)
    .map((p) => ({
      url: `${BASE_URL}/codigo-postal/${p.postalCode}`,
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

  return stations.map((station) => ({
    url: `${BASE_URL}/maritimo/combustible/${station.id}`,
    changeFrequency: "daily" as const,
    priority: 0.5,
  }));
}

// ---------------------------------------------------------------------------
// Insights sitemap (articles + tags)
// ---------------------------------------------------------------------------

async function insightsSitemap(): Promise<SitemapEntry[]> {
  const [articles, tags] = await Promise.all([
    prisma.article.findMany({
      // Stale ephemeral reports are noindex (isStaleArticle): not listed.
      where: {
        status: "PUBLISHED",
        NOT: {
          category: { in: EPHEMERAL_ARTICLE_CATEGORIES },
          publishedAt: { lt: new Date(Date.now() - EPHEMERAL_ARTICLE_MAX_AGE_MS) },
        },
      },
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
  ]);

  const evergreenCategories = new Set([
    "ANNUAL_REPORT",
    "ROAD_ANALYSIS",
    "MONTHLY_REPORT",
  ]);

  return [
    {
      url: `${BASE_URL}/noticias`,
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
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
    // /analisis/accidentes/* and /analisis/carreteras/* used to be listed here:
    // 450 URLs that only 308 to /estadisticas/accidentes/* and /carreteras/*,
    // which other shards already list. A sitemap should hold final URLs only.
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
    select: { id: true },
    orderBy: { id: "asc" },
  });

  const changedAt = await contentChangedAt(["radar"]);
  return radars.map((r) => ({
    url: `${BASE_URL}/radares/radar/${r.id}`,
    lastModified: changedAt.get(fingerprintKey("radar", r.id)),
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
    select: { id: true },
    orderBy: { id: "asc" },
  });

  const changedAt = await contentChangedAt(["camera"]);
  return cameras.map((c) => ({
    url: `${BASE_URL}/camaras/camara/${c.id}`,
    lastModified: changedAt.get(fingerprintKey("camera", c.id)),
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
    select: { id: true },
    orderBy: { id: "asc" },
  });

  return chargers.map((c) => ({
    url: `${BASE_URL}/carga-ev/punto/${c.id}`,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));
}

// ---------------------------------------------------------------------------
// Railway station sitemap shards — /trenes/estacion/[slug]
// ---------------------------------------------------------------------------

async function railwayStationSitemap(
  shardIndex: number
): Promise<SitemapEntry[]> {
  try {
    const stations = await prisma.railwayStation.findMany({
      skip: shardIndex * SHARD_SIZE,
      take: SHARD_SIZE,
      select: { slug: true },
      where: { slug: { not: null } },
      orderBy: { slug: "asc" },
    });
    return stations
      .filter((s) => !!s.slug)
      .map((s) => ({
        url: `${BASE_URL}/trenes/estacion/${s.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.65,
      }));
  } catch (err) {
    reportApiError(err, "sitemap railway stations");
    return [];
  }
}

// ---------------------------------------------------------------------------
// Railway line sitemap shards — /trenes/linea/[slug]
// ---------------------------------------------------------------------------

async function railwayLineSitemap(
  shardIndex: number
): Promise<SitemapEntry[]> {
  try {
    const routes = await prisma.railwayRoute.findMany({
      skip: shardIndex * SHARD_SIZE,
      take: SHARD_SIZE,
      select: { slug: true },
      where: { slug: { not: null } },
      orderBy: { slug: "asc" },
    });
    const seen = new Set<string>();
    return routes.flatMap((r) => {
      if (!r.slug || seen.has(r.slug)) return [];
      seen.add(r.slug);
      return [
        {
          url: `${BASE_URL}/trenes/linea/${r.slug}`,
          changeFrequency: "weekly" as const,
          priority: 0.65,
        },
      ];
    });
  } catch (err) {
    reportApiError(err, "sitemap railway lines");
    return [];
  }
}

// ---------------------------------------------------------------------------
// Air quality station shards — /calidad-aire/estacion/[id]
// ---------------------------------------------------------------------------

async function airQualityStationSitemap(
  shardIndex: number
): Promise<SitemapEntry[]> {
  try {
    const stations = await prisma.airQualityStation.findMany({
      skip: shardIndex * SHARD_SIZE,
      take: SHARD_SIZE,
      select: { stationId: true },
      orderBy: { stationId: "asc" },
    });
    return stations.map((s) => ({
      url: `${BASE_URL}/calidad-aire/estacion/${encodeURIComponent(s.stationId)}`,
      changeFrequency: "daily" as const,
      priority: 0.55,
    }));
  } catch (err) {
    reportApiError(err, "sitemap air quality stations");
    return [];
  }
}

// ---------------------------------------------------------------------------
// Climate station shards — /clima/estacion/[id]
// ---------------------------------------------------------------------------

async function climateStationSitemap(
  shardIndex: number
): Promise<SitemapEntry[]> {
  try {
    const stations = await prisma.climateStation.findMany({
      skip: shardIndex * SHARD_SIZE,
      take: SHARD_SIZE,
      select: { stationCode: true },
      orderBy: { stationCode: "asc" },
    });
    return stations.map((s) => ({
      url: `${BASE_URL}/clima/estacion/${encodeURIComponent(s.stationCode)}`,
      changeFrequency: "weekly" as const,
      priority: 0.55,
    }));
  } catch (err) {
    reportApiError(err, "sitemap climate stations");
    return [];
  }
}

// ---------------------------------------------------------------------------
// Aircraft sitemap shards — /aviacion/avion/[icao24]
// Also emits per-flight-date URLs (/aviacion/avion/[icao24]/vuelo/[date])
// for the top 50 most-active aircraft in the last 30 days (noindex on those
// sub-pages, but still linkable/crawlable for Googlebot discovery).
// ---------------------------------------------------------------------------

async function aircraftSitemap(shardIndex: number): Promise<SitemapEntry[]> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rows = await prisma.aircraftPosition.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { icao24: true },
      distinct: ["icao24"],
      skip: shardIndex * SHARD_SIZE,
      take: SHARD_SIZE,
      orderBy: { icao24: "asc" },
    });

    // Base aircraft pages
    const aircraftEntries: SitemapEntry[] = rows.map((r) => ({
      url: `${BASE_URL}/aviacion/avion/${r.icao24.toLowerCase()}`,
      changeFrequency: "daily" as const,
      priority: 0.45,
    }));

    // Flight-detail entries for top 50 aircraft (only on shard 0 to avoid duplication)
    const flightEntries: SitemapEntry[] = [];
    if (shardIndex === 0) {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const top50 = rows.slice(0, 50);
        for (const r of top50) {
          const positions = await prisma.aircraftPosition.findMany({
            where: {
              icao24: { equals: r.icao24, mode: "insensitive" },
              createdAt: { gte: thirtyDaysAgo },
            },
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 500,
          });
          // Extract unique dates (YYYY-MM-DD UTC)
          const dates = new Set(
            positions.map((p) => p.createdAt.toISOString().slice(0, 10))
          );
          for (const date of dates) {
            flightEntries.push({
              url: `${BASE_URL}/aviacion/avion/${r.icao24.toLowerCase()}/vuelo/${date}`,
              changeFrequency: "yearly" as const,
              priority: 0.2,
            });
          }
        }
      } catch (err) {
        reportApiError(err, "sitemap aircraft flight-dates");
      }
    }

    return [...aircraftEntries, ...flightEntries];
  } catch (err) {
    reportApiError(err, "sitemap aircraft");
    return [];
  }
}

// ---------------------------------------------------------------------------
// Spanish port sitemap shards — /maritimo/puerto/[slug]
// ---------------------------------------------------------------------------

async function spanishPortSitemap(shardIndex: number): Promise<SitemapEntry[]> {
  try {
    const ports = await prisma.spanishPort.findMany({
      skip: shardIndex * SHARD_SIZE,
      take: SHARD_SIZE,
      select: { slug: true },
      orderBy: { slug: "asc" },
    });
    return ports.map((p) => ({
      url: `${BASE_URL}/maritimo/puerto/${p.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));
  } catch (err) {
    reportApiError(err, "sitemap spanish ports");
    return [];
  }
}
