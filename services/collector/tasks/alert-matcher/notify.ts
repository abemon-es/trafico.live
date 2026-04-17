/**
 * Notification Dispatcher
 *
 * Routes a match result to the appropriate notification channels:
 *   PUSH     — Web Push via VAPID (web-push package)
 *   EMAIL    — Amazon SES via AWS SDK (existing ses.ts pattern)
 *   TELEGRAM — Telegram Bot API via plain fetch
 *
 * All channels are dispatched in parallel with Promise.allSettled.
 * A failure in one channel never aborts the others.
 * All errors are logged with alertId + channel for observability.
 *
 * Database interactions:
 *   - PUSH: reads PushSubscription rows for the user
 *   - EMAIL: reads User email for the user
 *   - TELEGRAM: reads User.telegramId (TODO — requires T3.6 schema addition)
 */

import { PrismaClient } from "@prisma/client";
import { AlertChannel, AlertTarget, MatchResult } from "../../../../src/lib/alert-matcher.js";

const TASK = "alert-matcher/notify";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

export async function notify(
  prisma: PrismaClient,
  alert: AlertTarget,
  match: MatchResult
): Promise<void> {
  if (alert.channels.length === 0) return;

  const channelJobs = alert.channels.map(
    (channel) => () => dispatchChannel(prisma, alert, match, channel)
  );

  const results = await Promise.allSettled(channelJobs.map((fn) => fn()));

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected") {
      console.error(
        `[${TASK}] Channel ${alert.channels[i]} failed for alert ${alert.id}:`,
        r.reason
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Per-channel dispatch
// ---------------------------------------------------------------------------

async function dispatchChannel(
  prisma: PrismaClient,
  alert: AlertTarget,
  match: MatchResult,
  channel: AlertChannel
): Promise<void> {
  switch (channel) {
    case "PUSH":
      await sendPushChannel(prisma, alert, match);
      break;
    case "EMAIL":
      await sendEmailChannel(prisma, alert, match);
      break;
    case "TELEGRAM":
      await sendTelegramChannel(prisma, alert, match);
      break;
    default:
      console.warn(`[${TASK}] Unknown channel: ${channel} for alert ${alert.id}`);
  }
}

// ---------------------------------------------------------------------------
// PUSH channel
// ---------------------------------------------------------------------------

async function sendPushChannel(
  prisma: PrismaClient,
  alert: AlertTarget,
  match: MatchResult
): Promise<void> {
  const { isWebPushConfigured, sendPushNotification } = await import(
    "../../../../src/lib/web-push.js"
  );

  if (!isWebPushConfigured()) {
    console.warn(`[${TASK}] PUSH skipped — VAPID keys not configured`);
    return;
  }

  // Fetch all active push subscriptions for this user
  // NOTE: requires PushSubscription model in schema (T3.6 responsibility).
  // This query uses `isActive` field — add to schema if not present.
  let subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[];

  try {
    // Dynamic query — PushSubscription model may not exist yet (T3.6)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscriptions = await (prisma as any).pushSubscription.findMany({
      where: { userId: alert.userId, isActive: true },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
  } catch {
    console.warn(
      `[${TASK}] PushSubscription model not found — skipping PUSH for alert ${alert.id}. ` +
        "T3.6 must add PushSubscription to schema."
    );
    return;
  }

  if (subscriptions.length === 0) {
    console.log(
      `[${TASK}] No active push subscriptions for user ${alert.userId} (alert ${alert.id})`
    );
    return;
  }

  const pushResults = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const result = await sendPushNotification({
        subscription: {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        title: match.title,
        body: match.body,
        url: match.url,
        tag: `alert-${alert.id}`,
      });

      if (result.expired) {
        // Mark subscription as inactive (HTTP 410 Gone)
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prisma as any).pushSubscription.update({
            where: { id: sub.id },
            data: { isActive: false },
          });
          console.log(
            `[${TASK}] Push subscription ${sub.id} marked inactive (expired 410)`
          );
        } catch {
          console.warn(
            `[${TASK}] Could not mark push subscription ${sub.id} as inactive`
          );
        }
      }

      if (!result.success && !result.expired) {
        throw new Error(
          `Push failed for subscription ${sub.id}: ${result.error} (HTTP ${result.statusCode})`
        );
      }
    })
  );

  const sent = pushResults.filter((r) => r.status === "fulfilled").length;
  const failed = pushResults.filter((r) => r.status === "rejected").length;

  if (failed > 0) {
    pushResults
      .filter((r) => r.status === "rejected")
      .forEach((r) => {
        if (r.status === "rejected") {
          console.error(`[${TASK}] Push error for alert ${alert.id}:`, r.reason);
        }
      });
  }

  console.log(
    `[${TASK}] PUSH alert ${alert.id}: sent=${sent}, failed=${failed} of ${subscriptions.length} subscriptions`
  );
}

// ---------------------------------------------------------------------------
// EMAIL channel
// ---------------------------------------------------------------------------

async function sendEmailChannel(
  prisma: PrismaClient,
  alert: AlertTarget,
  match: MatchResult
): Promise<void> {
  // Look up user email
  let user: { email: string } | null = null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user = await (prisma as any).user.findUnique({
      where: { id: alert.userId },
      select: { email: true },
    });
  } catch {
    console.warn(
      `[${TASK}] User model not found — skipping EMAIL for alert ${alert.id}. ` +
        "T3.6 must add User to schema."
    );
    return;
  }

  if (!user?.email) {
    console.log(`[${TASK}] No email for user ${alert.userId} (alert ${alert.id})`);
    return;
  }

  const { sendEmail, isSESConfigured } = await import(
    "../../../../src/lib/email/ses.js"
  );

  if (!isSESConfigured()) {
    console.warn(`[${TASK}] EMAIL skipped — AWS SES not configured`);
    return;
  }

  const unsubscribeUrl = `${BASE_URL}/alertas?action=unsubscribe&alertId=${alert.id}`;
  const html = buildAlertEmailHtml(match, unsubscribeUrl);
  const text = buildAlertEmailText(match, unsubscribeUrl);

  await sendEmail({
    to: user.email,
    subject: match.title,
    html,
    text,
    tags: { alertType: match.type, channel: "alert-matcher" },
  });

  console.log(
    `[${TASK}] EMAIL sent for alert ${alert.id} to ${user.email}`
  );
}

// ---------------------------------------------------------------------------
// TELEGRAM channel
// ---------------------------------------------------------------------------

async function sendTelegramChannel(
  prisma: PrismaClient,
  alert: AlertTarget,
  match: MatchResult
): Promise<void> {
  const { sendMessage, buildAlertMessage, isTelegramConfigured } = await import(
    "../../../../src/lib/telegram.js"
  );

  if (!isTelegramConfigured()) {
    console.warn(`[${TASK}] TELEGRAM skipped — TELEGRAM_BOT_TOKEN not configured`);
    return;
  }

  // Look up user's Telegram ID
  // TODO: User.telegramId must be added to schema by T3.6
  let telegramId: string | null = null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (prisma as any).user.findUnique({
      where: { id: alert.userId },
      select: { telegramId: true },
    });
    telegramId = user?.telegramId ?? null;
  } catch {
    console.warn(
      `[${TASK}] Could not look up telegramId for user ${alert.userId} — ` +
        "T3.6 must add User.telegramId to schema."
    );
    return;
  }

  if (!telegramId) {
    console.log(
      `[${TASK}] User ${alert.userId} has no linked Telegram account (alert ${alert.id})`
    );
    return;
  }

  const text = buildAlertMessage({
    type: match.type,
    title: match.title,
    body: match.body,
    url: match.url,
  });

  const result = await sendMessage(telegramId, text, { parseMode: "HTML" });

  if (!result.success) {
    throw new Error(`Telegram send failed: ${result.error}`);
  }

  console.log(`[${TASK}] TELEGRAM sent for alert ${alert.id} to chatId ${telegramId}`);
}

// ---------------------------------------------------------------------------
// Email HTML/text builders
// ---------------------------------------------------------------------------

const TYPE_EMOJI: Record<string, string> = {
  ROAD: "🚦",
  TRAIN: "🚂",
  FLIGHT: "✈️",
};

const TYPE_LABEL: Record<string, string> = {
  ROAD: "Alerta de tráfico",
  TRAIN: "Alerta de tren",
  FLIGHT: "Alerta de vuelo",
};

function buildAlertEmailHtml(match: MatchResult, unsubscribeUrl: string): string {
  const emoji = TYPE_EMOJI[match.type] || "🔔";
  const label = TYPE_LABEL[match.type] || "Alerta";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${match.title}</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; max-width:600px; width:100%;">
          <tr>
            <td style="background-color:#0a0a0a; padding:20px 32px;">
              <a href="${BASE_URL}" style="color:#f59e0b; font-size:24px; font-weight:800; text-decoration:none; letter-spacing:-0.5px;">trafico.live</a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px; font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em;">${label}</p>
              <h1 style="margin:0 0 16px; font-size:22px; color:#111827; font-weight:700;">
                ${emoji} ${match.title}
              </h1>
              <p style="margin:0 0 24px; font-size:15px; color:#374151; line-height:1.6;">
                ${match.body}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="${match.url}" style="display:inline-block; padding:12px 32px; background:#d97706; color:#ffffff; font-size:15px; font-weight:600; text-decoration:none; border-radius:8px;">
                      Ver detalles →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px; background-color:#f9fafb; border-top:1px solid #e5e7eb;">
              <p style="margin:0; font-size:12px; color:#9ca3af; line-height:1.5;">
                Recibes este email porque tienes una alerta activa en <a href="${BASE_URL}" style="color:#d97706;">trafico.live</a>.
                <br/><a href="${unsubscribeUrl}" style="color:#9ca3af;">Gestionar alertas</a>
              </p>
              <p style="margin:8px 0 0; font-size:11px; color:#d1d5db;">
                trafico.live — Inteligencia de transporte en tiempo real · Datos: DGT, Renfe, OpenSky
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildAlertEmailText(match: MatchResult, unsubscribeUrl: string): string {
  const label = TYPE_LABEL[match.type] || "Alerta";
  return `${label.toUpperCase()}: ${match.title}

${match.body}

Ver detalles: ${match.url}

---
Gestionar alertas: ${unsubscribeUrl}
trafico.live — Inteligencia de transporte en tiempo real`;
}
