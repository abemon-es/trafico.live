import { MetadataRoute } from "next";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

// Next.js splits sitemaps automatically when generateSitemaps() is used.
// Each sitemap gets its own URL: /gasolineras/terrestres/sitemap/0.xml, /1.xml, etc.
export async function generateSitemaps() {
  const count = await prisma.gasStation.count();
  const numSitemaps = Math.ceil(count / 5000);
  return Array.from({ length: numSitemaps }, (_, i) => ({ id: i }));
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  const stations = await prisma.gasStation.findMany({
    skip: id * 5000,
    take: 5000,
    select: { id: true },
    orderBy: { id: "asc" },
  });

  return stations.map((station) => ({
    url: `https://trafico.live/gasolineras/terrestres/${station.id}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));
}
