"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSWRConfig } from "swr";

/**
 * Connects to /api/stream SSE endpoint and triggers SWR revalidation
 * when V16 or incident data changes server-side.
 *
 * Returns `isConnected` so callers can disable SWR polling when SSE is active
 * (avoids double-fetching the same data).
 */
export function useTrafficStream(): { isConnected: boolean } {
  const { mutate } = useSWRConfig();
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let es: EventSource;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource("/api/stream");
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
      };

      es.addEventListener("v16", () => {
        mutate("/api/v16");
      });

      es.addEventListener("incidents", () => {
        mutate("/api/incidents");
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        setIsConnected(false);
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
      setIsConnected(false);
    };
  }, [mutate]);

  return { isConnected };
}
