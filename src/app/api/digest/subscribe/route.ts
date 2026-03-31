import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { sendEmail, isSESConfigured } from "@/lib/email/ses";
import { confirmationHtml } from "@/lib/email/templates";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export async function POST(request: NextRequest) {
  let body: { email?: string; province?: string; provinceName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud no válida" }, { status: 400 });
  }

  const { email, province, provinceName } = body;

  if (!email || typeof email !== "string" || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return NextResponse.json({ error: "Email no válido" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check for existing subscription
  const existing = await prisma.digestSubscriber.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing?.isActive && existing.confirmedAt) {
    return NextResponse.json({ error: "Ya estás suscrito" }, { status: 409 });
  }

  // Create or reactivate
  const subscriber = existing
    ? await prisma.digestSubscriber.update({
        where: { email: normalizedEmail },
        data: { isActive: true, province: province || null, provinceName: provinceName || null },
      })
    : await prisma.digestSubscriber.create({
        data: { email: normalizedEmail, province: province || null, provinceName: provinceName || null },
      });

  // Send confirmation email (double opt-in)
  if (isSESConfigured()) {
    const confirmUrl = `${BASE_URL}/api/digest/confirm?token=${subscriber.unsubscribeToken}`;
    try {
      await sendEmail({
        to: normalizedEmail,
        subject: "Confirma tu suscripción — trafico.live",
        html: confirmationHtml(confirmUrl),
        tags: { type: "digest-confirmation" },
      });
    } catch (error) {
      console.error("[digest] Failed to send confirmation:", error);
    }
  } else {
    // SES not configured — auto-confirm for development
    await prisma.digestSubscriber.update({
      where: { id: subscriber.id },
      data: { confirmedAt: new Date() },
    });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
