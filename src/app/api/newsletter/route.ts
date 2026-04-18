/**
 * POST /api/newsletter
 *
 * Subscribe an email address with double opt-in.
 * Rate limited: 3 signups per IP per hour.
 * Never leaks subscription status — always returns { status: 'pending' } or
 * { status: 'already_subscribed' } for confirmed addresses.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { sendTransactional } from "@/lib/resend";
import { ConfirmEmailTemplate } from "@/emails/newsletter-confirm";
import { createElement } from "react";

// ---------------------------------------------------------------------------
// Rate limiter: 3 newsletter signups per IP per hour
// ---------------------------------------------------------------------------

const newsletterLimiter: RateLimiterRedis | RateLimiterMemory = redis
  ? new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: "ratelimit:newsletter:signup",
      points: 3,
      duration: 3600, // 1 hour
      blockDuration: 3600,
    })
  : new RateLimiterMemory({
      keyPrefix: "ratelimit:newsletter:signup",
      points: 3,
      duration: 3600,
      blockDuration: 3600,
    });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Parse body
  let body: { email?: string; source?: string; leadMagnet?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  // 2. Validate email
  const rawEmail = body.email ?? "";
  const email = rawEmail.trim().toLowerCase();

  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { error: "Introduce una dirección de email válida" },
      { status: 422 }
    );
  }

  // 3. Rate limit by IP
  const ip = getClientIp(req);
  try {
    await newsletterLimiter.consume(ip);
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      return NextResponse.json(
        { error: "Demasiados intentos. Inténtalo más tarde." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(err.msBeforeNext / 1000)),
          },
        }
      );
    }
    // Fail open — log but allow
    console.error("[Newsletter] Rate limiter error:", err);
  }

  // 4. Check existing subscription
  let existing: {
    id: string;
    status: string;
    confirmToken: string | null;
    unsubscribeToken: string;
  } | null = null;

  try {
    existing = await prisma.newsletterSubscription.findUnique({
      where: { email },
      select: { id: true, status: true, confirmToken: true, unsubscribeToken: true },
    });
  } catch (err) {
    console.error("[Newsletter] DB lookup error:", err);
    return NextResponse.json({ error: "Error interno. Inténtalo de nuevo." }, { status: 500 });
  }

  // Already confirmed — don't leak status, return generic already_subscribed
  if (existing?.status === "CONFIRMED") {
    return NextResponse.json({ status: "already_subscribed" }, { status: 200 });
  }

  // Unsubscribed — allow re-subscribe by creating a fresh pending record
  // PENDING_CONFIRMATION — resend confirmation email

  // 5. Generate tokens
  const confirmToken = generateToken();
  const unsubscribeToken = existing?.unsubscribeToken ?? generateToken();

  // 6. Upsert subscription
  try {
    await prisma.newsletterSubscription.upsert({
      where: { email },
      create: {
        email,
        status: "PENDING_CONFIRMATION",
        confirmToken,
        unsubscribeToken,
        source: body.source ?? null,
        leadMagnet: body.leadMagnet ?? null,
      },
      update: {
        status: "PENDING_CONFIRMATION",
        confirmToken,
        source: body.source ?? existing ? undefined : null,
        leadMagnet: body.leadMagnet ?? existing ? undefined : null,
      },
    });
  } catch (err) {
    console.error("[Newsletter] DB upsert error:", err);
    return NextResponse.json({ error: "Error al guardar suscripción." }, { status: 500 });
  }

  // 7. Send confirmation email
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://trafico.live";
  const confirmUrl = `${baseUrl}/api/newsletter/confirm?token=${confirmToken}`;

  const { error: sendError } = await sendTransactional({
    to: email,
    subject: "Confirma tu suscripción a trafico.live",
    react: createElement(ConfirmEmailTemplate, { confirmUrl, email }),
    tags: [
      { name: "category", value: "newsletter_confirm" },
      ...(body.source ? [{ name: "source", value: body.source }] : []),
    ],
  });

  if (sendError) {
    // Log but don't fail — subscription is saved, user can request resend later
    console.warn("[Newsletter] Confirmation email failed:", sendError);
  }

  // 8. Optionally sync to Resend Audience
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (audienceId) {
    const { addToAudience } = await import("@/lib/resend");
    await addToAudience(email, audienceId, { unsubscribed: false });
  }

  return NextResponse.json({ status: "pending" }, { status: 200 });
}
