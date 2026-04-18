import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { getAllODPairs, getODPairBySlugs } from "@/lib/od-pairs";

/**
 * /viaje/[origen]/[destino] — SEO-variant that consolidates into /ir.
 *
 * Emits noindex + canonical pointing to /ir/... and then permanently
 * redirects so search engines index the canonical URL.
 */

interface PageProps {
  params: Promise<{ origen: string; destino: string }>;
}

export function generateStaticParams() {
  return getAllODPairs().map((pair) => ({
    origen: pair.originSlug,
    destino: pair.destSlug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { origen, destino } = await params;
  const canonical = `https://trafico.live/ir/${origen}/${destino}`;
  const pair = getODPairBySlugs(origen, destino);
  const title = pair
    ? `Viaje de ${pair.originName} a ${pair.destName} | trafico.live`
    : "Viaje | trafico.live";

  return {
    title,
    robots: { index: false, follow: true },
    alternates: { canonical },
  };
}

export const revalidate = 86400;

export default async function ViajeODPage({ params }: PageProps) {
  const { origen, destino } = await params;
  // 308 Permanent Redirect — consolidates link equity into /ir canonical.
  permanentRedirect(`/ir/${origen}/${destino}`);
}
