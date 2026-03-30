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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
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
      // Redirect /mapa to homepage (unified map now on /)
      {
        source: "/mapa",
        destination: "/",
        permanent: true,
      },
      // Note: /provincias/[code] redirects would need middleware
      // since we need to look up the slug from the code
    ];
  },
};

export default nextConfig;
