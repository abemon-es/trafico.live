import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Resolve the authenticated caller's email from their API key */
async function resolveCallerEmail(request: NextRequest): Promise<string | null> {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return null;
  const record = await prisma.apiKey.findFirst({
    where: { key: apiKey, isActive: true },
    select: { email: true },
  });
  return record?.email ?? null;
}

/**
 * POST /api/keys — Generate a new FREE API key
 * Body: { email, name? }
 */
export async function POST(request: NextRequest) {
  const rateLimited = await applyRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    const { email, name } = (await request.json()) as { email?: string; name?: string };

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid or missing email" }, { status: 400 });
    }

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
 * GET /api/keys — List keys for the authenticated caller
 * Requires: x-api-key header (returns only keys belonging to the same email)
 */
export async function GET(request: NextRequest) {
  const rateLimited = await applyRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    const callerEmail = await resolveCallerEmail(request);
    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized — provide x-api-key" }, { status: 401 });
    }

    const keys = await prisma.apiKey.findMany({
      where: { email: callerEmail, isActive: true },
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

    const masked = keys.map((k) => ({
      ...k,
      key: k.key.slice(0, 12) + "..." + k.key.slice(-4),
    }));

    return NextResponse.json({ keys: masked });
  } catch (error) {
    console.error("[keys] List error:", error);
    return NextResponse.json({ error: "Failed to list keys" }, { status: 500 });
  }
}

/**
 * DELETE /api/keys — Revoke a key (must belong to the caller's email)
 * Requires: x-api-key header + Body: { keyId }
 */
export async function DELETE(request: NextRequest) {
  const rateLimited = await applyRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    const callerEmail = await resolveCallerEmail(request);
    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { keyId } = (await request.json()) as { keyId?: string };
    if (!keyId) {
      return NextResponse.json({ error: "Missing keyId" }, { status: 400 });
    }

    // Verify ownership
    const target = await prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!target || target.email !== callerEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
