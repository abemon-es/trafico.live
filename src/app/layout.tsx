import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Header } from "@/components/layout/Header";
import "./globals.css";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

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
    default: "Tráfico España - Inteligencia Vial en Tiempo Real",
    template: "%s | Tráfico España",
  },
  description:
    "Monitorización en tiempo real del tráfico español: balizas V16, incidencias, cámaras, cargadores eléctricos y zonas de bajas emisiones. Datos oficiales de la DGT. Un servicio de Logistics Express.",
  keywords: [
    "tráfico",
    "DGT",
    "V16",
    "balizas",
    "accidentes",
    "España",
    "carreteras",
    "incidencias",
    "tiempo real",
    "logistics express",
    "transporte",
  ],
  authors: [{ name: "Logistics Express", url: "https://logisticsexpress.es" }],
  openGraph: {
    title: "Tráfico España - Inteligencia Vial en Tiempo Real",
    description:
      "Datos en tiempo real del tráfico español: V16, incidencias, cámaras y más. Un servicio de Logistics Express.",
    url: "https://trafico.logisticsexpress.es",
    siteName: "Tráfico España by Logistics Express",
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tráfico España by Logistics Express",
    description: "Inteligencia vial en tiempo real",
  },
  robots: {
    index: true,
    follow: true,
  },
};

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
        <Header />
        {children}
      </body>
      {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
    </html>
  );
}
