/**
 * A sitemap URL's lastmod: when the page's main content last changed, or none.
 *
 * Until 2026-10-21 every lastmod was the time the sitemap was generated (1,549
 * of the 1,712 URLs in /sitemap/0.xml said «today»), and Google uses lastmod
 * only while it is consistently true. The content-fingerprints task
 * (services/collector/tasks/content-fingerprints) hashes what a page lists,
 * once a day, and keeps when that hash last moved. A page without a
 * fingerprint, or whose fingerprint hasn't changed since it was first seen,
 * gets no lastmod: no date beats a made-up one.
 */

import type { PrismaClient } from "@prisma/client";

/** The collector task's FAMILIES; tests/sitemap-lastmod.test.ts checks they match. */
export const FINGERPRINT_FAMILIES = ["camera", "camera-road", "camera-province", "radar", "radar-road", "radar-province", "gas-station"] as const;
export type FingerprintFamily = (typeof FINGERPRINT_FAMILIES)[number];

export function fingerprintKey(family: FingerprintFamily, id: string): string {
  return `${family}:${id}`;
}

/** Fingerprint key → when that content last changed, for the keys that have a date. */
export async function loadChangedAt(
  prisma: Pick<PrismaClient, "contentFingerprint">,
  families: readonly FingerprintFamily[],
): Promise<Map<string, Date>> {
  const rows = await prisma.contentFingerprint.findMany({
    where: { changedAt: { not: null }, OR: families.map((f) => ({ key: { startsWith: `${f}:` } })) },
    select: { key: true, changedAt: true },
  });
  return new Map(rows.flatMap((r) => (r.changedAt ? [[r.key, r.changedAt] as const] : [])));
}
