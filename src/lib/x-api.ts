/**
 * X (Twitter) API v2 client wrapper
 *
 * Supports two auth modes:
 *   - App-only (read-only): env X_API_BEARER_TOKEN
 *   - User context (posting): env X_API_KEY + X_API_SECRET + X_ACCESS_TOKEN + X_ACCESS_TOKEN_SECRET
 *
 * Posting requires X Developer Account with Basic tier ($100/mo write access).
 * https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
 *
 * Character limit: 280 (truncated to 277 + "..." if exceeded).
 */

const POST_URL = "https://api.twitter.com/2/tweets";
const MAX_CHARS = 280;
const TRUNCATE_SUFFIX = "...";

export interface PostTweetOptions {
  text: string;
  /** Optional pre-uploaded media IDs (from X media upload endpoint) */
  mediaIds?: string[];
}

export type XResult = "ok" | "skip" | "error";

/**
 * Build OAuth 1.0a Authorization header for user-context posting.
 * Uses Node.js built-in crypto — no external oauth library needed.
 */
async function buildOAuth1Header(
  method: string,
  url: string,
  body: string
): Promise<string> {
  const { createHmac } = await import("crypto");

  const apiKey = process.env.X_API_KEY!;
  const apiSecret = process.env.X_API_SECRET!;
  const accessToken = process.env.X_ACCESS_TOKEN!;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET!;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const encode = (s: string) => encodeURIComponent(s);

  // Combine oauth params + body params for signature base
  const bodyParams: Record<string, string> = {};
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string") bodyParams[k] = v;
    }
  } catch {
    // Non-JSON body — skip
  }

  const allParams = { ...oauthParams, ...bodyParams };
  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${encode(k)}=${encode(allParams[k])}`)
    .join("&");

  const baseString = `${method.toUpperCase()}&${encode(url)}&${encode(paramString)}`;
  const signingKey = `${encode(apiSecret)}&${encode(accessTokenSecret)}`;

  const signature = createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  oauthParams["oauth_signature"] = signature;

  const authHeader =
    "OAuth " +
    Object.entries(oauthParams)
      .map(([k, v]) => `${encode(k)}="${encode(v)}"`)
      .join(", ");

  return authHeader;
}

/**
 * Truncate text to X's 280-char limit.
 * Appends "..." if truncated. Returns original if within limit.
 */
export function truncateForX(text: string): string {
  if (text.length <= MAX_CHARS) return text;
  return text.slice(0, MAX_CHARS - TRUNCATE_SUFFIX.length) + TRUNCATE_SUFFIX;
}

/**
 * Post a tweet to X (Twitter).
 * Returns 'ok' on success, 'skip' if credentials missing, 'error' on failure.
 *
 * Auth preference: User context (OAuth 1.0a) if X_API_KEY/X_API_SECRET/X_ACCESS_TOKEN/X_ACCESS_TOKEN_SECRET
 * are all set. Falls back to Bearer-token-only — but Bearer token cannot post tweets (app-only is read-only).
 * In that case returns 'skip' with a warning.
 */
export async function postTweet(
  opts: PostTweetOptions,
  { retries = 2 }: { retries?: number } = {}
): Promise<XResult> {
  const hasUserContext =
    process.env.X_API_KEY &&
    process.env.X_API_SECRET &&
    process.env.X_ACCESS_TOKEN &&
    process.env.X_ACCESS_TOKEN_SECRET;

  const hasBearerOnly =
    process.env.X_API_BEARER_TOKEN && !hasUserContext;

  if (!hasUserContext && !hasBearerOnly) {
    console.warn("[x-api] No X credentials configured — skipping X post");
    return "skip";
  }

  if (hasBearerOnly) {
    console.warn(
      "[x-api] Only X_API_BEARER_TOKEN set — app-only Bearer cannot post tweets. " +
        "Set X_API_KEY + X_API_SECRET + X_ACCESS_TOKEN + X_ACCESS_TOKEN_SECRET for user-context posting."
    );
    return "skip";
  }

  const text = truncateForX(opts.text);
  const bodyObj: Record<string, unknown> = { text };
  if (opts.mediaIds && opts.mediaIds.length > 0) {
    bodyObj.media = { media_ids: opts.mediaIds };
  }
  const body = JSON.stringify(bodyObj);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const authHeader = await buildOAuth1Header("POST", POST_URL, body);

      const res = await fetch(POST_URL, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body,
      });

      if (res.status === 429) {
        const resetHeader = res.headers.get("x-rate-limit-reset");
        const resetAt = resetHeader ? new Date(Number(resetHeader) * 1000) : null;
        const waitMs = resetAt
          ? Math.max(0, resetAt.getTime() - Date.now()) + 500
          : Math.pow(2, attempt) * 2000;

        console.warn(
          `[x-api] Rate limited (429). Retry ${attempt}/${retries} in ${Math.round(waitMs / 1000)}s` +
            (resetAt ? ` (reset at ${resetAt.toISOString()})` : "")
        );

        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, Math.min(waitMs, 60_000)));
          continue;
        }
        return "error";
      }

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.error(`[x-api] Post failed HTTP ${res.status}: ${errBody}`);
        if (attempt === retries) return "error";
        await new Promise((r) => setTimeout(r, attempt * 1000));
        continue;
      }

      console.log(`[x-api] Tweet posted successfully`);
      return "ok";
    } catch (err) {
      console.error(`[x-api] Network error (attempt ${attempt}/${retries}):`, err);
      if (attempt === retries) return "error";
      await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }

  return "error";
}
