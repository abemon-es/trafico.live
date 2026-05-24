/**
 * POST /api/billing/portal
 *
 * Crea una sesión del Customer Portal de Stripe para el usuario autenticado
 * y redirige al portal (o devuelve { url } para clientes fetch).
 *
 * Seguridad:
 *   - Requiere sesión NextAuth válida (auth() de src/lib/auth-config.ts).
 *     Sin sesión → 401. No acepta email desde el body.
 *   - El stripeCustomerId se extrae de ApiKey del usuario en base de datos,
 *     no de la petición del cliente.
 *   - Rate limit: 10 peticiones/hora por IP.
 *
 * Flujo:
 *   1. Verificar sesión → obtener email
 *   2. Buscar ApiKey activa con stripeCustomerId para ese email
 *   3. Si no hay customerId → 404 (sin suscripción gestionable)
 *   4. Crear Stripe Portal Session → redirigir
 */

import { NextRequest, NextResponse } from "next/server";
import { RateLimiterMemory, RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";
import { auth } from "@/lib/auth-config";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { createPortalSession } from "@/lib/stripe";
import { getClientIP } from "@/lib/api-utils";
import { reportApiError } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Rate limiter — 10 peticiones por hora por IP
// ---------------------------------------------------------------------------

const limiter: RateLimiterRedis | RateLimiterMemory = redis
  ? new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: "ratelimit:billing-portal",
      points: 10,
      duration: 3600,
      blockDuration: 3600,
    })
  : new RateLimiterMemory({
      keyPrefix: "ratelimit:billing-portal",
      points: 10,
      duration: 3600,
      blockDuration: 3600,
    });

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
        { error: "Demasiadas peticiones. Inténtalo más tarde." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(error.msBeforeNext / 1000)) } },
      );
    }
    reportApiError(error, "billing-portal] Rate limiter error (fail open)");
  }

  // Auth — require valid NextAuth session
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Autenticación requerida." },
      { status: 401 },
    );
  }

  const email = session.user.email;

  // Look up Stripe customer ID from the user's active ApiKey
  let stripeCustomerId: string | null = null;
  try {
    const apiKey = await prisma.apiKey.findFirst({
      where: { email, isActive: true, stripeCustomerId: { not: null } },
      orderBy: { tier: "desc" },
      select: { stripeCustomerId: true },
    });
    stripeCustomerId = apiKey?.stripeCustomerId ?? null;
  } catch (error) {
    reportApiError(error, "billing-portal] DB lookup failed");
    return NextResponse.json(
      { error: "Error interno. Inténtalo más tarde." },
      { status: 500 },
    );
  }

  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: "No se encontró ninguna suscripción activa para esta cuenta." },
      { status: 404 },
    );
  }

  // Build return URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://trafico.live";
  const returnUrl = `${baseUrl}/dashboard/billing`;

  // Create Stripe portal session
  let portalUrl: string;
  try {
    portalUrl = await createPortalSession(stripeCustomerId, returnUrl);
  } catch (error) {
    reportApiError(error, "billing-portal] Stripe portal session creation failed");
    return NextResponse.json(
      { error: "No se pudo acceder al portal de facturación. Inténtalo más tarde." },
      { status: 502 },
    );
  }

  // Detect whether the caller is a fetch/XHR client or a native form POST.
  // A native <form> POST sends Accept: text/html; a fetch client sends
  // Accept: application/json or */*. Redirect works for both — for the
  // form POST the browser follows it directly; for fetch clients,
  // a 303 redirect is also fine, but returning JSON is more explicit.
  const acceptHeader = request.headers.get("accept") ?? "";
  if (acceptHeader.includes("application/json")) {
    return NextResponse.json({ url: portalUrl });
  }

  // For native form submissions — 303 See Other to preserve GET semantics
  return NextResponse.redirect(portalUrl, 303);
}
