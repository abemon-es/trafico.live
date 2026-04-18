/**
 * GET  /api/dashboard/keys   — list keys for authenticated user
 * POST /api/dashboard/keys   — create a new API key
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { prisma } from "@/lib/db";
import { hashApiKey } from "@/lib/api-key-hash";
import { API_TIERS, type ApiTierName } from "@/lib/api-tiers";
import { reportApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/** Generate a cryptographically-random API key in the form tl_{tier}_{32 hex chars} */
function generateApiKey(tier: ApiTierName): string {
  const prefix = tier === "FREE" ? "tl_free" : tier === "PRO" ? "tl_pro" : "tl_ent";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}_${hex}`;
}

/** Return only first-4 and last-4 chars — rest is masked. */
function maskKey(key: string): string {
  if (key.length <= 12) return key;
  return `${key.slice(0, 8)}••••••••${key.slice(-4)}`;
}

// --------------------------------------------------------------------------
// GET — list keys
// --------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const email = session.user.email;

    const keys = await prisma.apiKey.findMany({
      where: { email, isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        key: true,
        tier: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
        rateLimitPerMinute: true,
        rateLimitPerDay: true,
        // Aggregate today's usage
        usage: {
          where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
          select: { requestCount: true },
        },
      },
    });

    const result = keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPreview: maskKey(k.key),
      tier: k.tier,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
      expiresAt: k.expiresAt,
      rateLimitPerMinute: k.rateLimitPerMinute,
      rateLimitPerDay: k.rateLimitPerDay,
      requestsToday: k.usage.reduce((sum: number, u: { requestCount: number }) => sum + u.requestCount, 0),
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    reportApiError(error, "GET /api/dashboard/keys");
    return NextResponse.json(
      { error: "Error al obtener las claves" },
      { status: 500 }
    );
  }
}

// --------------------------------------------------------------------------
// POST — create key
// --------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const email = session.user.email;

    const body = await request.json();
    const name = (body.name as string)?.trim();
    const tier = (body.tier as ApiTierName) ?? "FREE";

    if (!name || name.length < 2 || name.length > 64) {
      return NextResponse.json(
        { error: "El nombre debe tener entre 2 y 64 caracteres" },
        { status: 400 }
      );
    }

    const validTiers: ApiTierName[] = ["FREE", "PRO", "ENTERPRISE"];
    if (!validTiers.includes(tier)) {
      return NextResponse.json({ error: "Tier no válido" }, { status: 400 });
    }

    // Enforce tier constraints: user can only create keys for their own tier or lower.
    // For now we check how many FREE keys exist (billing gate would tighten this).
    const existingCount = await prisma.apiKey.count({
      where: { email, isActive: true },
    });

    const MAX_FREE_KEYS = 3;
    if (tier === "FREE" && existingCount >= MAX_FREE_KEYS) {
      return NextResponse.json(
        { error: `Máximo ${MAX_FREE_KEYS} claves gratuitas. Actualiza tu plan para crear más.` },
        { status: 403 }
      );
    }

    const tierConfig = API_TIERS[tier];
    const plainKey = generateApiKey(tier);
    const hashedKey = await hashApiKey(plainKey);

    // Store the hashed version, return plaintext ONCE
    const created = await prisma.apiKey.create({
      data: {
        key: hashedKey,
        name,
        email,
        tier,
        rateLimitPerMinute: tierConfig.rateLimitPerMinute,
        rateLimitPerDay: tierConfig.rateLimitPerDay,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: created.id,
          name: created.name,
          tier: created.tier,
          createdAt: created.createdAt,
          // Plaintext returned ONCE — client must save it
          key: plainKey,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    reportApiError(error, "POST /api/dashboard/keys");
    return NextResponse.json(
      { error: "Error al crear la clave" },
      { status: 500 }
    );
  }
}
