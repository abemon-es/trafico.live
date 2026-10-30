/**
 * The road number in /camaras/carretera/<vía> and /radares/<vía> as the data
 * spells it. Most roads are upper case (A-7, N-340) but Mallorca's are not
 * (Ma-19): upper-casing the URL made those pages 404 while the sitemap listed
 * them. Any other spelling of the URL redirects to this one.
 */

import prisma from "@/lib/db";

export function decodeRoadParam(param: string): string {
  try {
    return decodeURIComponent(param).trim();
  } catch {
    return param.trim();
  }
}

export async function canonicalRoadNumber(table: "camera" | "radar", param: string): Promise<string> {
  const raw = decodeRoadParam(param);
  const where = { roadNumber: { equals: raw, mode: "insensitive" as const } };
  try {
    const row =
      table === "camera"
        ? await prisma.camera.findFirst({ where, select: { roadNumber: true } })
        : await prisma.radar.findFirst({ where, select: { roadNumber: true } });
    return row?.roadNumber ?? raw.toUpperCase();
  } catch {
    return raw.toUpperCase();
  }
}
