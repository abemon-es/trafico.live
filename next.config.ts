import type { NextConfig } from "next";

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
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com https://fonts.openmaptiles.org",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.cartocdn.com https://*.carto.com https://fonts.openmaptiles.org https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
      "worker-src 'self' blob:",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
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
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Next.js auto-generated sitemap index is broken (404) with generateSitemaps
        // in Coolify builds. Route to our manual API handler instead.
        {
          source: "/sitemap.xml",
          destination: "/api/sitemap-index",
        },
      ],
    };
  },
  async redirects() {
    return [
      // 301: /combustible → /gasolineras (was a rewrite — duplicate content)
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
      // 301: /alertas → /incidencias (was a rewrite — duplicate content)
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
      // Redirect old /provincias to /espana
      {
        source: "/provincias",
        destination: "/espana",
        permanent: true,
      },
      // 301: /blog, /insights → /noticias
      { source: "/blog", destination: "/noticias", permanent: true },
      { source: "/blog/:slug*", destination: "/noticias/:slug*", permanent: true },
      { source: "/insights", destination: "/noticias", permanent: true },
      { source: "/insights/:slug*", destination: "/noticias/:slug*", permanent: true },
      // 301: /gasolineras/maritimas → /maritimo/combustible
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
      // Note: /provincias/[code] redirects would need middleware
      // since we need to look up the slug from the code
    ];
  },
};

export default nextConfig;
