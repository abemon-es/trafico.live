/**
 * Fleet Vehicles API
 *
 * GET  /api/flotas/vehicles         — list all vehicles for the authenticated fleet
 * POST /api/flotas/vehicles         — create a new vehicle in the fleet
 *
 * Auth: x-api-key header
 * Isolation: all operations scoped to the FleetClient derived from the API key.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { applyRateLimit } from "@/lib/api-utils";

// ─── Resolve API key → FleetClient id ────────────────────────────────────────
async function resolveFleetClientId(apiKeyValue: string): Promise<string | null> {
  try {
    const fleet = await prisma.fleetClient.findFirst({
      where: { apiKey: { key: apiKeyValue, isActive: true } },
      select: { id: true },
    });
    return fleet?.id ?? null;
  } catch {
    return "demo"; // dev fallback
  }
}

// ─── GET /api/flotas/vehicles ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request);
  if (limited) return limited;

  const authResult = authenticateRequest(request);
  if (authResult) return authResult;

  const apiKeyValue = request.headers.get("x-api-key") ?? "";
  const fleetClientId = await resolveFleetClientId(apiKeyValue);
  if (!fleetClientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (fleetClientId === "demo") {
    return NextResponse.json({ vehicles: [] });
  }

  try {
    const vehicles = await prisma.fleetVehicle.findMany({
      where: { fleetClientId }, // CRITICAL: isolation
      select: {
        id: true,
        externalId: true,
        licensePlate: true,
        label: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ vehicles });
  } catch (err) {
    console.error("[flotas/vehicles] GET error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

// ─── POST /api/flotas/vehicles ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request);
  if (limited) return limited;

  const authResult = authenticateRequest(request);
  if (authResult) return authResult;

  const apiKeyValue = request.headers.get("x-api-key") ?? "";
  const fleetClientId = await resolveFleetClientId(apiKeyValue);
  if (!fleetClientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const { externalId, licensePlate, label } = body as Record<string, unknown>;

  if (typeof externalId !== "string" || !externalId.trim()) {
    return NextResponse.json({ error: "externalId (string) is required" }, { status: 400 });
  }
  if (licensePlate !== undefined && typeof licensePlate !== "string") {
    return NextResponse.json({ error: "licensePlate must be a string" }, { status: 400 });
  }
  if (label !== undefined && typeof label !== "string") {
    return NextResponse.json({ error: "label must be a string" }, { status: 400 });
  }

  if (fleetClientId === "demo") {
    return NextResponse.json({
      vehicle: {
        id: `demo-${Date.now()}`,
        externalId,
        licensePlate: licensePlate ?? null,
        label: label ?? null,
        status: "ACTIVE",
        fleetClientId: "demo",
      },
    }, { status: 201 });
  }

  try {
    const vehicle = await prisma.fleetVehicle.create({
      data: {
        fleetClientId, // CRITICAL: always scoped to this fleet
        externalId: externalId.trim(),
        licensePlate: typeof licensePlate === "string" ? licensePlate.trim() || null : null,
        label: typeof label === "string" ? label.trim() || null : null,
        status: "ACTIVE",
      },
      select: {
        id: true,
        externalId: true,
        licensePlate: true,
        label: true,
        status: true,
        createdAt: true,
        fleetClientId: true,
      },
    });

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (err) {
    // Unique constraint violation = duplicate externalId within this fleet
    if (
      typeof err === "object" &&
      err !== null &&
      (err as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A vehicle with this externalId already exists in your fleet" },
        { status: 409 }
      );
    }
    console.error("[flotas/vehicles] POST error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
