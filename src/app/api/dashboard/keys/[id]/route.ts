/**
 * DELETE /api/dashboard/keys/[id]  — revoke (soft-delete) an API key
 * PATCH  /api/dashboard/keys/[id]  — regenerate a key (body: { action: 'regenerate' })
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { prisma } from "@/lib/db";
import { hashApiKey } from "@/lib/api-key-hash";
import { reportApiError } from "@/lib/api-error";
import type { ApiTierName } from "@/lib/api-tiers";

export const dynamic = "force-dynamic";

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function generateApiKey(tier: ApiTierName): string {
  const prefix = tier === "FREE" ? "tl_free" : tier === "PRO" ? "tl_pro" : "tl_ent";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}_${hex}`;
}

/** Verify the key belongs to the session user */
async function getOwnedKey(id: string, email: string) {
  return prisma.apiKey.findFirst({
    where: { id, email, isActive: true },
  });
}

// --------------------------------------------------------------------------
// DELETE — revoke
// --------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const email = session.user.email;

    const existing = await getOwnedKey(id, email);
    if (!existing) {
      return NextResponse.json(
        { error: "Clave no encontrada" },
        { status: 404 }
      );
    }

    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: "Clave revocada" });
  } catch (error) {
    reportApiError(error, "DELETE /api/dashboard/keys/[id]");
    return NextResponse.json(
      { error: "Error al revocar la clave" },
      { status: 500 }
    );
  }
}

// --------------------------------------------------------------------------
// PATCH — regenerate
// --------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const email = session.user.email;

    const body = await request.json();
    if (body?.action !== "regenerate") {
      return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }

    const existing = await getOwnedKey(id, email);
    if (!existing) {
      return NextResponse.json(
        { error: "Clave no encontrada" },
        { status: 404 }
      );
    }

    const tier = existing.tier as ApiTierName;
    const plainKey = generateApiKey(tier);
    const hashedKey = await hashApiKey(plainKey);

    await prisma.apiKey.update({
      where: { id },
      data: { key: hashedKey, lastUsedAt: null },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: existing.id,
        name: existing.name,
        tier: existing.tier,
        // Plaintext returned ONCE
        key: plainKey,
      },
    });
  } catch (error) {
    reportApiError(error, "PATCH /api/dashboard/keys/[id]");
    return NextResponse.json(
      { error: "Error al regenerar la clave" },
      { status: 500 }
    );
  }
}
