# Trafico Dashboard - Full Audit Report

**Date:** 2026-01-26
**URL:** https://trafico.logisticsexpress.es
**Project:** `/Users/mj/Desarrollos/trafico-dashboard`

---

## Executive Summary

| Category | Status |
|----------|--------|
| Page Availability | ✅ All pages accessible |
| API Endpoints | ✅ All 15 priority endpoints healthy |
| DNS/SSL | ✅ Valid certificates, DNS resolving |
| Security | ⚠️ Partially fixed (see details) |
| Infrastructure | ✅ Database & collectors healthy |
| Redirects | ⚠️ trafico.abemon.es not redirecting |

---

## 1. Page Availability Audit

### 1.1 Static Pages (22 routes)

| Status | Count |
|--------|-------|
| ✅ 200 OK | 22/22 |
| ❌ 404 | 0 |

All static pages accessible:
- `/`, `/camaras`, `/carreteras`, `/carreteras/autopistas`, `/carreteras/autovias`
- `/carreteras/nacionales`, `/carreteras/regionales`, `/estadisticas`, `/historico`
- `/gasolineras`, `/gasolineras/mapa`, `/gasolineras/terrestres`, `/gasolineras/maritimas`
- `/gasolineras/precios`, `/espana`, `/explorar/territorios`, `/explorar/carreteras`
- `/explorar/infraestructura`, `/incidencias/estadisticas`, `/sobre`

### 1.2 Dynamic Routes (14 sampled)

| Status | Count |
|--------|-------|
| ✅ 200 OK | 14/14 |

Tested:
- Province pages: `/provincias/28`, `/provincias/08`, `/provincias/41`, `/provincias/46`, `/provincias/48`
- Gas station prices: `/gasolineras/precios/madrid`, `/gasolineras/precios/barcelona`, `/gasolineras/precios/ceuta`
- Roads: `/carreteras/A-1`, `/carreteras/AP-7`, `/carreteras/N-340`
- Communities: `/comunidad-autonoma/madrid`, `/comunidad-autonoma/cataluna`, `/comunidad-autonoma/andalucia`

### 1.3 Redirects

| Source | Target | Status |
|--------|--------|--------|
| `/mapa` | `/` | ✅ 308 |
| `/incidencias` | `/` | ✅ 308 |
| `/provincias` | `/espana` | ✅ 308 |
| `trafico.abemon.es/*` | `trafico.logisticsexpress.es/*` | ❌ 404 |

**Issue:** trafico.abemon.es returns 404. Domain configured in Cloudflare but NOT added as custom domain in Railway for the main dashboard service.

---

## 2. Security Audit

### 2.1 Vulnerabilities Fixed

| Issue | Severity | Status |
|-------|----------|--------|
| CORS Wildcard (`*`) | HIGH | ✅ Fixed |
| Missing Security Headers | MEDIUM | ✅ Fixed |
| Hono JWT vulnerabilities (2 CVEs) | HIGH | ✅ Fixed |

### 2.2 Vulnerabilities Remaining

| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
| xlsx prototype pollution | HIGH | ⚠️ No fix available | Consider replacing xlsx package |
| xlsx ReDoS | HIGH | ⚠️ No fix available | Consider replacing xlsx package |
| lodash prototype pollution | MODERATE | ⚠️ Requires breaking change | Would require Prisma downgrade |
| Rate limit fail-open | MEDIUM | ℹ️ Acknowledged | Design choice for availability |
| innerHTML usage | LOW | ℹ️ Safe | Uses typed enums, no user input |

### 2.3 Changes Applied

**File: `src/lib/api-utils.ts`**
- Replaced wildcard CORS (`*`) with explicit allowed origins
- Added origin validation function `getCORSOrigin()`
- Allowed origins: trafico.logisticsexpress.es, trafico.abemon.es, logisticsexpress.es, abemon.es, localhost

**File: `next.config.ts`**
- Added comprehensive security headers:
  - `Strict-Transport-Security` (HSTS)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` (restricted camera, microphone, geolocation)
  - `Content-Security-Policy` (restricts sources for scripts, styles, images, connections)

**File: `package.json` / `package-lock.json`**
- Updated hono: 4.10.6 → 4.11.4 (fixes JWT vulnerabilities)
- Updated prisma: 7.2.0 → 7.3.0
- Updated @prisma/client: matching version

### 2.4 Credentials Check

| Item | Status |
|------|--------|
| `.env` in git history | ✅ Never committed |
| `.env*` in .gitignore | ✅ Present |
| Database credentials exposed | ✅ No (local dev only) |

---

## 3. Infrastructure Audit

### 3.1 Railway Services

| Component | Status |
|-----------|--------|
| Main App (Next.js) | ✅ Deployed |
| Database (PostgreSQL) | ✅ Connected (8-159ms latency) |
| Redis | ℹ️ Optional (falls back gracefully) |

### 3.2 Collectors Freshness

| Collector | Last Update | Stale |
|-----------|-------------|-------|
| v16 | 2026-01-26T13:35:11Z | ✅ No |
| incidents | 2026-01-26T13:35:08Z | ✅ No |
| gasStations | 2026-01-26T12:50:29Z | ✅ No |

All collectors running and data is fresh.

### 3.3 External API Dependencies

| API | Purpose | Status |
|-----|---------|--------|
| DGT NAP | V16 alerts, cameras, radars | ⚠️ 403 (auth required) |
| DGT DATEX | Traffic data | ⚠️ 404 (requires params) |
| MINETUR | Gas stations | ✅ 200 (via redirect) |
| AEMET | Weather | ✅ 200 |

Note: DGT APIs returning errors in direct tests but collectors are functioning (data is fresh).

---

## 4. DNS & Domain Audit

### 4.1 DNS Resolution

| Domain | IPs | Proxy |
|--------|-----|-------|
| trafico.logisticsexpress.es | 188.114.97.5, 188.114.96.5 | Cloudflare ✅ |
| trafico.abemon.es | 188.114.96.5, 188.114.97.5 | Cloudflare ✅ |

### 4.2 SSL Certificates

| Domain | Valid From | Valid Until | Issuer |
|--------|------------|-------------|--------|
| trafico.logisticsexpress.es | Jan 18, 2026 | Apr 18, 2026 | Google Trust Services |
| trafico.abemon.es | Dec 23, 2025 | Mar 23, 2026 | Google Trust Services |

Both certificates valid and auto-renewing via Cloudflare.

---

## 5. API Endpoint Audit

### 5.1 Priority Endpoints (15 tested)

| Endpoint | Status | Response Time |
|----------|--------|---------------|
| `/api/health` | ✅ 200 | 0.28s |
| `/api/espana` | ✅ 200 | 0.18s |
| `/api/incidents` | ✅ 200 | 0.32s |
| `/api/cameras` | ✅ 200 | 0.21s |
| `/api/radars` | ✅ 200 | 0.16s |
| `/api/panels` | ✅ 200 | 0.13s |
| `/api/gas-stations` | ✅ 200 | 0.13s |
| `/api/gas-stations/cheapest` | ✅ 200 | 0.14s |
| `/api/maritime-stations` | ✅ 200 | 0.11s |
| `/api/chargers` | ✅ 200 | 0.57s |
| `/api/fuel-prices/today` | ✅ 200 | 0.13s |
| `/api/roads/catalog` | ✅ 200 | 0.11s |
| `/api/weather` | ✅ 200 | 0.23s |
| `/api/zbe` | ✅ 200 | 0.12s |
| `/api/rankings` | ✅ 200 | 0.25s |

All endpoints healthy with response times under 1 second.

---

## 6. Action Items

### Critical (Requires Attention)

| # | Issue | Action |
|---|-------|--------|
| 1 | trafico.abemon.es returns 404 | Add as custom domain in Railway dashboard |

### Recommended

| # | Issue | Action |
|---|-------|--------|
| 2 | xlsx package vulnerable | Consider replacing with safer alternative (e.g., exceljs) |
| 3 | lodash vulnerability | Monitor for Prisma update that uses newer lodash |
| 4 | Build verification | Run `npm run build` locally before committing |

### Manual Steps Required

**To fix trafico.abemon.es redirect:**
1. Go to Railway dashboard: https://railway.com/project/trafico-espana
2. Select the main dashboard service (not gas-station-collector)
3. Settings → Domains → Add Custom Domain
4. Add: `trafico.abemon.es`
5. Verify DNS (should already be pointing to Railway via Cloudflare)

---

## 7. Files Modified

```
next.config.ts        | +51 lines (security headers)
package.json          | Updated dependencies
package-lock.json     | Updated lock file
src/lib/api-utils.ts  | +29 lines (CORS fix)
```

**Build Status:** ✅ Successful (verified locally)

---

## 8. Next Steps

1. **Deploy changes** - Push security fixes to production
2. **Add trafico.abemon.es** - Configure in Railway dashboard
3. **Monitor** - Check logs for any issues after deploy
4. **Consider** - Evaluate xlsx replacement for long-term security

---

*Report generated by Claude Code audit on 2026-01-26*
