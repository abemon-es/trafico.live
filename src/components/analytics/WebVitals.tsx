"use client";

import { useReportWebVitals } from "next/web-vitals";
import * as Sentry from "@sentry/nextjs";

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Send to GA4
    if (typeof window.gtag === "function") {
      window.gtag("event", metric.name, {
        value: Math.round(
          metric.name === "CLS" ? metric.value * 1000 : metric.value
        ),
        event_label: metric.id,
        non_interaction: true,
      });
    }

    // Send poor vitals to Sentry as breadcrumbs (always)
    // and as measurements on the active transaction
    const thresholds: Record<string, number> = {
      LCP: 2500,
      FID: 100,
      CLS: 0.1,
      INP: 200,
      TTFB: 800,
      FCP: 1800,
    };

    const threshold = thresholds[metric.name];
    if (threshold && metric.value > threshold) {
      Sentry.captureMessage(`Poor ${metric.name}: ${Math.round(metric.value)}`, {
        level: "warning",
        tags: {
          vital: metric.name,
          page_url: window.location.pathname,
        },
        extra: {
          value: metric.value,
          rating: metric.rating,
          threshold,
        },
      });
    }
  });

  return null;
}
