"use client";

import { useEffect, useRef } from "react";
import { useSWRConfig } from "swr";

/**
 * Connects to /api/stream SSE endpoint and triggers SWR revalidation
 * when V16 or incident data changes server-side.
 *
 * Falls back gracefully — if SSE fails, SWR polling continues as before.
 */
export function useTrafficStream() {
  const { mutate } = useSWRConfig();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Only connect in browser
    if (typeof window === "undefined") return;

    let es: EventSource;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource("/api/stream");
      eventSourceRef.current = es;

      es.addEventListener("v16", () => {
        mutate("/api/v16");
      });

      es.addEventListener("incidents", () => {
        mutate("/api/incidents");
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        // Reconnect after 30s on error
        reconnectTimeout = setTimeout(connect, 30_000);
      };
    }

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [mutate]);
}
