import type { Metadata, Viewport } from "next";
import { Exo_2, DM_Sans, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { Header } from "@/components/layout/Header";
import { ContextStrip } from "@/components/layout/ContextStrip";
import { Footer } from "@/components/layout/Footer";
import { StickyFooterAd } from "@/components/ads/StickyFooterAd";
import { CookieConsent } from "@/components/legal/CookieConsent";
import { SkipLink } from "@/components/ui/SkipLink";
import { WebVitals } from "@/components/analytics/WebVitals";
import { StructuredData, generateOrganizationSchema, generateWebSiteSchema, generateSiteNavigationSchema } from "@/components/seo/StructuredData";
import { SWRProvider } from "@/components/providers/SWRProvider";
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
  // Critical: without metadataBase, every relative-URL OG image (every
  // `app/**/opengraph-image.tsx` route file) is resolved against
  // http://localhost:3000 at build time. Every social share card on
  // every page that uses dynamic OG images was broken in production.
  // One-line fix; sitewide impact.
  metadataBase: new URL(BASE_URL),
  title: {
    default: "trafico.live — Tráfico España en Tiempo Real",
    template: "%s | trafico.live",
  },
  description:
    "Tráfico en tiempo real en España: incidencias DGT, trenes Renfe, vuelos, barcos AIS, calidad del aire, combustible y cargadores EV. Datos oficiales actualizados cada minuto.",
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
    "trenes tiempo real",
    "Renfe en vivo",
    "vuelos España",
    "AENA aeropuertos",
    "barcos AIS",
    "puertos España",
    "calidad del aire",
    "ICA MITECO",
    "estaciones aforo DGT",
    "IMD tráfico",
    "puntos negros",
    "accidentes carretera",
    "transporte público",
    "GTFS España",
    "OpenSky",
    "Cercanías Madrid",
    "Cercanías Barcelona",
  ],
  authors: [{ name: "Abemon", url: "https://abemon.es" }],
  openGraph: {
    title: "trafico.live — Tráfico España en Tiempo Real",
    description:
      "Mapa unificado: tráfico, trenes, vuelos, barcos, calidad del aire y combustible. Datos oficiales DGT, AEMET, Renfe, AENA, MITECO en tiempo real.",
    url: BASE_URL,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: `${BASE_URL}/og-image.webp`,
        width: 1200,
        height: 630,
        alt: "trafico.live — Tráfico España en Tiempo Real",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@traficolive",
    title: "trafico.live — Tráfico España en Tiempo Real",
    description: "Inteligencia de movilidad en tiempo real: carreteras, trenes, vuelos, puertos, aire.",
    images: [`${BASE_URL}/og-image.webp`],
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large" as const,
    "max-snippet": -1,
  },
  alternates: {
    canonical: BASE_URL,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "trafico.live",
  },
};

export const viewport: Viewport = {
  themeColor: "#1b4bd5",
};

const organizationSchema = generateOrganizationSchema({
  name: "trafico.live",
  url: BASE_URL,
  description: "Plataforma de inteligencia multimodal en tiempo real para España. Datos oficiales de DGT, AEMET, Renfe, AENA, MITECO, MobilityData, OpenSky: tráfico, trenes, vuelos, barcos, calidad del aire, combustible, cargadores eléctricos y zonas de bajas emisiones.",
  logo: `${BASE_URL}/icon.svg`,
  sameAs: [],
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

const siteNavSchema = generateSiteNavigationSchema([
  { name: "Mapa en vivo", url: `${BASE_URL}/` },
  { name: "Incidencias", url: `${BASE_URL}/incidencias` },
  { name: "Cámaras DGT", url: `${BASE_URL}/camaras` },
  { name: "Atascos", url: `${BASE_URL}/atascos` },
  { name: "Alertas meteo", url: `${BASE_URL}/alertas-meteo` },
  { name: "Autopistas", url: `${BASE_URL}/carreteras/autopistas` },
  { name: "Autovías", url: `${BASE_URL}/carreteras/autovias` },
  { name: "Radares", url: `${BASE_URL}/radares` },
  { name: "Estadísticas", url: `${BASE_URL}/estadisticas` },
  { name: "Precio gasolina hoy", url: `${BASE_URL}/precio-gasolina-hoy` },
  { name: "Precio diésel hoy", url: `${BASE_URL}/precio-diesel-hoy` },
  { name: "Gasolineras baratas", url: `${BASE_URL}/gasolineras/baratas` },
  { name: "Cargadores EV", url: `${BASE_URL}/carga-ev` },
  { name: "Comunidades autónomas", url: `${BASE_URL}/comunidad-autonoma` },
  { name: "Provincias", url: `${BASE_URL}/espana` },
  { name: "Ciudades", url: `${BASE_URL}/ciudad` },
  { name: "Noticias", url: `${BASE_URL}/noticias` },
  { name: "Profesional", url: `${BASE_URL}/profesional` },
  { name: "API", url: `${BASE_URL}/api-docs` },
  { name: "Trenes en vivo", url: `${BASE_URL}/trenes` },
  { name: "Estaciones tren", url: `${BASE_URL}/trenes/estaciones` },
  { name: "Cercanías", url: `${BASE_URL}/trenes/cercanias` },
  { name: "Aviación", url: `${BASE_URL}/aviacion` },
  { name: "Aeropuertos AENA", url: `${BASE_URL}/aviacion/aeropuertos` },
  { name: "Marítimo", url: `${BASE_URL}/maritimo` },
  { name: "Calidad del aire", url: `${BASE_URL}/calidad-aire` },
  { name: "Transporte público", url: `${BASE_URL}/transporte-publico` },
  { name: "Estadísticas transporte", url: `${BASE_URL}/estadisticas-transporte` },
  { name: "Accidentes", url: `${BASE_URL}/accidentes` },
  { name: "Clima", url: `${BASE_URL}/clima` },
  { name: "Corredores", url: `${BASE_URL}/corredores` },
  { name: "Insights", url: `${BASE_URL}/insights` },
  { name: "Blog", url: `${BASE_URL}/blog` },
]);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://tiles.trafico.live" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://tiles.trafico.live" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${exo2.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <SkipLink />
        <StructuredData data={[organizationSchema, webSiteSchema, siteNavSchema]} />
        <SWRProvider>
          <Header />
          <ContextStrip />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <StickyFooterAd />
          <Footer />
        </SWRProvider>
        <WebVitals />
        <CookieConsent />
        <Script id="sw-register" strategy="afterInteractive">
          {`if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}`}
        </Script>
        <Script id="tile-sw-register" strategy="afterInteractive">
          {`if('serviceWorker' in navigator){navigator.serviceWorker.register('/tile-sw.js',{scope:'/'}).catch(()=>{})}`}
        </Script>
        {gaId && (
          <>
            <Script id="ga-consent-default" strategy="beforeInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',wait_for_update:500});`}
            </Script>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
