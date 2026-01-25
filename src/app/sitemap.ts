import { MetadataRoute } from "next";
import prisma from "@/lib/db";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.logisticsexpress.es";

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
    {
      url: `${BASE_URL}/incidencias`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/camaras`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
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
      url: `${BASE_URL}/explorar`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/sobre`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

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
      pages.push(
        {
          url: `${BASE_URL}/carreteras/${encodeURIComponent(road.id)}/camaras`,
          lastModified: now,
          changeFrequency: "daily",
          priority: priority - 0.1,
        },
        {
          url: `${BASE_URL}/carreteras/${encodeURIComponent(road.id)}/radares`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: priority - 0.1,
        },
        {
          url: `${BASE_URL}/carreteras/${encodeURIComponent(road.id)}/estadisticas`,
          lastModified: now,
          changeFrequency: "daily",
          priority: priority - 0.1,
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
      url: `${BASE_URL}/provincias/${p.province}`,
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

  return [...staticPages, ...roadPages, ...provincePages, ...communityPages];
}
