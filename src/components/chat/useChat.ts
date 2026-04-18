"use client";

/**
 * useChat hook — manages chat messages, calls /api/chat, and parses SSE.
 */

import { useState, useCallback, useRef } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallHint[];
  isStreaming?: boolean;
  error?: boolean;
}

export interface ToolCallHint {
  name: string;
  label: string;
  source?: string;
}

interface SSEEvent {
  type: "text" | "tool_call" | "tool_result" | "done" | "error";
  delta?: string;
  name?: string;
  input?: Record<string, unknown>;
  preview?: string;
  message?: string;
}

// ─── Tool label mapping ────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, { label: string; source: string }> = {
  get_active_incidents: { label: "consultando incidencias", source: "DGT" },
  get_fuel_prices: { label: "consultando precios combustible", source: "MINETUR" },
  get_train_alerts: { label: "consultando alertas Renfe", source: "Renfe" },
  get_train_positions: { label: "consultando trenes en tiempo real", source: "Renfe" },
  get_aircraft: { label: "consultando vuelos", source: "OpenSky" },
  get_vessels: { label: "consultando embarcaciones", source: "AIS" },
  get_air_quality: { label: "consultando calidad del aire", source: "MITECO" },
  search_entities: { label: "buscando en trafico.live", source: "trafico.live" },
  get_road_details: { label: "consultando carretera", source: "DGT" },
  get_weather_alerts: { label: "consultando alertas meteorológicas", source: "AEMET" },
};

function getToolHint(name: string): ToolCallHint {
  const info = TOOL_LABELS[name] ?? { label: `consultando ${name}`, source: name };
  return { name, label: info.label, source: info.source };
}

// ─── ID generator ──────────────────────────────────────────────────────────

let idCounter = 0;
function nextId(): string {
  return `msg-${Date.now()}-${++idCounter}`;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export interface UseChatOptions {
  conversationId?: string;
}

export interface UseChatReturn {
  messages: ChatMessageItem[];
  send: (content: string) => Promise<void>;
  isStreaming: boolean;
  error: string | null;
  clearError: () => void;
  reset: () => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { conversationId } = options;

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      // Abort any previous stream
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setError(null);

      // Add user message
      const userMsg: ChatMessageItem = {
        id: nextId(),
        role: "user",
        content: content.trim(),
      };

      // Placeholder for assistant response
      const assistantId = nextId();
      const assistantPlaceholder: ChatMessageItem = {
        id: assistantId,
        role: "assistant",
        content: "",
        toolCalls: [],
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
      setIsStreaming(true);

      try {
        // Build messages history for API (all previous + new user message)
        const apiMessages = [
          ...messages
            .filter((m) => !m.error)
            .map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: content.trim() },
        ];

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, conversationId }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          let errMsg = `Error ${res.status}`;
          try {
            const json = (await res.json()) as { error?: string };
            if (json.error) errMsg = json.error;
          } catch {
            /* ignore */
          }
          throw new Error(errMsg);
        }

        if (!res.body) throw new Error("No se recibió respuesta del servidor");

        // Parse SSE stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedText = "";
        const toolCallsFound: ToolCallHint[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            let event: SSEEvent;
            try {
              event = JSON.parse(raw) as SSEEvent;
            } catch {
              continue;
            }

            if (event.type === "text" && event.delta) {
              accumulatedText += event.delta;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: accumulatedText, isStreaming: true }
                    : m
                )
              );
            } else if (event.type === "tool_call" && event.name) {
              const hint = getToolHint(event.name);
              toolCallsFound.push(hint);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, toolCalls: [...toolCallsFound], isStreaming: true }
                    : m
                )
              );
            } else if (event.type === "tool_result") {
              // Update last tool call with source info already set
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, toolCalls: [...toolCallsFound] } : m
                )
              );
            } else if (event.type === "error") {
              throw new Error(event.message ?? "Error en el asistente");
            } else if (event.type === "done") {
              break;
            }
          }
        }

        // Finalize assistant message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: accumulatedText, isStreaming: false, toolCalls: toolCallsFound }
              : m
          )
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;

        const msg = err instanceof Error ? err.message : "Error desconocido";
        setError(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: msg,
                  isStreaming: false,
                  error: true,
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, conversationId]
  );

  const clearError = useCallback(() => setError(null), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setIsStreaming(false);
  }, []);

  return { messages, send, isStreaming, error, clearError, reset };
}
