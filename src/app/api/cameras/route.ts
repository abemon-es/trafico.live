import { NextResponse } from "next/server";
import { fetchDGTCameras, CameraData } from "@/lib/parsers/datex2";

// Cache the response for 5 minutes
export const revalidate = 300;

interface CamerasResponse {
  count: number;
  cameras: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    road: string;
    direction: string;
    kmPoint: number | null;
    province: string;
    imageUrl: string;
  }>;
  provinces: string[];
}

export async function GET() {
  try {
    const cameras = await fetchDGTCameras();

    // Transform to API response format
    const response: CamerasResponse = {
      count: cameras.length,
      cameras: cameras.map((cam: CameraData) => ({
        id: cam.id,
        name: cam.name,
        lat: cam.latitude,
        lng: cam.longitude,
        road: cam.road,
        direction: cam.direction,
        kmPoint: cam.kmPoint,
        province: cam.province,
        imageUrl: cam.imageUrl,
      })),
      // Extract unique provinces for filtering
      provinces: [...new Set(cameras.map((cam) => cam.province).filter(Boolean))].sort(),
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
