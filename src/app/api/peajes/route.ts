import { NextResponse } from "next/server";
import tollData from "../../../../data/tolls.json";

export const revalidate = 86400;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const road = searchParams.get("road");

  if (road) {
    const found = tollData.roads.find(
      (r) => r.id.toLowerCase() === road.toLowerCase()
    );
    if (!found) {
      return NextResponse.json({ error: "Road not found" }, { status: 404 });
    }
    return NextResponse.json(found, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  return NextResponse.json(
    {
      lastUpdated: tollData.lastUpdated,
      source: tollData.source,
      seittPerKm: tollData.seittPerKm,
      roads: tollData.roads.map((r) => ({
        id: r.id,
        name: r.name,
        operator: r.operator,
        expires: r.expires,
        segmentCount: r.segments.length,
        maxPrice: Math.max(...r.segments.map((s) => s.price)),
      })),
    },
    { headers: { "Cache-Control": "public, max-age=86400" } }
  );
}
