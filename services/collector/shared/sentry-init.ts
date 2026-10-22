/**
 * Sentry for the collector process, initialised by the dispatcher's first
 * import: ESM evaluates imports in order, so a module that fails to load after
 * it (prisma, a task) is reported too, with its name.
 *
 * The DSN comes as COLLECTOR_SENTRY_DSN under supercronic, whose own SENTRY_DSN
 * is unset (Dockerfile.cron): supercronic read that variable and reported
 * every job that exited non-zero as «error running command: exit status 1»,
 * one issue for every task, on top of the dispatcher's own event with the real
 * message (14,544 events by 2026-10-22). collector-ais runs node directly and
 * keeps SENTRY_DSN.
 */
import * as Sentry from "@sentry/node";

// GlitchTip uses UUID keys with hyphens; Sentry SDK requires \w+ — strip hyphens
const SENTRY_DSN = (process.env.COLLECTOR_SENTRY_DSN || process.env.SENTRY_DSN)?.replace(
  /\/\/([0-9a-f-]+)@/,
  (_, key: string) => `//${key.replace(/-/g, "")}@`
);
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || "production",
    tracesSampleRate: 0.1,
  });
}
