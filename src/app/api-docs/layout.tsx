import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "API de Tráfico - Documentación | trafico.live",
  description:
    "API REST con 121 endpoints de tráfico, combustible, ferrocarril, meteorología y movilidad en España. Datos en tiempo real + históricos.",
  keywords: [
    "API tráfico España",
    "API DGT datos tiempo real",
    "API incidencias tráfico",
    "API precio combustible España",
    "API ferrocarril Renfe",
    "API meteorología España",
    "datos tráfico REST API",
    "API movilidad España",
  ],
  alternates: {
    canonical: `${BASE_URL}/api-docs`,
  },
  openGraph: {
    title: "API de Inteligencia de Tráfico — trafico.live",
    description:
      "121 endpoints REST. Tráfico en tiempo real, combustible, ferrocarril, meteorología, movilidad y más. 3 tiers: FREE, PRO (29€/mes), ENTERPRISE (149€/mes).",
    url: `${BASE_URL}/api-docs`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: `${BASE_URL}/og-image.webp`,
        width: 1200,
        height: 630,
        alt: "trafico.live API — Inteligencia de Tráfico en España",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "API de Tráfico España — trafico.live",
    description:
      "121 endpoints REST. Tiempo real + histórico. FREE / PRO 29€ / ENTERPRISE 149€.",
  },
};

export default function ApiDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
