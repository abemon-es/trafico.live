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

// ---------------------------------------------------------------------------
// GET /api/alerts/[id]
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = authenticateRequest(request);
  if (blocked) return blocked;

  const rateLimited = await applyRateLimit(request);
  if (rateLimited) return rateLimited;

  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: "Se requiere autenticación" }, { status: 401 });

  const { id } = await params;

  try {
    const alert = await prisma.userAlert.findFirst({
      where: { id, userId, status: { not: "DELETED" } },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alerta no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ alert });
  } catch (err) {
    console.error("[alerts/id:GET]", err);
    return NextResponse.json({ error: "Error al obtener alerta" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/alerts/[id]
// ---------------------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = authenticateRequest(request);
  if (blocked) return blocked;

  const rateLimited = await applyRateLimit(request);
  if (rateLimited) return rateLimited;

  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: "Se requiere autenticación" }, { status: 401 });

  const { id } = await params;

  try {
    const existing = await prisma.userAlert.findFirst({
      where: { id, userId, status: { not: "DELETED" } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Alerta no encontrada" }, { status: 404 });
    }

    const body = (await request.json()) as {
      targetLabel?: string;
      channels?: string[];
      frequency?: string;
      status?: string;
    };

    const validChannels = ["PUSH", "EMAIL", "TELEGRAM"];
    const validFrequencies = ["REAL_TIME", "DAILY", "WEEKLY"];
    const validStatuses = ["ACTIVE", "PAUSED"];

    if (body.channels && !body.channels.every((c) => validChannels.includes(c.toUpperCase()))) {
      return NextResponse.json({ error: "Canal inválido" }, { status: 400 });
    }
    if (body.frequency && !validFrequencies.includes(body.frequency.toUpperCase())) {
      return NextResponse.json({ error: "Frecuencia inválida" }, { status: 400 });
    }
    if (body.status && !validStatuses.includes(body.status.toUpperCase())) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const updated = await prisma.userAlert.update({
      where: { id },
      data: {
        ...(body.targetLabel && { targetLabel: body.targetLabel }),
        ...(body.channels && {
          channels: body.channels.map((c) => c.toUpperCase()) as Array<"PUSH" | "EMAIL" | "TELEGRAM">,
        }),
        ...(body.frequency && {
          frequency: body.frequency.toUpperCase() as "REAL_TIME" | "DAILY" | "WEEKLY",
        }),
        ...(body.status && {
          status: body.status.toUpperCase() as "ACTIVE" | "PAUSED",
        }),
      },
    });

    return NextResponse.json({ alert: updated });
  } catch (err) {
    console.error("[alerts/id:PATCH]", err);
    return NextResponse.json({ error: "Error al actualizar alerta" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/alerts/[id]  — soft delete
// ---------------------------------------------------------------------------
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = authenticateRequest(request);
  if (blocked) return blocked;

  const rateLimited = await applyRateLimit(request);
  if (rateLimited) return rateLimited;

  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: "Se requiere autenticación" }, { status: 401 });

  const { id } = await params;

  try {
    const existing = await prisma.userAlert.findFirst({
      where: { id, userId, status: { not: "DELETED" } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Alerta no encontrada" }, { status: 404 });
    }

    await prisma.userAlert.update({
      where: { id },
      data: { status: "DELETED" },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[alerts/id:DELETE]", err);
    return NextResponse.json({ error: "Error al eliminar alerta" }, { status: 500 });
  }
}
