# Ayuntamiento Branding — Onboarding Guide

## Overview

The `/ayuntamiento/[slug]` portal renders a municipal mobility dashboard for any Spanish
municipality. Municipalities on a paid plan can customise the portal with their logo and
brand colours. Free-tier pages always show the default trafico.live branding.

---

## MunicipalityBranding — Proposed Prisma Schema

Add this model to `prisma/schema.prisma`:

```prisma
model MunicipalityBranding {
  slug           String    @id           // Same as Municipality.slug
  name           String                  // Official display name
  logoUrl        String?                 // HTTPS URL to square logo (SVG or PNG, min 200×200)
  primaryColor   String?                 // Hex color, e.g. "#d40000"
  secondaryColor String?                 // Hex color, optional
  contactEmail   String?                 // Billing/technical contact at the municipality
  tier           BrandingTier @default(FREE)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

enum BrandingTier {
  FREE        // trafico.live branding — no customisation
  BASE        // Full logo + colors + monthly PDF reports
  DATA_FEED   // Data feed API access only (no visual customisation)
}
```

Run after adding:
```bash
npx prisma migrate dev --name add-municipality-branding
```

---

## Branding Policy

| Tier | Logo applied | Custom colors | Monthly PDF | API access |
|------|-------------|---------------|-------------|------------|
| FREE | No | No | No | No |
| BASE | Yes | Yes | Yes (auto) | No |
| DATA_FEED | No | No | No | Yes |

**Rule**: A municipality must have `tier = BASE` for the logo and colours to render
in `BrandingShell`. `FREE` tier always renders the trafico.live header.

---

## Onboarding a New Municipality

### 1. Confirm the slug

Look up the slug in the `Municipality` table:

```sql
SELECT slug, name, code FROM "Municipality" WHERE name ILIKE '%toledo%';
```

The slug is the URL segment used in `/ayuntamiento/[slug]`.

### 2. Prepare assets

- **Logo**: SVG or PNG, square or horizontal, transparent background, min 200 px.
  Host on a CDN with CORS headers (e.g., Cloudflare R2 `assets/municipios/`).
- **Primary color**: Municipal corporate identity hex (exact match preferred).
  Must pass WCAG AA contrast on white (check with `palette-generator.js`).
- **Secondary color**: Optional accent, typically slightly darker or a complementary hue.

### 3. Insert the record

```sql
INSERT INTO "MunicipalityBranding"
  (slug, name, "logoUrl", "primaryColor", "secondaryColor", "contactEmail", tier)
VALUES
  ('toledo', 'Toledo',
   'https://assets.trafico.live/municipios/toledo-logo.svg',
   '#d40000', '#a00000',
   'movilidad@toledo.es',
   'BASE');
```

Or via Prisma Studio:
```bash
npm run db:studio
```

### 4. Verify the page

Visit `https://trafico.live/ayuntamiento/toledo` and confirm:
- Header strip shows the municipality logo.
- "Datos por trafico.live" attribution is visible.
- `BrandingShell` renders without errors.

### 5. Announce to the municipality

Email template: see `docs/email-templates/municipal-onboarding.md` (to be created).

---

## Pricing Proposal

| Plan | Price | Features |
|------|-------|---------|
| **Base** | 499 €/mes | Logo + colors + monthly PDF report auto-published + /ayuntamiento portal |
| **Data Feed** | 199 €/mes | API access (PRO key + `/api/*` rate limit upgrade) |
| **Base + Data Feed** | 599 €/mes | Full bundle |

Annual plans: 20% discount.

Billing managed via Stripe (existing integration at `src/lib/stripe.ts`).

---

## Static Params Coverage

`generateStaticParams` in `/ayuntamiento/[slug]/page.tsx` pre-renders the top 50
municipalities by population at build time. Any additional slug that resolves via
Prisma at request time is rendered on-demand (ISR, `revalidate = 3600`).

To extend the pre-rendered set, update `take: 50` to a higher value — be aware of
build time impact.

---

## Related

- `docs/MONTHLY-REPORT.md` — PDF generation pipeline
- `src/components/ayuntamiento/BrandingShell.tsx` — branding wrapper
- `src/components/ayuntamiento/MunicipalDashboard.tsx` — dashboard layout
- `src/components/ayuntamiento/KPIGrid.tsx` — 6-KPI data grid
- S5 section in roadmap: `docs/ROADMAP-TEAM-4-PLATFORM.md`
