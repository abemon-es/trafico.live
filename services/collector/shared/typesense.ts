/**
 * Typesense client for the collector process.
 *
 * Separate from the Next.js singleton — collectors have their own
 * node_modules and don't use @/ path aliases.
 */

import Typesense from "typesense";

let _client: Typesense.Client | null = null;

export function getTypesenseClient(): Typesense.Client {
  if (_client) return _client;

  const rawUrl = process.env.TYPESENSE_URL;
  const apiKey = process.env.TYPESENSE_API_KEY;

  if (!rawUrl || !apiKey) {
    throw new Error(
      "TYPESENSE_URL and TYPESENSE_API_KEY environment variables are required"
    );
  }

  const url = new URL(rawUrl);

  _client = new Typesense.Client({
    nodes: [
      {
        host: url.hostname,
        port: parseInt(url.port || "8108", 10),
        protocol: url.protocol.replace(":", "") as "http" | "https",
      },
    ],
    apiKey,
    connectionTimeoutSeconds: 10,
  });

  return _client;
}
