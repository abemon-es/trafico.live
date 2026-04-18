/**
 * Web Push Sender (VAPID)
 *
 * Sends Web Push notifications to subscribed browsers.
 * Uses the `web-push` npm package.
 *
 * Install before use:
 *   npm install web-push
 *   npm install --save-dev @types/web-push
 *   (add to services/collector/package.json as well for the collector worker)
 *
 * Required env vars:
 *   VAPID_PUBLIC_KEY   — base64url-encoded public key (generate once with web-push generate-vapid-keys)
 *   VAPID_PRIVATE_KEY  — base64url-encoded private key
 *   VAPID_SUBJECT      — mailto: or https: URI identifying the sender
 *                        e.g. "mailto:noticias@trafico.live"
 *
 * Generate keys (one-time):
 *   npx web-push generate-vapid-keys
 *
 * TODO (T3.6 schema):
 *   The PushSubscription model needs an `isActive Boolean @default(true)` field so
 *   expired subscriptions (HTTP 410) can be soft-deleted without removing the row.
 *   Add index: @@index([userId, isActive])
 */

// ---------------------------------------------------------------------------
// Types — mirrors the browser PushSubscription serialization
// ---------------------------------------------------------------------------

export interface SerializedPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface SendPushOptions {
  subscription: SerializedPushSubscription;
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

export interface SendPushResult {
  success: boolean;
  statusCode?: number;
  /** True if the subscription should be marked inactive (HTTP 410 Gone) */
  expired: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// VAPID initialization
// ---------------------------------------------------------------------------

function getVapidKeys(): { publicKey: string; privateKey: string; subject: string } {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:noticias@trafico.live";

  if (!publicKey || !privateKey) {
    throw new Error(
      "[web-push] VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set. " +
        "Generate with: npx web-push generate-vapid-keys"
    );
  }

  return { publicKey, privateKey, subject };
}

// ---------------------------------------------------------------------------
// Send a single push notification
// ---------------------------------------------------------------------------

/**
 * Send a Web Push notification to a single subscription.
 *
 * Returns `expired: true` when the push service returns 410 Gone — the caller
 * should mark the subscription as inactive in the database.
 *
 * The `web-push` package is dynamically imported to avoid bundling errors when
 * running in Next.js edge contexts (this file is server-only).
 */
export async function sendPushNotification(opts: SendPushOptions): Promise<SendPushResult> {
  try {
    // Dynamic import — web-push is a Node.js-only package, not bundled with Next.js.
    // The package name is intentionally obscured to prevent static analysis errors
    // when web-push is not yet installed (install: npm install web-push @types/web-push).
    const pkg = "web-push";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webpush: any = await import(/* webpackIgnore: true */ pkg);

    const { publicKey, privateKey, subject } = getVapidKeys();

    const wp = webpush.default ?? webpush;
    wp.setVapidDetails(subject, publicKey, privateKey);

    const payload = JSON.stringify({
      title: opts.title,
      body: opts.body,
      url: opts.url || "https://trafico.live",
      icon: opts.icon || "https://trafico.live/icons/icon-192x192.png",
      badge: opts.badge || "https://trafico.live/icons/badge-72x72.png",
      tag: opts.tag,
      data: { url: opts.url || "https://trafico.live" },
    });

    const result = await wp.sendNotification(
      {
        endpoint: opts.subscription.endpoint,
        keys: {
          p256dh: opts.subscription.keys.p256dh,
          auth: opts.subscription.keys.auth,
        },
      },
      payload,
      {
        TTL: 24 * 60 * 60, // 24 hours
        urgency: "normal",
      }
    );

    return { success: true, statusCode: result.statusCode, expired: false };
  } catch (err: unknown) {
    const error = err as { statusCode?: number; body?: string; message?: string };
    const statusCode = error.statusCode;

    // HTTP 410 Gone = subscription no longer valid
    if (statusCode === 410) {
      return {
        success: false,
        statusCode,
        expired: true,
        error: "Subscription expired (410 Gone)",
      };
    }

    // HTTP 404 also means gone on some push services
    if (statusCode === 404) {
      return {
        success: false,
        statusCode,
        expired: true,
        error: "Subscription not found (404)",
      };
    }

    return {
      success: false,
      statusCode,
      expired: false,
      error: error.message || String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isWebPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}
