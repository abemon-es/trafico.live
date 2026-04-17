import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "API de datos multimodal — trafico.live",
  description:
    "API REST para España: tráfico en tiempo real, trenes Renfe, AIS marítimo, vuelos, calidad del aire y combustible. 121 endpoints. Plan FREE sin tarjeta.",
  keywords: [
    "API tráfico España",
    "API datos multimodal",
    "API DGT tiempo real",
    "API trenes Renfe",
    "API AIS barcos España",
    "API vuelos AENA",
    "API calidad aire MITECO",
    "API precio combustible",
    "datos abiertos movilidad España",
    "REST API transporte",
  ],
  alternates: {
    canonical: `${BASE_URL}/api-landing`,
  },
  openGraph: {
    title: "API de datos multimodal — trafico.live",
    description:
      "121 endpoints REST. Tráfico, trenes, aviones, barcos, calidad del aire y combustible en tiempo real. Plan FREE gratuito, PRO 49€/mes, Enterprise 149€/mes.",
    url: `${BASE_URL}/api-landing`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: `${BASE_URL}/api-landing/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "API de datos multimodal — trafico.live",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "API de datos multimodal — trafico.live",
    description:
      "121 endpoints REST. Tráfico, trenes, aviones, barcos. FREE gratis · PRO 49€ · Enterprise 149€.",
    images: [`${BASE_URL}/api-landing/opengraph-image`],
  },
};

export default function ApiLandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
