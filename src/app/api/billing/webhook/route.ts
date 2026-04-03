import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent, getStripe } from "@/lib/stripe";
import prisma from "@/lib/db";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/webhook — Stripe webhook
 *
 * Events: checkout.session.completed, subscription.updated/deleted, invoice.payment_failed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const event = constructWebhookEvent(body, signature);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        if (!customerId) {
          console.error(`[webhook] checkout.session.completed missing customerId`, { sessionId: session.id });
          break;
        }

        // Resolve email from session or Stripe customer object
        let email = session.customer_email;
        if (!email) {
          try {
            const customer = await getStripe().customers.retrieve(customerId);
            if ("email" in customer && customer.email) email = customer.email;
          } catch (err) {
            console.error(`[webhook] Failed to resolve email for customer ${customerId}`, err);
          }
        }
        if (!email) {
          console.error(`[webhook] checkout.session.completed: no email for customer ${customerId}`);
          break;
        }

        const tier = await getTierFromSubscription(subscriptionId);
        const key = `tl_${tier.toLowerCase()}_${randomBytes(24).toString("hex")}`;

        await prisma.apiKey.create({
          data: {
            key,
            name: `${tier} key for ${email}`,
            email,
            tier,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId || null,
            rateLimitPerMinute: tier === "ENTERPRISE" ? 300 : 60,
            rateLimitPerDay: tier === "ENTERPRISE" ? 500_000 : 50_000,
          },
        });
        console.log(`[webhook] Created ${tier} key for ${email}`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        if (!customerId) break;

        const newTier = await getTierFromSubscription(sub.id);
        await prisma.apiKey.updateMany({
          where: { stripeCustomerId: customerId, isActive: true },
          data: {
            tier: newTier,
            rateLimitPerMinute: newTier === "ENTERPRISE" ? 300 : 60,
            rateLimitPerDay: newTier === "ENTERPRISE" ? 500_000 : 50_000,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        if (!customerId) break;

        await prisma.apiKey.updateMany({
          where: { stripeCustomerId: customerId, isActive: true },
          data: { tier: "FREE", rateLimitPerMinute: 10, rateLimitPerDay: 1000, stripeSubscriptionId: null },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (customerId) console.warn(`[webhook] Payment failed: ${customerId}`);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Distinguish signature errors (don't retry) from processing errors (retry)
    const isSignatureError = error instanceof Error && error.message.includes("signature");
    console.error("[webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: isSignatureError ? 400 : 500 },
    );
  }
}

async function getTierFromSubscription(subId: string | null | undefined): Promise<"PRO" | "ENTERPRISE"> {
  if (!subId) return "PRO";
  // Let Stripe errors propagate — caller must handle them.
  // Silently defaulting to PRO would downgrade ENTERPRISE customers.
  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subId);
  const priceId = sub.items.data[0]?.price?.id;
  if (!priceId) {
    console.error(`[webhook] Subscription ${subId} has no price item`);
    return "PRO";
  }
  return priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID ? "ENTERPRISE" : "PRO";
}
