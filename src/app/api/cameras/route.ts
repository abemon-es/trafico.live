import { NextRequest, NextResponse } from "next/server";
import { fetchDGTCameras, CameraData } from "@/lib/parsers/datex2";
import {
  normalizeDGTProvince,
  getProvincesForCommunity,
  PROVINCE_TO_COMMUNITY,
} from "@/lib/geo/province-mapping";

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
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filterProvince = searchParams.get("province");
    const filterCommunity = searchParams.get("community");

    const rawCameras = await fetchDGTCameras();

    // Transform and normalize province names
    let cameras: CameraResponseItem[] = rawCameras.map((cam: CameraData) => {
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

    // Filter by province if specified
    if (filterProvince) {
      const filterLower = filterProvince.toLowerCase();
      cameras = cameras.filter(
        (cam) => cam.province.toLowerCase() === filterLower
      );
    }

    // Filter by community if specified
    if (filterCommunity) {
      const communityProvinces = getProvincesForCommunity(filterCommunity);
      if (communityProvinces.length > 0) {
        const provincesLower = communityProvinces.map((p) => p.toLowerCase());
        cameras = cameras.filter((cam) =>
          provincesLower.includes(cam.province.toLowerCase())
        );
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
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching cameras:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch camera data",
        count: 0,
        cameras: [],
        provinces: [],
      },
      { status: 500 }
    );
  }
}
