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
  } = options;

  let ws: WebSocket | null = null;
  let currentDelay = initialDelay;
  let consecutiveFailures = 0;
  let stopped = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let connectTime = 0;
  let receivedMessage = false;

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
      // Do NOT reset consecutiveFailures here — only reset when we
      // actually receive a message, proving the connection is healthy.
      // Must send subscription within 3 seconds
      ws!.send(JSON.stringify(subscriptionMessage));
    });

    ws.on("message", (raw: WebSocket.RawData) => {
      try {
        const data = JSON.parse(raw.toString());
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
