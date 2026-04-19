/**
 * Canonical URL helpers for trafico.live
 *
 * Thin helpers that guarantee every page emits a correct, absolute canonical
 * URL without query strings, hash fragments, or UTM parameters.
 *
 * Usage:
 *   import { canonicalUrl, pageCanonical } from "@/lib/seo/canonical";
 *
 *   // In generateMetadata or static metadata export:
 *   alternates: { canonical: canonicalUrl("/trenes/estacion/madrid-atocha") }
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

/**
 * Build an absolute canonical URL from a pathname.
 * - Strips query strings and hash fragments.
 * - Always returns https://trafico.live{path}.
 */
export function canonicalUrl(path: string): string {
  if (path.startsWith("http")) {
    // Already absolute — strip query + hash and return
    const u = new URL(path);
    return `${u.origin}${u.pathname}`;
  }
  const clean = path.split("?")[0].split("#")[0];
  const withLeadingSlash = clean.startsWith("/") ? clean : `/${clean}`;
  return `${BASE_URL}${withLeadingSlash}`;
}

/**
 * Convenience alias — build canonical + return it as an `alternates` object
 * ready to spread into Metadata.
 *
 * @example
 *   export const metadata: Metadata = {
 *     title: "...",
 *     ...pageCanonical("/trenes/cercanias/madrid"),
 *   };
 */
export function pageCanonical(path: string): { alternates: { canonical: string } } {
  return { alternates: { canonical: canonicalUrl(path) } };
}
