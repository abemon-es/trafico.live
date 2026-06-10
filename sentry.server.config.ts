import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE || process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  // Drop health-check transactions entirely; sample 5% of everything else.
  // prismaIntegration removed: it emitted ~24.9M prisma:client:operation spans
  // (99%+ of all GlitchTip ingest) with no alerting benefit.
  tracesSampler(samplingContext) {
    const name = samplingContext.name ?? "";
    if (name.includes("/api/health") || name.includes("/healthz")) {
      return 0;
    }
    return process.env.NODE_ENV === "production" ? 0.05 : 0.1;
  },
  ignoreErrors: ["ECONNREFUSED", "ETIMEDOUT", "ECONNRESET"],
});
