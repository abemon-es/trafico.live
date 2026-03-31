import type { Metadata } from "next";
import { Exo_2, DM_Sans, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StickyFooterAd } from "@/components/ads/StickyFooterAd";
import { CookieConsent } from "@/components/legal/CookieConsent";
import { StructuredData, generateOrganizationSchema, generateWebSiteSchema } from "@/components/seo/StructuredData";
import "./globals.css";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

const exo2 = Exo_2({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
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
    images: [`${BASE_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: BASE_URL,
  },
  manifest: "/manifest.json",
  themeColor: "#1b4bd5",
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
  sameAs: [
    "https://twitter.com/traficolive",
    "https://www.linkedin.com/company/traficolive",
    "https://www.facebook.com/traficolive",
  ],
  contactPoint: {
    contactType: "customer service",
    url: `${BASE_URL}/sobre`,
    availableLanguage: "Spanish",
  },
  foundingDate: "2024",
  areaServed: { "@type": "Country", name: "España" },
});

const webSiteSchema = generateWebSiteSchema({
  name: "trafico.live",
  url: BASE_URL,
  description: "Tráfico en tiempo real en España: incidencias, cámaras DGT, radares, precios de combustible, cargadores eléctricos y zonas de bajas emisiones.",
  searchUrl: `${BASE_URL}/explorar?q={search_term_string}`,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="es">
      <body
        className={`${exo2.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <StructuredData data={[organizationSchema, webSiteSchema]} />
        <Header />
        {children}
        <StickyFooterAd />
        <Footer />
        <CookieConsent />
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
