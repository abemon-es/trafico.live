import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.25 : 1.0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.5,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
      networkDetailAllowUrls: ["/api/"],
    }),
    Sentry.browserTracingIntegration({
      enableInp: true,
    }),
  ],
  beforeSend(event) {
    if (typeof window !== "undefined") {
      event.tags = { ...event.tags, page_url: window.location.pathname };
    }
    return event;
  },
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === "console" && breadcrumb.level === "log") return null;
    return breadcrumb;
  },
  ignoreErrors: [
    "ResizeObserver loop",
    "Non-Error promise rejection",
    "Load failed",
    "Failed to fetch",
    "NetworkError",
    "AbortError",
    "ChunkLoadError",
  ],
});
