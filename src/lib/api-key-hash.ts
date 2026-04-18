/**
 * Edge-safe API key hashing utility.
 *
 * Uses Web Crypto (crypto.subtle) — no Node.js imports.
 * Compatible with Next.js Edge Runtime and Node.js runtimes.
 */

/**
 * Hash an API key using SHA-256 via Web Crypto.
 * Returns a lowercase hex string (64 chars).
 *
 * Used in middleware to avoid sending plaintext keys over internal fetch calls.
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
