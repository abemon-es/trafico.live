import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/keys — Generate a new FREE API key
 * Body: { email, name? }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, name } = (await request.json()) as { email?: string; name?: string };

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    // Check existing keys for this email
    const existing = await prisma.apiKey.count({ where: { email, isActive: true } });
    if (existing >= 3) {
      return NextResponse.json({ error: "Maximum 3 active keys per email" }, { status: 429 });
    }

    const key = `tl_free_${randomBytes(24).toString("hex")}`;

    const apiKey = await prisma.apiKey.create({
      data: {
        key,
        name: name || `Free key for ${email}`,
        email,
        tier: "FREE",
        rateLimitPerMinute: 10,
        rateLimitPerDay: 1000,
      },
    });

    return NextResponse.json({
      key: apiKey.key,
      tier: apiKey.tier,
      rateLimits: { perMinute: apiKey.rateLimitPerMinute, perDay: apiKey.rateLimitPerDay },
      createdAt: apiKey.createdAt,
    }, { status: 201 });
  } catch (error) {
    console.error("[keys] Create error:", error);
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }
}

/**
 * GET /api/keys — List keys for an email
 * Query: email (required)
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Missing email param" }, { status: 400 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { email, isActive: true },
    select: {
      id: true,
      key: true,
      name: true,
      tier: true,
      rateLimitPerMinute: true,
      rateLimitPerDay: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Mask keys (show first 12 chars + last 4)
  const masked = keys.map((k) => ({
    ...k,
    key: k.key.slice(0, 12) + "..." + k.key.slice(-4),
  }));

  return NextResponse.json({ keys: masked });
}

/**
 * DELETE /api/keys — Revoke a key
 * Body: { keyId }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { keyId } = (await request.json()) as { keyId?: string };
    if (!keyId) {
      return NextResponse.json({ error: "Missing keyId" }, { status: 400 });
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[keys] Delete error:", error);
    return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 });
  }
}
