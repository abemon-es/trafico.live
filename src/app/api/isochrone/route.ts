import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-utils";
import { queryValhallaIsochrone } from "@/lib/isochrone";
import type { IsochroneRequest } from "@/types/isochrone";

export const dynamic = "force-dynamic";

const VALHALLA_URL =
  process.env.VALHALLA_URL || "http://trafico-valhalla:8002";

// ─── GET /api/isochrone — health check ───────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  try {
    const response = await fetch(`${VALHALLA_URL}/status`, {
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: "degraded", engine: "valhalla", httpStatus: response.status },
        { status: 502 },
      );
    }

    const body = (await response.json()) as Record<string, unknown>;
    return NextResponse.json({
      status: "ok",
      engine: "valhalla",
      valhalla: body,
    });
  } catch (err) {
    return NextResponse.json(
      { status: "unavailable", engine: "valhalla", error: (err as Error).message },
      { status: 503 },
    );
  }
}

// ─── POST /api/isochrone ─────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  let body: Partial<IsochroneRequest>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── Validate location ────────────────────────────────────────────────────
  const location = body.location;
  if (
    !location ||
    typeof location.lat !== "number" ||
    typeof location.lon !== "number"
  ) {
    return NextResponse.json(
      { error: "location.lat and location.lon are required numbers" },
      { status: 400 },
    );
  }

  if (location.lat < -90 || location.lat > 90) {
    return NextResponse.json(
      { error: "location.lat must be between -90 and 90" },
      { status: 400 },
    );
  }

  if (location.lon < -180 || location.lon > 180) {
    return NextResponse.json(
      { error: "location.lon must be between -180 and 180" },
      { status: 400 },
    );
  }

  // ── Validate profile ─────────────────────────────────────────────────────
  const profile = body.profile ?? "car";
  if (profile !== "car" && profile !== "truck") {
    return NextResponse.json(
      {
        error:
          "profile must be 'car' or 'truck'. Bike/foot isochrones are not supported.",
      },
      { status: 400 },
    );
  }

  // ── Validate contoursMinutes ─────────────────────────────────────────────
  const contoursMinutes = body.contoursMinutes ?? [15, 30, 60];

  if (!Array.isArray(contoursMinutes)) {
    return NextResponse.json(
      { error: "contoursMinutes must be an array of numbers" },
      { status: 400 },
    );
  }

  if (contoursMinutes.length < 1 || contoursMinutes.length > 6) {
    return NextResponse.json(
      { error: "contoursMinutes must contain between 1 and 6 values" },
      { status: 400 },
    );
  }

  for (const m of contoursMinutes) {
    if (typeof m !== "number" || m < 1 || m > 120) {
      return NextResponse.json(
        { error: `contoursMinutes values must be numbers between 1 and 120 (got ${m})` },
        { status: 400 },
      );
    }
  }

  // ── Validate optional params ─────────────────────────────────────────────
  const denoise = body.denoise;
  if (denoise !== undefined && (typeof denoise !== "number" || denoise < 0 || denoise > 1)) {
    return NextResponse.json(
      { error: "denoise must be a number between 0 and 1" },
      { status: 400 },
    );
  }

  const generalize = body.generalize;
  if (generalize !== undefined && (typeof generalize !== "number" || generalize < 0)) {
    return NextResponse.json(
      { error: "generalize must be a non-negative number (metres)" },
      { status: 400 },
    );
  }

  // ── Execute ──────────────────────────────────────────────────────────────
  const req: IsochroneRequest = {
    location,
    profile,
    contoursMinutes,
    ...(denoise !== undefined && { denoise }),
    ...(generalize !== undefined && { generalize }),
    ...(body.dateTime && { dateTime: body.dateTime }),
  };

  try {
    const result = await queryValhallaIsochrone(req);
    return NextResponse.json(result);
  } catch (err) {
    const message = (err as Error).message;

    if (message.includes("unreachable")) {
      return NextResponse.json(
        { error: "Routing engine unavailable", detail: message },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Isochrone computation failed", detail: message },
      { status: 502 },
    );
  }
}
