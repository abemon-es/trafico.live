import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StickyFooterAd } from "@/components/ads/StickyFooterAd";
import { StructuredData, generateOrganizationSchema } from "@/components/seo/StructuredData";
import "./globals.css";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "trafico.live — Tráfico España en Tiempo Real",
    template: "%s | trafico.live",
  },
  description:
    "Tráfico en tiempo real en España: incidencias, cámaras DGT, radares, precios de combustible, cargadores eléctricos y zonas de bajas emisiones. Datos oficiales actualizados cada 60 segundos.",
  keywords: [
    "tráfico",
    "tráfico en tiempo real",
    "DGT",
    "incidencias tráfico",
    "cámaras tráfico",
    "radares DGT",
    "precio gasolina",
    "precio diesel",
    "gasolineras baratas",
    "cargadores eléctricos",
    "zonas bajas emisiones",
    "carreteras España",
    "V16",
  ],
  authors: [{ name: "trafico.live" }],
  openGraph: {
    title: "trafico.live — Tráfico España en Tiempo Real",
    description:
      "Incidencias, cámaras, radares, combustible y cargadores eléctricos en toda España. Datos oficiales DGT actualizados cada 60 segundos.",
    url: BASE_URL,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "trafico.live — Tráfico España en Tiempo Real",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "trafico.live — Tráfico España en Tiempo Real",
    description: "Inteligencia vial en tiempo real para toda España",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: BASE_URL,
  },
  manifest: "/manifest.json",
  themeColor: "#2563eb",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "trafico.live",
  },
};

const organizationSchema = generateOrganizationSchema({
  name: "trafico.live",
  url: BASE_URL,
  description: "Plataforma de inteligencia vial en tiempo real para España. Datos oficiales de la DGT incluyendo incidencias, cámaras, radares, precios de combustible, cargadores eléctricos y zonas de bajas emisiones.",
  logo: `${BASE_URL}/icon.svg`,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StructuredData data={organizationSchema} />
        <Header />
        {children}
        <StickyFooterAd />
        <Footer />
      </body>
      {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
    </html>
  );
}
