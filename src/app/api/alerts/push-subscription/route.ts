import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-utils";
import { authenticateRequest } from "@/lib/auth";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

async function resolveUserId(request: NextRequest): Promise<string | null> {
  const userId = request.headers.get("x-user-id");
  if (userId) return userId;

  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return null;
  const record = await prisma.apiKey.findFirst({
    where: { key: apiKey, isActive: true },
    select: { id: true },
  });
  return record?.id ?? null;
}

/**
 * POST /api/alerts/push-subscription
 * Registers (or upserts) a Web Push subscription for the authenticated user.
 *
 * Body: PushSubscription JSON { endpoint, keys: { p256dh, auth } }
 */
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
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };

    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Suscripción push inválida — faltan endpoint o claves" },
        { status: 400 }
      );
    }

    // Upsert by endpoint (one device may update its subscription)
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return NextResponse.json({ id: subscription.id }, { status: 201 });
  } catch (err) {
    console.error("[push-subscription:POST]", err);
    return NextResponse.json({ error: "Error al registrar suscripción" }, { status: 500 });
  }
}

/**
 * DELETE /api/alerts/push-subscription
 * Removes a push subscription (user opted out).
 * Body: { endpoint }
 */
export async function DELETE(request: NextRequest) {
  const blocked = authenticateRequest(request);
  if (blocked) return blocked;

  const userId = await resolveUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Se requiere autenticación" }, { status: 401 });
  }

  try {
    const { endpoint } = (await request.json()) as { endpoint?: string };
    if (!endpoint) {
      return NextResponse.json({ error: "Falta endpoint" }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[push-subscription:DELETE]", err);
    return NextResponse.json({ error: "Error al eliminar suscripción" }, { status: 500 });
  }
}
