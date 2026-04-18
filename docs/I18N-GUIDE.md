# i18n Guide — next-intl base

> T4.10c scaffolding. Spanish is primary; English is opt-in via cookie or header. Full route-level i18n (`[locale]` segments) is deferred to T2.3 as a larger refactor.

## Install

```bash
npm install next-intl
```

## Files

| Path | Purpose |
|---|---|
| `src/i18n/config.ts` | Locale registry (`es`, `en`) + `defaultLocale` + `Locale` type |
| `src/i18n/request.ts` | `next-intl` request config — reads `NEXT_LOCALE` cookie, falls back to `Accept-Language`, then `es` |
| `messages/es.json` | Spanish strings |
| `messages/en.json` | English strings (1:1 key mirror) |
| `src/lib/i18n/useT.ts` | Client hook — `"use client"` re-export of `useTranslations as useT` |
| `src/lib/i18n/getT.ts` | Server helper — re-export of `getTranslations as getT` |
| `next.config.ts` | Wrapped with `createNextIntlPlugin('./src/i18n/request.ts')` |

## Add a new string

1. Add the key to `messages/es.json` and `messages/en.json` (same path).
2. In a Server Component: `const t = await getT("common"); <p>{t("loading")}</p>`.
3. In a Client Component: `"use client"; const t = useT("common"); <p>{t("loading")}</p>`.

## Switch locale

- Set cookie `NEXT_LOCALE=en` (or `es`).
- Or add `?lang=en` query — B1's middleware reads this and sets the cookie + redirects without the param.

## Integration notes

**T2.3 (layout owner)** — add to `src/app/layout.tsx`:

```tsx
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

Without this, `useT` (client) throws at runtime. `getT` (server) works without the provider.

**B1 (middleware owner)** — to support `?lang=en`:

```ts
const langParam = request.nextUrl.searchParams.get("lang");
if (langParam === "es" || langParam === "en") {
  const url = request.nextUrl.clone();
  url.searchParams.delete("lang");
  const response = NextResponse.redirect(url);
  response.cookies.set("NEXT_LOCALE", langParam, { maxAge: 60 * 60 * 24 * 365 });
  return response;
}
```

## Add a new locale

1. Update `locales` in `src/i18n/config.ts`: `['es', 'en', 'ca']` (for example Catalan).
2. Create `messages/ca.json` mirroring keys from `es.json`.
3. Deploy. No middleware changes needed — cookie-based routing works automatically.

## Out of scope (T2.3)

- Per-route `[locale]` segments: `/en/trenes`, `/en/maritimo`
- Automatic URL rewriting per locale
- Hreflang tags in `<head>` (T2.8 SEO if prioritised)
