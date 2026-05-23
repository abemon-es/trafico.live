/**
 * Reconnecting WebSocket Client
 *
 * Generic wrapper for streaming data sources (e.g., aisstream.io AIS feed).
 * Handles exponential backoff reconnection, subscription re-send, and
 * graceful shutdown via AbortSignal.
 */

import WebSocket from "ws";
import { log, logError } from "./utils.js";

export interface WSClientOptions {
  url: string;
  /** JSON subscription message sent immediately after connection opens */
  subscriptionMessage: Record<string, unknown>;
  /** Called for every incoming message (parsed JSON) */
  onMessage: (data: unknown) => void;
  /** Task name for logging */
  task: string;
  /** Initial reconnect delay in ms (default 5000) */
  reconnectDelay?: number;
  /** Max reconnect delay in ms (default 60000) */
  maxReconnectDelay?: number;
  /** Max consecutive failures before circuit-breaking (default 10) */
  maxConsecutiveFailures?: number;
  /** Circuit breaker cooldown in ms (default 300000 = 5 min) */
  circuitBreakerCooldown?: number;
  /** Minimum connection duration in ms to count as "healthy" (default 5000) */
  minHealthyDuration?: number;
  /**
   * Staleness watchdog: if no message has been received for this many ms
   * while the WS is "open", force a terminate so the reconnect cycle kicks
   * in. The aisstream.io WS can stay open indefinitely with zero traffic
   * (no close, no error frame); we hit exactly this pattern on 2026-05-07
   * → 2026-05-23: the AIS stats counter froze for 15 days with the WS
   * still nominally "open" and the collector container still "healthy".
   *
   * Default: 0 (watchdog disabled — keeps backwards-compat). Pass a real
   * value (recommended: 300_000 = 5 min) to enable.
   */
  staleMessageTimeoutMs?: number;
}

export function createReconnectingWS(
  options: WSClientOptions,
  signal?: AbortSignal
): { stop: () => void } {
  const {
    url,
    subscriptionMessage,
    onMessage,
    task,
    reconnectDelay: initialDelay = 5000,
    maxReconnectDelay = 60000,
    maxConsecutiveFailures = 10,
    circuitBreakerCooldown = 300_000,
    minHealthyDuration = 5000,
    staleMessageTimeoutMs = 0,
  } = options;

  let ws: WebSocket | null = null;
  let currentDelay = initialDelay;
  let consecutiveFailures = 0;
  let stopped = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let connectTime = 0;
  let receivedMessage = false;
  let lastMessageAt = 0;
  let stalenessTimer: ReturnType<typeof setInterval> | null = null;

  function connect() {
    if (stopped || signal?.aborted) return;

    try {
      ws = new WebSocket(url);
    } catch (err) {
      logError(task, "Failed to create WebSocket", err);
      consecutiveFailures++;
      scheduleReconnect();
      return;
    }

    ws.on("open", () => {
      log(task, `Connected to ${url}`);
      connectTime = Date.now();
      receivedMessage = false;
      lastMessageAt = Date.now();
      armStalenessWatchdog();
      // Do NOT reset consecutiveFailures here — only reset when we
      // actually receive a message, proving the connection is healthy.
      // Must send subscription within 3 seconds
      ws!.send(JSON.stringify(subscriptionMessage));
    });

    ws.on("message", (raw: WebSocket.RawData) => {
      try {
        const data = JSON.parse(raw.toString());
        lastMessageAt = Date.now();
        // First successful message: connection is truly healthy
        if (!receivedMessage) {
          receivedMessage = true;
          consecutiveFailures = 0;
          currentDelay = initialDelay;
          log(task, "First message received — connection confirmed healthy");
        }
        onMessage(data);
      } catch (err) {
        logError(task, "Failed to parse message", err);
      }
    });

    ws.on("close", (code: number, reason: Buffer) => {
      const duration = Date.now() - connectTime;
      log(task, `Connection closed: ${code} ${reason.toString()} (was open ${(duration / 1000).toFixed(1)}s)`);
      disarmStalenessWatchdog();
      if (!stopped) {
        // If connection was open for less than minHealthyDuration and we
        // never received a message, count it as a failure
        if (duration < minHealthyDuration && !receivedMessage) {
          consecutiveFailures++;
          log(task, `Short-lived connection counted as failure (${consecutiveFailures} consecutive)`);
        }
        scheduleReconnect();
      }
    });

    ws.on("error", (err: Error) => {
      logError(task, "WebSocket error", err);
      consecutiveFailures++;
      ws?.terminate();
    });
  }

  function armStalenessWatchdog() {
    if (staleMessageTimeoutMs <= 0) return;
    // Probe every 30s (or 1/10th of the threshold, whichever is smaller).
    const probe = Math.min(30_000, Math.floor(staleMessageTimeoutMs / 10));
    stalenessTimer = setInterval(() => {
      const idle = Date.now() - lastMessageAt;
      if (idle > staleMessageTimeoutMs) {
        log(
          task,
          `Staleness watchdog: ${Math.floor(idle / 1000)}s since last message ` +
            `(threshold ${Math.floor(staleMessageTimeoutMs / 1000)}s) — forcing terminate`
        );
        // ws.terminate triggers the "close" handler which triggers reconnect.
        // We also bump consecutiveFailures so we eventually hit the circuit
        // breaker if the upstream is permanently silent.
        consecutiveFailures++;
        ws?.terminate();
      }
    }, probe);
  }

  function disarmStalenessWatchdog() {
    if (stalenessTimer) {
      clearInterval(stalenessTimer);
      stalenessTimer = null;
    }
  }

  function scheduleReconnect() {
    if (stopped || signal?.aborted) return;

    if (consecutiveFailures >= maxConsecutiveFailures) {
      log(task, `Circuit breaker: ${consecutiveFailures} failures, cooling down ${circuitBreakerCooldown / 1000}s`);
      reconnectTimer = setTimeout(() => {
        consecutiveFailures = 0;
        connect();
      }, circuitBreakerCooldown);
      return;
    }

    log(task, `Reconnecting in ${currentDelay / 1000}s...`);
    reconnectTimer = setTimeout(connect, currentDelay);
    currentDelay = Math.min(currentDelay * 2, maxReconnectDelay);
  }

  function stop() {
    stopped = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    disarmStalenessWatchdog();
    if (ws) {
      ws.removeAllListeners();
      ws.terminate();
    }
    log(task, "Stopped");
  }

  // Listen for abort signal
  signal?.addEventListener("abort", stop, { once: true });

  // Start
  connect();

  return { stop };
}
