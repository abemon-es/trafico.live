/**
 * Weekly Digest — Collector Entry Point
 *
 * Sends the weekly traffic newsletter to all confirmed DigestSubscriber records.
 * Scheduled: Monday 09:00 CET (0 9 * * 1) in the `daily` collector container.
 *
 * Usage (send rules in send.ts):
 *   TASK=weekly-digest npx tsx index.ts --preview                    # Print HTML to stdout
 *   DIGEST_TEST_TO=a@b.es TASK=weekly-digest npx tsx index.ts        # One test email, list never read
 *   DIGEST_SEND_ENABLED=true TASK=weekly-digest npx tsx index.ts     # List send (Monday cron)
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
import { digestEmailInput, digestMode, pacingMs } from "./send.js";

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
  const mode = digestMode(process.env, process.argv);
  if (mode.kind === "off") {
    console.log(`[weekly-digest] Not sending: ${mode.reason}.`);
    return;
  }

  // Determine the week window
  // On Monday we look at the *previous* completed week (Mon-Sun)
  const now = new Date();
  const { weekStart, weekEnd } = getWeekBounds();

  // For preview, weekEnd might be in the future — that's fine for dev
  const effectiveWeekEnd = mode.kind === "preview" ? weekEnd : new Date(Math.min(weekEnd.getTime(), now.getTime()));

  console.log(
    `[weekly-digest] Week: ${weekStart.toISOString().slice(0, 10)} → ${effectiveWeekEnd.toISOString().slice(0, 10)}`
  );

  // Compose digest data
  const digestData = await composeDigest(prisma, weekStart, effectiveWeekEnd);

  // --preview mode: dump HTML to stdout and exit
  if (mode.kind === "preview") {
    const html = renderDigestHtml(digestData, "https://trafico.live/api/digest/unsubscribe?token=PREVIEW_TOKEN");
    process.stdout.write(html);
    process.stdout.write("\n\n<!-- TEXT VERSION -->\n\n");
    const text = renderDigestText(digestData, "https://trafico.live/api/digest/unsubscribe?token=PREVIEW_TOKEN");
    process.stdout.write(text);
    return;
  }

  const sesClient = await getSESClient();
  const { SendEmailCommand } = await import("@aws-sdk/client-sesv2");

  const fromEmail = process.env.AWS_SES_FROM_EMAIL || "noticias@trafico.live";
  const fromName = process.env.AWS_SES_FROM_NAME || "trafico.live";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
  const subject = `Resumen semanal de tráfico — ${digestData.weekLabel}`;

  const send = (to: string, unsubscribeToken: string, test = false) => {
    const unsubscribeUrl = `${baseUrl}/api/digest/unsubscribe?token=${unsubscribeToken}`;
    return sesClient.send(
      new SendEmailCommand(
        digestEmailInput({
          from: `${fromName} <${fromEmail}>`,
          to,
          subject: test ? `[Prueba] ${subject}` : subject,
          html: renderDigestHtml(digestData, unsubscribeUrl),
          text: renderDigestText(digestData, unsubscribeUrl),
          unsubscribeUrl,
          weekLabel: digestData.weekLabel,
          test,
        })
      )
    );
  };

  // Test send: one email to one address. The subscriber list is never read.
  // The unsubscribe link uses that address's own row; a missing row is
  // created inactive and unconfirmed, so the list send can never pick it up.
  if (mode.kind === "test") {
    const row =
      (await prisma.digestSubscriber.findUnique({
        where: { email: mode.to },
        select: { unsubscribeToken: true },
      })) ??
      (await prisma.digestSubscriber.create({
        data: { email: mode.to, isActive: false, confirmedAt: null },
        select: { unsubscribeToken: true },
      }));
    await send(mode.to, row.unsubscribeToken, true);
    console.log("[weekly-digest] Test email sent to the DIGEST_TEST_TO address only.");
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

  const pauseMs = pacingMs(process.env);
  console.log(
    `[weekly-digest] Sending to ${subscribers.length} subscriber(s), one at a time, ${Math.round(1000 / pauseMs)}/s max...`
  );

  const sentIds: string[] = [];
  let failed = 0;
  const sendStart = Date.now();

  for (const [i, sub] of subscribers.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, pauseMs));
    try {
      await send(sub.email, sub.unsubscribeToken);
      sentIds.push(sub.id);
    } catch (error) {
      // Subscriber id only: addresses stay out of the logs.
      console.error(`[weekly-digest] Failed for subscriber ${sub.id}:`, error);
      failed++;
    }
  }

  const sent = sentIds.length;
  const elapsedMs = Date.now() - sendStart;
  console.log(
    `[weekly-digest] Done. Sent: ${sent}, Failed: ${failed}, ${(sent / Math.max(elapsedMs / 1000, 1)).toFixed(1)}/s`
  );

  // Update lastSentAt for all successfully-sent subscribers
  if (sent > 0) {
    await prisma.digestSubscriber.updateMany({
      where: { id: { in: sentIds } },
      data: { lastSentAt: now },
    });
    console.log(`[weekly-digest] Updated lastSentAt for ${sent} subscriber(s)`);
  }

  // Non-zero failures are a warning, not a fatal error — the batch is partially done
  if (failed > 0 && sent === 0) {
    throw new Error(`[weekly-digest] All ${failed} sends failed — check SES configuration`);
  }
}
