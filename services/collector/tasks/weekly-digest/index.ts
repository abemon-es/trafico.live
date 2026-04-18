/**
 * Weekly Digest — Collector Entry Point
 *
 * Sends the weekly traffic newsletter to all confirmed DigestSubscriber records.
 * Scheduled: Monday 09:00 CET (0 9 * * 1) in the `daily` collector container.
 *
 * Usage:
 *   TASK=weekly-digest npx tsx index.ts            # Production send
 *   TASK=weekly-digest npx tsx index.ts --preview  # Print HTML to stdout
 *
 * Required env vars:
 *   DATABASE_URL           — PostgreSQL connection
 *   AWS_SES_ACCESS_KEY     — IAM key with ses:SendEmail
 *   AWS_SES_SECRET_KEY     — IAM secret
 *   AWS_SES_FROM_EMAIL     — Verified sender (default: noticias@trafico.live)
 *   AWS_SES_FROM_NAME      — Display name (default: trafico.live)
 *   AWS_SES_REGION         — SES region (default: eu-west-1)
 *   NEXT_PUBLIC_BASE_URL   — Canonical URL (default: https://trafico.live)
 */

import { getPrisma, getPool } from "../../shared/prisma.js";
import { composeDigest } from "./compose.js";
import { renderDigestHtml, renderDigestText } from "./render.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the Monday 00:00:00 of the current week (UTC) */
function getWeekBounds(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  // ISO week: Monday = day 1
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToMonday));
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  return { weekStart, weekEnd };
}

// We use SES (same as existing email infrastructure) — see src/lib/email/ses.ts
async function getSESClient() {
  const { SESv2Client } = await import("@aws-sdk/client-sesv2");
  const region = process.env.AWS_SES_REGION || "eu-west-1";
  const accessKeyId = process.env.AWS_SES_ACCESS_KEY;
  const secretAccessKey = process.env.AWS_SES_SECRET_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("[weekly-digest] AWS_SES_ACCESS_KEY and AWS_SES_SECRET_KEY are required");
  }

  return new SESv2Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

// ---------------------------------------------------------------------------
// run — called by the dispatcher (TASK=weekly-digest)
// ---------------------------------------------------------------------------

export async function run(prisma: import("@prisma/client").PrismaClient): Promise<void> {
  const isPreview = process.argv.includes("--preview");

  // Determine the week window
  // On Monday we look at the *previous* completed week (Mon-Sun)
  const now = new Date();
  const { weekStart, weekEnd } = getWeekBounds();

  // For preview, weekEnd might be in the future — that's fine for dev
  const effectiveWeekEnd = isPreview ? weekEnd : new Date(Math.min(weekEnd.getTime(), now.getTime()));

  console.log(
    `[weekly-digest] Week: ${weekStart.toISOString().slice(0, 10)} → ${effectiveWeekEnd.toISOString().slice(0, 10)}`
  );

  // Compose digest data
  const digestData = await composeDigest(prisma, weekStart, effectiveWeekEnd);

  // --preview mode: dump HTML to stdout and exit
  if (isPreview) {
    const html = renderDigestHtml(digestData, "https://trafico.live/api/digest/unsubscribe?token=PREVIEW_TOKEN");
    process.stdout.write(html);
    process.stdout.write("\n\n<!-- TEXT VERSION -->\n\n");
    const text = renderDigestText(digestData, "https://trafico.live/api/digest/unsubscribe?token=PREVIEW_TOKEN");
    process.stdout.write(text);
    return;
  }

  // Guard: only send on Mondays (day === 1) in production
  if (now.getUTCDay() !== 1) {
    console.log(`[weekly-digest] Not Monday (day=${now.getUTCDay()}). Skipping send.`);
    return;
  }

  // Guard: deduplicate — skip if already sent today
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const alreadySent = await prisma.digestSubscriber.findFirst({
    where: { lastSentAt: { gte: todayStart } },
  });
  if (alreadySent) {
    console.log("[weekly-digest] Already sent this Monday. Skipping.");
    return;
  }

  // Check SES configuration
  if (!process.env.AWS_SES_ACCESS_KEY || !process.env.AWS_SES_SECRET_KEY) {
    throw new Error("[weekly-digest] SES not configured — set AWS_SES_ACCESS_KEY and AWS_SES_SECRET_KEY");
  }

  // Fetch confirmed subscribers
  const subscribers = await prisma.digestSubscriber.findMany({
    where: { isActive: true, confirmedAt: { not: null } },
    select: { id: true, email: true, unsubscribeToken: true },
    orderBy: { createdAt: "asc" },
  });

  if (subscribers.length === 0) {
    console.log("[weekly-digest] No confirmed subscribers. Nothing to send.");
    return;
  }

  console.log(`[weekly-digest] Sending to ${subscribers.length} subscriber(s)...`);

  const sesClient = await getSESClient();
  const { SendEmailCommand } = await import("@aws-sdk/client-sesv2");

  const fromEmail = process.env.AWS_SES_FROM_EMAIL || "noticias@trafico.live";
  const fromName = process.env.AWS_SES_FROM_NAME || "trafico.live";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
  const subject = `Resumen semanal de tráfico — ${digestData.weekLabel}`;

  let sent = 0;
  let failed = 0;
  const failedEmails: string[] = [];
  const sendStart = Date.now();

  // Send in batches of 100 (Resend API compatible rate; SES limit is higher but
  // we throttle to 100/batch with a 1s pause between batches as required)
  const BATCH_SIZE = 100;

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (sub) => {
        const unsubscribeUrl = `${baseUrl}/api/digest/unsubscribe?token=${sub.unsubscribeToken}`;
        const html = renderDigestHtml(digestData, unsubscribeUrl);
        const text = renderDigestText(digestData, unsubscribeUrl);

        try {
          await sesClient.send(
            new SendEmailCommand({
              FromEmailAddress: `${fromName} <${fromEmail}>`,
              Destination: { ToAddresses: [sub.email] },
              Content: {
                Simple: {
                  Subject: { Data: subject, Charset: "UTF-8" },
                  Body: {
                    Html: { Data: html, Charset: "UTF-8" },
                    Text: { Data: text, Charset: "UTF-8" },
                  },
                },
              },
              EmailTags: [
                { Name: "type", Value: "weekly-digest" },
                { Name: "week", Value: digestData.weekLabel },
              ],
            })
          );
          sent++;
        } catch (error) {
          console.error(`[weekly-digest] Failed for ${sub.email}:`, error);
          failedEmails.push(sub.email);
          failed++;
        }
      })
    );

    // Rate-limit pause between batches (1s)
    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  const elapsedMs = Date.now() - sendStart;
  const avgDeliveryMs = sent > 0 ? Math.round(elapsedMs / sent) : 0;

  console.log(
    `[weekly-digest] Done. Sent: ${sent}, Failed: ${failed}, Avg delivery: ${avgDeliveryMs}ms`
  );

  if (failedEmails.length > 0) {
    console.warn(`[weekly-digest] Failed addresses: ${failedEmails.join(", ")}`);
  }

  // Update lastSentAt for all successfully-sent subscribers
  if (sent > 0) {
    const successIds = subscribers
      .filter((s) => !failedEmails.includes(s.email))
      .map((s) => s.id);

    await prisma.digestSubscriber.updateMany({
      where: { id: { in: successIds } },
      data: { lastSentAt: now },
    });

    console.log(`[weekly-digest] Updated lastSentAt for ${successIds.length} subscriber(s)`);
  }

  // Non-zero failures are a warning, not a fatal error — the batch is partially done
  if (failed > 0 && sent === 0) {
    throw new Error(`[weekly-digest] All ${failed} sends failed — check SES configuration`);
  }
}
