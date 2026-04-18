/**
 * Affiliate redirect handler — /go/[partner]/[slug]
 *
 * Flow:
 *   1. Resolve AffiliateOffer (DB → static fallback)
 *   2. Generate subId + read/set tl_session cookie
 *   3. Fire-and-forget: record AffiliateClick row + GA4 MP event
 *   4. 302 redirect to partner deep-link with subId appended
 *
 * No auth required (public redirector).
 * Never blocks on slow ops — click recording and GA4 are fire-and-forget.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateSubId,
  resolveOffer,
  buildPartnerUrl,
  recordClick,
} from "@/lib/affiliate";
import { sendEvent } from "@/lib/ga4-measurement-protocol";
import { randomBytes } from "crypto";

/** Cookie name used for anonymous session tracking. */
const SESSION_COOKIE = "tl_session";
/** 1 year TTL for session cookie. */
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 365;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ partner: string; slug: string }> }
): Promise<NextResponse> {
  const { partner, slug } = await params;

  // 1. Resolve offer
  const offer = await resolveOffer(partner, slug);

  if (!offer) {
    return NextResponse.json(
      { error: "offer_not_found", partner, slug },
      { status: 404 }
    );
  }

  // 2. Generate subId + resolve session
  const subId = generateSubId();

  const existingSession = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionId = existingSession ?? randomBytes(16).toString("hex");
  const isNewSession = !existingSession;

  // Optional: user id from auth header / session — best-effort only
  const userId: string | undefined = undefined; // B1 auth() not yet in scope for /ir

  // 3. Build redirect URL
  const partnerUrl = buildPartnerUrl({
    deepLink: offer.deepLink,
    subId,
    partner,
  });

  // 3a. Referrer path for analytics
  const referrerPath = request.headers.get("referer") ?? undefined;

  // 3b. GA4 client_id — use sessionId as stable client_id proxy
  const clientId = sessionId;

  // Fire-and-forget: DB click record (never blocks redirect)
  recordClick({
    offerId: offer.offerId,
    subId,
    userId,
    sessionId,
    referrerPath,
    partner,
    slug,
  }).catch((err) =>
    console.warn("[ir] recordClick failed:", err instanceof Error ? err.message : err)
  );

  // Fire-and-forget: GA4 Measurement Protocol event (never blocks redirect)
  sendEvent({
    clientId,
    sessionId,
    userId,
    event: {
      name: "affiliate_click",
      params: {
        partner,
        slug,
        ...(offer.product && { product: offer.product }),
        ...(offer.priceEur !== undefined && {
          value: offer.priceEur,
          currency: "EUR",
        }),
        session_id: sessionId,
        sub_id: subId,
      },
    },
  }).catch((err) =>
    console.warn("[ir] ga4 event failed:", err instanceof Error ? err.message : err)
  );

  // 4. Build 302 response
  const response = NextResponse.redirect(partnerUrl, 302);

  // Cache-Control: no-store — each redirect must be fresh (tracking depends on it)
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

  // Set session cookie if new
  if (isNewSession) {
    const isProduction = process.env.NODE_ENV === "production";
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: SESSION_TTL_SECONDS,
      path: "/",
    });
  }

  return response;
}
