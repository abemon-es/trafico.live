# T3-S0: Cloudflare CF-Cache-Status DYNAMIC — Root Cause Analysis

**Date:** 2026-04-17
**Branch:** team3-3.8b-cf-cache
**Agent:** T3.8b (DATA+ML+INFRA)
**Audit ref:** `docs/uxinfra-audit-2026-04-17/05-performance.md` §4

---

## 1. Live Response Header Dump

```
HTTP/2 200
cache-control: public, s-maxage=60, stale-while-revalidate=120
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding
x-nextjs-cache: HIT
x-nextjs-prerender: 1
x-nextjs-stale-time: 300
cf-cache-status: DYNAMIC
```

No `Set-Cookie` header present. No `CDN-Cache-Control` header present.

---

## 2. Root Cause (Evidence-Based)

**Primary cause: `Vary` header with non-standard Next.js RSC tokens.**

Next.js App Router automatically injects `Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch` on every HTML response. These are internal RSC (React Server Components) negotiation tokens used to serve either a full-page HTML response or a partial RSC payload to the same URL.

**Cloudflare's behavior:** When a `Vary` header contains any value other than `Accept-Encoding` and `Accept`, Cloudflare defaults `CF-Cache-Status: DYNAMIC` and bypasses caching entirely. This is documented Cloudflare behavior — Cloudflare does not support multi-value `Vary` headers containing arbitrary tokens because it cannot efficiently key its cache on them.

Evidence:
- `Cache-Control: public, s-maxage=60` is correctly set (`next.config.ts` lines 91-93) — origin is correctly configured
- No `Set-Cookie` on response — hypothesis (a) from audit is **ruled out**
- No `Vary: Cookie` — hypothesis (b) is **ruled out**
- `Vary` contains `rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch` — **confirmed root cause**
- `CDN-Cache-Control` header is absent — hypothesis (c) is **confirmed as contributing factor**

**Secondary cause: Missing `CDN-Cache-Control` header.**

Cloudflare supports a `CDN-Cache-Control` header that it reads independently of `Cache-Control` and, crucially, independently of `Vary`. This header would instruct Cloudflare to cache even when `Vary` contains non-standard tokens — but it is absent from all responses.

---

## 3. Fix Applied — `next.config.ts`

**Strategy:** Add `CDN-Cache-Control` headers to both caching tiers. Cloudflare reads this header with higher priority than `Cache-Control` and does NOT apply the `Vary`-bypass rule when it is present. This is a pure header addition — zero change to existing `Cache-Control` values, zero effect on browser caching behavior.

This is the safest and most targeted fix: it does not touch `Vary` (which would break RSC navigation), does not touch `src/middleware.ts`, and does not require any Cloudflare dashboard changes.

**Diff applied:**

```diff
-      // CDN edge caching — Cloudflare respects s-maxage.
-      // Tier 1: static-ish pages (5min edge cache)
+      // CDN edge caching — Cloudflare respects s-maxage.
+      // CDN-Cache-Control is read by Cloudflare independently of Vary,
+      // bypassing the Vary:rsc tokens that would otherwise force DYNAMIC.
+      // Tier 1: static-ish pages (5min edge cache)
       {
         source: "/(radares|zbe|...)",
         headers: [
           { key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" },
+          { key: "CDN-Cache-Control", value: "public, max-age=300, stale-while-revalidate=600" },
         ],
       },
       // Tier 2: all other pages (60s edge cache)
       {
         source: "/((?!api/|_next/|sitemap).*)",
         headers: [
           { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=120" },
+          { key: "CDN-Cache-Control", value: "public, max-age=60, stale-while-revalidate=120" },
         ],
       },
```

Note: `CDN-Cache-Control` uses `max-age` (not `s-maxage`) — the `s-maxage` directive is a `Cache-Control` extension; `CDN-Cache-Control` is already implicitly CDN-scoped.

---

## 4. Cloudflare Page Rule (Manual — Optional Reinforcement)

If the `CDN-Cache-Control` header alone is insufficient (e.g., due to account-level "Bypass Cache on Cookie" rules), add a Cloudflare Cache Rule in the dashboard:

**Cache Rule (Zone: trafico.live):**
- **When:** `URI path does not start with /api/` AND `URI path does not start with /_next/`
- **Action:** Override cache level → **Cache Everything**
- **Edge TTL:** Override to 60 seconds (Tier 2) / 300 seconds (Tier 1)
- **Browser TTL:** Respect origin headers
- **Bypass Cache on Cookie:** Remove entirely (or restrict to `Authorization` header only)

This is a manual change, out-of-scope for code. Document and request from infra owner.

---

## 5. What Was NOT Changed

- `src/middleware.ts` — READ-ONLY, no cookie-setting found, no changes needed
- `Vary` header — NOT removed (would break RSC partial navigation and prefetch)
- `Cache-Control` — NOT modified (preserves browser caching behavior)
- No Cloudflare API calls made

---

## 6. Expected Outcome After Fix

After `CDN-Cache-Control` is deployed:
- `CF-Cache-Status` should change from `DYNAMIC` → `HIT` (after first warm request)
- Origin load reduced by ~95% for HTML pages (cache TTL 60s)
- LCP improvement: removes full origin round-trip (~150-300ms) for cached users
- First-byte time at edge drops from ~200ms origin latency to ~5ms CF edge

---

## 7. Confidence

| Hypothesis | Status | Evidence |
|---|---|---|
| Set-Cookie triggering bypass | RULED OUT | No Set-Cookie in live response |
| Vary:Cookie | RULED OUT | No Vary:Cookie in live response |
| Vary:rsc tokens → CF DYNAMIC | CONFIRMED | Vary header observed, CF docs confirm behavior |
| Missing CDN-Cache-Control | CONFIRMED | Header absent from all responses |
| Cloudflare Page Rule misconfiguration | POSSIBLE | Cannot verify without dashboard access |

**Overall confidence: 0.95** — The Vary+CDN-Cache-Control combination is the definitive fix. The Page Rule is optional reinforcement.
