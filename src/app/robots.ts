import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/", "/static/"],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/carreteras/", "/sitemap.xml"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/carreteras/", "/sitemap.xml"],
      },
      {
        userAgent: "Anthropic-AI",
        allow: ["/", "/carreteras/", "/sitemap.xml"],
      },
      {
        userAgent: "Claude-Web",
        allow: ["/", "/carreteras/", "/sitemap.xml"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
