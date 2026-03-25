import { MetadataRoute } from "next";
import prisma from "@/lib/db";
import { ARTICLES } from "@/app/blog/articles";

// Force dynamic rendering - database not accessible during build
export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// Per-city live traffic pages ("tráfico [city] hoy" — 5-30K searches/mo each)
const TRAFFIC_CITY_SLUGS = [
  "madrid", "barcelona", "valencia", "sevilla", "malaga",
  "zaragoza", "bilbao", "alicante", "murcia", "granada",
];

// ZBE cities with dedicated pages
const ZBE_CITY_SLUGS = [
  "madrid", "barcelona", "granada", "malaga", "zaragoza",
  "sabadell", "vitoria", "valladolid", "sevilla", "valencia",
];

// Major cities for city pages
const CITIES = [
  "madrid", "barcelona", "valencia", "sevilla", "zaragoza",
  "malaga", "murcia", "palma", "bilbao", "alicante",
  "cordoba", "valladolid", "vigo", "gijon", "granada",
  "vitoria", "oviedo", "san-sebastian", "santander", "pamplona"
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages with high priority
  const staticPages: MetadataRoute.Sitemap = [
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
      priority: 0.9,
    },
    // Roads section
    {
      url: `${BASE_URL}/carreteras`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/carreteras/autopistas`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/carreteras/autovias`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/carreteras/nacionales`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/carreteras/regionales`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    // Incidents (with alias)
    {
      url: `${BASE_URL}/incidencias`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/incidencias/analytics`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/alertas`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    // Cameras
    {
      url: `${BASE_URL}/camaras`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    // Variable message panels (PMV)
    {
      url: `${BASE_URL}/paneles`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    // Radares (high-value SEO page)
    {
      url: `${BASE_URL}/radares`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    // Per-road radar pages (3-8K searches/mo each — "radares AP-7", "radares A-1", etc.)
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
    // Statistics
    {
      url: `${BASE_URL}/estadisticas`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/historico`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    // Geographic
    {
      url: `${BASE_URL}/espana`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/provincias`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/comunidad-autonoma`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/ciudad`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    // High-value fuel price landing pages
    {
      url: `${BASE_URL}/precio-gasolina-hoy`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/precio-diesel-hoy`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
    },
    // Gas stations (with alias)
    {
      url: `${BASE_URL}/gasolineras`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/combustible`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/gasolineras/terrestres`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/gasolineras/maritimas`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/gasolineras/precios`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/gasolineras/mapa`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    // EV Chargers section (NEW)
    {
      url: `${BASE_URL}/carga-ev`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/carga-ev/cerca`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    // Professional section (NEW)
    {
      url: `${BASE_URL}/profesional`,
      lastModified: now,
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
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/profesional/restricciones`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    // Route cost calculator (high SEO value — "calculadora ruta", "coste viaje coche")
    {
      url: `${BASE_URL}/calculadora`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // EV charging cost calculator (high SEO value — "cuánto cuesta cargar coche eléctrico")
    {
      url: `${BASE_URL}/cuanto-cuesta-cargar`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    // Best travel hour analysis (SEO — "mejor hora para viajar", "horas punta tráfico")
    {
      url: `${BASE_URL}/mejor-hora`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    // Black spots / accident concentration zones (high SEO value)
    {
      url: `${BASE_URL}/puntos-negros`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    // Weather alerts (AEMET)
    {
      url: `${BASE_URL}/alertas-meteo`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.85,
    },
    // Seasonal SEO pages
    {
      url: `${BASE_URL}/semana-santa-2026`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/operaciones`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/restricciones`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    // Gasolineras 24 horas (high SEO value — "gasolineras 24 horas", "gasolineras abiertas")
    {
      url: `${BASE_URL}/gasolineras-24-horas`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    // Explore
    {
      url: `${BASE_URL}/explorar`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/explorar/infraestructura`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    // API documentation
    {
      url: `${BASE_URL}/api-docs`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // About
    {
      url: `${BASE_URL}/sobre`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    // Blog index
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  // Per-city live traffic pages (high SEO value — "tráfico madrid hoy", etc.)
  const trafficCityPages: MetadataRoute.Sitemap = TRAFFIC_CITY_SLUGS.map((city) => ({
    url: `${BASE_URL}/trafico/${city}`,
    lastModified: now,
    changeFrequency: "hourly" as const,
    priority: 0.9,
  }));

  // ZBE city pages (high SEO value — "ZBE Madrid", "zona bajas emisiones Barcelona", etc.)
  const zbeCityPages: MetadataRoute.Sitemap = ZBE_CITY_SLUGS.map((city) => ({
    url: `${BASE_URL}/zbe/${city}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.88,
  }));

  // City pages (NEW)
  const cityPages: MetadataRoute.Sitemap = CITIES.map((city) => ({
    url: `${BASE_URL}/ciudad/${city}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.75,
  }));

  // EV charger city pages (NEW)
  const evCityPages: MetadataRoute.Sitemap = CITIES.slice(0, 10).map((city) => ({
    url: `${BASE_URL}/carga-ev/${city}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  // Cheapest gas station city pages — high SEO value ("gasolineras baratas madrid", etc.)
  const baratosCitySlugs = [
    "madrid", "barcelona", "valencia", "sevilla", "zaragoza",
    "malaga", "murcia", "bilbao", "alicante", "cordoba",
    "valladolid", "granada", "oviedo", "santander", "pamplona",
    "san-sebastian", "vitoria", "palma", "las-palmas", "santa-cruz",
  ];
  const baratosIndexPage: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/gasolineras/baratas`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
  ];
  const baratosCityPages: MetadataRoute.Sitemap = baratosCitySlugs.map((city) => ({
    url: `${BASE_URL}/gasolineras/baratas/${city}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  // Camera city pages — high SEO value ("cámaras tráfico madrid", etc.)
  const camarasCitySlugsList = [
    "madrid", "barcelona", "valencia", "sevilla", "zaragoza",
    "malaga", "murcia", "bilbao", "alicante", "cordoba",
    "valladolid", "granada", "oviedo", "santander", "pamplona",
    "san-sebastian", "vitoria", "palma", "las-palmas", "santa-cruz",
  ];
  const camarasCityPages: MetadataRoute.Sitemap = camarasCitySlugsList.map((city) => ({
    url: `${BASE_URL}/camaras/${city}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  // Blog article pages (static, from ARTICLES registry)
  const blogArticlePages: MetadataRoute.Sitemap = ARTICLES.map((article) => ({
    url: `${BASE_URL}/blog/${article.slug}`,
    lastModified: new Date(article.date),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Get all roads for dynamic pages
  const roads = await prisma.road.findMany({
    select: { id: true, type: true },
    orderBy: { id: "asc" },
  });

  // Road pages - higher priority for main roads
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

    // Add sub-pages only for main roads
    if (isMainRoad) {
      // Round to 1 decimal to avoid IEEE-754 artifacts (e.g. 0.85 - 0.1 = 0.7500000000000001)
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

  // Get provinces for province pages
  const provinces = await prisma.camera.findMany({
    select: { province: true },
    distinct: ["province"],
  });

  const provincePages: MetadataRoute.Sitemap = provinces
    .filter((p) => p.province)
    .map((p) => ({
      url: `${BASE_URL}/provincias/${encodeURIComponent(p.province!)}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.75,
    }));

  // Get communities
  const communities = [
    "andalucia", "aragon", "asturias", "baleares", "canarias",
    "cantabria", "castilla-la-mancha", "castilla-y-leon", "cataluna",
    "comunidad-valenciana", "extremadura", "galicia", "madrid",
    "murcia", "navarra", "pais-vasco", "la-rioja", "ceuta", "melilla"
  ];

  const communityPages: MetadataRoute.Sitemap = communities.map((community) => ({
    url: `${BASE_URL}/comunidad-autonoma/${community}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  // ---------------------------------------------------------------------------
  // GAS STATION DETAIL PAGES — 11,742+ individual station URLs
  // ---------------------------------------------------------------------------
  // Each station has a URL at /gasolineras/terrestres/[id] with full SEO
  // metadata (JSON-LD GasStation+LocalBusiness schema, canonical, OG tags)
  // and a "5 alternativas más baratas" section for internal linking depth.
  //
  // WHY NOT INCLUDED HERE:
  // A single sitemap.xml file must stay under 50,000 URLs and 50 MB (Google
  // limit). With 11,742+ stations, plus roads, cameras, and other pages, the
  // total exceeds the per-file limit. Including all stations here would also
  // bloat this sitemap to the point that crawl budget is wasted on it.
  //
  // NEXT ITERATION — Sitemap Index:
  // Implement a sitemap index at /sitemap-index.xml that references:
  //   - /sitemap/core.xml        → static + road + city pages (this file)
  //   - /sitemap/gasolineras-1.xml → stations 1–10,000 (by lastPriceUpdate)
  //   - /sitemap/gasolineras-2.xml → stations 10,001–end
  //
  // Each per-station sitemap entry will use:
  //   url: `${BASE_URL}/gasolineras/terrestres/${station.id}`
  //   lastModified: station.lastPriceUpdate   ← daily price updates = fresh signal
  //   changeFrequency: "daily"
  //   priority: 0.65
  //
  // The sitemap index route should live at:
  //   /src/app/sitemap-index.xml/route.ts
  // and the per-shard sitemaps at:
  //   /src/app/sitemap/gasolineras-[shard]/route.ts
  // ---------------------------------------------------------------------------

  return [
    ...staticPages,
    ...blogArticlePages,
    ...trafficCityPages,
    ...zbeCityPages,
    ...cityPages,
    ...evCityPages,
    ...baratosIndexPage,
    ...baratosCityPages,
    ...camarasCityPages,
    ...roadPages,
    ...provincePages,
    ...communityPages
  ];
}
