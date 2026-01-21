import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Redirect old /provincias to /espana
      {
        source: "/provincias",
        destination: "/espana",
        permanent: true,
      },
      // Note: /provincias/[code] redirects would need middleware
      // since we need to look up the slug from the code
    ];
  },
};

export default nextConfig;
