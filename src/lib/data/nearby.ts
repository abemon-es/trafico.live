// Nearby municipalities data fetcher for location pages.
// Returns geographically close cities within the same province,
// enriched with basic stats from LocationStats when available.

import { getOrCompute } from "../redis";
import { prisma } from "../db";
import type { GeoEntity } from "../geo/types";

// -----------------------------------------------------------------------
// TTL constants (seconds)
// -----------------------------------------------------------------------

const TTL = {
  REALTIME: 120,
  FREQUENT: 300,
  DAILY: 3_600,
  WEEKLY: 86_400,
  MONTHLY: 604_800,
} as const;

// -----------------------------------------------------------------------
// Cache key helper
// -----------------------------------------------------------------------

function cacheKey(entity: GeoEntity, section: string): string {
  const scope =
    entity.municipalityCode ??
    entity.provinceCode ??
    entity.communityCode ??
    entity.roadId ??
    entity.slug;
  return `loc:${entity.level}:${scope}:${section}`;
}

// -----------------------------------------------------------------------
// Haversine distance (km)
// -----------------------------------------------------------------------

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// -----------------------------------------------------------------------
// Return types
// -----------------------------------------------------------------------

export interface NearbyCity {
  slug: string;
  name: string;
  population: number;
  distance: number;
  incidentCount: number | null;
  minDieselPrice: number | null;
  score: number | null;
  href: string;
}

export interface NearbyMunicipalitiesData {
  cities: NearbyCity[];
}

// -----------------------------------------------------------------------
// 1. Nearby Municipalities
// -----------------------------------------------------------------------

/**
 * Finds the closest municipalities within the same province, sorted by
 * Haversine distance from the entity's center coordinates. Each result
 * is enriched with basic stats (incident count, fuel price) from
 * LocationStats when available.
 */
export async function getNearbyMunicipalities(
  entity: GeoEntity,
  limit: number = 6
): Promise<NearbyMunicipalitiesData> {
  return getOrCompute(
    cacheKey(entity, `nearby:${limit}`),
    TTL.DAILY,
    async () => {
      if (!entity.center || !entity.provinceCode) {
        return { cities: [] };
      }

      const { lat, lng } = entity.center;

      // Fetch all municipalities in the same province with coordinates
      const municipalities = await prisma.municipality.findMany({
        where: {
          provinceCode: entity.provinceCode,
          latitude: { not: null },
          longitude: { not: null },
          // Exclude the current entity
          ...(entity.municipalityCode
            ? { code: { not: entity.municipalityCode } }
            : {}),
        },
        include: {
          province: {
            include: {
              community: true,
            },
          },
        },
      });

      if (municipalities.length === 0) {
        return { cities: [] };
      }

      // Calculate distances and sort
      const withDistance = municipalities
        .map((m) => ({
          municipality: m,
          distance: haversineKm(
            lat,
            lng,
            Number(m.latitude!),
            Number(m.longitude!)
          ),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);

      // Fetch LocationStats for the nearby municipalities in bulk
      const codes = withDistance.map((w) => w.municipality.code);
      const stats = await prisma.locationStats.findMany({
        where: {
          scopeType: "municipality",
          scopeCode: { in: codes },
        },
        select: {
          scopeCode: true,
          activeIncidentCount: true,
          minDieselPrice: true,
        },
      });

      const statsMap = new Map(stats.map((s) => [s.scopeCode, s]));

      const cities: NearbyCity[] = withDistance.map((w) => {
        const m = w.municipality;
        const s = statsMap.get(m.code);
        const communitySlug = m.province.community.slug;
        const provinceSlug = m.province.slug;

        return {
          slug: m.slug,
          name: m.name,
          population: m.population ?? 0,
          distance: Math.round(w.distance * 10) / 10,
          incidentCount: s?.activeIncidentCount ?? null,
          minDieselPrice: s?.minDieselPrice
            ? Number(s.minDieselPrice)
            : null,
          score: null, // Reserved for future scoring
          href: `/espana/${communitySlug}/${provinceSlug}/${m.slug}`,
        };
      });

      return { cities };
    }
  );
}
