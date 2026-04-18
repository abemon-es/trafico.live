/**
 * GA4 Measurement Protocol — server-side event sender.
 *
 * Used when a server-side 302 redirect means the browser's gtag never fires
 * (e.g. /go/[partner]/[slug] affiliate redirector).
 *
 * Env vars required:
 *   GA4_MEASUREMENT_ID   — e.g. "G-XXXXXXXXXX"
 *   GA4_API_SECRET       — created in GA4 > Admin > Data Streams > Measurement Protocol API secrets
 *
 * Ref: https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events
 */

const GA4_MP_ENDPOINT = "https://www.google-analytics.com/mp/collect";

/** Timeout for the GA4 MP POST — never block the redirect. */
const GA4_TIMEOUT_MS = 1_000;

export interface GA4Event {
  name: string;
  params?: Record<string, string | number | boolean | null | undefined>;
}

export interface SendEventOptions {
  /** GA4 client_id — must be a stable UUID or similar per-browser ID. */
  clientId: string;
  event: GA4Event;
  /** Optional session_id for session-level attribution. */
  sessionId?: string;
  /** Optional user_id for cross-device identification. */
  userId?: string;
}

/**
 * Send a single event to the GA4 Measurement Protocol.
 *
 * - Returns silently (with a warning) when env vars are missing.
 * - Uses a 1-second abort timeout so it never blocks 302 redirects.
 * - Failures are logged as warnings, not thrown.
 */
export async function sendEvent({
  clientId,
  event,
  sessionId,
  userId,
}: SendEventOptions): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;

  if (!measurementId || !apiSecret) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[ga4-mp] GA4_MEASUREMENT_ID or GA4_API_SECRET not set — skipping server-side event"
      );
    }
    return;
  }

  const url = `${GA4_MP_ENDPOINT}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;

  const payload: Record<string, unknown> = {
    client_id: clientId,
    events: [
      {
        name: event.name,
        params: {
          engagement_time_msec: "1",
          // session_id must be a string in MP
          ...(sessionId && { session_id: sessionId }),
          ...event.params,
        },
      },
    ],
  };

  if (userId) {
    payload.user_id = userId;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GA4_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`[ga4-mp] Non-2xx response: ${res.status}`);
    }
  } catch (err) {
    // Abort (timeout) or network error — non-critical
    if (err instanceof Error && err.name === "AbortError") {
      console.warn("[ga4-mp] Request timed out after 1s — skipping");
    } else {
      console.warn("[ga4-mp] Failed to send event:", err instanceof Error ? err.message : err);
    }
  } finally {
    clearTimeout(timer);
  }
}
