/**
 * Affiliate conversion postback endpoint — POST /api/admin/affiliates/convert
 *
 * Called by affiliate networks when a conversion (booking/purchase) is reported.
 * Supported networks: Awin, Impact (Skyscanner), Rakuten.
 *
 * Each partner uses a different shared secret for HMAC-SHA256 verification:
 *   Awin:     AWIN_POSTBACK_SECRET
 *   Impact:   IMPACT_POSTBACK_SECRET   (also used by Skyscanner Partners)
 *   Rakuten:  RAKUTEN_POSTBACK_SECRET
 *   FlixBus:  FLIXBUS_POSTBACK_SECRET
 *   Trainline: TRAINLINE_POSTBACK_SECRET
 *   DirectFerries: DIRECTFERRIES_POSTBACK_SECRET
 *
 * Request body (JSON):
 *   { subId, amount, currency, transactionId, partner }
 *
 * Signature header: X-Postback-Signature: sha256=<hex>
 *   HMAC-SHA256 of the raw request body using the partner's secret.
 *
 * Returns 200 immediately on success, 400 on bad input, 401 on bad signature, 500 on DB error.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

const PARTNER_SECRETS: Record<string, string | undefined> = {
  awin: process.env.AWIN_POSTBACK_SECRET,
  skyscanner: process.env.IMPACT_POSTBACK_SECRET,
  impact: process.env.IMPACT_POSTBACK_SECRET,
  rakuten: process.env.RAKUTEN_POSTBACK_SECRET,
  flixbus: process.env.FLIXBUS_POSTBACK_SECRET,
  trainline: process.env.TRAINLINE_POSTBACK_SECRET,
  directferries: process.env.DIRECTFERRIES_POSTBACK_SECRET,
};

interface ConversionBody {
  subId: string;
  amount: number | string;
  currency?: string;
  transactionId?: string;
  partner: string;
}

function verifyHmac(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;

  // Signature format: "sha256=<hex>" or just "<hex>"
  const sigHex = signature.startsWith("sha256=") ? signature.slice(7) : signature;

  const expected = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  try {
    const expectedBuf = Buffer.from(expected, "hex");
    const receivedBuf = Buffer.from(sigHex, "hex");
    if (expectedBuf.length !== receivedBuf.length) return false;
    return timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();

  let body: ConversionBody;
  try {
    body = JSON.parse(rawBody) as ConversionBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { subId, amount, currency = "EUR", transactionId, partner } = body;

  if (!subId || !partner) {
    return NextResponse.json(
      { error: "missing_required_fields", required: ["subId", "partner"] },
      { status: 400 }
    );
  }

  // HMAC signature verification
  const partnerKey = partner.toLowerCase();
  const secret = PARTNER_SECRETS[partnerKey];

  if (secret) {
    const signature = request.headers.get("x-postback-signature");
    if (!verifyHmac(rawBody, signature, secret)) {
      console.warn(`[convert] Invalid HMAC signature for partner=${partner} subId=${subId}`);
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }
  } else {
    // No secret configured for this partner — log but allow in non-production
    if (process.env.NODE_ENV === "production") {
      console.warn(`[convert] No postback secret configured for partner=${partner} — rejecting in production`);
      return NextResponse.json({ error: "partner_not_configured" }, { status: 401 });
    }
    console.warn(`[convert] No postback secret for partner=${partner} — allowing in dev/staging`);
  }

  // Convert amount to EUR decimal
  const amountNum = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(amountNum) || amountNum < 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  // Update AffiliateClick row
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = (await import("@/lib/db")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (prisma as any).affiliateClick;

    if (!model) {
      console.warn("[convert] AffiliateClick table not available");
      return NextResponse.json({ ok: true, note: "table_not_available" }, { status: 200 });
    }

    // Find click by subId (stored in the click row)
    const click = await model.findFirst({
      where: { subId },
    });

    if (!click) {
      console.warn(`[convert] No AffiliateClick found for subId=${subId}`);
      // Return 200 to avoid partner retrying — the click record may have been cleaned up
      return NextResponse.json({ ok: true, note: "click_not_found" }, { status: 200 });
    }

    await model.update({
      where: { id: click.id },
      data: {
        converted: true,
        convertedEur: amountNum,
        convertedAt: new Date(),
        ...(transactionId && { transactionId }),
      },
    });

    console.info(
      `[convert] Conversion recorded: partner=${partner} subId=${subId} amount=${amountNum}${currency} txn=${transactionId ?? "n/a"}`
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[convert] DB error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
