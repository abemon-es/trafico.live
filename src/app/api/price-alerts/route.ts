import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud no válido" }, { status: 400 });
  }

  const { email, fuelType, targetPrice, province, provinceName } = body as {
    email?: unknown;
    fuelType?: unknown;
    targetPrice?: unknown;
    province?: unknown;
    provinceName?: unknown;
  };

  // Validate required fields
  if (!email || !fuelType || targetPrice === undefined || targetPrice === null || targetPrice === "") {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  // Validate email format
  if (typeof email !== "string" || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return NextResponse.json({ error: "Formato de email no válido" }, { status: 400 });
  }

  // Validate fuel type
  if (!["gasoleoA", "gasolina95"].includes(String(fuelType))) {
    return NextResponse.json({ error: "Tipo de combustible no válido" }, { status: 400 });
  }

  // Validate target price is a positive number
  const parsedPrice = Number(targetPrice);
  if (isNaN(parsedPrice) || parsedPrice <= 0 || parsedPrice > 9.999) {
    return NextResponse.json({ error: "Precio objetivo no válido" }, { status: 400 });
  }

  // Validate province if provided
  const provinceValue = province ? String(province) : null;
  const provinceNameValue = provinceName ? String(provinceName) : null;

  // Check for duplicate active alert
  const existing = await prisma.priceAlert.findFirst({
    where: {
      email: email.toLowerCase().trim(),
      fuelType: String(fuelType),
      province: provinceValue,
      isActive: true,
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Ya tienes una alerta activa para este combustible" },
      { status: 409 }
    );
  }

  // Create the alert
  const alert = await prisma.priceAlert.create({
    data: {
      email: email.toLowerCase().trim(),
      fuelType: String(fuelType),
      targetPrice: parsedPrice,
      province: provinceValue,
      provinceName: provinceNameValue,
    },
  });

  return NextResponse.json({ success: true, id: alert.id }, { status: 201 });
}
