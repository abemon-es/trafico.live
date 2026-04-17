# Stripe Sandbox Setup — trafico.live API Billing

> Environment: **Stripe Test Mode** only. No live keys here.

---

## 1. Prerequisites

- Stripe account at https://dashboard.stripe.com — use the **Test mode** toggle (top-right).
- Local `.env` file in the repo root (already in `.gitignore`).
- Stripe CLI installed: `brew install stripe/stripe-cli/stripe` (or see https://stripe.com/docs/stripe-cli).

---

## 2. Create Products and Prices

Go to **Dashboard → Catalog → Products** in test mode and create the three products below.

### Product 1: trafico-api-free

| Field         | Value                  |
|---------------|------------------------|
| Name          | trafico-api-free       |
| Description   | trafico.live Free API tier |
| Price         | None (no recurring price — free tier, no Stripe subscription) |

This product is informational only. No price is attached; free keys are provisioned directly in the DB.

---

### Product 2: trafico-api-pro

| Field              | Value                        |
|--------------------|------------------------------|
| Name               | trafico-api-pro              |
| Description        | trafico.live PRO API — 100 req/min, 100K req/day |
| Pricing model      | Standard pricing             |
| Recurring interval | Monthly                      |
| Price              | **€49.00 / month**           |
| Currency           | EUR                          |

After saving, copy the **Price ID** (format: `price_XXXXXXXXXXXXXXXX`) and add to `.env`:

```
STRIPE_PRO_PRICE_ID=price_XXXXXXXXXXXXXXXX
```

---

### Product 3: trafico-api-enterprise

| Field              | Value                        |
|--------------------|------------------------------|
| Name               | trafico-api-enterprise       |
| Description        | trafico.live ENTERPRISE API — 1000 req/min, unlimited req/day |
| Pricing model      | Standard pricing             |
| Recurring interval | Monthly                      |
| Price              | **€149.00 / month**          |
| Currency           | EUR                          |

Copy the Price ID and add to `.env`:

```
STRIPE_ENTERPRISE_PRICE_ID=price_YYYYYYYYYYYYYYYYYY
```

---

## 3. API Keys

Go to **Dashboard → Developers → API keys** (test mode).

Copy the **Secret key** (`sk_test_...`) and add to `.env`:

```
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXX
```

The **Publishable key** (`pk_test_...`) is only needed if the frontend renders a Stripe Elements form — not currently in scope for the API billing flow (we redirect to Checkout).

---

## 4. Configure the Webhook Endpoint

Go to **Dashboard → Developers → Webhooks → Add endpoint**.

| Field              | Value                                           |
|--------------------|-------------------------------------------------|
| Endpoint URL       | `https://trafico.live/api/billing/webhook`      |
| Listen to          | Events on your account                          |
| Select events      | See list below                                  |

### Events to subscribe

```
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_failed
invoice.payment_succeeded
```

After saving, click **Reveal signing secret** and add to `.env`:

```
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXX
```

> For local development, use `stripe listen` (see Section 7) — it generates a separate signing secret for the local tunnel.

---

## 5. Stripe Tax (EU VAT) — S1 Enablement Note

EU VAT compliance is required before going live. Steps for S1:

1. Go to **Dashboard → Tax → Get started**.
2. Enable automatic tax calculation.
3. Add your business address (Spain — applicable VAT rate auto-applied).
4. On `createCheckoutSession` in `src/lib/stripe.ts`, add `automatic_tax: { enabled: true }` when ready (currently omitted for sandbox).
5. Set `tax_id_collection: { enabled: true }` on the checkout session so B2B customers can enter their NIF/VAT number for 0% intra-EU supply.

> Stripe Tax is included at no extra cost. Target: enabled before S1 (launch gate).

---

## 6. Stripe Partner Program (Reseller/Affiliate)

If trafico.live plans to resell API access or build an affiliate programme:

- Application URL: https://stripe.com/partners/become-a-partner
- Select **Technology Partner** (build on top of Stripe APIs).
- Approval target: **< 7 business days** (typically 3–5 days for established businesses).
- Benefit: dedicated partner support, co-marketing, and enhanced rate limits.

---

## 7. Local Development — `stripe listen`

Use the Stripe CLI to forward webhook events to your local dev server.

```bash
# Start local listener — generates a whsec_... secret for localhost
stripe listen --forward-to localhost:3000/api/billing/webhook

# In a second terminal, trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

Copy the `whsec_...` secret printed by `stripe listen` into a local `.env.local` override:

```
STRIPE_WEBHOOK_SECRET=whsec_LOCAL_XXXXXXXXXXXXXXXX
```

> `.env.local` takes priority over `.env` in Next.js. Do not commit either file.

---

## 8. Test Checklist

Run through these steps in order to validate the full sandbox flow.

### 8.1 Tier Provisioning

- [ ] Call `POST /api/billing` with `{ "email": "test@example.com", "tier": "PRO" }`.
- [ ] Response contains a `url` pointing to Stripe Checkout.
- [ ] Open the URL, complete checkout with test card `4242 4242 4242 4242`, exp `12/34`, CVC `123`.
- [ ] Stripe triggers `checkout.session.completed` → webhook handler creates an `ApiKey` row with `tier=PRO`.
- [ ] `GET /api/billing` with the new key returns `tier: "PRO"`, `rateLimits: { perMinute: 100, perDay: 100000 }`.

### 8.2 Tier Upgrade

- [ ] Manually change the subscription price to `STRIPE_ENTERPRISE_PRICE_ID` in the Stripe dashboard.
- [ ] Stripe triggers `customer.subscription.updated`.
- [ ] `ApiKey` row updated to `tier=ENTERPRISE`, `rateLimitPerMinute=1000`.

### 8.3 Cancellation / Downgrade to FREE

- [ ] Cancel the subscription in the Stripe dashboard (or run `stripe trigger customer.subscription.deleted`).
- [ ] `ApiKey` row updated to `tier=FREE`, `rateLimitPerMinute=10`, `rateLimitPerDay=1000`, `stripeSubscriptionId=null`.

### 8.4 Payment Failure — Suspension

- [ ] Run `stripe trigger invoice.payment_failed` (or use test card `4000 0000 0000 0341` at checkout).
- [ ] On third+ failure, `ApiKey.isActive` set to `false`.
- [ ] Verify API calls with the key return 401.

### 8.5 Refund Flow (S2 prep)

```typescript
import { createRefund } from "@/lib/stripe";
const refund = await createRefund("ch_XXXXXXXX", "requested_by_customer");
console.log(refund.status); // "succeeded"
```

- [ ] Refund appears in Stripe dashboard under **Payments → Refunds**.

### 8.6 Signature Verification

- [ ] Send a POST to `/api/billing/webhook` with a tampered body or wrong signature.
- [ ] Response is `400 Invalid webhook signature` (Stripe stops retrying).

---

## 9. Environment Variable Summary

```env
# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
```

All four must be set for billing to function. The app will throw on startup if `STRIPE_SECRET_KEY` is missing, and individual operations will throw if `STRIPE_WEBHOOK_SECRET` / price IDs are absent.
