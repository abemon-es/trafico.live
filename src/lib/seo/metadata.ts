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
 * Build standard metadata for a page with canonical, OG, and Twitter.
 */
export function buildPageMetadata({
  title,
  description,
  path,
  keywords,
  changeFrequency,
  ogType = "website",
}: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  changeFrequency?: "hourly" | "daily" | "weekly" | "monthly";
  ogType?: "website" | "article";
}): Metadata {
  const url = canonicalUrl(path);
  return {
    title,
    description,
    ...(keywords && { keywords }),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "trafico.live",
      locale: "es_ES",
      type: ogType,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
