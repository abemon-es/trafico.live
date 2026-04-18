import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-utils";
import { authenticateRequest } from "@/lib/auth";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

const FREE_ALERT_LIMIT = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract caller identity from request.
 * We use x-api-key for external callers, and for browser same-origin calls we
 * accept x-user-id (set by the client from session data).  This is intentionally
 * simple; B1's auth() session integration will replace this in S4.
 */
async function resolveUserId(request: NextRequest): Promise<string | null> {
  // Browser same-origin: trust x-user-id header (session-backed, server-side)
  const userId = request.headers.get("x-user-id");
  if (userId) return userId;

  // External API key path
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return null;
  const record = await prisma.apiKey.findFirst({
    where: { key: apiKey, isActive: true },
    select: { id: true },
  });
  return record?.id ?? null;
}

function isPremium(tier?: string | null): boolean {
  return tier === "PRO" || tier === "ENTERPRISE";
}

// ---------------------------------------------------------------------------
// GET /api/alerts — list alerts for the authenticated user
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const blocked = authenticateRequest(request);
  if (blocked) return blocked;

  const rateLimited = await applyRateLimit(request);
  if (rateLimited) return rateLimited;

  const userId = await resolveUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Se requiere autenticación" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;
  const skip = (page - 1) * limit;

  try {
    const [alerts, total] = await Promise.all([
      prisma.userAlert.findMany({
        where: { userId, status: { not: "DELETED" } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.userAlert.count({
        where: { userId, status: { not: "DELETED" } },
      }),
    ]);

    return NextResponse.json({
      alerts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("[alerts:GET]", err);
    return NextResponse.json({ error: "Error al obtener alertas" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/alerts — create a new alert
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const blocked = authenticateRequest(request);
  if (blocked) return blocked;

  const rateLimited = await applyRateLimit(request);
  if (rateLimited) return rateLimited;

  const userId = await resolveUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Se requiere autenticación" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      type?: string;
      targetKey?: string;
      targetLabel?: string;
      channels?: string[];
      frequency?: string;
    };

    const { type, targetKey, targetLabel, channels, frequency } = body;

    if (!type || !targetKey || !targetLabel || !channels || channels.length === 0) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const validTypes = ["ROAD", "TRAIN", "FLIGHT"];
    const validChannels = ["PUSH", "EMAIL", "TELEGRAM"];
    const validFrequencies = ["REAL_TIME", "DAILY", "WEEKLY"];

    if (!validTypes.includes(type.toUpperCase())) {
      return NextResponse.json({ error: "Tipo de alerta inválido" }, { status: 400 });
    }
    if (!channels.every((c) => validChannels.includes(c.toUpperCase()))) {
      return NextResponse.json({ error: "Canal de alerta inválido" }, { status: 400 });
    }
    if (frequency && !validFrequencies.includes(frequency.toUpperCase())) {
      return NextResponse.json({ error: "Frecuencia inválida" }, { status: 400 });
    }

    // Check tier limits
    const apiKey = request.headers.get("x-api-key");
    let userTier: string | null = null;
    if (apiKey) {
      const record = await prisma.apiKey.findFirst({
        where: { key: apiKey, isActive: true },
        select: { tier: true },
      });
      userTier = record?.tier ?? null;
    }

    if (!isPremium(userTier)) {
      const activeCount = await prisma.userAlert.count({
        where: { userId, status: "ACTIVE" },
      });
      if (activeCount >= FREE_ALERT_LIMIT) {
        return NextResponse.json(
          {
            error: "Límite alcanzado",
            message: `El plan gratuito permite un máximo de ${FREE_ALERT_LIMIT} alertas activas. Mejora a Premium para ilimitadas.`,
            upgradeUrl: "/api/billing",
          },
          { status: 402 }
        );
      }
    }

    const alert = await prisma.userAlert.create({
      data: {
        userId,
        type: type.toUpperCase() as "ROAD" | "TRAIN" | "FLIGHT",
        targetKey,
        targetLabel,
        channels: channels.map((c) => c.toUpperCase()) as Array<"PUSH" | "EMAIL" | "TELEGRAM">,
        frequency: (frequency?.toUpperCase() ?? "REAL_TIME") as "REAL_TIME" | "DAILY" | "WEEKLY",
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (err) {
    console.error("[alerts:POST]", err);
    return NextResponse.json({ error: "Error al crear alerta" }, { status: 500 });
  }
}
