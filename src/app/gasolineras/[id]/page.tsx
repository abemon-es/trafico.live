import { notFound, permanentRedirect } from "next/navigation";
import prisma from "@/lib/db";

/**
 * Shortcut route: `/gasolineras/[id]`
 *
 * Resolves the IDEESS station code against both GasStation (terrestrial) and
 * MaritimeStation (maritime) tables and redirects to the canonical entity
 * route. If the id matches nothing, renders 404.
 *
 * ISR: 1800s — station catalog barely changes; the redirect target handles
 * pricing freshness on its own cadence.
 */
export const revalidate = 1800;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ id: string }>;
}

// Shortcut routes don't need to be prerendered — they just redirect.
export async function generateStaticParams() {
  return [];
}

export default async function GasStationShortcutPage({ params }: PageProps) {
  const { id } = await params;
  const normalizedId = decodeURIComponent(id).trim();

  if (!normalizedId) {
    notFound();
  }

  const [terrestrial, maritime] = await Promise.all([
    prisma.gasStation.findUnique({ where: { id: normalizedId }, select: { id: true } }),
    prisma.maritimeStation.findUnique({ where: { id: normalizedId }, select: { id: true } }),
  ]);

  if (terrestrial) {
    permanentRedirect(`/gasolineras/terrestres/${encodeURIComponent(terrestrial.id)}`);
  }

  if (maritime) {
    permanentRedirect(`/gasolineras/maritimas/${encodeURIComponent(maritime.id)}`);
  }

  notFound();
}

/**
 * Sitemap helper: shortcut route is not canonical, so we don't expose it to
 * the sitemap. The canonical routes (`/gasolineras/terrestres/[id]` and
 * `/gasolineras/maritimas/[id]`) own sitemap inclusion.
 */
export async function getSlugList(): Promise<string[]> {
  return [];
}
