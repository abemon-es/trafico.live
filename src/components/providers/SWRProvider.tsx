"use client";

import { SWRConfig } from "swr";
import * as Sentry from "@sentry/nextjs";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        onError(error, key) {
          // Don't flood Sentry with rate limits or aborts
          if (error?.status === 429) return;
          if (error?.name === "AbortError") return;

          Sentry.captureException(error, {
            tags: {
              swr_key: typeof key === "string" ? key : "unknown",
              page_url: typeof window !== "undefined" ? window.location.pathname : "unknown",
            },
            fingerprint: [
              "swr-error",
              typeof key === "string" ? key : "unknown",
              String(error?.status || "unknown"),
            ],
          });
        },

        onSuccess(_data, key) {
          // Leave a breadcrumb so errors have a trail of successful fetches
          Sentry.addBreadcrumb({
            category: "swr",
            message: `OK ${key}`,
            level: "info",
          });
        },

        shouldRetryOnError: true,
        errorRetryCount: 3,
      }}
    >
      {children}
    </SWRConfig>
  );
}
