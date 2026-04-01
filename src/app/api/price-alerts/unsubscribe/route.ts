import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token || token.trim() === "") {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    const alert = await prisma.priceAlert.findUnique({
      where: { unsubscribeToken: token.trim() },
    });

    if (!alert) {
      return NextResponse.json({ error: "Token no válido o alerta no encontrada" }, { status: 404 });
    }

    if (!alert.isActive) {
      return NextResponse.json({ success: true, message: "Ya estabas dado de baja de esta alerta" });
    }

    await prisma.priceAlert.update({
      where: { unsubscribeToken: token.trim() },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "Te has dado de baja correctamente de la alerta de precio",
    });
  } catch (error) {
    console.error("Error unsubscribing from price alert:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
