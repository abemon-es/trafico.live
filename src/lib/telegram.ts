/**
 * Telegram Bot API Sender
 *
 * Sends messages via the Telegram Bot API using plain fetch.
 * No extra npm package needed — uses the native fetch API (Node 18+).
 *
 * Required env vars:
 *   TELEGRAM_BOT_TOKEN   — Bot token from @BotFather (e.g. "123456789:AAFxxxxx")
 *
 * Optional env vars:
 *   TELEGRAM_CHANNEL     — Channel/group chat ID for broadcast messages
 *                          (e.g. "@trafico_live_alerts" or numeric "-1001234567890")
 *
 * Setup:
 *   1. Create bot via @BotFather on Telegram
 *   2. Set TELEGRAM_BOT_TOKEN env var
 *   3. For user messages: user must start the bot first (to get chatId)
 *   4. For channel broadcast: add bot as admin to channel, set TELEGRAM_CHANNEL
 *
 * TODO (T3.6 schema):
 *   Add `telegramId String?` field to the User model so per-user messages work.
 *   This is looked up in notify.ts when the TELEGRAM channel is requested.
 *   Also add `telegramLinkedAt DateTime?` for audit purposes.
 */

const BOT_API_BASE = "https://api.telegram.org/bot";

export interface TelegramSendOptions {
  /** Markdown V2 or HTML parse mode */
  parseMode?: "MarkdownV2" | "HTML" | "Markdown";
  /** Disable link previews */
  disableWebPagePreview?: boolean;
  /** Disable notifications (silent message) */
  disableNotification?: boolean;
  /** Reply markup (keyboard, inline buttons, etc.) */
  replyMarkup?: Record<string, unknown>;
}

export interface TelegramResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Core send function
// ---------------------------------------------------------------------------

/**
 * Send a message to a specific Telegram chat/user by chatId.
 *
 * chatId can be:
 *   - Numeric user ID (from User.telegramId)
 *   - "@channelUsername" for public channels
 *   - Numeric group/channel ID (e.g. -1001234567890)
 */
export async function sendMessage(
  chatId: string | number,
  text: string,
  opts: TelegramSendOptions = {}
): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { success: false, error: "TELEGRAM_BOT_TOKEN not set" };
  }

  const url = `${BOT_API_BASE}${token}/sendMessage`;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    ...(opts.parseMode && { parse_mode: opts.parseMode }),
    ...(opts.disableWebPagePreview && { disable_web_page_preview: true }),
    ...(opts.disableNotification && { disable_notification: true }),
    ...(opts.replyMarkup && { reply_markup: opts.replyMarkup }),
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as {
      ok: boolean;
      result?: { message_id: number };
      description?: string;
      error_code?: number;
    };

    if (!data.ok) {
      return {
        success: false,
        error: `Telegram API error ${data.error_code}: ${data.description}`,
      };
    }

    return {
      success: true,
      messageId: data.result?.message_id,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Broadcast to channel
// ---------------------------------------------------------------------------

/**
 * Broadcast a message to the configured TELEGRAM_CHANNEL.
 * Used for system-wide alerts or high-priority notifications.
 */
export async function broadcast(
  text: string,
  opts: TelegramSendOptions = {}
): Promise<TelegramResult> {
  const channel = process.env.TELEGRAM_CHANNEL;
  if (!channel) {
    return { success: false, error: "TELEGRAM_CHANNEL not set" };
  }
  return sendMessage(channel, text, opts);
}

// ---------------------------------------------------------------------------
// HTML message builder for alert notifications
// ---------------------------------------------------------------------------

/**
 * Build a Spanish-language Telegram HTML message for a traffic alert notification.
 * Telegram HTML supports <b>, <i>, <a href="...">, <code>, <pre>.
 */
export function buildAlertMessage(opts: {
  type: "ROAD" | "TRAIN" | "FLIGHT";
  title: string;
  body: string;
  url: string;
}): string {
  const typeEmoji = { ROAD: "🚦", TRAIN: "🚂", FLIGHT: "✈️" }[opts.type] || "🔔";
  const escapedBody = opts.body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return (
    `${typeEmoji} <b>${opts.title}</b>\n\n` +
    `${escapedBody}\n\n` +
    `<a href="${opts.url}">Ver en trafico.live →</a>`
  );
}

// ---------------------------------------------------------------------------
// Configuration check
// ---------------------------------------------------------------------------

export function isTelegramConfigured(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN;
}
