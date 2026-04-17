import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent, getStripe, getSubscriptionTier } from "@/lib/stripe";
import { API_TIERS } from "@/lib/api-tiers";
import prisma from "@/lib/db";
import { randomBytes } from "crypto";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/webhook — Stripe webhook receiver.
 *
 * Handled events:
 *   - checkout.session.completed       → provision new API key at correct tier
 *   - customer.subscription.updated    → update tier + rate limits on existing keys
 *   - customer.subscription.deleted    → downgrade all keys for customer to FREE
 *   - invoice.payment_failed           → suspend keys (isActive=false) pending retry
 *
 * Return 200 for all events we acknowledge (even partial failures) so Stripe does NOT
 * retry unnecessarily. Return 400 only for invalid signatures. Return 500 only for
 * unexpected infrastructure errors where a Stripe retry is actually desirable.
 */
export async function POST(request: NextRequest) {
  let event: Stripe.Event;

  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }
    event = constructWebhookEvent(body, signature);
  } catch (error) {
    // Signature verification failure — 400 so Stripe stops retrying this payload.
    console.error("[webhook] Signature verification failed:", error);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, event.id);
        break;
      }

      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, event.id);
        break;
      }

      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, event.id);
        break;
      }

      case "invoice.payment_failed": {
        await handlePaymentFailed(event.data.object as Stripe.Invoice, event.id);
        break;
      }

      default: {
        // Log unhandled events so we know what to add next — never silently discard.
        console.warn(`[webhook] Unhandled event type: ${event.type}`, { eventId: event.id });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Unexpected processing error — 500 so Stripe will retry (desirable for DB failures, etc.)
    console.error(`[webhook] Unhandled error processing event ${event.id} (${event.type}):`, error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/**
 * Provision a new API key when a checkout completes.
 * Uses upsert on email so re-purchasing upgrades an existing FREE key instead
 * of creating a duplicate.
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  eventId: string,
): Promise<void> {
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!customerId) {
    console.error(`[webhook] checkout.session.completed: missing customerId`, {
      eventId,
      sessionId: session.id,
    });
    return; // Return 200 — nothing to retry, data is fundamentally absent.
  }

  // Resolve customer email — prefer session field, fall back to Stripe customer fetch.
  let email = session.customer_email;
  if (!email) {
    try {
      const customer = await getStripe().customers.retrieve(customerId);
      if (!customer.deleted && "email" in customer && customer.email) {
        email = customer.email;
      }
    } catch (err) {
      console.error(
        `[webhook] checkout.session.completed: failed to retrieve customer ${customerId}`,
        err,
      );
    }
  }
  if (!email) {
    console.error(
      `[webhook] checkout.session.completed: no email for customer ${customerId}`,
      { eventId },
    );
    return;
  }

  // Resolve tier from subscription price.
  const tier = await resolveTierFromSubscription(subscriptionId, eventId);
  const tierConfig = API_TIERS[tier];

  // Generate a key with a recognisable prefix per tier.
  const tierSlug = tier === "ENTERPRISE" ? "ent" : "pro";
  const key = `tl_${tierSlug}_${randomBytes(24).toString("hex")}`;

  // Upsert: if the user already has an active key (e.g. upgraded), update it.
  const existing = await prisma.apiKey.findFirst({ where: { email, isActive: true } });
  if (existing) {
    await prisma.apiKey.update({
      where: { id: existing.id },
      data: {
        tier,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId ?? null,
        rateLimitPerMinute: tierConfig.rateLimitPerMinute,
        rateLimitPerDay: clampInt(tierConfig.rateLimitPerDay),
        isActive: true,
      },
    });
    console.log(`[webhook] Upgraded existing key ${existing.id} to ${tier} for ${email}`);
  } else {
    await prisma.apiKey.create({
      data: {
        key,
        name: `${tier} key for ${email}`,
        email,
        tier,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId ?? null,
        rateLimitPerMinute: tierConfig.rateLimitPerMinute,
        rateLimitPerDay: clampInt(tierConfig.rateLimitPerDay),
      },
    });
    console.log(`[webhook] Created ${tier} key for ${email}`, { eventId });
  }
}

/**
 * Handle subscription upgrades/downgrades — update tier + rate limits on all
 * active keys for the customer.
 */
async function handleSubscriptionUpdated(
  sub: Stripe.Subscription,
  eventId: string,
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) {
    console.error(`[webhook] customer.subscription.updated: missing customerId`, { eventId });
    return; // Return 200 — retrying won't fix missing data.
  }

  const newTier = getSubscriptionTier(sub);
  const tierConfig = API_TIERS[newTier];

  const result = await prisma.apiKey.updateMany({
    where: { stripeCustomerId: customerId, isActive: true },
    data: {
      tier: newTier,
      rateLimitPerMinute: tierConfig.rateLimitPerMinute,
      rateLimitPerDay: clampInt(tierConfig.rateLimitPerDay),
    },
  });
  console.log(
    `[webhook] customer.subscription.updated: updated ${result.count} key(s) to ${newTier} for customer ${customerId}`,
    { eventId },
  );
}

/**
 * Downgrade all keys for a cancelled subscription to FREE tier.
 */
async function handleSubscriptionDeleted(
  sub: Stripe.Subscription,
  eventId: string,
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) {
    console.error(`[webhook] customer.subscription.deleted: missing customerId`, { eventId });
    return;
  }

  const freeConfig = API_TIERS["FREE"];

  const result = await prisma.apiKey.updateMany({
    where: { stripeCustomerId: customerId, isActive: true },
    data: {
      tier: "FREE",
      rateLimitPerMinute: freeConfig.rateLimitPerMinute,
      rateLimitPerDay: freeConfig.rateLimitPerDay,
      stripeSubscriptionId: null,
    },
  });
  console.log(
    `[webhook] customer.subscription.deleted: downgraded ${result.count} key(s) to FREE for customer ${customerId}`,
    { eventId },
  );
}

/**
 * Mark keys as inactive (past_due) when a payment fails.
 * Stripe retries payments automatically; keys are reactivated on
 * customer.subscription.updated when payment succeeds.
 *
 * Note: schema has no `status` field — we use `isActive=false` as the
 * past_due signal. T3.6 may add a `status` enum field in a future schema
 * migration to make this more expressive.
 */
async function handlePaymentFailed(invoice: Stripe.Invoice, eventId: string): Promise<void> {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

  if (!customerId) {
    console.error(`[webhook] invoice.payment_failed: missing customerId`, { eventId });
    return;
  }

  const attemptCount = (invoice as Stripe.Invoice & { attempt_count?: number }).attempt_count ?? 0;

  // Only suspend after multiple failures (Stripe default: 4 attempts over ~4 weeks).
  // On first failure, just log — give the customer a chance to fix their card.
  if (attemptCount >= 3) {
    const result = await prisma.apiKey.updateMany({
      where: { stripeCustomerId: customerId, isActive: true },
      data: { isActive: false },
    });
    console.warn(
      `[webhook] invoice.payment_failed: suspended ${result.count} key(s) for customer ${customerId} after ${attemptCount} attempts`,
      { eventId },
    );
  } else {
    console.warn(
      `[webhook] invoice.payment_failed: attempt ${attemptCount} for customer ${customerId} — keys remain active`,
      { eventId },
    );
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolve tier from a subscription ID by fetching from Stripe.
 * Falls back to "PRO" on any error — never silently defaults to ENTERPRISE
 * (that would grant excess access), and never silently defaults to FREE
 * (that would deny paid access immediately after checkout).
 */
async function resolveTierFromSubscription(
  subId: string | null | undefined,
  eventId: string,
): Promise<"PRO" | "ENTERPRISE"> {
  if (!subId) {
    console.warn(`[webhook] resolveTierFromSubscription: no subscriptionId`, { eventId });
    return "PRO";
  }
  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subId);
    const tier = getSubscriptionTier(sub);
    // getSubscriptionTier can return "FREE" for unknown prices — default to PRO in that case.
    return tier === "ENTERPRISE" ? "ENTERPRISE" : "PRO";
  } catch (err) {
    console.error(
      `[webhook] resolveTierFromSubscription: failed to retrieve subscription ${subId}`,
      err,
      { eventId },
    );
    return "PRO";
  }
}

/**
 * Clamp a potentially-huge rate-limit value (Number.MAX_SAFE_INTEGER for ENTERPRISE)
 * to the maximum safe 32-bit integer for Prisma/Postgres Int columns.
 */
function clampInt(value: number): number {
  const PG_INT_MAX = 2_147_483_647;
  return Math.min(value, PG_INT_MAX);
}
