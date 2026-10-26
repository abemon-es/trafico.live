/**
 * Weekly Digest — send rules (pure, no DB or SES).
 *
 * Which send a run is allowed to make, what each email carries and how fast
 * they go out. Having SES credentials is never enough to mail the list:
 *   DIGEST_TEST_TO=<address>   one email to that address only; the list is never read
 *   DIGEST_SEND_ENABLED=true   the list send (the Monday cron)
 *   neither                    nothing is sent
 *   DIGEST_MAX_PER_SECOND      list send pacing (default 5, one email at a time)
 */

import type { SendEmailCommandInput } from "@aws-sdk/client-sesv2";

type Env = Record<string, string | undefined>;

export type DigestMode =
  | { kind: "preview" }
  | { kind: "test"; to: string }
  | { kind: "list" }
  | { kind: "off"; reason: string };

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

export function digestMode(env: Env, argv: string[]): DigestMode {
  if (argv.includes("--preview")) return { kind: "preview" };

  const testTo = env.DIGEST_TEST_TO?.trim().toLowerCase();
  if (testTo) {
    if (!EMAIL_RE.test(testTo)) {
      throw new Error("[weekly-digest] DIGEST_TEST_TO must be a single email address");
    }
    return { kind: "test", to: testTo };
  }

  if (env.DIGEST_SEND_ENABLED === "true") return { kind: "list" };
  return { kind: "off", reason: "DIGEST_SEND_ENABLED is not true" };
}

/** Pause between two list emails, from DIGEST_MAX_PER_SECOND (default 5/s). */
export function pacingMs(env: Env): number {
  const perSecond = Number(env.DIGEST_MAX_PER_SECOND);
  const rate = Number.isFinite(perSecond) && perSecond > 0 ? Math.min(perSecond, 14) : 5;
  return Math.ceil(1000 / rate);
}

export function digestEmailInput(opts: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
  weekLabel: string;
  test?: boolean;
}): SendEmailCommandInput {
  return {
    FromEmailAddress: opts.from,
    Destination: { ToAddresses: [opts.to] },
    Content: {
      Simple: {
        Subject: { Data: opts.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: opts.html, Charset: "UTF-8" },
          Text: { Data: opts.text, Charset: "UTF-8" },
        },
        // RFC 2369 + RFC 8058: mail clients show their own «unsubscribe»
        // button and can unsubscribe with one POST to the same URL.
        Headers: [
          { Name: "List-Unsubscribe", Value: `<${opts.unsubscribeUrl}>` },
          { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
        ],
      },
    },
    EmailTags: [
      { Name: "type", Value: opts.test ? "weekly-digest-test" : "weekly-digest" },
      { Name: "week", Value: opts.weekLabel.replace(/[^A-Za-z0-9_-]/g, "-") },
    ],
  };
}
