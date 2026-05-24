import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

/**
 * Server-side metadata wrapper for /calendario.
 *
 * The page component itself is `"use client"` (it renders Cal.com iframes
 * and needs browser interactivity), so it cannot export `metadata`
 * directly. Without this layout the page inherited the root layout's
 * fallback title ("trafico.live — Tráfico España en Tiempo Real") and
 * the root canonical (`https://trafico.live`), making /calendario read
 * to Google as a duplicate of the homepage.
 */
export const metadata: Metadata = {
  title: "Reservar una reunión",
  description:
    "Reserva una llamada con el equipo de trafico.live: producto, datos, API, partnerships o prensa. Calendario en directo.",
  alternates: { canonical: `${BASE_URL}/calendario` },
  // Booking page is a conversion surface, not an indexable content page —
  // keep it crawlable but signal low priority.
  robots: { index: true, follow: true },
  openGraph: {
    title: "Reservar una reunión — trafico.live",
    description:
      "Reserva una llamada con el equipo de trafico.live: producto, datos, API, partnerships o prensa.",
    url: `${BASE_URL}/calendario`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

export default function CalendarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
