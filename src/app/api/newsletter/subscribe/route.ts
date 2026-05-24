/**
 * POST /api/newsletter/subscribe
 *
 * Endpoint público de suscripción al boletín de trafico.live.
 * - Sin double opt-in (por ahora): sólo recoge el email.
 * - GDPR: almacena timestamp de consentimiento + IP truncada (2 octetos) + user-agent.
 * - Rate limit: 3 peticiones/hora por IP (Redis si disponible, memoria si no).
 * - Deduplicación: upsert por email — si ya existe y está activo devuelve { ok: true, already: true }.
 * - Si estaba desuscrito lo reactiva.
 */

import { NextRequest, NextResponse } from "next/server";
import { RateLimiterMemory, RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";
import { redis } from "@/lib/redis";
import { db } from "@/lib/db";
import { reportApiError } from "@/lib/api-error";
import { getClientIP } from "@/lib/api-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Rate limiter — 3 peticiones por hora por IP
// ---------------------------------------------------------------------------

const limiter: RateLimiterRedis | RateLimiterMemory = redis
  ? new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: "ratelimit:newsletter-subscribe",
      points: 3,
      duration: 3600,
      blockDuration: 3600,
    })
  : new RateLimiterMemory({
      keyPrefix: "ratelimit:newsletter-subscribe",
      points: 3,
      duration: 3600,
      blockDuration: 3600,
    });

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SubscribePayload {
  email: string;
  source: string;
}

function validate(body: unknown):
  | { ok: true; data: SubscribePayload }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Solicitud no válida" };
  }
  const b = body as Record<string, unknown>;

  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 120) {
    return { ok: false, error: "Email no válido" };
  }

  const rawSource = typeof b.source === "string" ? b.source.trim() : "";
  const source = rawSource.length > 0 ? rawSource.slice(0, 40) : "footer-cta";

  return { ok: true, data: { email, source } };
}

// ---------------------------------------------------------------------------
// IP truncation — keeps only first 2 octets for GDPR proof-of-consent
// without storing a full identifiable address.
// ---------------------------------------------------------------------------

function truncateIP(ip: string): string {
  // IPv4: "81.47.123.45" → "81.47"
  const v4 = ip.match(/^(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (v4) return v4[1];
  // IPv6: keep first two groups (e.g. "2a02:ec80") for rough geo-proof
  const v6 = ip.match(/^([0-9a-f]{1,4}:[0-9a-f]{1,4}):/i);
  if (v6) return v6[1];
  // Fallback: store nothing identifiable
  return "";
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIP(request);

  // Rate limit
  try {
    await limiter.consume(ip);
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      return NextResponse.json(
        { ok: false, error: "Demasiados intentos. Inténtalo más tarde." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(error.msBeforeNext / 1000)) } }
      );
    }
    reportApiError(error, "newsletter-subscribe] Rate limiter error (fail open)");
  }

  // Parse + validate
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const v = validate(json);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
  }

  const { email, source } = v.data;
  const ipTruncated = truncateIP(ip);
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 512);
  const country = request.headers.get("cf-ipcountry") ?? undefined;

  try {
    const existing = await db.newsletterSubscriber.findUnique({ where: { email } });

    if (existing) {
      if (existing.status === "active") {
        // Already subscribed and active — user-friendly, no error
        return NextResponse.json({ ok: true, already: true });
      }

      // Reactivate unsubscribed (or bounced) subscriber
      await db.newsletterSubscriber.update({
        where: { email },
        data: {
          status: "active",
          source,
          ip: ipTruncated || undefined,
          userAgent: userAgent || undefined,
          country: country || undefined,
          subscribedAt: new Date(),
          unsubscribedAt: null,
        },
      });

      return NextResponse.json({ ok: true });
    }

    // New subscriber
    await db.newsletterSubscriber.create({
      data: {
        email,
        source,
        ip: ipTruncated || undefined,
        userAgent: userAgent || undefined,
        country: country || undefined,
        status: "active",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    reportApiError(error, "newsletter-subscribe] DB error");
    return NextResponse.json(
      { ok: false, error: "Error al procesar la suscripción. Inténtalo más tarde." },
      { status: 500 }
    );
  }
}
