import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-utils";
import { isSanctioned } from "@/lib/sanctions";
import { queryOTP } from "@/lib/multimodal";
import type {
  MultimodalErrorResponse,
  MultimodalRequest,
} from "@/types/multimodal";

export const dynamic = "force-dynamic";

const MAX_ITINERARIES = 6;
const VALID_MODES = new Set([
  "RAIL", "BUS", "TRAM", "SUBWAY", "FERRY", "WALK", "CAR", "BICYCLE",
]);

// ─── POST /api/multimodal ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: Partial<MultimodalRequest>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<MultimodalErrorResponse>(
      { error: "Invalid JSON body", code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  // ── Validate required fields ────────────────────────────────────────────────
  if (
    !body.from ||
    typeof body.from.lat !== "number" ||
    typeof body.from.lon !== "number"
  ) {
    return NextResponse.json<MultimodalErrorResponse>(
      { error: "from.lat and from.lon are required numbers", code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  if (
    !body.to ||
    typeof body.to.lat !== "number" ||
    typeof body.to.lon !== "number"
  ) {
    return NextResponse.json<MultimodalErrorResponse>(
      { error: "to.lat and to.lon are required numbers", code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  // Latitude range check
  if (
    body.from.lat < -90 || body.from.lat > 90 ||
    body.to.lat < -90 || body.to.lat > 90
  ) {
    return NextResponse.json<MultimodalErrorResponse>(
      { error: "Latitude must be between -90 and 90", code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  // Longitude range check
  if (
    body.from.lon < -180 || body.from.lon > 180 ||
    body.to.lon < -180 || body.to.lon > 180
  ) {
    return NextResponse.json<MultimodalErrorResponse>(
      { error: "Longitude must be between -180 and 180", code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  // numItineraries bounds
  if (body.numItineraries !== undefined) {
    if (
      typeof body.numItineraries !== "number" ||
      body.numItineraries < 1 ||
      body.numItineraries > MAX_ITINERARIES
    ) {
      return NextResponse.json<MultimodalErrorResponse>(
        {
          error: `numItineraries must be a number between 1 and ${MAX_ITINERARIES}`,
          code: "INVALID_INPUT",
        },
        { status: 400 }
      );
    }
  }

  // modes validation
  if (body.modes !== undefined) {
    if (!Array.isArray(body.modes)) {
      return NextResponse.json<MultimodalErrorResponse>(
        { error: "modes must be an array", code: "INVALID_INPUT" },
        { status: 400 }
      );
    }
    const invalid = body.modes.filter((m) => !VALID_MODES.has(m));
    if (invalid.length > 0) {
      return NextResponse.json<MultimodalErrorResponse>(
        {
          error: `Invalid modes: ${invalid.join(", ")}. Valid: ${[...VALID_MODES].join(", ")}`,
          code: "INVALID_INPUT",
        },
        { status: 400 }
      );
    }
  }

  // ── Sanctions check ─────────────────────────────────────────────────────────
  const fromCheck = isSanctioned(body.from.lat, body.from.lon);
  if (fromCheck.sanctioned) {
    return NextResponse.json<MultimodalErrorResponse>(
      {
        error: `Routing from sanctioned region is not permitted`,
        code: "SANCTIONED_ZONE",
        sanctionedRegion: fromCheck.region,
      },
      { status: 422 }
    );
  }

  const toCheck = isSanctioned(body.to.lat, body.to.lon);
  if (toCheck.sanctioned) {
    return NextResponse.json<MultimodalErrorResponse>(
      {
        error: `Routing to sanctioned region is not permitted`,
        code: "SANCTIONED_ZONE",
        sanctionedRegion: toCheck.region,
      },
      { status: 422 }
    );
  }

  // ── Build typed request ─────────────────────────────────────────────────────
  const req: MultimodalRequest = {
    from: body.from,
    to: body.to,
    ...(body.date !== undefined ? { date: body.date } : {}),
    ...(body.time !== undefined ? { time: body.time } : {}),
    ...(body.numItineraries !== undefined ? { numItineraries: body.numItineraries } : {}),
    ...(body.modes !== undefined ? { modes: body.modes } : {}),
    ...(body.maxWalkDistance !== undefined ? { maxWalkDistance: body.maxWalkDistance } : {}),
    ...(body.wheelchair !== undefined ? { wheelchair: body.wheelchair } : {}),
  };

  // ── Query OTP ───────────────────────────────────────────────────────────────
  try {
    const result = await queryOTP(req);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Distinguish no-route from actual upstream failure
    if (message === "NO_ROUTE" || (err as { otpCode?: string }).otpCode === "NO_ROUTE") {
      return NextResponse.json<MultimodalErrorResponse>(
        { error: "No route found between the specified locations", code: "NO_ROUTE" },
        { status: 422 }
      );
    }

    return NextResponse.json<MultimodalErrorResponse>(
      { error: "Routing service unavailable", code: "UPSTREAM_DOWN" },
      { status: 503 }
    );
  }
}

// ─── GET /api/multimodal — health ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const otpUrl = process.env.OTP_URL || "http://trafico-otp:8080";

  try {
    const res = await fetch(`${otpUrl}/otp/routers/default`, {
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: "application/json" },
    });
    const healthy = res.ok;
    return NextResponse.json({ healthy, engine: "otp", otpUrl: new URL(otpUrl).hostname });
  } catch {
    return NextResponse.json(
      { healthy: false, engine: "otp", error: "OTP unreachable" },
      { status: 503 }
    );
  }
}
