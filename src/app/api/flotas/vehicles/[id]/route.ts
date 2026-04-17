/**
 * Single Fleet Vehicle API
 *
 * GET    /api/flotas/vehicles/[id] — get vehicle detail
 * PATCH  /api/flotas/vehicles/[id] — update label / licensePlate / status
 * DELETE /api/flotas/vehicles/[id] — soft-delete (set status=INACTIVE)
 *
 * Auth: x-api-key header
 * Isolation: CRITICAL — every operation verifies fleetClientId before touching data.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { applyRateLimit } from "@/lib/api-utils";

// ─── Resolve API key → FleetClient id ────────────────────────────────────────
async function resolveFleetClientId(apiKeyValue: string): Promise<string | null> {
  try {
    // @ts-expect-error — FleetClient model added via PRISMA-PROPOSAL-T4-FLEET.md
    const fleet = await prisma.fleetClient.findFirst({
      where: { apiKey: { key: apiKeyValue, isActive: true } },
      select: { id: true },
    });
    return fleet?.id ?? null;
  } catch {
    return "demo";
  }
}

// ─── Find vehicle + verify ownership ─────────────────────────────────────────
async function findOwnedVehicle(vehicleId: string, fleetClientId: string) {
  try {
    // @ts-expect-error — FleetVehicle model added via migration
    return await prisma.fleetVehicle.findFirst({
      where: {
        id: vehicleId,
        fleetClientId, // CRITICAL: ownership check
      },
    });
  } catch {
    return null;
  }
}

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/flotas/vehicles/[id] ───────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  const limited = await applyRateLimit(request);
  if (limited) return limited;

  const authResult = authenticateRequest(request);
  if (authResult) return authResult;

  const { id } = await context.params;
  const apiKeyValue = request.headers.get("x-api-key") ?? "";
  const fleetClientId = await resolveFleetClientId(apiKeyValue);
  if (!fleetClientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vehicle = await findOwnedVehicle(id, fleetClientId);
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

  return NextResponse.json({ vehicle });
}

// ─── PATCH /api/flotas/vehicles/[id] ─────────────────────────────────────────

export async function PATCH(request: NextRequest, context: RouteContext) {
  const limited = await applyRateLimit(request);
  if (limited) return limited;

  const authResult = authenticateRequest(request);
  if (authResult) return authResult;

  const { id } = await context.params;
  const apiKeyValue = request.headers.get("x-api-key") ?? "";
  const fleetClientId = await resolveFleetClientId(apiKeyValue);
  if (!fleetClientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership before any update
  const existing = await findOwnedVehicle(id, fleetClientId);
  if (!existing) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { label, licensePlate, status } = (body as Record<string, unknown>) ?? {};

  const updateData: Record<string, unknown> = {};

  if (label !== undefined) {
    if (typeof label !== "string") {
      return NextResponse.json({ error: "label must be a string" }, { status: 400 });
    }
    updateData.label = label.trim() || null;
  }
  if (licensePlate !== undefined) {
    if (typeof licensePlate !== "string") {
      return NextResponse.json({ error: "licensePlate must be a string" }, { status: 400 });
    }
    updateData.licensePlate = licensePlate.trim() || null;
  }
  if (status !== undefined) {
    if (status !== "ACTIVE" && status !== "INACTIVE") {
      return NextResponse.json({ error: "status must be ACTIVE or INACTIVE" }, { status: 400 });
    }
    updateData.status = status;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  try {
    // @ts-expect-error — FleetVehicle model added via migration
    const updated = await prisma.fleetVehicle.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json({ vehicle: updated });
  } catch (err) {
    console.error("[flotas/vehicles/[id]] PATCH error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

// ─── DELETE /api/flotas/vehicles/[id] ────────────────────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  const limited = await applyRateLimit(request);
  if (limited) return limited;

  const authResult = authenticateRequest(request);
  if (authResult) return authResult;

  const { id } = await context.params;
  const apiKeyValue = request.headers.get("x-api-key") ?? "";
  const fleetClientId = await resolveFleetClientId(apiKeyValue);
  if (!fleetClientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership before delete
  const existing = await findOwnedVehicle(id, fleetClientId);
  if (!existing) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

  try {
    // Soft delete — set status INACTIVE, preserve positions for audit trail
    // @ts-expect-error — FleetVehicle model added via migration
    await prisma.fleetVehicle.update({
      where: { id },
      data: { status: "INACTIVE" },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[flotas/vehicles/[id]] DELETE error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
