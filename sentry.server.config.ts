import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.25 : 1.0,
  integrations: [
    Sentry.prismaIntegration(),
  ],
  ignoreErrors: ["ECONNREFUSED", "ETIMEDOUT", "ECONNRESET"],
});
