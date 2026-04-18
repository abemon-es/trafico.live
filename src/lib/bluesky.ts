/**
 * Bluesky AT Protocol client wrapper
 *
 * Requires: @atproto/api (install: npm install @atproto/api)
 * Env vars: BLUESKY_HANDLE, BLUESKY_APP_PASSWORD
 *
 * Provides postSkeet() with automatic URL facet detection,
 * optional external embed card, and retry-with-backoff on rate limits.
 */

// Dynamic import to avoid hard crash if package not installed
let BskyAgent: typeof import("@atproto/api").BskyAgent | null = null;

async function getAgent() {
  try {
    const mod = await import("@atproto/api");
    BskyAgent = mod.BskyAgent;
  } catch {
    return null;
  }

  const handle = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD;

  if (!handle || !password) {
    console.warn("[bluesky] BLUESKY_HANDLE or BLUESKY_APP_PASSWORD not set — skipping Bluesky");
    return null;
  }

  const agent = new BskyAgent({ service: "https://bsky.social" });
  await agent.login({ identifier: handle, password });
  return agent;
}

/**
 * Build RichText facets for all https:// URLs found in text.
 * Returns an array of AT Protocol facets (byteSlice index into UTF-8 encoded text).
 */
function buildUrlFacets(text: string): Array<{
  index: { byteStart: number; byteEnd: number };
  features: Array<{ $type: string; uri: string }>;
}> {
  const encoder = new TextEncoder();
  const facets: ReturnType<typeof buildUrlFacets> = [];
  const urlRegex = /https?:\/\/[^\s)]+/g;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    const beforeBytes = encoder.encode(text.slice(0, match.index)).length;
    const urlBytes = encoder.encode(url).length;
    facets.push({
      index: { byteStart: beforeBytes, byteEnd: beforeBytes + urlBytes },
      features: [{ $type: "app.bsky.richtext.facet#link", uri: url }],
    });
  }

  return facets;
}

export interface PostSkeetOptions {
  /** Post text (max 300 chars for Bluesky). Will be truncated if longer. */
  text: string;
  /** Optional external link card (title + description + URL thumbnail) */
  link?: {
    uri: string;
    title: string;
    description?: string;
  };
}

export type BlueskyResult = "ok" | "skip" | "error";

/**
 * Post a skeet to Bluesky.
 * Returns 'ok' on success, 'skip' if credentials missing, 'error' on failure.
 */
export async function postSkeet(
  opts: PostSkeetOptions,
  { retries = 3 }: { retries?: number } = {}
): Promise<BlueskyResult> {
  const MAX_CHARS = 300;
  let text = opts.text;
  if (text.length > MAX_CHARS) {
    text = text.slice(0, MAX_CHARS - 1) + "…";
  }

  let agent: Awaited<ReturnType<typeof getAgent>>;
  try {
    agent = await getAgent();
  } catch (err) {
    console.error("[bluesky] Login failed:", err);
    return "error";
  }

  if (!agent) return "skip";

  const facets = buildUrlFacets(text);

  // Build post record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const record: Record<string, any> = {
    $type: "app.bsky.feed.post",
    text,
    createdAt: new Date().toISOString(),
    langs: ["es"],
  };

  if (facets.length > 0) {
    record.facets = facets;
  }

  if (opts.link) {
    record.embed = {
      $type: "app.bsky.embed.external",
      external: {
        uri: opts.link.uri,
        title: opts.link.title,
        description: opts.link.description ?? "",
      },
    };
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await agent.post(record);
      console.log(`[bluesky] Skeet posted successfully`);
      return "ok";
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      const status = error?.status;

      if (status === 429) {
        // Rate limited — exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[bluesky] Rate limited (429). Retry ${attempt}/${retries} in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      console.error(`[bluesky] Post failed (attempt ${attempt}/${retries}):`, error?.message ?? err);

      if (attempt === retries) return "error";

      const delay = attempt * 500;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return "error";
}
