import { MetadataRoute } from "next";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateSitemaps() {
  const count = await prisma.municipality.count();
  const numSitemaps = Math.ceil(count / 5000);
  return Array.from({ length: numSitemaps }, (_, i) => ({ id: i }));
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  const municipalities = await prisma.municipality.findMany({
    skip: id * 5000,
    take: 5000,
    select: { slug: true },
    orderBy: { slug: "asc" },
  });

  return municipalities.map((m) => ({
    url: `https://trafico.live/municipio/${m.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));
}
