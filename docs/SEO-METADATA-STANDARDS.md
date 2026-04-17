# SEO Metadata Standards — trafico.live

> Owner: agent-2.8 (SEO infra) · Consumed by: 2.2 (hubs), 2.5 (entity SSG A), 2.6 (entity SSG B), 2.7 (polish).
> Last updated: 2026-04-17.

This is the single source of truth for **every** metadata export in
`src/app/**/page.tsx`. If your page diverges from a pattern below, either
open a PR against this doc or ask 2.8 in team chat. The helpers live in
`src/lib/seo` and the root OG image lives at `src/app/opengraph-image.tsx`.

---

## Hard rules (non-negotiable)

1. **Never hardcode `| trafico.live` in a title.** The root layout already
   sets `title.template: "%s | trafico.live"` and it is applied automatically.
   Double-suffixes (`Foo | trafico.live | trafico.live`) are the #1 SEO bug
   on this site.
2. **Every indexable page must have `alternates.canonical`**. Use
   `canonicalUrl(path)` from `@/lib/seo` — never concatenate base URLs by hand.
3. **Every indexable page must have at least one `openGraph.images` entry.**
   If you omit it, `buildMetadata` injects the root `/opengraph-image` for
   you. Do not pass an image you have not tested.
4. **Never expose draft / test pages to crawlers.** Pages behind auth, internal
   dashboards, or preview routes must set `robots: { index: false }`.
5. **Structured data via `src/lib/seo`, not inline literals.** Every JSON-LD
   emission must come from a helper; page-level inline `@context` objects are
   forbidden.

---

## The one helper: `buildMetadata`

```ts
// src/app/{route}/page.tsx
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Radares fijos en España",               // no " | trafico.live"
  description: "Lista oficial de radares DGT …",  // 140-160 chars
  path: "/radares",                               // must start with "/"
  keywords: ["radares", "DGT", "velocidad"],      // optional, 3-8 items
  // ogImage: defaults to /opengraph-image when omitted
  // ogType:  "website" (default) | "article"
});
```

`buildMetadata` guarantees:

| Field | Behaviour |
|-------|-----------|
| `title` | Passed through `stripBrandSuffix` — safe to re-pass already-suffixed strings |
| `alternates.canonical` | Absolute URL via `canonicalUrl(path)` |
| `openGraph.url` | Matches `alternates.canonical` |
| `openGraph.images` | `input.ogImage` if given, else root `/opengraph-image` |
| `twitter.card` | `summary_large_image`, mirroring OG |
| `robots` | Defaults to index+follow; pass `{ index: false }` explicitly to block |

---

## Pattern catalogue

### 1. Hub page (`/trenes`, `/gasolineras`, `/maritimo`, `/calidad-aire`…)

Owned by 2.2. One metadata export per hub, broad description, include 1-2
JSON-LD schemas (WebPage + FAQ for rich results).

```ts
import { buildMetadata, generateWebPageSchema, faqSchema } from "@/lib/seo";
import { StructuredData } from "@/components/seo/StructuredData";

export const metadata = buildMetadata({
  title: "Trenes en España — Horarios, alertas y mapa en tiempo real",
  description:
    "Estado de Renfe Cercanías (12 núcleos), AVE y larga distancia. 2.154 estaciones con datos actualizados cada 2 minutos.",
  path: "/trenes",
  keywords: ["trenes", "Renfe", "Cercanías", "AVE", "alertas"],
});

export default function TrenesHub() {
  const pageSchema = generateWebPageSchema({ ... });
  const faq = faqSchema({ questions: [ ... ] });
  return (
    <>
      <StructuredData data={[pageSchema, faq]} />
      {/* hub content */}
    </>
  );
}
```

### 2. Entity SSG page (`/gasolineras/terrestres/[id]`, `/trenes/estacion/[slug]`, `/aviacion/aeropuertos/[iata]`, `/maritimo/puertos/[slug]`, `/clima/estacion/[id]`…)

Owned by 2.5 / 2.6. Title and description are dynamic per entity; emit the
entity schema matching the type.

```ts
import { buildMetadata, airportSchema, breadcrumbSchema } from "@/lib/seo";
import { StructuredData } from "@/components/seo/StructuredData";

export async function generateMetadata({ params }) {
  const { iata } = await params;
  const airport = await getAirport(iata);
  if (!airport) return { title: "Aeropuerto no encontrado" };

  return buildMetadata({
    title: `Aeropuerto ${airport.name} (${airport.iata})`,
    description: `Estado operativo, pasajeros, movimientos y vuelos en el aeropuerto ${airport.name}.`,
    path: `/aviacion/aeropuertos/${iata.toLowerCase()}`,
  });
}

export default async function AirportPage({ params }) {
  const { iata } = await params;
  const airport = await getAirport(iata);
  const schema = airportSchema({
    name: airport.name,
    iata: airport.iata,
    icao: airport.icao,
    url: `${BASE_URL}/aviacion/aeropuertos/${iata.toLowerCase()}`,
    lat: airport.lat,
    lon: airport.lon,
  });
  const crumbs = breadcrumbSchema({ items: [
    { name: "Aviación", href: "/aviacion" },
    { name: "Aeropuertos", href: "/aviacion/aeropuertos" },
    { name: airport.name, href: `/aviacion/aeropuertos/${iata.toLowerCase()}` },
  ]});
  return (
    <>
      <StructuredData data={[schema, crumbs]} />
      {/* entity content */}
    </>
  );
}
```

Entity schema table:

| Route family | Helper | Input shape |
|---|---|---|
| `/aviacion/aeropuertos/[iata]` | `airportSchema` | `AirportSchemaInput` |
| `/maritimo/puertos/[slug]` | `portSchema` | `PortSchemaInput` |
| `/gasolineras/terrestres/[id]` | `gasStationSchema` | `GasStationSchemaInput` |
| `/clima/estacion/[id]` | `weatherStationSchema` | `WeatherStationSchemaInput` |
| `/calidad-aire/estacion/[id]` | `weatherStationSchema` (same shape) | `WeatherStationSchemaInput` |
| `/trenes/estacion/[slug]` | `placeSchema` | `PlaceSchemaInput` |
| `/ciudad/[city]` · `/espana/[province]` | `placeSchema` | `PlaceSchemaInput` |
| `/carreteras/[roadId]` | `roadSchema` | `RoadSchemaProps` |
| `/noticias/[slug]` · `/guias/[slug]` | `articleSchema` | `ArticleSchemaInput` |

### 3. City / province page (`/ciudad/[city]`, `/espana/[province]`, `/pulso/[provincia]`, `/camaras/[city]`…)

Owned by 2.2 / 2.5. Always emit `placeSchema` + `breadcrumbSchema`.

```ts
import {
  buildMetadata,
  placeSchema,
  breadcrumbSchema,
  provinceTitle,
  provinceDescription,
} from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { provincia } = await params;
  return buildMetadata({
    title: provinceTitle(provincia, "pulso"),
    description: provinceDescription(provincia, "pulso"),
    path: `/pulso/${provincia}`,
  });
}
```

### 4. Polish / content page (`/divulgacion-afiliados`, `/sobre`, `/api-docs`, `/calculadora`…)

Owned by 2.7. Static metadata, no schema unless the content is FAQ-heavy.

```ts
import { buildMetadata, faqSchema } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Calculadora de coste por trayecto",
  description: "Estima combustible + peajes + tiempo entre dos puntos.",
  path: "/calculadora",
});
```

### 5. Noindex / internal page (`/admin/*`, `/status`, `/ads.txt` preview routes, dev-only flows)

```ts
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Panel interno",
  description: "—",
  path: "/admin/dashboard",
  robots: { index: false, follow: false },
});
```

---

## Common mistakes to avoid

| ❌ Wrong | ✅ Right | Why |
|---|---|---|
| `title: "Foo | trafico.live"` | `title: "Foo"` | Root layout appends suffix — double-suffix is a known SEO bug |
| `alternates: { canonical: "https://trafico.live/foo" }` | `buildMetadata({ path: "/foo" })` | Centralises base URL; `NEXT_PUBLIC_BASE_URL` may vary in staging |
| Inline `<script type="application/ld+json">{JSON.stringify({…})}</script>` | `<StructuredData data={schema} />` | Consistent DOM ID + `beforeInteractive` strategy |
| `openGraph: { images: ["/og-default.png"] }` | Omit → root `/opengraph-image` | Avoids broken/missing images; one canonical fallback |
| `robots: { index: true }` | Don't set it (default) | Noise; set `robots` only to block |
| Truncated description `< 50 chars` | 140-160 chars | Google SERP snippet length; short desc wastes CTR |
| Keywords `["spain", "traffic"]` in English | Spanish keywords | Audience is ES |

---

## Migration checklist for existing pages

When 2.2 / 2.5 / 2.6 / 2.7 swap their inline metadata to `buildMetadata`:

1. Remove any manual `title.includes("| trafico.live")`.
2. Remove manual `alternates.canonical`.
3. Remove manual `openGraph.url`, `openGraph.siteName`, `openGraph.locale`,
   `openGraph.type` — `buildMetadata` sets them.
4. Keep `keywords` if the page has them; pass them through.
5. Move inline JSON-LD to the matching `@/lib/seo` helper + `<StructuredData>`.
6. Run `npm run build` — a duplicate title/canonical warning means step 1 or
   step 2 was missed.

---

## Opaque behaviours you should know

- `stripBrandSuffix` is **idempotent**: re-running it on an already-stripped
  title is a no-op. It handles `" | trafico.live"`, `" — trafico.live"` and
  matches are case-insensitive with trailing whitespace tolerance.
- `robots.ts` is the deployed robots file; `public/robots.txt` is legacy and
  the fetcher picks the route version first. Don't diverge them.
- The root `opengraph-image.tsx` is edge-runtime; it renders at request time
  but is cached at the CDN layer for 24h+. Changes take effect on next deploy.
- `llms.txt` is served from `src/app/llms.txt/route.ts` (GET only). When a new
  hub ships, add it to that list — LLM crawlers respect the order.

---

## Links

- `src/lib/seo/index.ts` — all helpers, one barrel.
- `src/lib/seo/metadata.ts` — `buildMetadata`, `canonicalUrl`, `stripBrandSuffix`.
- `src/lib/seo/schemas.ts` — entity schemas (place, article, airport, port, gas station, weather station).
- `src/components/seo/StructuredData.tsx` — foundational schemas (WebPage, FAQ, Breadcrumb, Organization…) + `<StructuredData>` emitter.
- `src/app/opengraph-image.tsx` — root social card.
- `src/app/llms.txt/route.ts` — crawler hints for LLMs.
- `src/app/robots.ts` — deployed robots rules.
- `src/app/not-found.tsx` — branded 404.
