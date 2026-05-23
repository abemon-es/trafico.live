/**
 * POST /api/billing/refund — Admin-only refund endpoint
 *
 * Auth: x-admin-secret header must match ADMIN_SECRET env var.
 * B1 note: a proper admin-role session check will replace header auth in a future sprint.
 *
 * Body:
 *   chargeId  string  (required)  Stripe charge ID (ch_...)
 *   amount    number  (optional)  Partial refund amount in cents. Omit for full refund.
 *   reason    string  (optional)  "duplicate" | "fraudulent" | "requested_by_customer"
 *
 * Responses:
 *   200  { refund: Stripe.Refund }
 *   400  Missing / invalid body
 *   403  Missing or wrong admin secret
 *   500  Stripe API error (never silent-fails — always returns detail)
 */

import { NextRequest, NextResponse } from "next/server";
import { createRefund } from "@/lib/stripe";
import { safeCompare } from "@/lib/auth";

export const dynamic = "force-dynamic";

const VALID_REASONS = ["duplicate", "fraudulent", "requested_by_customer"] as const;
type RefundReason = (typeof VALID_REASONS)[number];

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Admin auth ────────────────────────────────────────────────────────────
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    // Misconfiguration — never grant access when the expected secret is absent
    console.error("[billing/refund] ADMIN_SECRET env var is not set");
    return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
  }

  const headerSecret = request.headers.get("x-admin-secret");
  // Constant-time compare — `!==` on strings short-circuits on the first
  // mismatched byte and leaks the correct prefix via timing.
  if (!headerSecret || !safeCompare(headerSecret, adminSecret)) {
    return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud no válido (JSON esperado)" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Cuerpo de la solicitud no válido" }, { status: 400 });
  }

  const { chargeId, amount, reason } = body as Record<string, unknown>;

  if (!chargeId || typeof chargeId !== "string" || !chargeId.startsWith("ch_")) {
    return NextResponse.json(
      { error: "chargeId es obligatorio y debe comenzar con 'ch_'" },
      { status: 400 },
    );
  }

  if (amount !== undefined && (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0)) {
    return NextResponse.json(
      { error: "amount debe ser un entero positivo en céntimos" },
      { status: 400 },
    );
  }

  const validatedReason: RefundReason | undefined =
    reason !== undefined && VALID_REASONS.includes(reason as RefundReason)
      ? (reason as RefundReason)
      : undefined;

  if (reason !== undefined && !validatedReason) {
    return NextResponse.json(
      {
        error: "reason no válido",
        valoresPermitidos: VALID_REASONS,
      },
      { status: 400 },
    );
  }

  // ── Create refund ─────────────────────────────────────────────────────────
  try {
    const refund = await createRefund(chargeId, validatedReason);

    console.info("[billing/refund] Refund created", {
      refundId: refund.id,
      chargeId,
      amount: refund.amount,
      reason: refund.reason,
      status: refund.status,
    });

    return NextResponse.json({ refund });
  } catch (error) {
    // Never silent-fail on Stripe errors — return detail for admin debugging
    const message = error instanceof Error ? error.message : String(error);
    console.error("[billing/refund] Stripe error:", message, { chargeId });

    return NextResponse.json(
      {
        error: "Error al crear el reembolso en Stripe",
        detalle: message,
      },
      { status: 500 },
    );
  }
}
