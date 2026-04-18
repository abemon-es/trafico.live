/**
 * POST /api/billing/portal — Stripe Customer Portal redirect
 *
 * Returns a short-lived Stripe portal URL so the customer can manage their
 * subscription (cancel, update payment method, view invoices) without our code
 * needing to handle any of that.
 *
 * Security:
 *   TODO(B1): Replace email-based customer lookup with session authentication
 *   once B1's session middleware is in place. The current approach accepts
 *   `email` in the request body and looks up the Stripe customer directly —
 *   this is acceptable for S0 (no session system yet) but must be replaced
 *   before launch to prevent enumeration of portal links by email.
 *
 * Body:
 *   email       string  (required)  Customer email address
 *   returnPath  string  (optional)  Path to return to after leaving portal (default: /api-docs)
 *
 * Responses:
 *   200  { url: string }  — Stripe portal session URL (redirect client here)
 *   400  Missing / invalid email
 *   404  No Stripe customer found for this email
 *   500  Stripe API error
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe, createPortalSession } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://trafico.live";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de la solicitud no válido (JSON esperado)" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Cuerpo de la solicitud no válido" }, { status: 400 });
  }

  const { email, returnPath } = body as Record<string, unknown>;

  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "El campo 'email' es obligatorio y debe ser una dirección de correo válida" },
      { status: 400 },
    );
  }

  const resolvedReturnPath =
    typeof returnPath === "string" && returnPath.startsWith("/") ? returnPath : "/api-docs";
  const returnUrl = `${BASE_URL}${resolvedReturnPath}`;

  // ── Look up Stripe customer by email ─────────────────────────────────────
  // TODO(B1): Replace with session-based customer lookup
  let customerId: string;
  try {
    const stripe = getStripe();
    const customers = await stripe.customers.list({ email, limit: 1 });

    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: "No se encontró ningún cliente de Stripe con ese correo electrónico" },
        { status: 404 },
      );
    }

    customerId = customers.data[0].id;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[billing/portal] Stripe customer lookup error:", message, { email });
    return NextResponse.json(
      {
        error: "Error al consultar el cliente en Stripe",
        detalle: message,
      },
      { status: 500 },
    );
  }

  // ── Create portal session ─────────────────────────────────────────────────
  try {
    const url = await createPortalSession(customerId, returnUrl);
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[billing/portal] Portal session error:", message, {
      customerId,
      returnUrl,
    });
    return NextResponse.json(
      {
        error: "Error al crear la sesión del portal de facturación",
        detalle: message,
      },
      { status: 500 },
    );
  }
}
