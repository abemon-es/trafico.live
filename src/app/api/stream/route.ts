import { NextRequest } from "next/server";
import { getFromCache } from "@/lib/redis";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 10_000; // Check Redis every 10s
const HEARTBEAT_INTERVAL_MS = 30_000; // Send heartbeat every 30s

interface CacheSnapshot {
  count: number;
  lastUpdated: string;
}

export async function GET(_request: NextRequest) {
  // Auth is handled by middleware for all /api/* routes
  const rateLimitResponse = await applyRateLimit(_request);
  if (rateLimitResponse) return rateLimitResponse;

  let closed = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let lastV16Hash = "";
      let lastIncidentsHash = "";

      function send(event: string, data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      }

      function hashSnapshot(data: { count: number; lastUpdated: string } | null): string {
        if (!data) return "";
        return `${data.count}:${data.lastUpdated}`;
      }

      async function poll() {
        if (closed) return;

        try {
          const [v16, incidents] = await Promise.all([
            getFromCache<CacheSnapshot>("api:v16:active"),
            getFromCache<CacheSnapshot>("api:incidents"),
          ]);

          const v16Hash = hashSnapshot(v16);
          const incidentsHash = hashSnapshot(incidents);

          if (v16 && v16Hash !== lastV16Hash) {
            lastV16Hash = v16Hash;
            send("v16", { count: v16.count, lastUpdated: v16.lastUpdated });
          }

          if (incidents && incidentsHash !== lastIncidentsHash) {
            lastIncidentsHash = incidentsHash;
            send("incidents", { count: incidents.count, lastUpdated: incidents.lastUpdated });
          }
        } catch {
          // Redis unavailable — skip this tick
        }
      }

      // Initial poll
      poll();

      // Poll every 10s for changes
      pollTimer = setInterval(poll, POLL_INTERVAL_MS);

      // Heartbeat to keep connection alive
      heartbeatTimer = setInterval(() => {
        send("heartbeat", { time: new Date().toISOString() });
      }, HEARTBEAT_INTERVAL_MS);
    },

    cancel() {
      closed = true;
      if (pollTimer) clearInterval(pollTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
