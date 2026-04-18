# Analytics Conversion Funnel — trafico.live

## Why this exists

The GA4 property (521333149) audit (`docs/seo-audit-2026-04-17/10-gsc-ga4.md` §3.5) found only **8 generic events** recorded across 90 days. The funnel was effectively broken — no conversion signals reaching GA4. This document defines the 8 custom events added to `src/lib/analytics.ts` to fix the S0+ conversion tracking post-launch.

---

## Event Catalog

| Function | GA4 Event Name | Key Params | Priority |
|---|---|---|---|
| `trackPricingClick` | `pricing_click` | tier, source | **Conversion** |
| `trackApiDocsClick` | `api_docs_click` | source, endpoint? | **Conversion** |
| `trackNewsletterSignup` | `newsletter_signup` | source, lead_magnet? | **Conversion** |
| `trackVerticalClick` | `vertical_click` | vertical, source | Engagement |
| `trackCtaClick` | `cta_click` | cta_id, cta_text, source | Engagement |
| `trackAffiliateClick` | `affiliate_click` | partner, route?, product?, value?, currency?, source | **Conversion** |
| `trackSearchSubmit` | `search_submit` | search_term, source | Engagement |
| `trackEmbedView` | `embed_view` | embed_type, embed_origin? | Reach |

---

## Event Descriptions and Wire Points

### 1. `trackPricingClick(tier, source)`

**When to fire:** User clicks a pricing tier button (PRO or ENTERPRISE) — intent to upgrade.

**Wire here:**
- `src/app/api-landing/` — TierCard component, on button `onClick`
- Footer PRO/ENTERPRISE CTA links — wrap with `onClick={() => trackPricingClick('PRO', 'footer')}`

**Example:**
```tsx
import { trackPricingClick } from "@/lib/analytics";

<button onClick={() => trackPricingClick("PRO", "api-landing-tier-card")}>
  Contratar PRO
</button>
```

---

### 2. `trackApiDocsClick(source, endpoint?)`

**When to fire:** User navigates toward `/api-docs` from anywhere — shows developer intent.

**Wire here:**
- `src/app/api-landing/` — any link pointing to `/api-docs` or specific endpoint anchors
- Header developer nav items (if present)

**Example:**
```tsx
import { trackApiDocsClick } from "@/lib/analytics";

<Link
  href="/api-docs"
  onClick={() => trackApiDocsClick("api-landing-hero")}
>
  Ver documentación
</Link>
```

---

### 3. `trackNewsletterSignup(source, leadMagnet?)`

**When to fire:** After a confirmed newsletter form submission — server response OK or optimistic.

**Wire here:**
- Footer newsletter form (to be built) — fire in `onSuccess` callback
- `/recursos/*` lead magnet download flows — fire after email capture confirmed

**Example:**
```tsx
import { trackNewsletterSignup } from "@/lib/analytics";

async function handleSubmit(email: string) {
  const ok = await subscribeNewsletter(email);
  if (ok) trackNewsletterSignup("footer-newsletter");
}
```

---

### 4. `trackVerticalClick(vertical, source)`

**When to fire:** User clicks a transport vertical hub link in the header navigation.

**Wire here:**
- Header nav links for: `trenes`, `maritimo`, `aviacion`, `transporte-publico`, `calidad-aire`, `gasolineras`, `incidencias`

**Example:**
```tsx
import { trackVerticalClick } from "@/lib/analytics";

<Link
  href="/trenes"
  onClick={() => trackVerticalClick("trenes", "header-nav")}
>
  Trenes
</Link>
```

---

### 5. `trackCtaClick(ctaId, ctaText, source)`

**When to fire:** User clicks any primary call-to-action button site-wide.

**Wire here:**
- Any `<Button variant="primary">` or equivalent across the site
- Hero CTAs, card primary actions, modal confirm buttons

**Example:**
```tsx
import { trackCtaClick } from "@/lib/analytics";

<Button
  onClick={() => trackCtaClick("hero-explore-map", "Explorar el mapa", "home-hero")}
>
  Explorar el mapa
</Button>
```

---

### 6. `trackAffiliateClick(params)`

**When to fire:** Before redirect in the `/ir/[partner]/[slug]` handler — capture the click before the user leaves.

**Wire here (owned by T1):**
- `src/app/ir/[partner]/[slug]/route.ts` (or page.tsx) — fire and `await` or use `sendBeacon` before redirect

**Example:**
```tsx
import { trackAffiliateClick } from "@/lib/analytics";

// In redirect handler
trackAffiliateClick({
  partner: "repsol",
  route: "madrid-barcelona",
  product: "gasolina-95",
  priceEur: 1.679,
  source: "gasolineras-detail",
});
```

**Note:** When `priceEur` is provided, the event emits `value` (number) and `currency: "EUR"` — this enables GA4 monetary attribution and revenue reporting.

---

### 7. `trackSearchSubmit(query, source)`

**When to fire:** User submits a search query — on Enter or clicking the search button in the Cmd+K modal or header search bar.

**Wire here:**
- `src/components/search/` — search form `onSubmit` or `onKeyDown` Enter handler
- Header Cmd+K modal — after query is sent

**Example:**
```tsx
import { trackSearchSubmit } from "@/lib/analytics";

function handleSearch(query: string) {
  trackSearchSubmit(query, "header-cmdk");
  router.push(`/buscar?q=${encodeURIComponent(query)}`);
}
```

---

### 8. `trackEmbedView(embedType, origin?)`

**When to fire:** An embed entry page mounts and the referrer is external (not `trafico.live`).

**Wire here:**
- Embed entry pages (e.g. `/embed/mapa`, `/embed/trafico`, `/embed/gasolineras`)
- Fire inside a `useEffect` on mount, checking `document.referrer`

**Example:**
```tsx
import { useEffect } from "react";
import { trackEmbedView } from "@/lib/analytics";

useEffect(() => {
  const origin = document.referrer
    ? new URL(document.referrer).hostname
    : undefined;
  trackEmbedView("traffic-map", origin);
}, []);
```

---

## Verification Checklist

Before declaring events live, verify each in **GA4 DebugView** (`Admin → DebugView`):

1. Open GA4 DebugView in a browser tab
2. Load the page/trigger the action in another tab with `?debug_mode=1` appended to the URL (or use the GA4 Debugger Chrome extension)
3. For each event, confirm:
   - [ ] `pricing_click` — params: `tier` ("PRO"/"ENTERPRISE"), `source` (string)
   - [ ] `api_docs_click` — params: `source` (string), optional `endpoint`
   - [ ] `newsletter_signup` — params: `source` (string), optional `lead_magnet`
   - [ ] `vertical_click` — params: `vertical` (string), `source` (string)
   - [ ] `cta_click` — params: `cta_id`, `cta_text`, `source` (all strings)
   - [ ] `affiliate_click` — params: `partner`, `source`; optional `route`, `product`, `value` (number), `currency` ("EUR")
   - [ ] `search_submit` — params: `search_term` (string), `source` (string)
   - [ ] `embed_view` — params: `embed_type` (string), optional `embed_origin`

---

## Register as Conversions in GA4 Admin

Mark these 4 high-value events as conversions:

**GA4 Admin → Events → toggle "Mark as conversion"**

| Event | Reason |
|---|---|
| `pricing_click` | Direct purchase intent signal |
| `api_docs_click` | Developer acquisition funnel start |
| `newsletter_signup` | Lead capture confirmed |
| `affiliate_click` | Revenue-generating click (monetary value attached) |

Path: `GA4 → Admin (gear icon) → Events → find event name → toggle "Mark as conversion"`

---

## Related Default Events Already Emitted

These GA4 automatic events are already collected and do not require custom code:

| Event | Trigger |
|---|---|
| `page_view` | Every route change (Next.js App Router + GA4 script) |
| `session_start` | First event of a session |
| `first_visit` | First time a user visits |
| `user_engagement` | Page in foreground for >1s |
| `scroll` | User scrolls 90% of page depth |
| `click` | Outbound link clicks (Enhanced Measurement) |
| `view_search_results` | Search results page (if configured in Enhanced Measurement) |

These supplement — but do not replace — the custom funnel events above. The existing legacy helpers (`trackSearch`, `trackPriceAlert`, `trackMapInteraction`, `trackFilter`, `trackOutbound`, `trackEntityView`) continue to fire alongside the new events.

---

## Implementation Notes

- All helpers call the internal `send()` function in `src/lib/analytics.ts`, which guards `typeof window !== "undefined"` — safe for SSR
- Optional params use conditional spread (`...(x && { x })`) — undefined values are never sent to GA4
- No new dependencies required
- `trackAffiliateClick` emits `value` as a number (not string) for correct GA4 revenue aggregation
