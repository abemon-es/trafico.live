/**
 * Amazon SES Email Client
 *
 * Sends transactional and digest emails via AWS SES.
 * Uses SESv2 for better template support and metrics.
 *
 * Required env vars:
 *   AWS_SES_REGION        — e.g., "eu-west-1"
 *   AWS_SES_ACCESS_KEY    — IAM access key with ses:SendEmail
 *   AWS_SES_SECRET_KEY    — IAM secret key
 *   AWS_SES_FROM_EMAIL    — verified sender (e.g., "noticias@trafico.live")
 *   AWS_SES_FROM_NAME     — display name (default: "trafico.live")
 */

import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

let client: SESv2Client | null = null;

function getClient(): SESv2Client {
  if (client) return client;

  const region = process.env.AWS_SES_REGION || "eu-west-1";
  const accessKeyId = process.env.AWS_SES_ACCESS_KEY;
  const secretAccessKey = process.env.AWS_SES_SECRET_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("[email] AWS_SES_ACCESS_KEY and AWS_SES_SECRET_KEY are required");
  }

  client = new SESv2Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  return client;
}

// ---------------------------------------------------------------------------
// Send email
// ---------------------------------------------------------------------------

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Record<string, string>;
}

export async function sendEmail(options: EmailOptions): Promise<{ messageId: string }> {
  const ses = getClient();
  const fromEmail = process.env.AWS_SES_FROM_EMAIL || "noticias@trafico.live";
  const fromName = process.env.AWS_SES_FROM_NAME || "trafico.live";

  const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

  const command = new SendEmailCommand({
    FromEmailAddress: `${fromName} <${fromEmail}>`,
    Destination: {
      ToAddresses: toAddresses,
    },
    Content: {
      Simple: {
        Subject: { Data: options.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: options.html, Charset: "UTF-8" },
          ...(options.text && { Text: { Data: options.text, Charset: "UTF-8" } }),
        },
      },
    },
    ...(options.replyTo && {
      ReplyToAddresses: [options.replyTo],
    }),
    ...(options.tags && {
      EmailTags: Object.entries(options.tags).map(([Name, Value]) => ({ Name, Value })),
    }),
  });

  const result = await ses.send(command);
  console.log(`[email] Sent to ${toAddresses.join(", ")} — MessageId: ${result.MessageId}`);
  return { messageId: result.MessageId || "" };
}

// ---------------------------------------------------------------------------
// Send to multiple recipients (batch — 50 per call max for SES)
// ---------------------------------------------------------------------------

export async function sendBatch(
  recipients: string[],
  subject: string,
  htmlBuilder: (email: string) => string,
  textBuilder?: (email: string) => string,
  tags?: Record<string, string>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  // SES v2 SendEmail supports 50 recipients per call, but for
  // personalized content (unsubscribe links) we send individually
  for (const email of recipients) {
    try {
      await sendEmail({
        to: email,
        subject,
        html: htmlBuilder(email),
        text: textBuilder?.(email),
        tags,
      });
      sent++;
      // SES rate limit: 14 emails/second by default. Add small delay.
      if (sent % 10 === 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch (error) {
      console.error(`[email] Failed to send to ${email}:`, error);
      failed++;
    }
  }

  return { sent, failed };
}

// ---------------------------------------------------------------------------
// Check if SES is configured
// ---------------------------------------------------------------------------

export function isSESConfigured(): boolean {
  return !!(process.env.AWS_SES_ACCESS_KEY && process.env.AWS_SES_SECRET_KEY);
}
