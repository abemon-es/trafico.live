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

export interface RoadNumber {
  /** The spelling to query with. */
  roadNumber: string;
  /** True only when the spelling came from a stored row. */
  resolved: boolean;
}

/**
 * The stored spelling of the road in the URL. An exact match wins; otherwise
 * a case-insensitive one, in a fixed order. When nothing is found, or the
 * database fails, the upper-cased URL is used to query but `resolved` is
 * false, so callers never redirect on a guess (a cached 308 to a spelling
 * that 404s would outlive the outage).
 */
export async function canonicalRoadNumber(table: "camera" | "radar", param: string): Promise<RoadNumber> {
  const raw = decodeRoadParam(param);
  const find = (roadNumber: { equals: string; mode?: "insensitive" }) =>
    table === "camera"
      ? prisma.camera.findFirst({ where: { roadNumber }, select: { roadNumber: true }, orderBy: { roadNumber: "asc" } })
      : prisma.radar.findFirst({ where: { roadNumber }, select: { roadNumber: true }, orderBy: { roadNumber: "asc" } });
  try {
    const row = (await find({ equals: raw })) ?? (await find({ equals: raw, mode: "insensitive" }));
    if (row?.roadNumber) return { roadNumber: row.roadNumber, resolved: true };
  } catch {
    // fall through: query with the guess, never redirect to it
  }
  return { roadNumber: raw.toUpperCase(), resolved: false };
}

/** Where a road hub should 308 to, or null to render in place. */
export function roadRedirectTarget(param: string, road: RoadNumber): string | null {
  if (!road.resolved) return null;
  return decodeRoadParam(param) === road.roadNumber ? null : road.roadNumber;
}
