import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' https://fonts.openmaptiles.org",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.cartocdn.com https://*.carto.com https://fonts.openmaptiles.org https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.openseamap.org https://tiles.openseamap.org https://tile.openweathermap.org https://server.arcgisonline.com",
      "worker-src 'self' blob:",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // DGT camera feeds (NAP portal)
      {
        protocol: "https",
        hostname: "nap.dgt.es",
      },
      // DGT camera feeds (infocar portal)
      {
        protocol: "https",
        hostname: "infocar.dgt.es",
      },
      // DGT informacion.trafico portal (camera stills)
      {
        protocol: "https",
        hostname: "informacion.trafico.dgt.es",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // CDN edge caching — Cloudflare respects s-maxage.
      // Tier 1: static-ish pages (5min edge cache)
      {
        source: "/(radares|zbe|etiqueta-ambiental|sobre|aviso-legal|politica-privacidad|politica-cookies|api-docs|ciclistas|puntos-negros|calculadora|cuanto-cuesta-cargar|mejor-hora|media|operaciones|restricciones)/:path*",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" },
        ],
      },
      // Tier 2: all other pages (60s edge cache)
      {
        source: "/((?!api/|_next/|sitemap).*)",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=120" },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        // All sitemaps served via API routes — no ISR/build-time dependency.
        {
          source: "/sitemap.xml",
          destination: "/api/sitemap-index",
        },
        {
          source: "/sitemap/:id(\\d+).xml",
          destination: "/api/sitemap/:id",
        },
      ],
    };
  },
  async redirects() {
    return [
      // -----------------------------------------------------------------------
      // Legacy rewrite-turned-redirects (duplicate content)
      // -----------------------------------------------------------------------
      // 301: /combustible → /gasolineras
      {
        source: "/combustible",
        destination: "/gasolineras",
        permanent: true,
      },
      {
        source: "/combustible/:path*",
        destination: "/gasolineras/:path*",
        permanent: true,
      },
      // 301: /alertas → /incidencias
      {
        source: "/alertas",
        destination: "/incidencias",
        permanent: true,
      },
      {
        source: "/alertas/:path*",
        destination: "/incidencias/:path*",
        permanent: true,
      },
      // 301: /provincias → /espana
      {
        source: "/provincias",
        destination: "/espana",
        permanent: true,
      },
      // -----------------------------------------------------------------------
      // Content duplicates: /blog, /insights, /informes → /noticias
      // -----------------------------------------------------------------------
      { source: "/blog", destination: "/noticias", permanent: true },
      { source: "/blog/:slug*", destination: "/noticias/:slug*", permanent: true },
      { source: "/insights", destination: "/noticias", permanent: true },
      { source: "/insights/:slug*", destination: "/noticias/:slug*", permanent: true },
      { source: "/informes", destination: "/noticias", permanent: true },
      { source: "/informes/:slug*", destination: "/noticias/:slug*", permanent: true },
      // -----------------------------------------------------------------------
      // Maritime fuel: /gasolineras/maritimas is canonical — redirect old path
      // NOTE: /maritimo/combustible is kept in sitemap as-is (it has real content).
      //       Do NOT redirect /maritimo/combustible → /gasolineras/maritimas
      //       as that would create a loop with the rewrite below.
      // -----------------------------------------------------------------------
      {
        source: "/gasolineras/maritimas",
        destination: "/maritimo/combustible",
        permanent: true,
      },
      {
        source: "/gasolineras/maritimas/:path*",
        destination: "/maritimo/combustible/:path*",
        permanent: true,
      },
      // -----------------------------------------------------------------------
      // Geographic duplicates
      // -----------------------------------------------------------------------
      // /trafico/:city → /ciudad/:city  (city-level traffic pages consolidated)
      {
        source: "/trafico/:city",
        destination: "/ciudad/:city",
        permanent: true,
      },
      // /explorar/territorios/:slug → /comunidad-autonoma/:slug
      {
        source: "/explorar/territorios/:slug",
        destination: "/comunidad-autonoma/:slug",
        permanent: true,
      },
      // /explorar/carreteras/:road → /carreteras/:road
      {
        source: "/explorar/carreteras/:road",
        destination: "/carreteras/:road",
        permanent: true,
      },
      // /explorar → /comunidad-autonoma (base redirect)
      // Must come AFTER the more-specific /explorar/territorios and /explorar/carreteras
      {
        source: "/explorar",
        destination: "/comunidad-autonoma",
        permanent: true,
      },
      // TODO: /comunidad-autonoma/:community/:province → /provincias/:code
      //       Requires province-slug→INE-code mapping lookup (not feasible in
      //       next.config.ts static redirects — handle in middleware if needed)
      // /comunidad-autonoma/:community/:province/:city → /municipio/:city
      {
        source: "/comunidad-autonoma/:community/:province/:city",
        destination: "/municipio/:city",
        permanent: true,
      },
      // -----------------------------------------------------------------------
      // Road sub-page consolidation
      // -----------------------------------------------------------------------
      // /carreteras/:road/camaras → /camaras/carretera/:road
      {
        source: "/carreteras/:road/camaras",
        destination: "/camaras/carretera/:road",
        permanent: true,
      },
      // /carreteras/:road/radares → /radares/:road
      {
        source: "/carreteras/:road/radares",
        destination: "/radares/:road",
        permanent: true,
      },
      // /analisis/carreteras/:road → /carreteras/:road
      {
        source: "/analisis/carreteras/:road",
        destination: "/carreteras/:road",
        permanent: true,
      },
      // -----------------------------------------------------------------------
      // Stats / analysis duplicates
      // -----------------------------------------------------------------------
      // /analisis/accidentes/:provincia → /estadisticas/accidentes/:provincia
      {
        source: "/analisis/accidentes/:provincia",
        destination: "/estadisticas/accidentes/:provincia",
        permanent: true,
      },
      // /incidencias/estadisticas → /incidencias/analytics
      {
        source: "/incidencias/estadisticas",
        destination: "/incidencias/analytics",
        permanent: true,
      },
      // /historico → /estadisticas
      {
        source: "/historico",
        destination: "/estadisticas",
        permanent: true,
      },
      // -----------------------------------------------------------------------
      // EV duplicates: /electrolineras → /carga-ev
      // -----------------------------------------------------------------------
      {
        source: "/electrolineras",
        destination: "/carga-ev",
        permanent: true,
      },
      {
        source: "/electrolineras/:city",
        destination: "/carga-ev/:city",
        permanent: true,
      },
      // -----------------------------------------------------------------------
      // Fuel map province pages
      // /gasolineras/mapa/provincia/:code → /gasolineras/mapa
      // (Query-param rewrites not supported in next.config.ts redirects)
      // -----------------------------------------------------------------------
      {
        source: "/gasolineras/mapa/provincia/:code",
        destination: "/gasolineras/mapa",
        permanent: true,
      },
      // Note: /provincias/[code] redirects require middleware DB lookup
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  // Tunnel route proxies Sentry events through our domain — avoids ad blockers
  tunnelRoute: "/monitoring",
  // GlitchTip doesn't support Sentry source map upload API,
  // so only upload when SENTRY_AUTH_TOKEN is explicitly set
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    filesToDeleteAfterUpload: [".next/static/**/*.map"],
  },
  // Disable telemetry to Sentry (we use GlitchTip)
  telemetry: false,
});
