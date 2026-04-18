import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale, locales, type Locale } from "./config";

function normalize(raw: string | null | undefined): Locale {
  if (!raw) return defaultLocale;
  const base = raw.toLowerCase().split("-")[0].split(",")[0].trim();
  return (locales as readonly string[]).includes(base) ? (base as Locale) : defaultLocale;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("NEXT_LOCALE")?.value;
  if (fromCookie) {
    const locale = normalize(fromCookie);
    const messages = (await import(`../../messages/${locale}.json`)).default;
    return { locale, messages };
  }

  const headersList = await headers();
  const locale = normalize(headersList.get("accept-language"));
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
