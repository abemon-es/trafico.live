/**
 * POST /api/newsletter/events
 *
 * Resend webhook handler for email delivery events.
 * Handles: delivered, opened, clicked, bounced, complained.
 *
 * Resend sends a SVIX-style signature. Verification uses the
 * RESEND_WEBHOOK_SECRET env var.
 *
 * NOTE: If using SES instead of Resend, this endpoint can be adapted
 * to receive SNS notifications from SES. The event structure differs
 * but the business logic (bounce → BOUNCED, complaint → UNSUBSCRIBED)
 * remains the same.
 *
 * Required env vars:
 *   RESEND_WEBHOOK_SECRET  — Webhook signing secret from Resend dashboard
 *
 * Schema additions proposed at bottom of this file.
 *
 * LSSI-SM compliance:
 *   - Complaints immediately mark subscription UNSUBSCRIBED
 *   - Bounces mark subscription BOUNCED (permanent) or log (transient)
 */

import { type NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Resend webhook event envelope
interface ResendWebhookEvent {
  type:
    | "email.delivered"
    | "email.opened"
    | "email.clicked"
    | "email.bounced"
    | "email.complained";
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject?: string;
    click?: { link: string; userAgent?: string };
    bounce?: { type: "hard" | "soft"; message?: string };
  };
}

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

/**
 * Verifies the Resend webhook signature.
 * Resend uses SVIX-compatible headers:
 *   svix-id, svix-timestamp, svix-signature
 *
 * Signature = HMAC-SHA256(svix-id + "." + svix-timestamp + "." + rawBody)
 * Encoded as base64 with "v1," prefix.
 */
function verifyResendSignature(
  rawBody: string,
  headers: Headers,
  secret: string
): boolean {
  const msgId = headers.get("svix-id");
  const msgTimestamp = headers.get("svix-timestamp");
  const msgSignature = headers.get("svix-signature");

  if (!msgId || !msgTimestamp || !msgSignature) return false;

  // Reject messages older than 5 minutes (replay protection)
  const timestampSeconds = parseInt(msgTimestamp, 10);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > 300) return false;

  const signedContent = `${msgId}.${msgTimestamp}.${rawBody}`;
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const computedHmac = createHmac("sha256", secretBytes)
    .update(signedContent, "utf8")
    .digest("base64");

  // msgSignature may contain multiple space-separated "v1,<base64>" signatures
  const signatures = msgSignature.split(" ");
  for (const sig of signatures) {
    const base64Sig = sig.replace(/^v1,/, "");
    try {
      if (
        timingSafeEqual(
          Buffer.from(computedHmac, "base64"),
          Buffer.from(base64Sig, "base64")
        )
      ) {
        return true;
      }
    } catch {
      // Buffer length mismatch — invalid signature, continue checking
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleDelivered(event: ResendWebhookEvent): Promise<void> {
  // Just log — no subscriber state change needed
  console.log(`[newsletter:events] Delivered: ${event.data.to[0]} email_id=${event.data.email_id}`);

  await logEvent(event.data.email_id, event.data.to[0], "delivered", null);
}

async function handleOpened(event: ResendWebhookEvent): Promise<void> {
  const email = event.data.to[0];
  console.log(`[newsletter:events] Opened: ${email}`);

  await logEvent(event.data.email_id, email, "opened", null);
}

async function handleClicked(event: ResendWebhookEvent): Promise<void> {
  const email = event.data.to[0];
  const link = event.data.click?.link ?? "";
  console.log(`[newsletter:events] Clicked: ${email} → ${link}`);

  await logEvent(event.data.email_id, email, "clicked", { link });
}

async function handleBounced(event: ResendWebhookEvent): Promise<void> {
  const email = event.data.to[0];
  const bounceType = event.data.bounce?.type ?? "hard";
  console.warn(`[newsletter:events] Bounced (${bounceType}): ${email}`);

  await logEvent(event.data.email_id, email, "bounced", { type: bounceType });

  // Only mark permanent (hard) bounces as BOUNCED
  if (bounceType === "hard") {
    await prisma.digestSubscriber.updateMany({
      where: { email, isActive: true },
      data: { isActive: false },
    });
    console.log(`[newsletter:events] Marked ${email} as inactive (hard bounce)`);
  }
}

async function handleComplained(event: ResendWebhookEvent): Promise<void> {
  const email = event.data.to[0];
  console.warn(`[newsletter:events] Complaint: ${email} — marking UNSUBSCRIBED immediately (LSSI)`);

  await logEvent(event.data.email_id, email, "complained", null);

  // LSSI-SM compliance: immediate unsubscribe on complaint
  await prisma.digestSubscriber.updateMany({
    where: { email },
    data: { isActive: false },
  });
}

// ---------------------------------------------------------------------------
// Event logging
// ---------------------------------------------------------------------------

/**
 * Logs the event to DigestEmailEvent table.
 *
 * PROPOSED SCHEMA ADDITION (add to prisma/schema.prisma):
 *
 * model DigestEmailEvent {
 *   id        String   @id @default(cuid())
 *   emailId   String   // Resend/SES message ID
 *   email     String   // recipient address
 *   eventType String   // delivered | opened | clicked | bounced | complained
 *   metadata  Json?    // event-specific data (link, bounceType, etc.)
 *   createdAt DateTime @default(now())
 *
 *   @@index([email])
 *   @@index([emailId])
 *   @@index([eventType, createdAt])
 * }
 */
async function logEvent(
  emailId: string,
  email: string,
  eventType: string,
  metadata: Record<string, string> | null
): Promise<void> {
  try {
    // DigestEmailEvent model is proposed — use a safe dynamic access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (prisma as any).digestEmailEvent;
    if (typeof model?.create === "function") {
      await model.create({
        data: { emailId, email, eventType, metadata },
      });
    } else {
      // Fallback: log to console until migration is applied
      console.log(
        `[newsletter:events] LOG emailId=${emailId} email=${email} type=${eventType}`,
        metadata ?? ""
      );
    }
  } catch (err) {
    // Never fail the webhook response due to a logging error
    console.error("[newsletter:events] logEvent error:", err);
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[newsletter:events] RESEND_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const rawBody = await request.text();

  // Verify signature
  const isValid = verifyResendSignature(rawBody, request.headers, secret);
  if (!isValid) {
    console.warn("[newsletter:events] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(rawBody) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!event.type || !event.data?.to?.[0]) {
    return NextResponse.json({ error: "Malformed event" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "email.delivered":
        await handleDelivered(event);
        break;
      case "email.opened":
        await handleOpened(event);
        break;
      case "email.clicked":
        await handleClicked(event);
        break;
      case "email.bounced":
        await handleBounced(event);
        break;
      case "email.complained":
        await handleComplained(event);
        break;
      default:
        console.log(`[newsletter:events] Unknown event type: ${(event as { type: string }).type}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[newsletter:events] Handler error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Resend requires 200 OK within 5s — disable body parsing to avoid timeout
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
