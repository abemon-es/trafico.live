/**
 * GET /api/transporte/[operator]/vehiculos?route=[routeId]
 *
 * Returns live vehicle positions for a transit operator (and optionally
 * filtered to a single route). Backed by TransitVehiclePosition table.
 *
 * If no positions exist yet (Agent B hasn't collected) returns an empty
 * vehicles array with count: 0 — the client renders an empty-state card.
 *
 * Cache: none (live data, client polls every 15 s).
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operator: string }> }
) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { operator: mdbId } = await params;
    const { searchParams } = new URL(request.url);
    const routeFilter = searchParams.get("route");

    // Resolve operator
    const op = await prisma.transitOperator.findUnique({
      where: { mdbId },
      select: { id: true, mdbId: true, name: true },
    });

    if (!op) {
      return NextResponse.json(
        { success: false, error: "Operator not found" },
        { status: 404 }
      );
    }

    // Rolling 2-minute window to get the most recent positions per vehicle
    const since = new Date(Date.now() - 2 * 60 * 1000);

    const positions = await prisma.transitVehiclePosition.findMany({
      where: {
        operatorId: op.id,
        fetchedAt: { gte: since },
        ...(routeFilter ? { routeId: routeFilter } : {}),
      },
      orderBy: { fetchedAt: "desc" },
      take: 200,
    });

    // Deduplicate — keep only the latest record per vehicleId
    const seen = new Map<string, typeof positions[0]>();
    for (const pos of positions) {
      if (!seen.has(pos.vehicleId)) {
        seen.set(pos.vehicleId, pos);
      }
    }

    const vehicles = Array.from(seen.values()).map((p) => ({
      vehicleId: p.vehicleId,
      tripId: p.tripId,
      routeId: p.routeId,
      latitude: p.latitude,
      longitude: p.longitude,
      bearing: p.bearing,
      speed: p.speed,
      reportedAt: p.timestamp.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      operator: { id: op.id, mdbId: op.mdbId, name: op.name },
      vehicles,
      count: vehicles.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    reportApiError(error, "Transit vehicles API error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch vehicle positions" },
      { status: 500 }
    );
  }
}
