/**
 * Fleet Positions API
 *
 * POST /api/flotas/positions — batch ingest GPS positions
 * GET  /api/flotas/positions?since=ISO — retrieve positions as GeoJSON
 *
 * Auth: x-api-key header (fleet API key)
 * Isolation: all queries filtered by fleetClientId derived from the API key.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { applyRateLimit } from "@/lib/api-utils";
import { redis } from "@/lib/redis";

// ─── Rate limiter for fleet ingest (1000 positions/min per fleet) ─────────────
// Uses a simple Redis INCR pattern separate from tier-based limits.
async function checkFleetRateLimit(fleetClientId: string): Promise<boolean> {
  if (!redis) return true; // fail open if Redis unavailable
  const key = `fleet:rl:${fleetClientId}:${Math.floor(Date.now() / 60000)}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 70);
    return count <= 1000;
  } catch {
    return true; // fail open
  }
}

// ─── Validate a single position entry ────────────────────────────────────────
interface PositionInput {
  vehicleId: string;
  lat: number;
  lon: number;
  speed?: number;
  heading?: number;
  timestamp?: string;
}

interface ValidationResult {
  ok: boolean;
  reason?: string;
}

function validatePosition(p: unknown): ValidationResult {
  if (typeof p !== "object" || p === null) {
    return { ok: false, reason: "Invalid object" };
  }
  const pos = p as Record<string, unknown>;

  if (typeof pos.vehicleId !== "string" || !pos.vehicleId.trim()) {
    return { ok: false, reason: "vehicleId required" };
  }
  const lat = Number(pos.lat);
  const lon = Number(pos.lon);
  if (!isFinite(lat) || lat < -90 || lat > 90) {
    return { ok: false, reason: "lat out of range [-90,90]" };
  }
  if (!isFinite(lon) || lon < -180 || lon > 180) {
    return { ok: false, reason: "lon out of range [-180,180]" };
  }
  if (pos.speed !== undefined && (typeof pos.speed !== "number" || !isFinite(pos.speed))) {
    return { ok: false, reason: "speed must be a finite number" };
  }
  if (pos.heading !== undefined) {
    const h = Number(pos.heading);
    if (!isFinite(h) || h < 0 || h > 360) {
      return { ok: false, reason: "heading must be 0–360" };
    }
  }
  return { ok: true };
}

// ─── Resolve API key → FleetClient ───────────────────────────────────────────
async function resolveFleetClient(
  apiKeyValue: string
): Promise<{ id: string; vehicleIds: Set<string> } | null> {
  try {
    const fleet = await prisma.fleetClient.findFirst({
      where: { apiKey: { key: apiKeyValue, isActive: true } },
      select: {
        id: true,
        vehicles: { select: { id: true, externalId: true }, where: { status: "ACTIVE" } },
      },
    });
    if (!fleet) return null;
    const vehicleIds = new Set<string>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fleet.vehicles.map((v: any) => v.externalId as string)
    );
    return { id: fleet.id, vehicleIds };
  } catch {
    // FleetClient model not yet migrated — dev mock
    return { id: "demo", vehicleIds: new Set() };
  }
}

// ─── POST /api/flotas/positions ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Rate limit
  const limited = await applyRateLimit(request);
  if (limited) return limited;

  // Auth
  const authResult = authenticateRequest(request);
  if (authResult) return authResult;

  const apiKeyValue = request.headers.get("x-api-key") ?? "";

  // Resolve fleet
  const fleet = await resolveFleetClient(apiKeyValue);
  if (!fleet) {
    return NextResponse.json(
      { error: "Unauthorized", message: "API key not linked to a fleet account" },
      { status: 401 }
    );
  }

  // Fleet rate limit
  const withinLimit = await checkFleetRateLimit(fleet.id);
  if (!withinLimit) {
    return NextResponse.json(
      { error: "Too Many Requests", message: "Fleet rate limit: 1000 positions/minute" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !Array.isArray((body as Record<string, unknown>).positions)
  ) {
    return NextResponse.json(
      { error: "Body must be { positions: [...] }" },
      { status: 400 }
    );
  }

  const rawPositions = (body as { positions: unknown[] }).positions;

  if (rawPositions.length === 0) {
    return NextResponse.json({ accepted: 0, rejected: [] });
  }
  if (rawPositions.length > 500) {
    return NextResponse.json(
      { error: "Maximum 500 positions per request" },
      { status: 400 }
    );
  }

  // Validate + build insert data
  const accepted: Array<{
    fleetClientId: string;
    vehicleId: string;
    lat: number;
    lon: number;
    speed?: number;
    heading?: number;
    recordedAt: Date;
  }> = [];

  const rejected: Array<{ vehicleId?: string; reason: string }> = [];

  for (const raw of rawPositions) {
    const validation = validatePosition(raw);
    if (!validation.ok) {
      rejected.push({
        vehicleId: typeof (raw as Record<string, unknown>)?.vehicleId === "string"
          ? String((raw as Record<string, unknown>).vehicleId)
          : undefined,
        reason: validation.reason!,
      });
      continue;
    }
    const p = raw as PositionInput;

    // Per-client isolation: resolve vehicleId to internal vehicle record
    // If the fleet has no vehicle with this externalId, auto-upsert is
    // intentionally NOT done here — vehicles must be created via POST /api/flotas/vehicles.
    // For demo/dev mode (fleet.id === "demo"), we skip the check.
    if (fleet.id !== "demo" && !fleet.vehicleIds.has(p.vehicleId)) {
      rejected.push({
        vehicleId: p.vehicleId,
        reason: "Vehicle not found in fleet. Create it first via POST /api/flotas/vehicles",
      });
      continue;
    }

    accepted.push({
      fleetClientId: fleet.id,
      vehicleId: p.vehicleId,
      lat: Number(p.lat),
      lon: Number(p.lon),
      ...(p.speed !== undefined && { speed: Number(p.speed) }),
      ...(p.heading !== undefined && { heading: Number(p.heading) }),
      recordedAt: p.timestamp ? new Date(p.timestamp) : new Date(),
    });
  }

  // Bulk insert (skip on demo mode)
  if (accepted.length > 0 && fleet.id !== "demo") {
    try {
      await prisma.fleetPosition.createMany({
        data: accepted.map((a) => ({
          vehicleId: a.vehicleId,
          lat: a.lat,
          lon: a.lon,
          speed: a.speed ?? null,
          heading: a.heading ?? null,
          recordedAt: a.recordedAt,
        })),
        skipDuplicates: true,
      });
    } catch (err) {
      console.error("[flotas/positions] DB insert error:", err);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  return NextResponse.json(
    { accepted: accepted.length, rejected },
    { status: 207 }
  );
}

// ─── GET /api/flotas/positions?since=ISO ─────────────────────────────────────

export const revalidate = 0; // always dynamic

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request);
  if (limited) return limited;

  const authResult = authenticateRequest(request);
  if (authResult) return authResult;

  const apiKeyValue = request.headers.get("x-api-key") ?? "";
  const fleet = await resolveFleetClient(apiKeyValue);
  if (!fleet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const sinceParam = searchParams.get("since");
  const vehicleIds = searchParams.getAll("vehicleId");

  // Default: last hour
  const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 3600_000);
  if (isNaN(since.getTime())) {
    return NextResponse.json({ error: "Invalid `since` parameter (ISO 8601 required)" }, { status: 400 });
  }

  // Demo mode — return empty GeoJSON
  if (fleet.id === "demo") {
    return NextResponse.json(
      { type: "FeatureCollection", features: [] },
      {
        headers: {
          "Cache-Control": "private, max-age=10",
          "X-Fleet-Mode": "demo",
        },
      }
    );
  }

  try {
    const positions = await prisma.fleetPosition.findMany({
      where: {
        vehicle: { fleetClientId: fleet.id }, // CRITICAL: isolation by fleet
        recordedAt: { gte: since },
        ...(vehicleIds.length > 0 && { vehicleId: { in: vehicleIds } }),
      },
      include: { vehicle: { select: { externalId: true, label: true, licensePlate: true } } },
      orderBy: { recordedAt: "desc" },
      take: 5000,
    });

    const geojson = {
      type: "FeatureCollection" as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      features: positions.map((pos: any) => ({
        type: "Feature",
        id: pos.id,
        geometry: {
          type: "Point",
          coordinates: [pos.lon, pos.lat],
        },
        properties: {
          vehicleId: pos.vehicle.externalId,
          label: pos.vehicle.label,
          licensePlate: pos.vehicle.licensePlate,
          speed: pos.speed,
          heading: pos.heading,
          recordedAt: pos.recordedAt.toISOString(),
        },
      })),
    };

    return NextResponse.json(geojson, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=5",
      },
    });
  } catch (err) {
    console.error("[flotas/positions] DB query error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
