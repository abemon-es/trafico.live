import { NextRequest, NextResponse } from "next/server";
import { getFromCache, setInCache } from "@/lib/redis";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const CACHE_KEY = "roads:geometry:spain";
const CACHE_TTL = 86400; // 24 hours

const OVERPASS_QUERY = `
[out:json][timeout:120];
area["ISO3166-1"="ES"]->.spain;
(
  way["highway"~"motorway|trunk|primary|secondary"](area.spain);
);
out body;
>;
out skel qt;
`;

interface OverpassElement {
  type: string;
  id: number;
  nodes?: number[];
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Check cache first
    const cached = await getFromCache<GeoJSON.FeatureCollection>(CACHE_KEY);
    if (cached) {
      return NextResponse.json({ success: true, data: cached, source: "cache" });
    }

    // Fetch from Overpass
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Overpass API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const elements: OverpassElement[] = data.elements || [];

    // Build node lookup
    const nodes = new Map<number, [number, number]>();
    for (const el of elements) {
      if (el.type === "node" && el.lat !== undefined && el.lon !== undefined) {
        nodes.set(el.id, [el.lon, el.lat]);
      }
    }

    // Build GeoJSON features from ways
    const features: GeoJSON.Feature[] = [];
    for (const el of elements) {
      if (el.type !== "way" || !el.nodes || !el.tags) continue;

      const coords: [number, number][] = [];
      for (const nodeId of el.nodes) {
        const coord = nodes.get(nodeId);
        if (coord) coords.push(coord);
      }

      if (coords.length < 2) continue;

      const ref = el.tags.ref || "";
      const highway = el.tags.highway || "";
      const name = el.tags.name || ref;

      // Assign colors by road type
      let color = "#6b7280"; // gray default
      if (highway === "motorway") color = "#1d4ed8"; // blue
      else if (highway === "trunk") color = "#dc2626"; // red
      else if (highway === "primary") color = "#f97316"; // orange
      else if (highway === "secondary") color = "#eab308"; // yellow

      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: coords },
        properties: { id: ref, name, highway, ref, color, osmId: el.id },
      });
    }

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features,
    };

    // Cache the result
    await setInCache(CACHE_KEY, geojson, CACHE_TTL);

    return NextResponse.json({
      success: true,
      data: geojson,
      source: "overpass",
      stats: { ways: features.length, nodes: nodes.size },
    });
  } catch (error) {
    console.error("Road geometry API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch road geometry" },
      { status: 500 }
    );
  }
}
