import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

/**
 * Build a full canonical URL from a path.
 * Ensures canonical URLs are always absolute.
 */
export function canonicalUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_URL}${clean}`;
}

/**
 * Idempotently strip the site brand suffix from any title string.
 * Next.js root layout `title.template: "%s | trafico.live"` auto-appends the
 * brand; a manual suffix on a page title yields the dreaded double-suffix.
 */
export function stripBrandSuffix(title: string): string {
  return title
    .replace(/\s*\|\s*trafico\.live\s*$/i, "")
    .replace(/\s*—\s*trafico\.live\s*$/i, "")
    .trim();
}

export interface BuildMetadataInput {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: "website" | "article";
  robots?: {
    index?: boolean;
    follow?: boolean;
    nocache?: boolean;
  };
  publishedTime?: string;
  modifiedTime?: string;
}

/**
 * Canonical metadata builder for every owned page in the site.
 *
 * Guarantees:
 *  - title is brand-stripped (relies on root layout template for suffix)
 *  - canonical is absolute
 *  - og.url === canonical
 *  - og.image defaults to the root /opengraph-image when omitted
 *  - twitter mirrors og for summary_large_image cards
 */
export function buildMetadata(input: BuildMetadataInput): Metadata {
  const title = stripBrandSuffix(input.title);
  const url = canonicalUrl(input.path);
  const ogImage = input.ogImage || `${BASE_URL}/opengraph-image`;

  const metadata: Metadata = {
    title,
    description: input.description,
    ...(input.keywords?.length && { keywords: input.keywords }),
    alternates: { canonical: url },
    openGraph: {
      title,
      description: input.description,
      url,
      siteName: "trafico.live",
      locale: "es_ES",
      type: input.ogType || "website",
      images: [ogImage],
      ...(input.publishedTime && { publishedTime: input.publishedTime }),
      ...(input.modifiedTime && { modifiedTime: input.modifiedTime }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: input.description,
      images: [ogImage],
    },
    ...(input.robots && {
      robots: {
        index: input.robots.index ?? true,
        follow: input.robots.follow ?? true,
        nocache: input.robots.nocache,
      },
    }),
  };

  return metadata;
}

/**
 * Backwards-compatible alias — older pages call buildPageMetadata.
 * Prefer `buildMetadata` in new code.
 */
export const buildPageMetadata = buildMetadata;
