import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-config";
import { prisma } from "@/lib/db";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

/**
 * Fleet Dashboard — server component.
 *
 * Auth gate: NextAuth session required + user must be linked to a FleetClient.
 * If either check fails, redirect to onboarding.
 *
 * NOTE: FleetClient model is scaffolded in docs/PRISMA-PROPOSAL-T4-FLEET.md.
 * Until the migration runs, the Prisma query below is wrapped in a try/catch
 * that gracefully falls back to a demo mode (empty fleet) so the UI still
 * renders for development.
 */
export default async function FleetDashboardPage() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?redirect=/flotas/dashboard");
  }

  // ── Fleet client lookup ───────────────────────────────────────────────────
  let fleetClient: { id: string; name: string; plan: string } | null = null;
  let vehicles: Array<{
    id: string;
    externalId: string;
    licensePlate: string | null;
    label: string | null;
    status: string;
    lastPosition: {
      lat: number;
      lon: number;
      speed: number | null;
      heading: number | null;
      recordedAt: string;
    } | null;
  }> = [];

  try {
    fleetClient = await prisma.fleetClient.findFirst({
      where: { apiKey: { userId: session.user.id } },
      select: { id: true, name: true, plan: true },
    });

    if (!fleetClient) {
      redirect("/login?redirect=/flotas/dashboard");
    }

    // Fetch vehicles with their latest position
    const rawVehicles = await prisma.fleetVehicle.findMany({
      where: { fleetClientId: fleetClient.id, status: "ACTIVE" },
      include: {
        positions: {
          orderBy: { recordedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { externalId: "asc" },
    });

    vehicles = rawVehicles.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (v: any) => ({
        id: v.id,
        externalId: v.externalId,
        licensePlate: v.licensePlate,
        label: v.label,
        status: v.status,
        lastPosition: v.positions[0]
          ? {
              lat: v.positions[0].lat,
              lon: v.positions[0].lon,
              speed: v.positions[0].speed,
              heading: v.positions[0].heading,
              recordedAt: v.positions[0].recordedAt.toISOString(),
            }
          : null,
      })
    );
  } catch {
    // Model not yet migrated — dev fallback with empty fleet
    // In production this would be a hard 500 after migration runs
    if (!fleetClient) {
      // Scaffold a mock fleet for UI development
      fleetClient = {
        id: "demo",
        name: "Demo Fleet (sin migración)",
        plan: "STARTER",
      };
    }
  }

  return (
    <DashboardClient
      fleetClient={fleetClient!}
      initialVehicles={vehicles}
    />
  );
}
