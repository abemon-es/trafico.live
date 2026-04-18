/**
 * On-Demand ISR Revalidation Endpoint
 *
 * POST /api/revalidate
 *
 * Body: { "path": "/transporte-publico", "secret": "<REVALIDATE_SECRET>" }
 *
 * Clears the ISR cache for the given path so the next request triggers a fresh
 * server-side render. Useful for hub pages that were built before collectors
 * populated data (e.g. /transporte-publico, /meteo, /calidad-aire showing "0 stations").
 *
 * Requires REVALIDATE_SECRET env var. Returns 403 if secret is missing or wrong.
 */

import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_PATHS = new Set([
  "/transporte-publico",
  "/meteo",
  "/calidad-aire",
  "/aviacion",
  "/maritimo",
  "/estadisticas-transporte",
  "/trenes",
  "/",
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, secret } = body as { path?: string; secret?: string };

    const revalidateSecret = process.env.REVALIDATE_SECRET;
    if (!revalidateSecret || secret !== revalidateSecret) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!path || typeof path !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'path' field" },
        { status: 400 }
      );
    }

    // Restrict to known hub paths to avoid arbitrary cache busting
    if (!ALLOWED_PATHS.has(path)) {
      return NextResponse.json(
        { success: false, error: `Path not in allowlist: ${path}` },
        { status: 400 }
      );
    }

    revalidatePath(path);

    return NextResponse.json({ success: true, revalidated: path });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to revalidate" },
      { status: 500 }
    );
  }
}
