/**
 * GET /api/geocode?q=address — Spain-biased forward geocoding via Nominatim.
 *
 * Wraps OpenStreetMap's public Nominatim service. Per their usage policy we:
 *   - Set a descriptive User-Agent on every request
 *   - Bias results to Spain (countrycodes=es)
 *   - Cap results at 5
 *   - Cache responses in Redis for 24h to keep load on Nominatim minimal
 *
 * Used by the /mapa RoutingPanel so users can type addresses instead of
 * having to click on the map.
 *
 * Auth: same-origin only (default middleware behavior — no exemption needed).
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrCompute } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "trafico.live/1.0 (https://trafico.live; contact: datos@trafico.live)";
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24h

interface NominatimResult {
  place_id?: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  importance?: number;
  address?: Record<string, string>;
}

interface GeocodeResult {
  name: string;
  fullName: string;
  lat: number;
  lon: number;
  type: string | null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ results: [] }, { status: 200 });
  }

  if (q.length > 120) {
    return NextResponse.json({ error: "Consulta demasiado larga" }, { status: 400 });
  }

  const cacheKey = `geocode:v1:${q.toLowerCase()}`;

  try {
    const results = await getOrCompute<GeocodeResult[]>(cacheKey, CACHE_TTL_SECONDS, async () => {
      const params = new URLSearchParams({
        q,
        format: "jsonv2",
        countrycodes: "es",
        limit: "5",
        addressdetails: "1",
      });
      const url = `${NOMINATIM_URL}?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept-Language": "es,en;q=0.8",
          Accept: "application/json",
        },
        // Nominatim is a public service — fail fast on slow responses
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        throw new Error(`Nominatim returned ${res.status}`);
      }

      const raw = (await res.json()) as NominatimResult[];
      return raw.map((r) => {
        // Build a short, human "name": prefer city/town/village/road; fall back
        // to first 60 chars of the display_name.
        const addr = r.address ?? {};
        const shortName =
          addr.city ?? addr.town ?? addr.village ?? addr.road ?? addr.suburb ??
          (r.display_name?.split(",")[0]?.trim() ?? r.display_name?.slice(0, 60) ?? "");
        return {
          name: shortName,
          fullName: r.display_name,
          lat: Number(r.lat),
          lon: Number(r.lon),
          type: r.type ?? null,
        };
      });
    });

    return NextResponse.json({ results }, { status: 200 });
  } catch (err) {
    // Soft fail — return empty results so the UI can still let the user
    // pick on the map as fallback.
    console.warn("[geocode] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { results: [], error: "Geocodificación temporalmente no disponible" },
      { status: 200 },
    );
  }
}
