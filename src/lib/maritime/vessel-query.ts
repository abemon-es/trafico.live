/**
 * Latest AIS position per vessel for /api/maritimo, with every filter in SQL
 * so that the LIMIT applies to the vessels asked for, not to all of them.
 */

import { Prisma } from "@prisma/client";

// ITU-R M.1371 ship type code ranges
export const TYPE_RANGES: Record<string, { min: number; max: number }> = {
  fishing: { min: 30, max: 30 },
  passenger: { min: 60, max: 69 },
  cargo: { min: 70, max: 79 },
  tanker: { min: 80, max: 89 },
};

export interface Bounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface VesselRow {
  mmsi: number;
  latitude: number;
  longitude: number;
  sog: number | null;
  cog: number | null;
  heading: number | null;
  navStatus: number | null;
  createdAt: Date;
  name: string | null;
  shipType: number | null;
  flag: string | null;
  destination: string | null;
  length: number | null;
  category: string | null;
  owner: string | null;
  gt: number | null;
}

/** "sw_lat,sw_lng,ne_lat,ne_lng" → box, or null when absent or malformed. */
export function parseBounds(raw: string | null): Bounds | null {
  if (!raw) return null;
  const parts = raw.split(",").map(Number);
  if (parts.length !== 4 || !parts.every((n) => Number.isFinite(n))) return null;
  const [swLat, swLng, neLat, neLng] = parts;
  if (swLat > neLat || swLng > neLng) return null;
  return { swLat, swLng, neLat, neLng };
}

export function latestVesselsQuery(opts: {
  since: Date;
  type: string;
  flag: string | null;
  bounds: Bounds | null;
  limit: number;
}): Prisma.Sql {
  const { since, type, flag, bounds, limit } = opts;

  const conditions: Prisma.Sql[] = [Prisma.sql`vp."createdAt" > ${since}`];
  const range = TYPE_RANGES[type.toLowerCase()];
  if (range) conditions.push(Prisma.sql`v."shipType" BETWEEN ${range.min} AND ${range.max}`);
  if (flag) conditions.push(Prisma.sql`v.flag = ${flag.toUpperCase().slice(0, 2)}`);
  if (bounds) {
    conditions.push(
      Prisma.sql`vp.latitude BETWEEN ${bounds.swLat} AND ${bounds.neLat} AND vp.longitude BETWEEN ${bounds.swLng} AND ${bounds.neLng}`
    );
  }

  // With bounds, the newest position inside the box must also be the vessel's
  // newest position anywhere: a ship that has left the box is not shown in it.
  const stillThere = bounds
    ? Prisma.sql`WHERE NOT EXISTS (
        SELECT 1 FROM "VesselPosition" p2 WHERE p2.mmsi = latest.mmsi AND p2."createdAt" > latest."createdAt"
      )`
    : Prisma.empty;

  return Prisma.sql`
    SELECT * FROM (
      SELECT DISTINCT ON (vp.mmsi)
        vp.mmsi, vp.latitude::float AS latitude, vp.longitude::float AS longitude,
        vp.sog, vp.cog, vp.heading, vp."navStatus", vp."createdAt",
        v.name, v."shipType", v.flag, v.destination, v.length,
        v."shipCategory" AS category, v."registeredOwner" AS owner, v."grossTonnage" AS gt
      FROM "VesselPosition" vp
      LEFT JOIN "Vessel" v ON v.mmsi = vp.mmsi
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY vp.mmsi, vp."createdAt" DESC
    ) latest
    ${stillThere}
    LIMIT ${limit}
  `;
}
