import { prisma } from "@/lib/db";
import { aqForecastSource, type AqForecastSource } from "@/lib/aq-forecast-source";

/**
 * The cams-aq heartbeat read as a forecast source, for the page, the API and
 * the sitemap. A failed read is «not CAMS».
 */
export async function getAqForecastSource(): Promise<AqForecastSource> {
  try {
    const hb = await prisma.collectorHeartbeat.findUnique({
      where: { task: "cams-aq" },
      select: { meta: true, lastSuccessAt: true },
    });
    return aqForecastSource(hb?.meta ?? null, hb?.lastSuccessAt ?? null);
  } catch {
    return aqForecastSource(null, null);
  }
}
