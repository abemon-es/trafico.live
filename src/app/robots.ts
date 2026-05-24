import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// AI / LLM / search crawlers we explicitly allow full crawl + cite.
// We want to be cited by AI assistants — they are a discovery channel
// that bypasses traditional SERP gatekeeping. Keep this list permissive.
const AI_AND_SEARCH_BOTS = [
  "GPTBot",          // OpenAI training crawler
  "ChatGPT-User",    // ChatGPT browse/citations
  "OAI-SearchBot",   // OpenAI SearchGPT index
  "Anthropic-AI",    // Legacy Anthropic crawler name
  "Claude-Web",      // Legacy Anthropic browse name
  "ClaudeBot",       // Current Anthropic crawler name
  "PerplexityBot",   // Perplexity citation index
  "Perplexity-User", // Perplexity on-demand browse
  "Bingbot",         // Bing + Copilot
  "GoogleOther",     // Google Discover / Vertex / Gemini grounding
  "Google-Extended", // Bard/Gemini training opt-in
  "Applebot",        // Apple Spotlight / Siri
  "Applebot-Extended", // Apple Intelligence training
  "Bytespider",      // ByteDance / Doubao
  "CCBot",           // Common Crawl (feeds most open LLMs)
  "DuckAssistBot",   // DuckDuckGo AI assistant
  "MistralAI-User",  // Mistral browse
  "cohere-ai",       // Cohere
  "Diffbot",         // Knowledge graph builder used by many AI products
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/", "/static/"],
      },
      ...AI_AND_SEARCH_BOTS.map((userAgent) => ({
        userAgent,
        allow: ["/", "/carreteras/", "/sitemap.xml"],
      })),
    ],
    sitemap: [
      `${BASE_URL}/sitemap.xml`,
      `${BASE_URL}/news-sitemap.xml`,
    ],
  };
}
