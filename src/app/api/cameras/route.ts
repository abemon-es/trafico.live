import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { fetchDGTCameras, CameraData } from "@/lib/parsers/datex2";
import {
  normalizeDGTProvince,
  getProvincesForCommunity,
  PROVINCE_TO_COMMUNITY,
} from "@/lib/geo/province-mapping";
import { getFromCache, setInCache } from "@/lib/redis";

const CACHE_KEY_PREFIX = "api:cameras";
const CACHE_TTL = 3600; // 1 hour — cameras rarely change

// Cache the response for 5 minutes
export const revalidate = 300;

interface CameraResponseItem {
  id: string;
  name: string;
  lat: number;
  lng: number;
  road: string;
  direction: string;
  kmPoint: number | null;
  province: string;
  community: string;
  imageUrl: string;
}

interface CamerasResponse {
  count: number;
  cameras: CameraResponseItem[];
  provinces: string[];
  source: "database" | "api";
}

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const filterProvince = searchParams.get("province");
    const filterCommunity = searchParams.get("community");

    // Build a deterministic cache key from query params
    const paramStr = new URLSearchParams(
      [...searchParams.entries()].sort(([a], [b]) => a.localeCompare(b))
    ).toString();
    const cacheKey = paramStr ? `${CACHE_KEY_PREFIX}:${paramStr}` : CACHE_KEY_PREFIX;

    const cached = await getFromCache<CamerasResponse>(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Try to fetch from database first
    let cameras: CameraResponseItem[] = [];
    let source: "database" | "api" = "database";

    try {
      // Build where clause for database query
      const whereClause: Record<string, unknown> = { isActive: true };

      if (filterProvince) {
        // Filter by province name (case-insensitive)
        whereClause.provinceName = filterProvince;
      }

      if (filterCommunity) {
        const communityProvinces = getProvincesForCommunity(filterCommunity);
        if (communityProvinces.length > 0) {
          whereClause.provinceName = { in: communityProvinces };
        }
      }

      const dbCameras = await prisma.camera.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
      });

      if (dbCameras.length > 0) {
        cameras = dbCameras.map((cam) => {
          const provinceName = cam.provinceName || "";
          return {
            id: cam.id,
            name: cam.name,
            lat: Number(cam.latitude),
            lng: Number(cam.longitude),
            road: cam.roadNumber || "",
            direction: "",
            kmPoint: cam.kmPoint ? Number(cam.kmPoint) : null,
            province: provinceName,
            community: PROVINCE_TO_COMMUNITY[provinceName] || "",
            imageUrl: cam.feedUrl || cam.thumbnailUrl || "",
          };
        });
      }
    } catch (dbError) {
      console.warn("Database query failed, falling back to API:", dbError);
    }

    // Fallback to direct API call if database is empty
    if (cameras.length === 0) {
      source = "api";
      const rawCameras = await fetchDGTCameras();

      cameras = rawCameras.map((cam: CameraData) => {
        const normalizedProvince = normalizeDGTProvince(cam.province);
        const community = PROVINCE_TO_COMMUNITY[normalizedProvince] || "";

        return {
          id: cam.id,
          name: cam.name,
          lat: cam.latitude,
          lng: cam.longitude,
          road: cam.road,
          direction: cam.direction,
          kmPoint: cam.kmPoint,
          province: normalizedProvince,
          community,
          imageUrl: cam.imageUrl,
        };
      });

      // Apply filters for API fallback
      if (filterProvince) {
        const filterLower = filterProvince.toLowerCase();
        cameras = cameras.filter(
          (cam) => cam.province.toLowerCase() === filterLower
        );
      }

      if (filterCommunity) {
        const communityProvinces = getProvincesForCommunity(filterCommunity);
        if (communityProvinces.length > 0) {
          const provincesLower = communityProvinces.map((p) => p.toLowerCase());
          cameras = cameras.filter((cam) =>
            provincesLower.includes(cam.province.toLowerCase())
          );
        }
      }
    }

    // Extract unique provinces for filtering dropdown
    const provinces = [
      ...new Set(cameras.map((cam) => cam.province).filter(Boolean)),
    ].sort();

    const response: CamerasResponse = {
      count: cameras.length,
      cameras,
      provinces,
      source,
    };

    await setInCache(cacheKey, response, CACHE_TTL);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching cameras:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch camera data",
        count: 0,
        cameras: [],
        provinces: [],
        source: "api" as const,
      },
      { status: 500 }
    );
  }
}
