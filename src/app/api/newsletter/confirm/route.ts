/**
 * GET /api/newsletter/confirm?token=...
 *
 * Handles double opt-in confirmation link.
 * On success: marks subscription CONFIRMED, sends welcome email, returns redirect.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendTransactional } from "@/lib/resend";
import { WelcomeEmailTemplate } from "@/emails/newsletter-welcome";
import { createElement } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://trafico.live";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token || token.length < 32) {
    return NextResponse.redirect(`${BASE_URL}/?newsletter=invalid`, { status: 302 });
  }

  // Find subscription by confirm token
  let sub: {
    id: string;
    email: string;
    status: string;
    unsubscribeToken: string;
  } | null = null;

  try {
    sub = await prisma.newsletterSubscription.findUnique({
      where: { confirmToken: token },
      select: { id: true, email: true, status: true, unsubscribeToken: true },
    });
  } catch (err) {
    console.error("[Newsletter/confirm] DB error:", err);
    return NextResponse.redirect(`${BASE_URL}/?newsletter=error`, { status: 302 });
  }

  if (!sub) {
    return NextResponse.redirect(`${BASE_URL}/?newsletter=invalid`, { status: 302 });
  }

  // Already confirmed — idempotent success
  if (sub.status === "CONFIRMED") {
    return NextResponse.redirect(`${BASE_URL}/?newsletter=confirmed`, { status: 302 });
  }

  // Confirm the subscription
  try {
    await prisma.newsletterSubscription.update({
      where: { id: sub.id },
      data: {
        status: "CONFIRMED",
        confirmToken: null, // invalidate token after use
        confirmedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[Newsletter/confirm] DB update error:", err);
    return NextResponse.redirect(`${BASE_URL}/?newsletter=error`, { status: 302 });
  }

  // Send welcome email
  const unsubscribeUrl = `${BASE_URL}/api/newsletter/unsubscribe?token=${sub.unsubscribeToken}`;
  await sendTransactional({
    to: sub.email,
    subject: "¡Bienvenido/a a trafico.live! 🛣️",
    react: createElement(WelcomeEmailTemplate, {
      email: sub.email,
      unsubscribeUrl,
    }),
    tags: [{ name: "category", value: "newsletter_welcome" }],
  });

  // Sync confirmed status to Resend Audience
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (audienceId) {
    const { addToAudience } = await import("@/lib/resend");
    await addToAudience(sub.email, audienceId, { unsubscribed: false });
  }

  return NextResponse.redirect(`${BASE_URL}/?newsletter=confirmed`, { status: 302 });
}
