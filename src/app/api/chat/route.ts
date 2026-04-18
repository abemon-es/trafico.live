/**
 * POST /api/chat
 *
 * Live Anthropic Claude streaming chat endpoint with:
 * - SSE streaming (text, tool_call, tool_result, done, error events)
 * - Tier-based rate limiting (FREE: 10/day, PRO: 100/day, ENTERPRISE: 1000/day)
 * - Anonymous response caching for FREE tier (1h Redis cache)
 * - Tool use against local /api/* endpoints
 * - Graceful 503 when ANTHROPIC_API_KEY is missing
 */

import { NextRequest } from "next/server";
import { isAnthropicAvailable, streamChat, CHAT_SYSTEM_PROMPT } from "@/lib/claude";
import { CHAT_TOOLS, executeTool } from "@/lib/chat-tools";
import { checkChatRateLimit } from "@/lib/chat-rate-limit";
import { redis } from "@/lib/redis";
import type { ApiTierName } from "@/lib/api-tiers";
import type { ChatMessage } from "@/lib/claude";
import * as Sentry from "@sentry/nextjs";
import crypto from "crypto";

// ─── Request types ─────────────────────────────────────────────────────────

interface ChatRequest {
  messages: ChatMessage[];
  conversationId?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return ip;
}

function getTierFromRequest(req: NextRequest): ApiTierName {
  const tier = req.headers.get("x-tier")?.toUpperCase();
  if (tier === "PRO" || tier === "ENTERPRISE") return tier;
  return "FREE";
}

/** 1-hour cache key for anonymous FREE-tier responses, based on first user message */
function getAnonymousCacheKey(firstUserMessage: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(firstUserMessage.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
  return `chat:cache:${hash}`;
}

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ─── Route handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  // ── 1. Availability check ──────────────────────────────────────────────
  if (!isAnthropicAvailable()) {
    return new Response(
      JSON.stringify({ error: "Asistente no disponible" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // ── 2. Parse body ──────────────────────────────────────────────────────
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return new Response(
      JSON.stringify({ error: "Cuerpo de solicitud inválido" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages, conversationId } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "Se requiere al menos un mensaje" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate message roles
  for (const m of messages) {
    if (!["user", "assistant"].includes(m.role) || typeof m.content !== "string") {
      return new Response(
        JSON.stringify({ error: "Formato de mensajes inválido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // ── 3. Rate limit ──────────────────────────────────────────────────────
  const identifier = getClientIdentifier(req);
  const tier = getTierFromRequest(req);

  const rl = await checkChatRateLimit({ identifier, tier });

  if (!rl.allowed) {
    const retryAfterSec = Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: `Límite de conversaciones alcanzado. Intenta de nuevo en ${Math.ceil(retryAfterSec / 3600)} horas.`,
        resetAt: rl.resetAt.toISOString(),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": rl.resetAt.toISOString(),
        },
      }
    );
  }

  // ── 4. Anonymous FREE-tier cache ───────────────────────────────────────
  // Only cache when: FREE tier + no conversationId (anonymous user) + 1 user message
  const isAnonymousFree =
    tier === "FREE" && !conversationId && messages.length === 1 && messages[0].role === "user";

  let cacheKey: string | null = null;
  if (isAnonymousFree && redis) {
    cacheKey = getAnonymousCacheKey(messages[0].content);
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        // Return cached response as a single SSE stream
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(cached));
            controller.enqueue(new TextEncoder().encode(sseEvent({ type: "done" })));
            controller.close();
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Cache": "HIT",
            "X-RateLimit-Limit": String(rl.limit),
            "X-RateLimit-Remaining": String(rl.remaining),
          },
        });
      }
    } catch (err) {
      console.warn("[Chat] Cache read error:", err);
    }
  }

  // ── 5. Stream response ─────────────────────────────────────────────────
  const encoder = new TextEncoder();
  let collectedText = ""; // Accumulate for cache storage

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(sseEvent(data)));
        } catch {
          // Client disconnected — ignore enqueue errors
        }
      };

      try {
        for await (const chunk of streamChat({
          messages,
          tools: CHAT_TOOLS,
          systemPrompt: CHAT_SYSTEM_PROMPT,
          executeTool,
        })) {
          enqueue(chunk);

          // Accumulate text for cache
          if (chunk.type === "text" && chunk.delta) {
            collectedText += chunk.delta;
          }
        }

        // Store anonymous FREE tier response in cache (1h TTL)
        if (cacheKey && redis && collectedText.length > 0) {
          try {
            // Cache the full text as a single SSE text event
            const cachePayload = sseEvent({ type: "text", delta: collectedText });
            await redis.set(cacheKey, cachePayload, "EX", 3600);
          } catch (err) {
            console.warn("[Chat] Cache write error:", err);
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error interno del servidor";
        console.error("[Chat] Stream error:", err);
        Sentry.captureException(err, {
          tags: { layer: "chat-api", tier },
          extra: { messageCount: messages.length, conversationId },
        });
        enqueue({ type: "error", message });
      } finally {
        enqueue({ type: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Cache": "MISS",
      "X-RateLimit-Limit": String(rl.limit),
      "X-RateLimit-Remaining": String(rl.remaining),
      "X-RateLimit-Reset": rl.resetAt.toISOString(),
    },
  });
}
